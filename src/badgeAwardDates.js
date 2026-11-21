const fs = require('fs');
const { writeTextAtomic } = require('./atomicFile');
const id = value => /^[1-9]\d{0,18}$/.test(String(value || '')) ? String(value) : '';
function awardDate(value, now = Date.now()) {
  const stamp = typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(stamp) && stamp >= Date.UTC(2006, 0, 1) && stamp <= now + 300000 ? new Date(stamp).toISOString() : null;
}

function createBadgeAwardDates(file, { fetchDates, authFor, onChange = () => {}, now = Date.now, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  let entries = {}, task = null, timer = null, stopped = false, revision = 0, retryAt = 0, lastSave = 0, message = '';
  const pending = new Map(), active = new Set(), invalidated = new Set(), blocked = new Map(), failures = new Map(), requested = new Set(), controllers = new Set();
  let accounts = new Map(), lastUserId = '';
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [userId, badges] of Object.entries(raw.users || {})) {
      if (!id(userId) || !badges || typeof badges !== 'object') continue;
      entries[userId] = {};
      for (const [badgeId, record] of Object.entries(badges)) if (id(badgeId)) {
        entries[userId][badgeId] = { awardedDate: awardDate(record?.awardedDate, now()), checkedAt: Math.max(0, Number(record?.checkedAt) || 0) };
      }
    }
  } catch {}
  const key = (userId, badgeId) => `${userId}:${badgeId}`;
  const lookup = (userId, badgeId) => entries[String(userId)]?.[String(badgeId)]?.awardedDate || null;
  function state(userId, badgeId) {
    const record = entries[String(userId)]?.[String(badgeId)];
    return record?.awardedDate ? 'known' : record?.checkedAt ? 'unavailable' : 'pending';
  }
  function status() {
    let known = 0, unavailable = 0;
    for (const reference of requested) {
      const [userId, badgeId] = reference.split(':');
      const value = state(userId, badgeId);
      if (value === 'known') known++;
      if (value === 'unavailable') unavailable++;
    }
    return { busy: !!task, pending: pending.size + active.size, total: requested.size, known, unavailable, revision, retryAt, message, failed: [...failures.values()] };
  }
  const changed = () => { revision++; try { onChange(status()); } catch {} };
  function save() { writeTextAtomic(file, JSON.stringify({ version: 1, users: entries })); lastSave = now(); }
  function remember(userId, badgeId, value) {
    const date = awardDate(value, now());
    if (!id(userId) || !id(badgeId) || !date || lookup(userId, badgeId) === date) return false;
    (entries[userId] ||= {})[badgeId] = { awardedDate: date, checkedAt: now() };
    return true;
  }
  function rememberBadges(badges) {
    let modified = false;
    for (const badge of badges) for (const account of badge.accounts || []) {
      if (account.status === 'earned') modified = remember(String(account.userId), String(badge.id), account.awardedDate) || modified;
    }
    if (modified && !stopped) { try { save(); } catch (error) { message = 'Badge dates could not be saved: ' + error.message; } changed(); }
  }
  function forget(userId, badgeIds) {
    let modified = false;
    for (const badgeId of badgeIds) {
      const reference = key(userId, badgeId);
      pending.delete(reference);
      requested.delete(reference);
      if (active.has(reference)) invalidated.add(reference);
      if (entries[userId]?.[badgeId]) {
        delete entries[userId][badgeId];
        modified = true;
      }
    }
    if (modified) { try { save(); } catch (error) { message = 'Badge dates could not be saved: ' + error.message; } }
    changed();
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (stopped || task || !pending.size) return;
    let soonest = Infinity;
    for (const ref of pending.values()) soonest = Math.min(soonest, blocked.get(String(ref.userId)) || 0);
    const next = Math.max(retryAt, soonest);
    if (next > now()) { timer = setTimeout(schedule, Math.max(1, next - now())); timer.unref?.(); return; }
    task = Promise.resolve().then(run).catch(error => { message = 'Badge dates could not be saved: ' + error.message; }).finally(() => { task = null; changed(); schedule(); });
    changed();
  }
  function takeBatch() {
    const eligible = [...pending.values()].filter(ref => (blocked.get(String(ref.userId)) || 0) <= now());
    const userId = String((eligible.find(ref => String(ref.userId) !== lastUserId) || eligible[0])?.userId || '');
    const batch = [];
    for (const [reference, ref] of pending) {
      if ((blocked.get(String(ref.userId)) || 0) > now()) continue;
      if (lookup(ref.userId, ref.badgeId)) { pending.delete(reference); continue; }
      if (String(ref.userId) !== userId) continue;
      pending.delete(reference); active.add(reference); batch.push(ref);
      if (batch.length === 10) break;
    }
    if (batch.length) lastUserId = userId;
    return batch;
  }
  async function fetchBatch(batch) {
    if (!batch.length) return;
    const userId = String(batch[0].userId), controller = new AbortController();
    controllers.add(controller);
    try {
      const account = accounts.get(userId);
      if (!account) return;
      const data = await fetchDates(account, authFor(account.id), batch.map(ref => String(ref.badgeId)), controller.signal);
      if (stopped) return;
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Roblox returned unreadable badge award dates.');
      for (const ref of batch) {
        const badgeId = String(ref.badgeId), date = awardDate(data[badgeId], now());
        if (invalidated.has(key(userId, badgeId))) continue;
        if (!remember(userId, badgeId, date) && !lookup(userId, badgeId)) (entries[userId] ||= {})[badgeId] = { awardedDate: null, checkedAt: now() };
      }
      blocked.delete(userId); failures.delete(userId);
      if (!failures.size && retryAt <= now()) message = '';
    } catch (error) {
      if (stopped) return;
      const wait = error.status === 401 || error.status === 403 ? 300000 : 60000;
      blocked.set(userId, now() + wait);
      failures.set(userId, { username: accounts.get(userId)?.username || 'Account', error: error.status === 401 || error.status === 403 ? 'Refresh this account’s Roblox login to load badge dates.' : String(error.message || 'Badge dates unavailable').slice(0, 200) });
      for (const ref of batch) {
        const reference = key(ref.userId, ref.badgeId);
        if (requested.has(reference) && !invalidated.has(reference)) pending.set(reference, ref);
      }
      if (error.status === 429) { retryAt = now() + Math.max(60000, error.retryAfterMs || 0); message = 'Roblox is limiting badge dates. Retrying shortly; saved dates are preserved.'; }
    } finally {
      controllers.delete(controller);
      for (const ref of batch) {
        const reference = key(ref.userId, ref.badgeId);
        active.delete(reference);
        invalidated.delete(reference);
      }
    }
  }
  async function run() {
    while (!stopped && pending.size && now() >= retryAt) {
      const first = takeBatch(), second = takeBatch();
      if (!first.length && !second.length) break;
      await Promise.all([fetchBatch(first), fetchBatch(second)]);
      if (stopped) break;
      if (now() - lastSave >= 10000) save();
      changed();
      if (pending.size && now() >= retryAt) await delay(500);
    }
    if (!stopped) save();
  }
  function enqueue(savedAccounts, references, { priority = false, retry = false, replace = false } = {}) {
    if (stopped) return status();
    accounts = new Map(savedAccounts.filter(account => id(account.userId)).map(account => [String(account.userId), account]));
    if (retry && retryAt <= now()) { blocked.clear(); failures.clear(); retryAt = 0; message = ''; }
    if (replace) requested.clear();
    const front = [];
    for (const ref of references) {
      const userId = id(ref.userId), badgeId = id(ref.badgeId), reference = key(userId, badgeId);
      if (!userId || !badgeId || !accounts.has(userId)) continue;
      requested.add(reference);
      const record = entries[userId]?.[badgeId];
      if (record?.awardedDate || (!retry && record?.checkedAt && now() - record.checkedAt < 6 * 3600000) || (active.has(reference) && !invalidated.has(reference))) continue;
      if (priority) { pending.delete(reference); front.push([reference, { userId, badgeId }]); }
      else if (!pending.has(reference)) pending.set(reference, { userId, badgeId });
    }
    if (priority && front.length) { const rest = [...pending]; pending.clear(); for (const row of [...front, ...rest]) pending.set(...row); }
    for (const [reference, ref] of pending) if (!accounts.has(String(ref.userId)) || !requested.has(reference)) pending.delete(reference);
    schedule();
    return status();
  }
  function stop() { stopped = true; clearTimeout(timer); for (const controller of controllers) controller.abort(); try { save(); } catch {} }
  return { enqueue, lookup, state, status, rememberBadges, forget, stop, whenIdle: () => task || Promise.resolve() };
}
module.exports = { createBadgeAwardDates, awardDate };
