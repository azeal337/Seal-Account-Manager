'use strict';

const fs = require('fs');
const path = require('path');

const STORE_VERSION = 1;
const MIN_SEGMENT_MS = 250;
const MERGE_GAP_MS = 20000;
const UNLINKED_KEY = 'account:unlinked';

function cleanText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 160) || fallback;
}

function numericId(value) {
  const text = String(value || '').trim();
  return /^\d+$/.test(text) ? text : '';
}

function accountFromSession(session = {}) {
  const accountId = cleanText(session.accountId);
  const userId = numericId(session.userId);
  if (!accountId && !userId) return null;
  return {
    key: userId ? `user:${userId}` : `account:${accountId}`,
    accountId,
    userId,
    ...(session.unassigned ? { unassigned: true } : {}),
    username: cleanText(session.username, 'Roblox account'),
    avatarUrl: cleanText(session.avatarUrl)
  };
}

function experienceFromSession(session = {}) {
  const presence = session.presence || {};
  const inExperience = presence.inGame === true || session.serverConfirmed === true;
  if (!inExperience) return null;

  const universeId = numericId(session.universeId || presence.universeId);
  const placeId = numericId(session.placeId || presence.placeId || presence.rootPlaceId);
  if (!universeId && !placeId) return null;

  const key = universeId ? `universe:${universeId}` : `place:${placeId}`;
  let name = cleanText(presence.lastLocation || session.targetLabel);
  if (/^(roblox|roblox home|in game|private server|place \d+|server in place \d+)$/i.test(name)) name = '';
  return {
    key,
    universeId,
    placeId,
    name: name || (placeId ? `Place ${placeId}` : 'Roblox experience')
  };
}

function emptyData(now = Date.now()) {
  return {
    version: STORE_VERSION,
    createdAt: now,
    updatedAt: now,
    accounts: {},
    experiences: {}
  };
}

class PlaytimeStore {
  constructor(options = {}) {
    this.filePath = String(options.filePath || '');
    this.logger = options.logger || console;
    this.saveDelayMs = Math.max(1000, Number(options.saveDelayMs) || 10000);
    this.data = null;
    this.live = new Map();
    this.saveTimer = null;
    this.dirty = false;
  }

  _load() {
    if (this.data) return this.data;
    let parsed = null;
    try {
      if (this.filePath && fs.existsSync(this.filePath)) {
        parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (err) {
      this.logger.warn?.('[time] Could not read saved playtime:', err.message);
    }
    if (!parsed || typeof parsed !== 'object') parsed = emptyData();
    parsed.version = STORE_VERSION;
    parsed.createdAt = Number(parsed.createdAt) || Date.now();
    parsed.updatedAt = Number(parsed.updatedAt) || parsed.createdAt;
    if (!parsed.accounts || typeof parsed.accounts !== 'object') parsed.accounts = {};
    if (!parsed.experiences || typeof parsed.experiences !== 'object') parsed.experiences = {};
    for (const account of Object.values(parsed.accounts)) {
      if (!Array.isArray(account.segments)) account.segments = [];
    }
    this.data = parsed;
    return parsed;
  }

  _scheduleSave() {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, this.saveDelayMs);
    this.saveTimer.unref?.();
  }

  _accountRecord(account) {
    const data = this._load();
    let record = data.accounts[account.key];
    if (!record) {
      record = { ...account, segments: [] };
      data.accounts[account.key] = record;
    } else {
      record.accountId = account.accountId || record.accountId || '';
      record.userId = account.userId || record.userId || '';
      record.username = account.username || record.username || 'Roblox account';
      record.avatarUrl = account.avatarUrl || record.avatarUrl || '';
      if (!Array.isArray(record.segments)) record.segments = [];
    }
    return record;
  }

  _rememberExperience(experience) {
    if (!experience?.key) return;
    const data = this._load();
    const previous = data.experiences[experience.key] || {};
    data.experiences[experience.key] = {
      key: experience.key,
      universeId: experience.universeId || previous.universeId || '',
      placeId: experience.placeId || previous.placeId || '',
      name: experience.name || previous.name || 'Roblox experience',
      iconUrl: previous.iconUrl || ''
    };
  }

  _append(account, experience, start, end) {
    const from = Math.max(0, Math.floor(Number(start) || 0));
    const to = Math.max(from, Math.floor(Number(end) || 0));
    if (!account || to - from < MIN_SEGMENT_MS) return;
    const record = this._accountRecord(account);
    this._rememberExperience(experience);
    const experienceKey = experience?.key || '';
    const last = record.segments[record.segments.length - 1];
    const mergeGap = account.unassigned ? 0 : MERGE_GAP_MS;
    if (last && last.experienceKey === experienceKey && from >= last.end && from - last.end <= mergeGap) {
      last.end = to;
    } else {
      record.segments.push({ start: from, end: to, experienceKey });
    }
    this.data.updatedAt = to;
    this._scheduleSave();
  }

  update(sessions = [], at = Date.now()) {
    const now = Math.max(0, Math.floor(Number(at) || Date.now()));
    const active = new Map();
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const account = accountFromSession(session);
      if (!account || active.has(account.key)) continue;
      active.set(account.key, { account, experience: experienceFromSession(session) });
    }

    for (const [key, previous] of this.live) {
      this._append(previous.account, previous.experience, previous.observedAt, now);
      if (!active.has(key)) this.live.delete(key);
    }
    for (const session of Array.isArray(sessions) ? sessions : []) {
      if (session.unassigned || !session.userId) continue;
      const account = accountFromSession(session);
      if (!account) continue;
      for (const id of session.unlinkedIds || []) {
        this._linkObservedTime(`account:${id}`, account, session.unlinkedSince);
      }
    }
    for (const [key, current] of active) {
      if (!current.account.unassigned) this._accountRecord(current.account);
      this._rememberExperience(current.experience);
      this.live.set(key, { ...current, observedAt: now });
    }
    return active.size;
  }

  _linkObservedTime(key, account, since = 0) {
    const data = this._load();
    const unlinked = data.accounts[key];
    if (!unlinked?.unassigned || !unlinked.segments.some(segment => segment.end > since)) return;
    const linked = this._accountRecord(account);
    const existing = linked.segments.slice().sort((a, b) => a.start - b.start);
    const remaining = [];
    let firstOverlap = 0;
    for (const segment of unlinked.segments) {
      if (segment.start < since) remaining.push({ ...segment, end: Math.min(segment.end, since) });
      let start = Math.max(segment.start, since);
      if (start >= segment.end) continue;
      while (firstOverlap < existing.length && existing[firstOverlap].end <= start) firstOverlap++;
      // A second client of the same account can overlap the unlinked time.
      // Preserve existing account history and move only the uncovered intervals.
      for (let i = firstOverlap; i < existing.length && existing[i].start < segment.end; i++) {
        const overlap = existing[i];
        const end = Math.min(overlap.start, segment.end);
        if (end > start) linked.segments.push({ ...segment, start, end });
        start = Math.max(start, overlap.end);
        if (start >= segment.end) break;
      }
      if (start < segment.end) linked.segments.push({ ...segment, start });
    }
    linked.segments.sort((a, b) => a.start - b.start);
    if (remaining.length) unlinked.segments = remaining;
    else delete data.accounts[key];
    this._scheduleSave();
  }

  setExperienceDetails(details = []) {
    const data = this._load();
    let changed = false;
    for (const item of Array.isArray(details) ? details : []) {
      const universeId = numericId(item.universeId);
      const placeId = numericId(item.placeId || item.rootPlaceId);
      const key = cleanText(item.key) || (universeId ? `universe:${universeId}` : (placeId ? `place:${placeId}` : ''));
      if (!key || !data.experiences[key]) continue;
      const record = data.experiences[key];
      const nextName = cleanText(item.name);
      const nextIcon = cleanText(item.iconUrl);
      if (nextName && nextName !== record.name) { record.name = nextName; changed = true; }
      if (nextIcon && nextIcon !== record.iconUrl) { record.iconUrl = nextIcon; changed = true; }
      if (universeId && !record.universeId) { record.universeId = universeId; changed = true; }
      if (placeId && !record.placeId) { record.placeId = placeId; changed = true; }
    }
    if (changed) this._scheduleSave();
    return changed;
  }

  getExperienceRecords() {
    return Object.values(this._load().experiences).map(item => ({ ...item }));
  }

  getStats(range = {}) {
    const data = this._load();
    const to = Math.max(0, Math.floor(Number(range.to) || Date.now()));
    const requestedFrom = Number(range.from);
    const from = Number.isFinite(requestedFrom) && requestedFrom >= 0 ? Math.min(requestedFrom, to) : 0;
    const accountTotals = new Map();
    const experienceTotals = new Map();
    const firstPlayed = new Map();
    let totalMs = 0;

    for (const [accountKey, record] of Object.entries(data.accounts)) {
      const reportKey = record.unassigned ? UNLINKED_KEY : accountKey;
      let accountTotal = 0;
      const accountExperiences = new Map();
      for (const segment of Array.isArray(record.segments) ? record.segments : []) {
        const observedStart = Number(segment.start), observedEnd = Number(segment.end);
        // First played is lifetime history, independent of the selected range.
        if (segment.experienceKey && Number.isFinite(observedStart) && observedStart >= 0 && observedStart <= 8640000000000000 && Number.isFinite(observedEnd) && observedEnd > observedStart) {
          const previous = firstPlayed.get(segment.experienceKey);
          if (previous === undefined || observedStart < previous) firstPlayed.set(segment.experienceKey, observedStart);
        }
        const start = Math.max(from, Number(segment.start) || 0);
        const end = Math.min(to, Number(segment.end) || 0);
        const duration = Math.max(0, end - start);
        if (!duration) continue;
        accountTotal += duration;
        if (!segment.experienceKey) continue;
        accountExperiences.set(segment.experienceKey, (accountExperiences.get(segment.experienceKey) || 0) + duration);
        let experience = experienceTotals.get(segment.experienceKey);
        if (!experience) {
          experience = { totalMs: 0, accounts: new Map() };
          experienceTotals.set(segment.experienceKey, experience);
        }
        experience.totalMs += duration;
        experience.accounts.set(reportKey, (experience.accounts.get(reportKey) || 0) + duration);
      }
      if (!accountTotal) continue;
      totalMs += accountTotal;
      let rollup = accountTotals.get(reportKey);
      if (!rollup) accountTotals.set(reportKey, rollup = {
        key: reportKey,
        accountId: record.unassigned ? 'unlinked' : record.accountId || '',
        userId: record.userId || '',
        username: record.username || 'Roblox account',
        avatarUrl: record.avatarUrl || '',
        ...(record.unassigned ? { unassigned: true } : {}),
        totalMs: 0,
        games: new Map()
      });
      rollup.totalMs += accountTotal;
      for (const [key, duration] of accountExperiences) rollup.games.set(key, (rollup.games.get(key) || 0) + duration);
    }

    const accounts = [...accountTotals.values()].map(({ games, ...account }) => ({
      ...account,
      experiences: [...games].map(([key, duration]) => ({
        ...(data.experiences[key] || { key, name: 'Roblox experience' }), key, totalMs: duration
      })).sort((a, b) => b.totalMs - a.totalMs)
    }));
    accounts.sort((a, b) => b.totalMs - a.totalMs || a.username.localeCompare(b.username));
    const accountByKey = new Map(accounts.map(account => [account.key, account]));
    const experiences = [...experienceTotals.entries()].map(([key, total]) => ({
      ...(data.experiences[key] || { key, name: 'Roblox experience' }),
      key,
      totalMs: total.totalMs,
      accounts: [...total.accounts.entries()].map(([accountKey, duration]) => {
        const account = accountByKey.get(accountKey) || data.accounts[accountKey] || {};
        return {
          key: accountKey,
          accountId: account.accountId || '',
          userId: account.userId || '',
          username: account.username || 'Roblox account',
          avatarUrl: account.avatarUrl || '',
          totalMs: duration
        };
      }).sort((a, b) => b.totalMs - a.totalMs)
    })).sort((a, b) => b.totalMs - a.totalMs || String(a.name).localeCompare(String(b.name)));

    return {
      from,
      to,
      createdAt: data.createdAt,
      firstPlayedGames: [...firstPlayed].map(([key,stamp])=>({key,universeId:data.experiences[key]?.universeId||'',placeId:data.experiences[key]?.placeId||'',firstPlayedAt:new Date(stamp).toISOString()})),
      totalMs,
      accountCount: accounts.filter(account => !account.unassigned).length,
      experienceCount: experiences.length,
      accounts,
      experiences
    };
  }

  save() {
    if (!this.dirty || !this.filePath) return false;
    const data = this._load();
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(data), 'utf8');
      if (fs.existsSync(this.filePath)) {
        try { fs.copyFileSync(this.filePath, `${this.filePath}.backup`); } catch {}
      }
      fs.copyFileSync(temporary, this.filePath);
      try { fs.unlinkSync(temporary); } catch {}
      this.dirty = false;
      return true;
    } catch (err) {
      this.logger.warn?.('[time] Could not save playtime:', err.message);
      return false;
    }
  }

  stop(at = Date.now()) {
    const now = Math.max(0, Math.floor(Number(at) || Date.now()));
    for (const previous of this.live.values()) {
      this._append(previous.account, previous.experience, previous.observedAt, now);
    }
    this.live.clear();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.save();
  }
}

module.exports = {
  PlaytimeStore,
  accountFromSession,
  experienceFromSession
};
