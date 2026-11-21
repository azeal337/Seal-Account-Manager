const fs = require('fs');
const { writeTextAtomic } = require('./atomicFile');
const validId = value => /^[1-9]\d{0,18}$/.test(String(value));
function validUrl(value) { try { const u = new URL(value); return u.protocol === 'https:' && /(^|\.)rbxcdn\.com$/i.test(u.hostname); } catch { return false; } }

function createBadgeIconCache(file, { fetchIcons, now = Date.now } = {}) {
  const icons = new Map(), pending = new Map(), attempts = new Map();
  let timer = null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [id, row] of Object.entries(data.icons || {})) if (validId(id) && validUrl(row?.url)) icons.set(id, { url: row.url, checkedAt: Number(row.checkedAt) || 0 });
  } catch {}
  const clean = ids => [...new Set(ids.map(String).filter(validId))].slice(0, 100);
  const cached = ids => Object.fromEntries(clean(ids).filter(id => icons.has(id)).map(id => [id, icons.get(id).url]));
  async function flush() {
    timer = null;
    const group = [...pending].filter(([, item]) => !item.running).slice(0, 100);
    group.forEach(([id, item]) => { item.running = true; attempts.set(id, now()); });
    try {
      const found = await fetchIcons(group.map(([id]) => id));
      for (const [id] of group) if (validUrl(found[id])) icons.set(id, { url: found[id], checkedAt: now() });
      if (icons.size) { try { writeTextAtomic(file, JSON.stringify({ version: 1, icons: Object.fromEntries(icons) })); } catch {} }
    } catch {} // Names and existing icons stay usable during a network failure.
    finally {
      group.forEach(([id, item]) => { pending.delete(id); item.resolve(); });
      if ([...pending.values()].some(item => !item.running) && !timer) timer = setTimeout(flush, 10);
    }
  }
  async function get(ids) {
    const waits = [];
    for (const id of clean(ids)) {
      if (icons.has(id) && now() - icons.get(id).checkedAt < 86400000) continue;
      if (pending.has(id)) { waits.push(pending.get(id).promise); continue; }
      if (attempts.has(id) && now() - attempts.get(id) < 30000) continue;
      const item = { running: false }; item.promise = new Promise(resolve => { item.resolve = resolve; });
      pending.set(id, item); waits.push(item.promise);
    }
    if (waits.length && !timer && [...pending.values()].some(item => !item.running)) timer = setTimeout(flush, 10);
    await Promise.all(waits); return cached(ids);
  }
  return { cached, get };
}
module.exports = { createBadgeIconCache };
