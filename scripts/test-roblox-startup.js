const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { syncRobloxStartup } = require('../src/robloxStartup');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-roblox-startup-'));
const versionsDirectory = path.join(root, 'Roblox', 'Versions');
const startupRoot = path.join(root, 'Startup');
const player = path.join(versionsDirectory, 'version-abcd', 'RobloxPlayerBeta.exe');
const executable = path.join(startupRoot, '1.33.39-abcdef0123456789', 'Seal-Account-Manager.exe');
const next = path.join(startupRoot, '1.33.40-abcdef0123456789', 'Seal-Account-Manager.exe');
const backupFile = path.join(root, 'userdata', 'stock-startup.json');
const stock = `"${player}" --launch-to-tray`;
let entry = '';
const read = () => entry;
const write = value => { entry = value; };
const base = { executable, startupRoot, versionsDirectory, backupFile, player, read, write };

try {
  fs.mkdirSync(path.dirname(player), { recursive: true });
  fs.writeFileSync(player, 'fixture');
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), false, 'do not enable an absent Roblox startup entry');
  entry = `"${player}" --custom`;
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), false, 'leave a custom entry alone');
  entry = stock;
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), true);
  assert.equal(entry, `"${executable}" --background --roblox-startup`);
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), false);
  assert.equal(syncRobloxStartup({ ...base, executable: next, enabled: true }), true, 'upgrade a prior SAM route');
  assert.equal(entry, `"${next}" --background --roblox-startup`);
  assert.equal(syncRobloxStartup({ ...base, executable: next, enabled: false }), true);
  assert.equal(entry, stock, 'disabling SAM restores the exact stock command');
  entry = stock;
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), true, 'repair if Roblox re-registers the enabled stock entry');
  entry = '';
  assert.equal(syncRobloxStartup({ ...base, enabled: true }), false, 'respect Roblox removing its own startup entry');
  console.log('PASS: safe startup routing, version upgrade, exact restore, repair and disabled/custom preference preservation.');
} finally {
  assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
  assert(path.basename(root).startsWith('seal-roblox-startup-'));
  fs.rmSync(root, { recursive: true, force: true });
}
