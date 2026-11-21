const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { writeTextAtomic } = require('./atomicFile');

const KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VALUE = 'RobloxPlayerBeta';
const TRAY_ARGS = '--launch-to-tray';
const SEAL_ARGS = '--background --roblox-startup';

function readRunEntry() {
  const result = spawnSync('reg.exe', ['query', KEY, '/v', VALUE], { windowsHide: true, encoding: 'utf8' });
  return result.status === 0
    ? result.stdout.match(/^\s*RobloxPlayerBeta\s+REG_SZ\s+(.+?)\s*$/im)?.[1] || ''
    : '';
}

function writeRunEntry(command) {
  const result = spawnSync('reg.exe', ['add', KEY, '/v', VALUE, '/t', 'REG_SZ', '/d', command, '/f'],
    { windowsHide: true, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('Windows did not accept the Roblox startup command.');
}

function splitCommand(command) {
  const match = String(command || '').trim().match(/^(?:"([^"]+)"|(\S+))\s+(.+)$/);
  return match ? { target: path.resolve(match[1] || match[2]), args: match[3] } : null;
}

function syncRobloxStartup({ executable, startupRoot, versionsDirectory, backupFile, enabled, player, read = readRunEntry, write = writeRunEntry }) {
  const current = read();
  const parts = splitCommand(current);
  if (!parts) return false;
  const installedPlayer = target => /^version-[a-f0-9]+[\\/]robloxplayerbeta\.exe$/i.test(path.relative(versionsDirectory, target));
  const stock = parts.args === TRAY_ARGS && installedPlayer(parts.target);
  const route = parts.args === SEAL_ARGS && (
    parts.target.toLowerCase() === path.resolve(executable).toLowerCase() ||
    /^\d+\.\d+\.\d+-[a-f0-9]{16}[\\/]seal-account-manager\.exe$/i.test(path.relative(startupRoot, parts.target))
  );
  if (enabled) {
    const command = `"${executable}" ${SEAL_ARGS}`;
    if ((!stock && !route) || current === command || command.length > 260) return false;
    if (stock) writeTextAtomic(backupFile, JSON.stringify({ command: current }));
    if (read() !== current) return false;
    write(command);
    return true;
  }
  if (!route) return false;
  let original = '';
  try { original = JSON.parse(fs.readFileSync(backupFile, 'utf8')).command || ''; } catch {}
  const saved = splitCommand(original);
  const restore = saved && saved.args === TRAY_ARGS && installedPlayer(saved.target) && fs.existsSync(saved.target)
    ? original
    : player && installedPlayer(player) && fs.existsSync(player) ? `"${player}" ${TRAY_ARGS}` : '';
  if (!restore || read() !== current) return false;
  write(restore);
  return true;
}

module.exports = { syncRobloxStartup };
