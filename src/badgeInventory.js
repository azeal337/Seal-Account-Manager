const fs = require('fs');
const crypto = require('crypto');
const { writeTextAtomic } = require('./atomicFile');
const { gameTitle } = require('./gameDetails');
const numeric = value => /^[1-9]\d{0,18}$/.test(String(value || '')) ? String(value) : '';
const HEAD_INTERVAL = 30 * 60 * 1000;
const AUDIT_INTERVAL = 12 * 60 * 60 * 1000;
const MANUAL_AUDIT_INTERVAL = 15 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;
function earlierDate(a,b){const left=Date.parse(a||''),right=Date.parse(b||'');return Number.isFinite(left)&&(!Number.isFinite(right)||left<=right)?new Date(left).toISOString():Number.isFinite(right)?new Date(right).toISOString():'';}
function normalizeBadge(raw) {
  const id = numeric(raw?.id), universeId = numeric(raw?.awardingUniverse?.id || raw?.universeId);
  const placeId = numeric(raw?.awardingUniverse?.rootPlaceId || raw?.placeId || ((raw?.awarder?.type === 1 || raw?.awarder?.type === 'Place') ? raw.awarder.id : ''));
  if (!id || (!universeId && !placeId)) return null;
  return { id, universeId, placeId, name: String(raw.displayName || raw.name || 'Badge').slice(0,160), description: String(raw.displayDescription || raw.description || '').slice(0,600), gameName: String(raw.awardingUniverse?.name || raw.awarder?.name || raw.gameName || (placeId ? `Place ${placeId}` : `Experience ${universeId}`)).slice(0,160), enabled: raw.enabled !== false };
}
function createBadgeInventory(file, { fetchPage, verifyDates, awardDates, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, onChange = () => {} } = {}) {
  const users = {}, controllers = new Set();
  let revision = 0, sequence = 0, task = null, mode = '', stopped = false, retryAt = 0, lastSave = 0, dirty = false;
  let activeAccounts = [], message = '', queuedRefresh = null, auditRequestedAt = 0;
  const timestamp = value => Math.max(0, Number(value) || 0);
  const cursorValue = value => typeof value === 'string' && value.length <= 2048 ? value : '';
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [userId, user] of Object.entries(raw.users || {})) {
      if (!numeric(userId) || !user || typeof user !== 'object') continue;
      const badges = {};
      for (const rawBadge of Object.values(user.badges || {})) {
        const badge = normalizeBadge(rawBadge);
        if (badge) badges[badge.id] = { ...badge, scan: String(rawBadge.scan || '').slice(0, 80) };
      }
      const complete = user.complete === true, checkedAt = timestamp(user.checkedAt);
      const scan = raw.version === 1 && complete ? '' : String(user.scan || '').slice(0, 80);
      users[userId] = {
        badges, complete, checkedAt, verifiedAt: timestamp(user.verifiedAt ?? (complete ? checkedAt : 0)),
        scan, cursor: scan ? cursorValue(user.cursor) : '', confirming: !!scan && user.confirming === true,
        headIds: Array.isArray(user.headIds) ? user.headIds.slice(0, 100).map(numeric).filter(Boolean) : [],
        retryAt: 0, error: ''
      };
    }
  } catch {}
  function save() {
    if (!dirty) return;
    const persisted = Object.fromEntries(Object.entries(users).map(([id, { error, retryAt, ...user }]) => [id, user]));
    writeTextAtomic(file, JSON.stringify({ version: 2, users: persisted }));
    lastSave = now();
    dirty = false;
  }
  function status() {
    return {
      busy: mode === 'sync' || !!queuedRefresh, checking: mode === 'audit' || activeAccounts.some(account => {
        const user = users[account.userId];
        return user?.complete && !!user.scan;
      }),
      accountCount: activeAccounts.length, completed: activeAccounts.filter(a => users[a.userId]?.complete).length,
      failed: activeAccounts.filter(a => users[a.userId]?.error).map(a => ({ username: a.username, error: users[a.userId].error })),
      badgeCount: activeAccounts.reduce((sum, a) => sum + Object.keys(users[a.userId]?.badges || {}).length, 0), revision, sequence, message
    };
  }
  function notify() { sequence++; try { onChange(status()); } catch {} }
  function beginScan(user) {
    user.scan = crypto.randomUUID();
    user.cursor = '';
    user.confirming = false;
    dirty = true;
  }
  function remember(user, badgeId, badge) {
    const previous = user.badges[badgeId];
    if (badge && gameTitle(previous?.gameName) && !gameTitle(badge.gameName)) badge.gameName = previous.gameName;
    if (badge && (!previous || Object.keys(badge).some(key => previous[key] !== badge[key]))) {
      user.badges[badgeId] = { ...badge, scan: previous?.scan || '' };
      dirty = true;
      revision++;
    }
    const record = user.badges[badgeId];
    if (record && user.scan && record.scan !== user.scan) {
      record.scan = user.scan;
      dirty = true;
    }
  }
  async function reconcile(account, user, authFor, signal) {
    const candidates = Object.values(user.badges).filter(badge => badge.scan !== user.scan);
    const batch = verifyDates ? candidates.slice(0, 10) : candidates;
    if (batch.length) {
      const dates = verifyDates ? await verifyDates(account, authFor(account.id), batch.map(badge => badge.id), signal) : {};
      if (stopped) return false;
      if (!dates || typeof dates !== 'object' || Array.isArray(dates)) throw Error('Roblox returned unreadable badge ownership.');
      const removed = [];
      for (const badge of batch) {
        if (Object.hasOwn(dates, badge.id)) { badge.scan = user.scan; continue; }
        delete user.badges[badge.id];
        removed.push(badge.id);
        revision++;
      }
      dirty = true;
      if (removed.length) {
        // Save ownership first so a failed write leaves the old date usable.
        save();
        awardDates?.forget?.(account.userId, removed);
      }
      if (batch.length < candidates.length) return true;
    }
    user.error = '';
    user.retryAt = 0;
    user.checkedAt = user.verifiedAt = now();
    user.scan = '';
    user.confirming = false;
    user.complete = true;
    dirty = true;
    return false;
  }
  async function advance(job, authFor) {
    const { account, user, head } = job;
    const controller = new AbortController();
    controllers.add(controller);
    try {
      if (!head && user.confirming) return await reconcile(account, user, authFor, controller.signal);
      const cursor = head ? head.cursor : user.cursor;
      const page = await fetchPage(account, authFor(account.id), cursor, controller.signal);
      if (stopped) return false;
      if (!Array.isArray(page?.data) || page.data.some(raw => !numeric(raw?.id))) throw Error('Roblox returned an unreadable badge inventory.');
      const next = page.nextPageCursor ?? '';
      if (typeof next !== 'string' || next.length > 2048 || (next && (next === cursor || job.cursors.has(next) || !page.data.length))) {
        throw Error('Roblox returned an invalid badge page. Sync can be retried.');
      }
      const records = page.data.map(raw => [numeric(raw.id), normalizeBadge(raw)]);
      if (!cursor && !head) user.headIds = records.slice(0, 100).map(([id]) => id);
      if (next) job.cursors.add(next);
      user.error = '';
      user.retryAt = 0;
      if (head) {
        if (!cursor) head.first = records.slice(0, 100).map(([id]) => id);
        // Keep the previous overlap until a successful delta reaches it.
        for (const [id, badge] of records) head.badges.set(id, badge);
        const reachedCache = records.some(([id]) => head.anchors ? head.anchors.has(id) : !!user.badges[id]);
        if (next && !reachedCache) { head.cursor = next; return true; }
        if (!next) beginScan(user);
        for (const [id, badge] of head.badges) remember(user, id, badge);
        user.headIds = head.first;
        user.checkedAt = now();
        dirty = true;
        if (next) return false;
        job.head = null;
      } else {
        for (const [id, badge] of records) remember(user, id, badge);
        user.cursor = next;
        dirty = true;
        if (next) return true;
      }
      user.confirming = true;
      return await reconcile(account, user, authFor, controller.signal);
    } catch (error) {
      if (stopped) return false;
      if (!head && !user.confirming && user.cursor && (error.status === 400 || error.status === 410)) beginScan(user);
      user.error = error.status === 401 || error.status === 403 ? 'Refresh this account’s Roblox login, then sync again.' : String(error.message || 'Badge sync failed.').slice(0, 250);
      user.retryAt = now() + RETRY_DELAY;
      if (error.status === 429) {
        retryAt = now() + Math.max(RETRY_DELAY, error.retryAfterMs || 0);
        message = 'Roblox is limiting badge requests. SAM will retry automatically.';
      }
      return false;
    } finally { controllers.delete(controller); }
  }
  async function run(queue, authFor) {
    while (queue.length && !stopped && now() >= retryAt) {
      const batch = queue.splice(0, 2);
      const more = await Promise.all(batch.map(job => advance(job, authFor)));
      batch.forEach((job, index) => { if (more[index] && --job.pages > 0) queue.push(job); });
      if (!stopped && now() - lastSave >= 10000) save();
      notify();
      if (mode === 'audit' && queuedRefresh) break;
      if (queue.length && !stopped && now() >= retryAt) await delay(250);
    }
    if (!stopped) save();
  }
  function start(accounts, authFor, { fresh = false, audit = false } = {}) {
    activeAccounts = [...new Map(accounts.filter(a => numeric(a.userId)).map(a => [String(a.userId), a])).values()];
    if (stopped || now() < retryAt) return status();
    if (fresh) auditRequestedAt = now();
    if (task) {
      if (fresh && mode === 'audit') queuedRefresh = { accounts, authFor };
      return status();
    }
    const queue = [];
    for (const account of activeAccounts) {
      const key = String(account.userId);
      let user = users[key];
      if (audit && !user?.complete) continue;
      if (!fresh && user?.retryAt > now()) continue;
      if (!user) user = users[key] = { badges: {}, complete: false, checkedAt: 0, verifiedAt: 0, scan: '', cursor: '', confirming: false, headIds: [], error: '', retryAt: 0 };
      if (audit) {
        const requested = auditRequestedAt - user.verifiedAt >= MANUAL_AUDIT_INTERVAL;
        if (!user.scan && !requested && now() - user.verifiedAt < AUDIT_INTERVAL) continue;
      } else if (user.complete && !fresh && now() - user.checkedAt < HEAD_INTERVAL) continue;
      const head = !audit && user.complete ? {
        cursor: '', first: [], badges: new Map(), anchors: user.headIds.length ? new Set(user.headIds) : null
      } : null;
      if (!head && !user.scan) beginScan(user);
      queue.push({ account, user, head, pages: audit ? 8 : Infinity, cursors: new Set(!head && user.cursor ? [user.cursor] : []) });
    }
    if (!queue.length) return status();
    message = '';
    mode = audit ? 'audit' : 'sync';
    task = Promise.resolve().then(() => run(queue, authFor)).catch(error => {
      message = `Badge sync could not be saved: ${error.message}`;
    }).finally(() => {
      task = null;
      mode = '';
      const request = queuedRefresh;
      queuedRefresh = null;
      if (request) start(request.accounts, request.authFor, { fresh: true });
      notify();
    });
    notify();
    return status();
  }
  function games(accounts, resolveGame = game => game) {
    const groups = new Map();
    for (const account of accounts) for (const badge of Object.values(users[String(account.userId)]?.badges || {})) {
      const sourceKey=badge.placeId?'place:'+badge.placeId:'universe:'+badge.universeId;
      const resolved=resolveGame({universeId:badge.universeId,placeId:badge.placeId,name:badge.gameName});
      const key=resolved.universeId?'universe:'+resolved.universeId:sourceKey;
      let game=groups.get(key);
      if(!game)groups.set(key,game={...resolved,key,badgeGameKey:sourceKey,badgeGameKeys:new Set(),owners:new Map(),badgeIds:new Set()});
      if (!gameTitle(game.name) && gameTitle(resolved.name)) game.name = resolved.name;
      game.badgeGameKeys.add(sourceKey);game.badgeIds.add(badge.id);
      if(!game.owners.has(account.id))game.owners.set(account.id,new Set());game.owners.get(account.id).add(badge.id);
    }
    return [...groups.values()];
  }
  function canonicalStats(stats, resolveGame){
    const result=structuredClone(stats);
    function combine(rows, owners=false){
      const grouped=new Map();
      for(const row of rows){const metadata=resolveGame(row),key=metadata.universeId?'universe:'+metadata.universeId:row.key;let item=grouped.get(key);
        if(!item){item={...row,...metadata,key,totalMs:0,...(owners?{accounts:[]}:{} )};grouped.set(key,item);}
        if (!gameTitle(item.name) && gameTitle(metadata.name)) item.name = metadata.name;
        item.totalMs+=Number(row.totalMs)||0;
        if(owners)for(const owner of row.accounts||[]){let existing=item.accounts.find(a=>String(a.userId||a.accountId)===String(owner.userId||owner.accountId));if(!existing){existing={...owner,totalMs:0};item.accounts.push(existing);}existing.totalMs+=Number(owner.totalMs)||0;}
      }
      return [...grouped.values()];
    }
    result.experiences=combine(result.experiences,true);for(const account of result.accounts)account.experiences=combine(account.experiences||[]);return result;
  }
  function merge(stats, accounts, resolveGame = game => game) {
    const result = canonicalStats(stats, resolveGame), byId = new Map(accounts.map(a=>[a.id,a]));
    const firstPlayed=new Map();
    for(const record of stats.firstPlayedGames||[]){const game=resolveGame(record),key=game.universeId?'universe:'+game.universeId:game.key;firstPlayed.set(key,earlierDate(firstPlayed.get(key),record.firstPlayedAt));}
    for (const game of games(accounts, resolveGame)) {
      let row = result.experiences.find(g => (game.universeId && String(g.universeId)===game.universeId) || (game.placeId && String(g.placeId)===game.placeId));
      if (!row) { row = { key: game.key, universeId: game.universeId, placeId: game.placeId, name: game.name, iconUrl: game.iconUrl, metadataResolved: game.metadataResolved, gameAvailability: game.gameAvailability, totalMs: 0, accounts: [] }; result.experiences.push(row); }
      if (!gameTitle(row.name) && gameTitle(game.name)) row.name = game.name;
      if (!row.gameAvailability) row.gameAvailability = game.gameAvailability;
      row.badgeGameKey = game.badgeGameKey; row.badgeGameKeys=[...game.badgeGameKeys]; row.earnedBadgeCount = (row.earnedBadgeCount||0) + game.badgeIds.size; row.earnedRevision = revision;
      for (const [accountId, badges] of game.owners) {
        const count=badges.size;
        const saved = byId.get(accountId), accountKey = `user:${saved.userId}`;
        let parent = result.accounts.find(a=>String(a.userId)===String(saved.userId));
        if (!parent) { parent = { key: accountKey, accountId, userId: saved.userId, username: saved.username, avatarUrl: saved.avatarUrl, totalMs: 0, experiences: [] }; result.accounts.push(parent); }
        parent.accountId=accountId;parent.username=saved.username;parent.avatarUrl=saved.avatarUrl;
        let owner = row.accounts.find(a=>String(a.userId)===String(saved.userId));
        if (!owner) { owner = { key: accountKey, accountId, userId: saved.userId, username: saved.username, avatarUrl: saved.avatarUrl, totalMs: 0 }; row.accounts.push(owner); }
        owner.accountId=accountId;owner.username=saved.username;owner.avatarUrl=saved.avatarUrl;
        owner.earnedBadgeCount = (owner.earnedBadgeCount||0)+count;
        let child = parent.experiences.find(g=>g.key===row.key);
        if (!child) { child = { key: row.key, universeId: row.universeId, placeId: row.placeId, name: row.name, iconUrl:row.iconUrl, totalMs: 0 }; parent.experiences.push(child); }
        if (!gameTitle(child.name) && gameTitle(row.name)) child.name = row.name;
        child.gameAvailability = row.gameAvailability;
        child.badgeGameKey = game.badgeGameKey;child.badgeGameKeys=[...game.badgeGameKeys];child.iconUrl=row.iconUrl; child.earnedBadgeCount = (child.earnedBadgeCount||0)+count; child.earnedRevision = revision;
      }
    }
    // Award dates are per owner, never badge creation/update timestamps. They
    // provide evidence of an older visit without inventing recorded playtime.
    const earliestBadges = new Map(), ownerBadges = new Map();
    for (const account of accounts) for (const badge of Object.values(users[String(account.userId)]?.badges || {})) {
      const date = awardDates?.lookup(account.userId, badge.id);
      if (!date) continue;
      const resolved = resolveGame({ universeId: badge.universeId, placeId: badge.placeId });
      const key = resolved.universeId ? 'universe:' + resolved.universeId : badge.placeId ? 'place:' + badge.placeId : 'universe:' + badge.universeId;
      earliestBadges.set(key, earlierDate(earliestBadges.get(key), date));
      const ownerKey = `${account.userId}:${key}`;
      ownerBadges.set(ownerKey, earlierDate(ownerBadges.get(ownerKey), date));
    }
    function setFirstPlay(game, recorded, badge) {
      game.firstRecordedAt = earlierDate(game.firstRecordedAt, recorded);
      game.earliestBadgeAt = badge || '';
      game.firstPlayedAt = earlierDate(game.firstRecordedAt, badge);
      game.firstPlayedSource = badge && game.firstPlayedAt === badge ? 'badge' : game.firstPlayedAt ? 'sam' : '';
    }
    const earnedRevision = `${revision}:${awardDates?.status().revision || 0}`;
    for (const game of result.experiences) {
      setFirstPlay(game, earlierDate(game.firstPlayedAt, firstPlayed.get(game.key)), earliestBadges.get(game.key));
      game.earnedRevision = earnedRevision;
      for (const owner of game.accounts) owner.earliestBadgeAt = ownerBadges.get(`${owner.userId}:${game.key}`) || '';
    }
    for (const account of result.accounts) for (const game of account.experiences) {
      game.earliestBadgeAt = ownerBadges.get(`${account.userId}:${game.key}`) || '';
      game.earnedRevision = earnedRevision;
    }
    const order=(a,b)=>b.totalMs-a.totalMs || String(a.name||a.username).localeCompare(String(b.name||b.username));
    result.accounts.sort(order); result.experiences.sort(order);
    for (const account of result.accounts) account.experiences.sort(order);
    for (const game of result.experiences) game.accounts.sort(order);
    result.accountCount=result.accounts.length; result.experienceCount=result.experiences.length; result.badgeSync=status();
    return result;
  }
  function ownedBadges(input, accounts) {
    const key=String(input.badgeGameKey || (input.universeId ? `universe:${numeric(input.universeId)}` : `place:${numeric(input.placeId)}`));
    const keys=new Set(Array.isArray(input.badgeGameKeys)?input.badgeGameKeys.filter(k=>/^(place|universe):[1-9]\d{0,18}$/.test(k)).slice(0,1000):[key]);
    const offset=Number(input.cursor||0);if(!Number.isSafeInteger(offset)||offset<0)throw Error('Invalid earned-badge page.');
    const found=new Map();
    for(const account of accounts.filter(a=>!input.accountId||a.id===input.accountId)) for(const badge of Object.values(users[String(account.userId)]?.badges||{})) {
      const gameKey=badge.placeId?`place:${badge.placeId}`:`universe:${badge.universeId}`;if(!keys.has(gameKey))continue;
      let row=found.get(badge.id);if(!row)found.set(badge.id,row={...badge,iconUrl:'',accounts:[]});
      row.accounts.push({accountId:account.id,userId:account.userId,username:account.username,status:'earned',awardedDate:awardDates?.lookup(account.userId,badge.id)||null,awardDateState:awardDates?.state(account.userId,badge.id)||'pending'});
    }
    const all=[...found.values()].sort((a,b)=>a.name.localeCompare(b.name));
    return {badges:all.slice(offset,offset+50),nextCursor:offset+50<all.length?String(offset+50):'',total:all.length,revision};
  }
  function stop() { stopped=true;for(const controller of controllers)controller.abort();try{save();}catch{} }
  function awardReferences(accounts) {
    return accounts.flatMap(account => Object.values(users[String(account.userId)]?.badges || {}).map(badge => ({userId:account.userId,badgeId:badge.id})));
  }
  return { start, status, merge, ownedBadges, awardReferences, references:accounts=>games(accounts).map(game=>({placeId:game.placeId,universeId:game.universeId})), stop, whenIdle:()=>task||Promise.resolve() };
}
module.exports = { createBadgeInventory, normalizeBadge };
