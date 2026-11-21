const fs = require('fs');
const { writeTextAtomic } = require('./atomicFile');
const { gameTitle, removedTitle } = require('./gameDetails');
const id = value => /^[1-9]\d{0,18}$/.test(String(value || '')) ? String(value) : '';
const DAY = 24 * 60 * 60 * 1000, HOUR = 60 * 60 * 1000;
const image = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && /(^|\.)rbxcdn\.com$/i.test(url.hostname) ? url.href : ''; }
  catch { return ''; }
};

function createExperienceMetadata(file, { resolvePlace, resolvePlaces, fetchDetails, fetchAvailability, fetchAlternate, onChange = () => {}, now = Date.now, delay = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  let places = {}, universes = {}, task = null, stopped = false, retryAt = 0, revision = 0, bulkUnavailableUntil = 0, retryTimer = null;
  const queue = [], queued = new Set(), attempts = new Map();
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [key, p] of Object.entries(data.places || {})) if (id(key) && (id(p?.universeId) || p?.unavailable === true)) {
      places[key] = { universeId: id(p.universeId), unavailable: p.unavailable === true, checkedAt: Number(p.checkedAt) || 0 };
    }
    for (const [key, g] of Object.entries(data.universes || {})) if (id(key) && typeof g?.name === 'string') {
      universes[key] = {
        universeId: key, placeId: id(g.placeId), name: gameTitle(g.name), iconUrl: image(g.iconUrl), checkedAt: Number(g.checkedAt) || 0,
        gameAvailability: removedTitle(g.name) ? 'removed' : String(g.gameAvailability || ''), availabilityAt: Number(g.availabilityAt) || 0
      };
    }
  } catch {}
  const status = () => ({ busy: !!task, pending: queued.size, retryAt, revision });
  const changed = () => { revision++; try { onChange(status()); } catch {} };
  const save = () => writeTextAtomic(file, JSON.stringify({ version: 2, places, universes }));
  const universeFor = ref => id(ref.universeId) || places[ref.placeId]?.universeId || '';
  const hasRecent = (stamp, interval) => !!stamp && now() - stamp < interval;
  const newDetail = key => ({ universeId: key, placeId: '', name: '', iconUrl: '', checkedAt: 0, gameAvailability: '', availabilityAt: 0 });
  function lookup(game) {
    const placeId = id(game.placeId), universeId = universeFor({ ...game, placeId }), detail = universes[universeId];
    const pending = queued.has('universe:' + universeId) || queued.has('place:' + placeId);
    const name = detail?.name || gameTitle(game.name);
    const fallback = pending ? 'Loading game details…' : placeId ? `Place ${placeId}` : universeId ? `Experience ${universeId}` : game.name;
    return {
      ...game, ...(universeId ? { universeId } : {}), ...(detail?.placeId ? { placeId: detail.placeId } : {}),
      name: name || fallback, iconUrl: detail?.iconUrl || game.iconUrl, metadataResolved: !!detail?.name,
      gameAvailability: detail?.gameAvailability || (places[placeId]?.unavailable ? 'unavailable' : ''),
      sourcePlaceId: placeId
    };
  }
  function rememberDetails(key, incoming, { fallback = false } = {}) {
    const detail = universes[key] ||= newDetail(key);
    const title = gameTitle(incoming?.name);
    if (title && (!fallback || !detail.name)) detail.name = title;
    detail.placeId = id(incoming?.placeId) || detail.placeId;
    detail.iconUrl = image(incoming?.iconUrl) || detail.iconUrl;
    detail.checkedAt = now();
    if (incoming?.removed || removedTitle(incoming?.name)) detail.gameAvailability = 'removed';
    else if (!fallback && title && ['removed', 'unavailable'].includes(detail.gameAvailability)) detail.gameAvailability = '';
    return detail;
  }
  function pause(batch) {
    retryAt = Math.max(retryAt, now() + 60000);
    queue.unshift(...batch);
  }
  async function detailsFor(refs) {
    const byUniverse = new Map(refs.map(ref => [universeFor(ref), ref]).filter(([uid]) => uid));
    const ids = [...byUniverse.keys()];
    const detailsIds = ids.filter(uid => {
      const ref = byUniverse.get(uid), detail = universes[uid];
      return ref.fresh || (ref.retry && (!detail?.name || detail.gameAvailability)) || !hasRecent(detail?.checkedAt, detail?.name && detail.iconUrl ? DAY : HOUR);
    });
    const missing = [];
    if (detailsIds.length && !stopped) {
      const rows = await fetchDetails(detailsIds, refs.some(ref => ref.fresh || ref.retry));
      if (stopped) return;
      for (const uid of detailsIds) {
        const row = rows?.[uid];
        if (row) rememberDetails(uid, row);
        if (!row || row.publicDetails === false || !universes[uid]?.name) {
          if (universes[uid]) universes[uid].checkedAt = 0;
          missing.push(uid);
        }
      }
      // Names and icons can render before the availability request finishes.
      save(); changed();
    }
    const availabilityIds = fetchAvailability ? ids.filter(uid => {
      const ref = byUniverse.get(uid), detail = universes[uid];
      return ref.fresh || (ref.retry && detail?.gameAvailability) || !hasRecent(detail?.availabilityAt, DAY);
    }) : [];
    let availability = {};
    if (availabilityIds.length && !stopped) {
      try {
        availability = await fetchAvailability(availabilityIds, refs.some(ref => ref.fresh || ref.retry));
        if (stopped) return;
        for (const uid of availabilityIds) {
          const detail = universes[uid] ||= newDetail(uid);
          if (Object.hasOwn(availability || {}, uid) && !['removed', 'archived', 'unavailable'].includes(detail.gameAvailability)) detail.gameAvailability = availability[uid];
          detail.availabilityAt = now();
        }
        save(); changed();
      } catch (error) { if (error.status === 429) throw error; }
    }
    for (const uid of missing) {
      if (stopped || !fetchAlternate) break;
      const ref = byUniverse.get(uid);
      try {
        const fallback = await fetchAlternate(uid, universes[uid]?.placeId || ref.placeId, ref.fresh || ref.retry);
        if (stopped || !fallback) continue;
        const detail = rememberDetails(uid, fallback, { fallback: true });
        if (fallback.availability && (fallback.availability !== 'unavailable' || !detail.gameAvailability)) detail.gameAvailability = fallback.availability;
        if (fallback.isPublic && !availability?.[uid] && ['private', 'removed', 'archived', 'unavailable'].includes(detail.gameAvailability)) detail.gameAvailability = '';
        save(); changed();
      } catch (error) { if (error.status === 429) throw error; }
    }
  }
  async function processBatch(batch) {
    let remaining = batch;
    const unknown = batch.filter(ref => !universeFor(ref));
    if (unknown.length && resolvePlaces && now() >= bulkUnavailableUntil) {
      try {
        const found = await resolvePlaces(unknown.map(ref => ref.placeId));
        for (const ref of unknown) {
          const result = found?.[ref.placeId], uid = id(result?.universeId);
          if (!uid) continue;
          places[ref.placeId] = { universeId: uid, checkedAt: now() };
          if (gameTitle(result.name) && !universes[uid]?.name) {
            const detail = universes[uid] ||= newDetail(uid);
            detail.name = gameTitle(result.name);
            detail.placeId = id(result.rootPlaceId);
          }
        }
      } catch (error) {
        if (error.status === 429) { pause(batch); return; }
        // Missing/expired logins cannot hold up public lookups.
        bulkUnavailableUntil = now() + 300000;
      }
    }
    if (now() < retryAt) { queue.unshift(...batch); return; }
    const resolved = remaining.filter(universeFor);
    if (resolved.length) {
      try { await detailsFor(resolved); }
      catch (error) { if (error.status === 429) { pause(batch); return; } }
      resolved.forEach(ref => queued.delete(ref.key));
      remaining = remaining.filter(ref => !resolved.includes(ref));
      if (!stopped) { save(); changed(); }
    }
    // Publish small fallback groups, rather than hiding successful results
    // behind an unavailable bulk lookup or an entire large inventory.
    for (let offset = 0; offset < remaining.length && !stopped; offset += 6) {
      const group = remaining.slice(offset, offset + 6);
      for (let start = 0; start < group.length; start += 3) {
        const results = await Promise.allSettled(group.slice(start, start + 3).map(async ref => {
          if (stopped || now() < retryAt) return;
          try {
            const value = await resolvePlace(ref.placeId), uid = id(value?.universeId);
            if (stopped) return;
            if (uid) places[ref.placeId] = { universeId: uid, checkedAt: now() };
            else if (value?.universeId === null) places[ref.placeId] = { universeId: '', unavailable: true, checkedAt: now() };
          } catch (error) {
            if (!stopped && [404, 410].includes(error.status)) places[ref.placeId] = { universeId: '', unavailable: true, checkedAt: now() };
            else throw error;
          }
        }));
        if (results.some(result => result.status === 'rejected' && result.reason?.status === 429)) { pause(remaining.slice(offset)); return; }
      }
      if (now() < retryAt) { queue.unshift(...remaining.slice(offset)); return; }
      try { await detailsFor(group); }
      catch (error) { if (error.status === 429) { pause(remaining.slice(offset)); return; } }
      group.forEach(ref => queued.delete(ref.key));
      if (!stopped) { save(); changed(); if (offset + 6 < remaining.length) await delay(25); }
    }
  }
  async function worker() {
    while (queue.length && !stopped && now() >= retryAt) {
      const size = resolvePlaces && now() >= bulkUnavailableUntil ? 50 : 6;
      await processBatch(queue.splice(0, size));
    }
  }
  function start() {
    if (task || !queue.length || stopped || now() < retryAt) return;
    clearTimeout(retryTimer); retryTimer = null;
    // Metadata jobs share robloxProgress's existing three-request limit.
    task = Promise.resolve().then(() => Promise.allSettled([worker(), worker()])).finally(() => {
      task = null;
      if (!stopped) {
        changed();
        if (queue.length && now() < retryAt) {
          retryTimer = setTimeout(start, Math.max(1, retryAt - now())); retryTimer.unref?.();
        } else if (queue.length) start();
      }
    });
    changed();
  }
  function enqueue(refs, { fresh = false, retry = false } = {}) {
    const missing = [], cached = [];
    for (const raw of refs) {
      const placeId = id(raw.placeId), universeId = universeFor({ ...raw, placeId });
      if (!placeId && !universeId) continue;
      const key = universeId ? 'universe:' + universeId : 'place:' + placeId;
      const detail = universes[universeId], fastRetry = retry && (!detail?.name || detail.gameAvailability);
      if (!fresh && !fastRetry) {
        if (!universeId && places[placeId]?.unavailable && hasRecent(places[placeId].checkedAt, HOUR)) continue;
        if (hasRecent(detail?.checkedAt, detail?.name && detail.iconUrl ? DAY : HOUR) &&
            (!fetchAvailability || hasRecent(detail?.availabilityAt, DAY))) continue;
      }
      if (queued.has(key) || (universeId && queued.has('place:' + placeId)) || (!fresh && !fastRetry && hasRecent(attempts.get(key), 60000))) continue;
      queued.add(key); attempts.set(key, now());
      (detail?.name ? cached : missing).push({ key, placeId, universeId, fresh, retry: fastRetry });
    }
    queue.unshift(...missing);
    queue.push(...cached);
    start(); return status();
  }
  return { enqueue, lookup, status, whenIdle: async () => { while (task) await task; }, stop: () => { stopped = true; clearTimeout(retryTimer); queue.length = 0; queued.clear(); } };
}
module.exports = { createExperienceMetadata };
