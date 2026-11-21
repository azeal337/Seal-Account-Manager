const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { updateHomeShortcuts, HOME_ARGUMENTS } = require('../src/robloxShortcuts');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-roblox-shortcuts-'));
const desktop = path.join(root, 'desktop');
const programs = path.join(root, 'programs');
const versionsDirectory = path.join(root, 'roblox', 'Versions');
const startupRoot = path.join(root, 'startup');
const executable = path.join(startupRoot, '1.33.36-0123456789abcdef', 'Seal-Account-Manager.exe');
const nextExecutable = path.join(startupRoot, '1.33.37-0123456789abcdef', 'Seal-Account-Manager.exe');
const player = path.join(versionsDirectory, 'version-abcdef', 'RobloxPlayerBeta.exe');
const shortcut = path.join(programs, 'Roblox', 'Roblox Player.lnk');
const custom = path.join(desktop, 'Roblox.lnk');
const decoy = path.join(desktop, 'Roblox Player.lnk');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}
const shell = {
  readShortcutLink: read,
  writeShortcutLink(file, mode, data) {
    write(file, mode === 'update' ? { ...read(file), ...data } : data);
    return true;
  }
};
const options = { desktop, programs, versionsDirectory, startupRoot, executable, player, shell, backupDir: path.join(root, 'backups') };
async function testNativeShortcut() {
  const { app, shell: windowsShell } = require('electron');
  app.setPath('userData', path.join(process.env.SEAL_TEST_TMP_ROOT, 'roblox-shortcuts'));
  await app.whenReady();
  try {
    write(player, {});
    write(executable, {});
    fs.mkdirSync(path.dirname(shortcut), { recursive: true });
    assert.equal(windowsShell.writeShortcutLink(shortcut, 'create', { target: player, cwd: path.dirname(player) }), true);
    const original = fs.readFileSync(shortcut);
    const nativeOptions = { ...options, shell: windowsShell };
    assert.deepEqual(updateHomeShortcuts({ ...nativeOptions, enabled: true }), [shortcut]);
    assert.equal(path.resolve(windowsShell.readShortcutLink(shortcut).target), executable);
    assert.equal(windowsShell.readShortcutLink(shortcut).args, HOME_ARGUMENTS);
    assert.deepEqual(updateHomeShortcuts({ ...nativeOptions, enabled: false }), [shortcut]);
    assert.deepEqual(fs.readFileSync(shortcut), original);
    console.log('PASS: real Windows shortcut routes to SAM and restores byte-for-byte.');
  } finally {
    cleanup();
  }
  app.quit();
}

function cleanup() {
  assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
  assert(path.basename(root).startsWith('seal-roblox-shortcuts-'));
  fs.rmSync(root, { recursive: true, force: true });
}

if (process.versions.electron) {
  testNativeShortcut().catch(error => {
    console.error(error);
    require('electron').app.exit(1);
  });
} else {
try {
  write(player, {});
  write(shortcut, { target: player, args: '', description: 'Roblox Player' });
  write(custom, { target: player, args: 'custom-argument' });
  write(decoy, { target: path.join(root, 'OtherApp.exe'), args: '' });
  const original = fs.readFileSync(shortcut);
  assert.deepEqual(updateHomeShortcuts({ ...options, enabled: true }), [shortcut]);
  assert.equal(read(shortcut).args, HOME_ARGUMENTS);
  assert.equal(read(shortcut).target, executable);
  assert.equal(read(shortcut).icon, player);
  assert.equal(read(custom).args, 'custom-argument');
  assert.equal(read(decoy).target, path.join(root, 'OtherApp.exe'));
  assert.deepEqual(updateHomeShortcuts({ ...options, enabled: true }), []);
  assert.deepEqual(updateHomeShortcuts({ ...options, executable: nextExecutable, enabled: true }), [shortcut]);
  assert.equal(read(shortcut).target, nextExecutable);
  assert.deepEqual(updateHomeShortcuts({ ...options, executable: nextExecutable, enabled: false }), [shortcut]);
  assert.deepEqual(fs.readFileSync(shortcut), original);
  console.log('PASS: stock shortcut routing, idempotent startup repair, upgrade, exact restore and custom shortcut preservation.');
} finally {
  cleanup();
}
}
