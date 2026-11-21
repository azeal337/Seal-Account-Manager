const { gameTitle, removedTitle } = require('./gameDetails');
const cache = new Map();
let active = 0;
const waiting = [];
async function request(url, options = {}, fresh = false) {
  const key = url + (options.body || '');
  const old = cache.get(key);
  if (!fresh && old && old.expires > Date.now()) return old.promise;
  const promise = (async () => {
    if (active >= 3) await new Promise(resolve => waiting.push(resolve));
    else active++;
    try {
      const { onRotation, timeoutMs = 15000, ...fetchOptions } = options;
      let response;
      for (let attempt = 0; attempt < 2; attempt++) {
        const timeout = AbortSignal.timeout(timeoutMs);
        response = await fetch(url, { ...fetchOptions, signal: fetchOptions.signal ? AbortSignal.any([fetchOptions.signal, timeout]) : timeout });
        const headers = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
        const rotated = headers.map(header => header.match(/(?:^|[,\s])\.ROBLOSECURITY=([^;\r\n,]+)/i)?.[1]).find(Boolean);
        if (rotated && onRotation) {
          onRotation(rotated);
          fetchOptions.headers = { ...fetchOptions.headers, Cookie: `.ROBLOSECURITY=${rotated}` };
          if (!response.ok && attempt === 0) continue;
        }
        break;
      }
      if (!response.ok) {
        const error = new Error(response.status === 429 ? 'Roblox is rate limiting requests. Try again shortly.' : `Roblox lookup unavailable (${response.status}).`);
        error.status = response.status;
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) error.retryAfterMs = Math.max(0, /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) || 0;
        throw error;
      }
      return await response.json();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  })();
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  const record = { promise, expires: Date.now() + 300000 };
  cache.set(key, record);
  promise.catch(() => { record.expires = Date.now() + 10000; });
  return promise;
}
function id(value) {
  const result = String(value || '');
  if (!/^[1-9]\d{0,18}$/.test(result)) throw new Error('A valid Roblox ID is required.');
  return result;
}
async function badges({ universeId, placeId, cursor = '', fresh = false }, accounts, authForAccount = null) {
  if (!universeId) {
    const place = await request(`https://apis.roblox.com/universes/v1/places/${id(placeId)}/universe`);
    universeId = place.universeId;
  }
  universeId = id(universeId);
  if (typeof cursor !== 'string' || cursor.length > 2048) throw new Error('Invalid badge page.');
  const page = await request(`https://badges.roblox.com/v1/universes/${universeId}/badges?limit=25&sortOrder=Asc&cursor=${encodeURIComponent(cursor)}`, {}, fresh);
  if (!Array.isArray(page.data)) throw new Error('Roblox returned an unreadable badge list.');
  const list = page.data.map(b => ({ id: id(b.id), name: String(b.name || 'Badge'), description: String(b.description || ''), enabled: b.enabled !== false, iconUrl: '', accounts: [] }));
  const images = list.length ? request(`https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${list.map(b => b.id).join(',')}&size=150x150&format=Png&isCircular=false`, {}, fresh).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });
  // One account at a time bounds queued work even with large account lists.
  for (const account of accounts) {
    for (let offset = 0; offset < list.length; offset += 10) {
      const chunk = list.slice(offset, offset + 10);
      let data = null;
      try {
        const auth = authForAccount?.(account.id);
        const options = auth ? { headers: { Cookie: `.ROBLOSECURITY=${auth.cookie}` }, onRotation: auth.onRotation } : {};
        const response = await request(`https://badges.roblox.com/v1/users/${id(account.userId)}/badges/awarded-dates?badgeIds=${chunk.map(b => b.id).join(',')}`, options, fresh);
        if (!Array.isArray(response.data)) throw new Error('Invalid badge awards');
        data = new Map(response.data.map(award => [String(award.badgeId), award.awardedDate]));
      } catch {}
      for (const badge of chunk) {
        const earned = data?.has(badge.id);
        const rawDate = data?.get(badge.id);
        badge.accounts.push({ accountId: account.id, userId: account.userId, username: account.username, status: data === null ? 'unknown' : earned ? 'earned' : 'not-returned', awardedDate: earned && Number.isFinite(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null });
      }
    }
  }
  const icons = await images;
  for (const badge of list) badge.iconUrl = icons.data?.find(i => String(i.targetId) === badge.id)?.imageUrl || '';
  return { badges: list, nextCursor: page.nextPageCursor || null, universeId, checkedAt: new Date().toISOString() };
}
async function profiles(accounts) {
  const found = [];
  for (let offset = 0; offset < accounts.length; offset += 100) {
    const data = await request('https://users.roblox.com/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: accounts.slice(offset, offset + 100).map(a => Number(id(a.userId))), excludeBannedUsers: false }) });
    if (!Array.isArray(data.data)) throw new Error('Unreadable Roblox profiles.');
    found.push(...data.data.filter(p => p.id && typeof p.name === 'string' && p.name.trim()));
  }
  return found;
}
async function artwork(universeId) {
  const data = await request(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${id(universeId)}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`);
  return data.data?.[0]?.thumbnails?.[0]?.imageUrl || '';
}
async function ownedBadgePage(account, auth, cursor = '', signal) {
  if (!auth?.cookie) throw new Error('Refresh this account’s Roblox login to sync its badges.');
  if (typeof cursor !== 'string' || cursor.length > 2048) throw new Error('Invalid badge inventory page.');
  return request(`https://badges.roblox.com/v1/users/${id(account.userId)}/badges?limit=100&sortOrder=Desc&cursor=${encodeURIComponent(cursor)}`, {
    headers: { Cookie: `.ROBLOSECURITY=${auth.cookie}` }, onRotation: auth.onRotation, signal
  }, true);
}
async function badgeIcons(badgeIds) {
  if (!badgeIds.length) return {};
  const result = await request(`https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${badgeIds.slice(0,100).map(id).join(',')}&size=150x150&format=Png&isCircular=false`);
  return Object.fromEntries((result.data || []).filter(item => item.imageUrl).map(item => [String(item.targetId), item.imageUrl]));
}
async function awardedDates(account, auth, badgeIds, signal) {
  if (!Array.isArray(badgeIds) || badgeIds.length > 10) throw Error('Choose up to 10 badge award dates.');
  if (!badgeIds.length) return {};
  if (!auth?.cookie) throw Error('Refresh this account’s Roblox login to load badge dates.');
  const ids = [...new Set(badgeIds.map(id))];
  const response = await request(`https://badges.roblox.com/v1/users/${id(account.userId)}/badges/awarded-dates?badgeIds=${ids.join(',')}`, {
    headers: { Cookie: `.ROBLOSECURITY=${auth.cookie}` }, onRotation: auth.onRotation, signal
  }, true);
  if (!Array.isArray(response.data)) throw Error('Roblox returned unreadable badge award dates.');
  if (response.data.some(row => ids.includes(String(row?.badgeId)) && !Number.isFinite(Date.parse(row.awardedDate)))) {
    throw Error('Roblox returned unreadable badge award dates.');
  }
  return Object.fromEntries(response.data.filter(row => ids.includes(String(row.badgeId)) && typeof row.awardedDate === 'string').map(row => [String(row.badgeId), row.awardedDate]));
}
async function resolvePlace(placeId) {
  return request(`https://apis.roblox.com/universes/v1/places/${id(placeId)}/universe`);
}
async function placeDetails(placeIds, auth) {
  if (!auth?.cookie) throw Error('No saved login available for bulk game lookup.');
  const ids = [...new Set(placeIds.map(id))].slice(0, 50);
  const rows = await request(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${ids.join(',')}`, {
    headers: { Cookie: `.ROBLOSECURITY=${auth.cookie}` }, onRotation: auth.onRotation, timeoutMs: 4000
  });
  if (!Array.isArray(rows)) throw Error('Roblox returned unreadable place details.');
  return Object.fromEntries(rows.filter(row => row.placeId && row.universeId).map(row => [String(row.placeId), {
    universeId: String(row.universeId), rootPlaceId: String(row.universeRootPlaceId || ''),
    name: String(row.universeRootPlaceId) === String(row.placeId) ? gameTitle(row.name) : ''
  }]));
}
async function experienceDetails(universeIds, fresh = false) {
  const ids = [...new Set(universeIds.map(id))], details = {};
  for (let start = 0; start < ids.length; start += 50) {
    const batch = new Set(ids.slice(start, start + 50)), query = [...batch].join(',');
    const [games, icons] = await Promise.all([
      request(`https://games.roblox.com/v1/games?universeIds=${query}`, {}, fresh),
      request(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${query}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`, {}, fresh).catch(() => ({ data: [] }))
    ]);
    if (!Array.isArray(games?.data)) throw Error('Roblox returned unreadable game details.');
    const images = new Map((Array.isArray(icons?.data) ? icons.data : [])
      .filter(icon => batch.has(String(icon?.targetId)) && (!icon.state || icon.state === 'Completed'))
      .map(icon => [String(icon.targetId), icon.imageUrl]));
    for (const [uid, iconUrl] of images) details[uid] = { iconUrl, publicDetails: false };
    for (const game of games.data) {
      const uid = String(game?.id);
      if (!batch.has(uid)) continue;
      details[uid] = {
        placeId: String(game.rootPlaceId || ''), name: gameTitle(game.name) || gameTitle(game.sourceName),
        iconUrl: images.get(uid) || '', removed: removedTitle(game.name)
      };
    }
  }
  return details;
}
const unavailableReasons = new Map([
  ['GameUnapproved', 'unapproved'], ['UniverseRootPlaceIsPrivate', 'private'], ['UnderReview', 'review'],
  ['PlaceHasNoPublishedVersion', 'unpublished'], ['TemporarilyUnavailable', 'temporary'],
  ['InsufficientPermissionEditorsOnly', 'private'], ['InsufficientPermissionPlayTestersOnly', 'private'],
  [3, 'unapproved'], [5, 'private'], [9, 'review'], [12, 'temporary'], [13, 'unpublished'], [32, 'private'], [33, 'private']
]);
async function experienceAvailability(universeIds, fresh = false) {
  const ids = [...new Set(universeIds.map(id))], availability = {};
  for (let start = 0; start < ids.length; start += 50) {
    const batch = new Set(ids.slice(start, start + 50)), query = [...batch].join(',');
    const rows = await request(`https://games.roblox.com/v1/games/multiget-playability-status?universeIds=${query}`, {}, fresh);
    if (!Array.isArray(rows)) throw Error('Roblox returned unreadable game availability.');
    for (const row of rows) if (batch.has(String(row?.universeId)) && (typeof row.playabilityStatus === 'string' || Number.isInteger(row.playabilityStatus))) {
      availability[String(row.universeId)] = row.isPlayable === true ? '' : unavailableReasons.get(row.playabilityStatus) || '';
    }
  }
  return availability;
}
async function alternateExperienceDetails(universeId, placeId, fresh = false) {
  let game;
  try { game = await request(`https://develop.roblox.com/v1/universes/${id(universeId)}`, {}, fresh); }
  catch (error) { if (![404, 410].includes(error.status)) throw error; }
  const root = game?.rootPlaceId ? String(game.rootPlaceId) : placeId;
  let name = gameTitle(game?.name), removed = removedTitle(game?.name);
  if (!name && root) {
    try {
      const place = await request(`https://economy.roblox.com/v2/assets/${id(root)}/details`, {}, fresh);
      if (place?.AssetTypeId === 9) { name = gameTitle(place.Name); removed ||= removedTitle(place.Name); }
    } catch (error) { if (![404, 410].includes(error.status)) throw error; }
  }
  let availability = '';
  if (removed) availability = 'removed';
  else if (game?.isArchived === true) availability = 'archived';
  else if (game?.privacyType === 'Private') availability = 'private';
  else if (!game) availability = 'unavailable';
  return { name, placeId: game?.rootPlaceId ? root : '', removed, availability, isPublic: !availability && game?.privacyType === 'Public' };
}
module.exports = { badges, profiles, artwork, ownedBadgePage, badgeIcons, awardedDates, resolvePlace, placeDetails, experienceDetails, experienceAvailability, alternateExperienceDetails };
