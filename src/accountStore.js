// accountStore.js
//
// Stores Roblox account info (display name, user id, avatar url, and the
// .ROBLOSECURITY cookie) on disk. The cookie itself is encrypted using
// Electron's `safeStorage` API, which on Windows uses DPAPI tied to the
// current Windows user account. This means the encrypted file is useless
// if copied to another PC or another Windows user profile - it can only be
// decrypted on this machine, by you.
//
// Nothing in this file ever sends data anywhere over the network.

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const { writeTextAtomic } = require('./atomicFile');
const { randomUUID } = require('crypto');

const DEFAULT_FAST_FLAG_PRESET = 'max';
const DEFAULT_FPS_CAP = 60;
const MAX_FPS_CAP = 2147483647;

function getStorePath() {
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'accounts.json');
}

function parseAccounts(text) {
  const accounts = JSON.parse(text);
  if (!Array.isArray(accounts) || accounts.some(account =>
    !account || typeof account !== 'object' || Array.isArray(account) ||
    typeof account.id !== 'string' || !account.id.trim())) {
    throw new Error('Invalid saved account records.');
  }
  return accounts;
}

function loadRaw() {
  const file = getStorePath();
  const backup = path.join(path.dirname(file), 'accounts.backup.json');
  if (!fs.existsSync(file) && !fs.existsSync(backup)) return [];
  try { return parseAccounts(fs.readFileSync(file, 'utf8')); } catch {}
  try {
    const text = fs.readFileSync(backup, 'utf8');
    const accounts = parseAccounts(text);
    // Preserve the damaged original for recovery before replacing it. Never
    // rotate a damaged primary over the last readable backup.
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(path.dirname(file), `accounts.corrupt-${Date.now()}-${randomUUID()}.json`));
    }
    writeTextAtomic(file, text);
    return accounts;
  } catch {
    const error = new Error('Saved account data could not be read or recovered. Your account files have been preserved; check the app data folder and its accounts.backup.json file.');
    error.code = 'ACCOUNT_STORE_UNREADABLE';
    throw error;
  }
}

function saveRaw(accounts, protectedAccountId) {
  const file = getStorePath();
  const text = JSON.stringify(accounts, null, 2);
  parseAccounts(text);
  if (fs.existsSync(file)) {
    const previous = fs.readFileSync(file, 'utf8');
    const previousAccounts = parseAccounts(previous);
    // Credential writes must not rotate an old plaintext login into the backup.
    // Preserve the previous card/settings, but retain its newly protected login.
    const protectedAccount = protectedAccountId && accounts.find(account => account.id === protectedAccountId);
    const previousAccount = protectedAccount && previousAccounts.find(account => account.id === protectedAccountId);
    if (previousAccount && protectedAccount.encrypted) {
      previousAccount.cookieEnc = protectedAccount.cookieEnc;
      previousAccount.encrypted = true;
    }
    writeTextAtomic(path.join(path.dirname(file), 'accounts.backup.json'), previousAccount ? JSON.stringify(previousAccounts, null, 2) : previous);
  }
  writeTextAtomic(file, text);
}

/**
 * Returns the list of stored accounts WITHOUT decrypting cookies.
 * Safe to send to the renderer for display purposes.
 */
function normalizeGraphicsQuality(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, n));
}

function normalizeFpsCap(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_FPS_CAP;
  return Math.min(MAX_FPS_CAP, Math.max(1, n));
}

function normalizeVolume(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(0, n));
}

function normalizeFastFlagPreset(value) {
  const rawPreset = String(value || DEFAULT_FAST_FLAG_PRESET).trim();
  if (/^custom:[a-z0-9_-]{6,64}$/i.test(rawPreset)) return rawPreset;
  const preset = rawPreset.toLowerCase();
  if (preset === 'off' || preset === 'balanced' || preset === 'max') return preset;
  return DEFAULT_FAST_FLAG_PRESET;
}

function listAccounts() {
  return loadRaw().slice().sort((a,b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (pinDiff) return pinDiff;
    const ao = Number((a.pinned ? a.pinnedOrder : a.order) ?? 0) || 0;
    const bo = Number((b.pinned ? b.pinnedOrder : b.order) ?? 0) || 0;
    if (ao !== bo) return ao - bo;
    return String(a.addedAt || '').localeCompare(String(b.addedAt || ''));
  }).map(acc => ({
    id: acc.id,
    username: acc.username,
    userId: acc.userId,
    avatarUrl: acc.avatarUrl || null,
    fpsCap: normalizeFpsCap(acc.fpsCap),
    graphicsQuality: normalizeGraphicsQuality(acc.graphicsQuality ?? 1),
    volume: normalizeVolume(acc.volume ?? 1),
    fastFlagPreset: normalizeFastFlagPreset(acc.fastFlagPreset ?? DEFAULT_FAST_FLAG_PRESET),
    pinned: !!acc.pinned,
    order: Number(acc.order ?? 0) || 0,
    addedAt: acc.addedAt
  }));
}

/**
 * Adds a new account. `cookie` is the raw .ROBLOSECURITY cookie value.
 * It is encrypted before being written to disk.
 */
function addAccount({ id, username, userId, avatarUrl, cookie, fpsCap, graphicsQuality, volume, fastFlagPreset, preserveId = false }) {
  const encrypted = encryptCookie(cookie);
  const accounts = loadRaw();
  const existing = accounts.find(a => a.userId === userId || (id && a.id === id));

  const entry = {
    id: preserveId && existing?.id ? existing.id : (existing?.id || `${userId}-${Date.now()}`),
    username,
    userId,
    avatarUrl: avatarUrl || existing?.avatarUrl || null,
    cookieEnc: encrypted,
    encrypted: true,
    fpsCap: normalizeFpsCap(fpsCap ?? existing?.fpsCap ?? DEFAULT_FPS_CAP),
    graphicsQuality: normalizeGraphicsQuality(graphicsQuality ?? existing?.graphicsQuality ?? 1),
    volume: normalizeVolume(volume ?? existing?.volume ?? 1),
    fastFlagPreset: normalizeFastFlagPreset(fastFlagPreset ?? existing?.fastFlagPreset ?? DEFAULT_FAST_FLAG_PRESET),
    pinned: !!existing?.pinned,
    order: Number(existing?.order ?? accounts.length) || accounts.length,
    pinnedOrder: Number(existing?.pinnedOrder ?? 0) || 0,
    originalOrder: existing?.originalOrder,
    addedAt: existing?.addedAt || new Date().toISOString(),
    refreshedAt: new Date().toISOString()
  };

  // Replace existing entry for the same userId/id, but preserve the same card id
  // during Refresh so selected accounts, pin order, drag order, and per-account
  // settings do not break after re-login.
  const filtered = accounts.filter(a => a.userId !== userId && (!id || a.id !== id));
  filtered.push(entry);
  saveRaw(filtered, entry.id);
  return { id: entry.id, username, userId, avatarUrl: entry.avatarUrl, fpsCap: entry.fpsCap, graphicsQuality: entry.graphicsQuality, volume: entry.volume, fastFlagPreset: entry.fastFlagPreset, pinned: entry.pinned, order: entry.order };
}
function removeAccount(id) {
  const accounts = loadRaw().filter(a => a.id !== id);
  saveRaw(accounts);
}

function setFpsCap(id, fpsCap) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.fpsCap = normalizeFpsCap(fpsCap);
    saveRaw(accounts);
  }
}

function setCookie(id, cookie) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (!acc) throw new Error('Account not found');
  if (!looksLikeRobloxCookie(cookie)) throw new Error('Roblox returned an unreadable login cookie.');
  acc.cookieEnc = encryptCookie(cookie);
  acc.encrypted = true;
  acc.refreshedAt = new Date().toISOString();
  saveRaw(accounts, acc.id);
  return true;
}

function setLaunchSettings(id, settings = {}) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (!acc) throw new Error('Account not found');
  if (Object.prototype.hasOwnProperty.call(settings, 'fpsCap')) acc.fpsCap = normalizeFpsCap(settings.fpsCap);
  if (Object.prototype.hasOwnProperty.call(settings, 'graphicsQuality')) acc.graphicsQuality = normalizeGraphicsQuality(settings.graphicsQuality);
  if (Object.prototype.hasOwnProperty.call(settings, 'volume')) acc.volume = normalizeVolume(settings.volume);
  if (Object.prototype.hasOwnProperty.call(settings, 'fastFlagPreset')) acc.fastFlagPreset = normalizeFastFlagPreset(settings.fastFlagPreset);
  saveRaw(accounts);
  return {
    fpsCap: acc.fpsCap,
    graphicsQuality: acc.graphicsQuality,
    volume: acc.volume,
    fastFlagPreset: acc.fastFlagPreset
  };
}

function setGraphicsQuality(id, graphicsQuality) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.graphicsQuality = normalizeGraphicsQuality(graphicsQuality);
    saveRaw(accounts);
  }
}

function setVolume(id, volume) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.volume = normalizeVolume(volume);
    saveRaw(accounts);
  }
}

function setAvatarUrl(id, avatarUrl) {
  const cleanUrl = String(avatarUrl || '').trim();
  if (!cleanUrl) return false;
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return false;
  acc.avatarUrl = cleanUrl;
  acc.avatarRefreshedAt = new Date().toISOString();
  saveRaw(accounts);
  return true;
}


function setPinned(id, pinned) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    const nextPinned = !!pinned;
    if (nextPinned && !acc.pinned) {
      acc.originalOrder = Number(acc.order ?? 0) || 0;
      const pinnedOrders = accounts.filter(a => a.pinned).map(a => Number(a.pinnedOrder ?? 0) || 0);
      const minPinned = pinnedOrders.length ? Math.min(...pinnedOrders) : 0;
      acc.pinnedOrder = minPinned - 1; // newest pin goes straight to the top
      acc.pinned = true;
    } else if (!nextPinned && acc.pinned) {
      acc.pinned = false;
      if (acc.originalOrder !== undefined && acc.originalOrder !== null) {
        acc.order = Number(acc.originalOrder) || 0;
      }
      delete acc.originalOrder;
      delete acc.pinnedOrder;
    }
    saveRaw(accounts);
  }
}

function setAccountOrder(ids) {
  const accounts = loadRaw();
  const pos = new Map((Array.isArray(ids) ? ids : []).map((id, index) => [String(id), index]));
  for (const acc of accounts) {
    if (!pos.has(String(acc.id))) continue;
    if (acc.pinned) acc.pinnedOrder = pos.get(String(acc.id));
    else acc.order = pos.get(String(acc.id));
  }
  saveRaw(accounts);
}

function setFastFlagPreset(id, fastFlagPreset) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.fastFlagPreset = normalizeFastFlagPreset(fastFlagPreset);
    saveRaw(accounts);
  }
}

function replaceFastFlagPresetReferences(presetId, replacement = 'off') {
  const accounts = loadRaw();
  let changed = 0;
  for (const acc of accounts) {
    if (String(acc.fastFlagPreset || '') !== String(presetId || '')) continue;
    acc.fastFlagPreset = normalizeFastFlagPreset(replacement);
    changed++;
  }
  if (changed) saveRaw(accounts);
  return changed;
}

/**
 * Decrypts and returns the raw cookie for a given account id.
 * Only called from main process code right before launching Roblox.
 */
function looksLikeRobloxCookie(value) {
  // Roblox began rotating and changing the cookie's opaque format in 2026, so
  // the old human-readable WARNING prefix is no longer a reliable validity
  // check. Reject empty/header-injection values here; Roblox API verification is
  // the authority on whether the token is actually a valid account session.
  const cookie = typeof value === 'string' ? value.trim() : '';
  return cookie.length >= 20 && !/[;\r\n]/.test(cookie);
}

function requireCookieEncryption() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows login encryption is temporarily unavailable. Seal did not save or use an unprotected login. Try again when Windows encryption is available.');
  }
}

function encryptCookie(cookie) {
  requireCookieEncryption();
  return safeStorage.encryptString(cookie).toString('base64');
}

function getCookie(id) {
  const accounts = loadRaw();
  const acc = accounts.find(a => a.id === id);
  if (!acc) throw new Error('Account not found');
  requireCookieEncryption();

  const rawBuffer = Buffer.from(acc.cookieEnc || '', 'base64');

  // Normal path: Electron safeStorage / Windows DPAPI.
  if (acc.encrypted) {
    try {
      return safeStorage.decryptString(rawBuffer);
    } catch (err) {
      // Some older builds mislabeled plaintext base64 as encrypted. Accept only
      // valid UTF-8 (never lossy decoding of DPAPI bytes) for legacy recovery.
      let fallback = '';
      try { fallback = new TextDecoder('utf-8', { fatal: true }).decode(rawBuffer); } catch {}
      if (looksLikeRobloxCookie(fallback)) return protectLegacyCookie(fallback);
      throw new Error('This saved login cannot be decrypted on this Windows profile. Click Refresh on this account and sign in again.');
    }
  }

  const cookie = rawBuffer.toString('utf-8');
  if (!looksLikeRobloxCookie(cookie)) {
    throw new Error('This saved login is damaged or unreadable. Click Refresh on this account and sign in again.');
  }

  return protectLegacyCookie(cookie);

  function protectLegacyCookie(cookie) {
    acc.cookieEnc = encryptCookie(cookie);
    acc.encrypted = true;
    // A failed encryption or disk write must stop launch, rather than silently
    // returning a legacy credential that has not actually been protected.
    saveRaw(accounts, acc.id);
    return cookie;
  }
}

module.exports = {
  updateProfiles(profiles) {
    const accounts = loadRaw();
    let changed = false;
    const byId = new Map(profiles.map(profile => [String(profile.id), profile.name]));
    for (const account of accounts) {
      const name = byId.get(String(account.userId));
      if (typeof name === 'string' && name.trim() && account.username !== name) { account.username = name; changed = true; }
    }
    if (changed) saveRaw(accounts);
    return changed;
  },
  listAccounts,
  addAccount,
  removeAccount,
  setCookie,
  setFpsCap,
  setLaunchSettings,
  setGraphicsQuality,
  setVolume,
  setAvatarUrl,
  setFastFlagPreset,
  replaceFastFlagPresetReferences,
  setPinned,
  setAccountOrder,
  getCookie
};
