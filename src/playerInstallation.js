const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
let cachedVersion = '', checkedAt = 0;
function registeredVersion() {
  if (process.env.SEAL_TEST_ROBLOX_ROOT || process.platform !== 'win32') return '';
  if (Date.now() - checkedAt < 1000) return cachedVersion;
  checkedAt = Date.now();
  const result = spawnSync('reg.exe', ['query', 'HKCU\\Software\\ROBLOX Corporation\\Environments\\roblox-player', '/v', 'version'], { encoding: 'utf8', windowsHide: true, timeout: 2000 });
  cachedVersion = String(result.stdout || '').match(/\bversion\s+REG_SZ\s+(version-[a-f0-9]+)\s*(?:\r?\n|$)/i)?.[1] || '';
  return cachedVersion;
}
function selectPlayerFolder(root, version = registeredVersion()) {
  const versions = path.join(root, 'Versions');
  if (!fs.existsSync(versions)) return null;
  if (/^version-[a-f0-9]+$/i.test(version)) {
    const registered = path.join(versions, version);
    if (fs.existsSync(path.join(registered, 'RobloxPlayerBeta.exe'))) return registered;
  }
  // Settings/mod writes touch directories. Rank fallback installations by the
  // executable's timestamp, which those writes do not alter.
  return fs.readdirSync(versions).filter(name => /^version-/i.test(name)).map(name => {
    const folder = path.join(versions, name);
    try { const stat = fs.statSync(path.join(folder, 'RobloxPlayerBeta.exe')); return stat.isFile() ? { folder, time: stat.mtimeMs } : null; } catch { return null; }
  }).filter(Boolean).sort((a,b) => b.time-a.time)[0]?.folder || null;
}
module.exports = { selectPlayerFolder };
