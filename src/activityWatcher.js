const fs = require('fs');
const path = require('path');
const os = require('os');

const JOIN_PATTERN = /! Joining game '([0-9a-f-]{36})' place (\d+) at ([0-9.]+)/i;
const UDMUX_PATTERN = /UDMUX Address = ([0-9.]+), Port = \d+ \| RCC Server Address = ([0-9.]+), Port = \d+/i;
const UNIVERSE_PATTERN = /universeid:(\d+).*userid:(\d+)/i;
const REPLICATOR_PATTERN = /Replicator created:.*serverId:\s*([0-9.]+)\|\d+/i;
const ACCEPTED_PATTERN = /\[D?FLog::Network(?:Client)?\]\s+Connection accepted from\s+[0-9.]+\|\d+/i;
const SERVER_PATTERN = /\[FLog::Network\]\s+serverId:\s*([0-9.]+)\|\d+/i;
const CREATED_PATTERN = /\[FLog::Network\]\s+Replicator created:/i;
const DISCONNECT_PATTERN = /Time to disconnect replication data:|leaveUGCGameInternal/i;
const DESKTOP_AUTH_PATTERN = /\[FLog::SingleSurfaceApp\]\s+userDid(LogIn|LogOut)\s*$/i;
const activityCache = new Map();

function logsDirectory() {
  const localAppData = String(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'));
  return path.join(localAppData, 'Roblox', 'logs');
}

function playerLogs() {
  const directory = logsDirectory();
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const name of fs.readdirSync(directory)) {
    if (!/player.*\.log$/i.test(name) || /crashpad|installer/i.test(name)) continue;
    const fullPath = path.join(directory, name);
    try {
      const stat = fs.statSync(fullPath);
      files.push({ path: fullPath, createdAt: stat.birthtimeMs || stat.ctimeMs, modifiedAt: stat.mtimeMs, size: stat.size });
    } catch {}
  }
  return files.sort((a, b) => b.createdAt - a.createdAt);
}

function findLogForLaunch(startedAt, excluded = new Set()) {
  const started = Number(startedAt) || Date.now();
  const candidates = playerLogs().filter(file => !excluded.has(file.path) && Math.abs(file.createdAt - started) < 12000);
  candidates.sort((a, b) => Math.abs(a.createdAt - started) - Math.abs(b.createdAt - started));
  return candidates.find(file => isPlayerLog(file.path))?.path || '';
}

// The Windows starter and tray also produce files with "Player" in the name.
// Inspect the client startup log before associating it with a playing window.
function isPlayerLog(filePath) {
  try {
    const buffer = Buffer.alloc(32768);
    const fd = fs.openSync(filePath, 'r');
    let read;
    try { read = fs.readSync(fd, buffer, 0, buffer.length, 0); }
    finally { fs.closeSync(fd); }
    return /\[FLog::(?:SingleSurfaceApp|SurfaceController|UgcExperienceController|GameJoinLoadTime)\]|! Joining game '/i.test(buffer.toString('utf8', 0, read));
  } catch { return false; }
}

function readTail(filePath, maxBytes = 1024 * 1024) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  const length = Math.min(stat.size, maxBytes);
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try { fs.readSync(fd, buffer, 0, length, Math.max(0, stat.size - length)); }
  finally { fs.closeSync(fd); }
  return buffer.toString('utf8');
}

function timestampFromLine(line) {
  const match = String(line || '').match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);
  const timestamp = match ? Date.parse(match[1]) : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseActivity(filePath) {
  let stat;
  try { stat = fs.statSync(filePath); } catch { return null; }
  const cached = activityCache.get(filePath);
  if (cached && cached.size === stat.size && cached.modifiedAt === stat.mtimeMs) return cached.value;
  const text = readTail(filePath);
  if (!text) return null;
  // Long-running games can push the original handshake out of the 1MB tail.
  // Preserve confirmed state only for the same growing file, never a new log.
  const continuation = cached && cached.birthtime === stat.birthtimeMs && stat.size >= cached.size && stat.size > 1024 * 1024;
  let current = continuation && cached.value ? { ...cached.value } : null;
  let connectionAccepted = continuation && !!cached.connectionAccepted;
  let serverIdentified = continuation && !!cached.serverIdentified;
  let replicatorCreated = continuation && !!cached.replicatorCreated;
  let desktopSignedInAt = continuation ? cached.desktopSignedInAt : null;
  for (const line of text.split(/\r?\n/)) {
    const auth = line.match(DESKTOP_AUTH_PATTERN);
    if (auth) {
      desktopSignedInAt = auth[1].toLowerCase() === 'login' ? timestampFromLine(line) : null;
      if (!desktopSignedInAt && current) current.disconnected = true;
    }
    const join = line.match(JOIN_PATTERN);
    if (join) {
      connectionAccepted = serverIdentified = replicatorCreated = false;
      current = {
        jobId: join[1],
        placeId: join[2],
        machineAddress: join[3],
        joinedAt: timestampFromLine(line),
        confirmed: false,
        disconnected: false,
        logFile: filePath
      };
      continue;
    }
    if (!current) continue;
    const universe = line.match(UNIVERSE_PATTERN);
    if (universe) {
      current.universeId = universe[1];
      current.userId = universe[2];
    }
    const udmux = line.match(UDMUX_PATTERN);
    if (udmux) current.machineAddress = udmux[1];
    if (ACCEPTED_PATTERN.test(line)) connectionAccepted = true;
    if (SERVER_PATTERN.test(line)) serverIdentified = true;
    if (CREATED_PATTERN.test(line)) replicatorCreated = true;
    if (REPLICATOR_PATTERN.test(line) || (connectionAccepted && serverIdentified && replicatorCreated)) {
      current.confirmed = true;
      current.joinedAt = current.joinedAt || timestampFromLine(line);
    }
    if (DISCONNECT_PATTERN.test(line)) {
      current.disconnected = true;
      current.leftAt = timestampFromLine(line) || Date.now();
    }
  }
  const value = current ? { ...current, desktopSignedInAt } : (desktopSignedInAt ? { desktopSignedInAt } : null);
  activityCache.set(filePath, { size: stat.size, modifiedAt: stat.mtimeMs, birthtime: stat.birthtimeMs, connectionAccepted, serverIdentified, replicatorCreated, desktopSignedInAt, value });
  return value;
}

module.exports = {
  logsDirectory,
  playerLogs,
  isPlayerLog,
  findLogForLaunch,
  parseActivity,
  patterns: { JOIN_PATTERN, UDMUX_PATTERN, UNIVERSE_PATTERN, REPLICATOR_PATTERN, DISCONNECT_PATTERN }
};
