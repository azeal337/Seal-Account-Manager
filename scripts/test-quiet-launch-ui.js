const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app, BrowserWindow } = require('electron');
const temporary = path.join(process.env.SEAL_TEST_TMP_ROOT, 'quiet-launch');
fs.mkdirSync(temporary, { recursive: true });
app.setPath('userData', path.join(temporary, 'userdata'));
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temporary, 'Roblox');
const version = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'Versions', 'version-fixture');
fs.mkdirSync(version, { recursive: true });
fs.writeFileSync(path.join(version, 'RobloxPlayerBeta.exe'), 'fixture');
const initialUri = 'roblox-player:1+launchmode:play+gameinfo:fixture-cold';
process.argv.push('--seal-launch-test', '--seal-background-test', '--seal-single-instance-test', initialUri);
const quit = app.quit.bind(app);
app.quit = () => {};
let loginWrites = 0, protocolWrites = 0;
app.setLoginItemSettings = () => { loginWrites++; throw Error('Test must not register startup'); };
app.setAsDefaultProtocolClient = () => { protocolWrites++; throw Error('Test must not register protocols'); };
let mode;
const background = require('../src/backgroundMode'), factory = background.createBackgroundMode;
background.createBackgroundMode = options => (mode = factory(options));
const launcher = require('../src/launcher');
const processes = [], recovered = [], applied = [], uris = [];
let homeEvidence = [];
let desktopHomeLaunches = 0;
let trayLaunches = 0;
let accounts = [], authCalls = 0, nativeLaunches = 0;
let keepNativePids = false, dropOnNextWebsite = false;
const started = Date.now() - 1000;
launcher.getRobloxPidSnapshot = async ({ expectedPids = [] } = {}) => {
  const pids = processes.map(row => row.pid);
  return { pids, reliable: true, confirmedMissingPids: expectedPids.filter(pid => !pids.includes(pid)) };
};
launcher.listRobloxPids = async () => processes.map(row => row.pid);
launcher.applyPerformanceSettings = settings => { applied.push(settings); };
launcher.setVolume = () => {};
launcher.launchAccount = async (_ticket, _target, _multi, { beforePids = [] } = {}) => {
  nativeLaunches++;
  if (!keepNativePids) return { pids: [], beforePids };
  const pid = 4400 + nativeLaunches;
  processes.push({ pid, startedAt: Date.now(), window: true });
  return { pids: [pid], beforePids };
};
launcher.launchDesktopHome = async ({ tray, onSpawn } = {}) => {
  const beforePids = processes.map(row => row.pid);
  if (tray) {
    trayLaunches++;
    const spawnedAt = Date.now();
    processes.push({ pid: 3340, parentPid: process.pid, startedAt: spawnedAt + 1, window: false });
    const start = { beforePids, spawnedPid: 3340, spawnedAt };
    onSpawn?.(start);
    return { ...start, pids: [3340] };
  }
  desktopHomeLaunches++;
  const spawnedAt = Date.now();
  processes.push({ pid: 3334, parentPid: 3333, startedAt: spawnedAt + 1, window: true });
  const start = { beforePids, spawnedPid: 3333, spawnedAt };
  onSpawn?.(start);
  return { ...start, pids: [3334] };
};
launcher.launchRawUri = async (uri, { onSpawn } = {}) => {
  const beforePids = processes.map(row => row.pid);
  const spawnedAt = Date.now();
  uris.push(uri);
  if (uris.length === 2) {
    processes.push({ pid: 2222, startedAt: started, window: true });
    recovered.push({ accountId: accounts[1].id, userId: 222, pid: 2222, processStartedAt: started, startedAt: started, logFile: 'fixture.log' });
  } else if (uris.length >= 4) {
    if (dropOnNextWebsite) processes.shift();
    processes.push({ pid: 5500 + uris.length, startedAt: spawnedAt, window: true });
  }
  const pids = processes.filter(row => !beforePids.includes(row.pid)).map(row => row.pid);
  const start = { beforePids, spawnedPid: pids[0], spawnedAt };
  if (pids.length) onSpawn?.(start);
  return { ...start, pids };
};
require('../src/sessionRecovery').createRecovery = () => ({ scan: async () => processes, recover: () => [...recovered, ...homeEvidence], save: () => {} });
require('../src/activityWatcher').findLogForLaunch = () => '';
require('../src/activityWatcher').parseActivity = () => ({ confirmed: true, userId: 222, placeId: '99', universeId: '88' });
const api = require('../src/robloxApi');
api.getAuthTicket = async () => { authCalls++; return 'fixture-only'; };
api.getAvatarUrls = async () => ({});
api.getPresenceMany = async () => ({ 222: { inGame: true, placeId: 99, universeId: 88, lastLocation: 'Fixture game' } });
require('../src/robloxProgress').profiles = async () => [];
const mutex = require('../src/mutexHolder');
mutex.start = async () => ({ ok: true, active: true });
mutex.status = () => ({ active: true });
app.whenReady().then(() => {
  const store = require('../src/accountStore');
  accounts = [store.addAccount({ username: 'Profile A', userId: 111, cookie: 'fixture-a', fpsCap: 144, graphicsQuality: 6, volume: 4, fastFlagPreset: 'off' }), store.addAccount({ username: 'Logged-in B', userId: 222, cookie: 'fixture-b', fpsCap: 90, graphicsQuality: 3, volume: 2, fastFlagPreset: 'balanced' })];
});
const deadline = setTimeout(() => { console.error('Quiet launch UI test timeout'); app.exit(1); }, 22000);
let shown = 0;
app.on('browser-window-created', (_event, window) => {
  window.on('show', () => shown++);
  window.webContents.once('did-finish-load', async () => {
    const read = code => window.webContents.executeJavaScript(code);
    const wait = async check => { for (let i = 0; i < 200; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw Error('Quiet launch condition timed out'); };
    try {
      await wait(() => uris.length === 1);
      await wait(async () => await read("document.getElementById('appVersion').textContent") === `v${require('../package.json').displayVersion || app.getVersion()}`);
      assert.equal(uris[0], initialUri, 'cold protocol invocation reaches Roblox unchanged');
      assert(!window.isVisible()); assert.equal(shown, 0); assert(mode.status().trayReady);
      assert.equal(authCalls, 0, 'external login ticket is not replaced with a saved account login');
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-home']);
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-home']);
      const desktopSessions = () => read('window.api.listSessions({fast:true})');
      await wait(async () => (await desktopSessions()).some(row => row.pids.includes(3334) && row.startedBySeal));
      assert.equal(desktopHomeLaunches, 1);
      assert.equal(authCalls, 0, 'a desktop shortcut keeps the standard Roblox sign-in');
      assert(!window.isVisible());
      const preparation = await read('window.api.prepareLaunchMultiple()');
      assert.equal(preparation.ready, true, 'a routed Home client can be followed by another SAM account');
      processes.pop();
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-startup']);
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-startup']);
      await wait(() => trayLaunches === 1);
      assert.equal((await desktopSessions()).length, 0, 'tray-only launch does not become a tracked window');
      const fixtureClock = Date.now;
      try {
        Date.now = () => fixtureClock() + 50000;
        processes.push({ pid: 3341, parentPid: 3340, startedAt: Date.now(), window: true });
        await wait(async () => (await desktopSessions()).some(row => row.pids.includes(3341) && row.startedBySeal));
      } finally {
        Date.now = fixtureClock;
      }
      assert.equal(trayLaunches, 1, 'startup requests coalesce');
      assert.equal(authCalls, 0);
      assert(!window.isVisible());
      processes.splice(0);
      const home = { pid: 3333, startedAt: Date.now(), window: true };
      processes.push(home);
      const mainSessions = () => read('window.api.listSessions({fast:true})');
      const picker = await mainSessions();
      assert(picker.some(row => row.unassigned && row.pids.includes(home.pid)));
      const { matchSessions } = require('../src/sessionRecovery');
      homeEvidence = matchSessions([home], [], [{
        path: 'desktop-fixture.log', createdAt: home.startedAt, activity: { desktopSignedInAt: home.startedAt }
      }], accounts, { userId: '222', modifiedAt: home.startedAt + 1000 });
      const linkedHome = await mainSessions();
      assert(linkedHome.some(row => row.accountId === accounts[1].id && row.pids.includes(home.pid)), 'verified Home account replaces the unlinked window without clicks');
      assert(!linkedHome.some(row => row.unassigned && row.pids.includes(home.pid)));
      homeEvidence = [];
      assert((await mainSessions()).some(row => row.unassigned && row.pids.includes(home.pid)), 'sign-out drops the profile-only account binding');
      processes.pop();
      await read(`window.api.launch(${JSON.stringify(accounts[0].id)},{placeId:'99'})`);
      assert.equal(nativeLaunches, 1); assert.equal(authCalls, 1);
      assert.equal(applied.at(-1).fpsCap, 144); assert.equal(applied.at(-1).graphicsQuality, 6); assert.equal(applied.at(-1).volume, 4);
      assert.equal((await read('window.api.getLaunchPreferences()')).lastAccountId, accounts[0].id);
      const secondUri = 'roblox-player:1+launchmode:play+gameinfo:fixture-second';
      app.emit('second-instance', {}, ['Seal.exe', secondUri]);
      await wait(() => uris.length === 2);
      assert.equal(uris[1], secondUri); assert.equal(authCalls, 1);
      assert.equal(applied.at(-1).fpsCap, 144, 'external Play reapplies last saved SAM profile');
      let sessions;
      await wait(async () => { sessions = await read('window.api.listSessions()'); return sessions.some(row => row.accountId === accounts[1].id || row.id === accounts[1].id); });
      assert(sessions.some(row => row.accountId === accounts[1].id || row.id === accounts[1].id), 'tracking follows confirmed logged-in B, not selected settings A');
      await read(`window.api.saveLaunchPreferences(${JSON.stringify(accounts[1].id)})`);
      processes.splice(0);
      recovered.splice(0);
      app.emit('second-instance', {}, ['Seal.exe', '--background', 'roblox:fixture-third']);
      await wait(() => uris.length === 3);
      assert.equal(applied.at(-1).fpsCap, 90); assert.equal(applied.at(-1).fastFlagPreset, 'balanced');
      assert.equal(authCalls, 1);
      await wait(async () => await read(`document.getElementById('externalPlayProfile').options.length===3`));
      await read(`document.getElementById('launcherNavBtn')?.click()`);
      await wait(async () => await read(`document.getElementById('externalPlayProfile').value===${JSON.stringify(accounts[1].id)}`));
      await read(`document.getElementById('externalPlayProfile').value='last';document.getElementById('externalPlayProfile').dispatchEvent(new Event('change'))`);
      await wait(async () => (await read('window.api.getLaunchPreferences()')).profile === 'last');
      keepNativePids = true;
      await read(`window.api.launch(${JSON.stringify(accounts[0].id)},{placeId:'99'})`);
      await read(`window.api.launch(${JSON.stringify(accounts[1].id)},{placeId:'99'})`);
      const originalPids = processes.map(row => row.pid);
      assert.equal(originalPids.length, 2);
      const traces = () => JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'roblox-launch-trace.json'), 'utf8'));
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-home']);
      await wait(() => desktopHomeLaunches === 2 && traces().at(-1)?.route === 'home' && traces().at(-1)?.phase === 'checked');
      app.emit('second-instance', {}, ['Seal.exe', '--background', secondUri]);
      app.emit('second-instance', {}, ['Seal.exe', '--background', secondUri]);
      await wait(() => uris.length === 4 && traces().at(-1)?.route === 'website' && traces().at(-1)?.phase === 'checked');
      assert.deepEqual(processes.map(row => row.pid), [...originalPids, 3334, 5504]);
      assert.equal((await desktopSessions()).filter(row => row.pids.some(pid => originalPids.includes(pid))).length, 2);
      assert.deepEqual(traces().at(-1).confirmedMissing, []);
      assert(traces().some(row => row.route === 'home' && row.phase === 'coalesced'));
      assert(traces().some(row => row.route === 'website' && row.phase === 'coalesced'));

      dropOnNextWebsite = true;
      app.emit('second-instance', {}, ['Seal.exe', '--background', secondUri]);
      await wait(() => uris.length === 5 && traces().at(-1)?.phase === 'checked');
      assert.deepEqual(traces().at(-1).confirmedMissing, [originalPids[0]]);
      const afterExit = await desktopSessions();
      assert(afterExit.some(row => row.unassigned && row.pids.includes(5505)), 'routed website process is not assigned to the closed SAM session');
      const traceText = JSON.stringify(traces());
      assert(!traceText.includes('gameinfo') && !traceText.includes('fixture-second') && !traceText.includes('fixture-a'));
      app.emit('second-instance', {}, ['Seal.exe', '--background', '--roblox-startup']);
      await wait(() => traces().at(-1)?.route === 'startup-tray' && traces().at(-1)?.phase === 'skipped');
      assert.equal(trayLaunches, 1);
      dropOnNextWebsite = false;
      const handoffUri = 'roblox-player:1+launchmode:play+gameinfo:fixture-os-handoff';
      const secondary = spawn(process.execPath, [__filename, '--background', handoffUri], { windowsHide: true, stdio: 'ignore' });
      const exitCode = await new Promise((resolve, reject) => {
        secondary.once('error', reject);
        secondary.once('exit', resolve);
      });
      assert.equal(exitCode, 0, 'secondary exits after handing its request to the primary');
      await wait(() => uris.length === 6 && traces().at(-1)?.phase === 'checked');
      assert.equal(uris.at(-1), handoffUri);
      assert(traces().every(entry => entry.samPid === process.pid), 'only the primary Electron process handled launches');
      assert.equal(authCalls, 3, 'external Play never uses a saved account ticket');
      assert.equal(BrowserWindow.getAllWindows().length, 1, 'no launch splash is created');
      assert(!window.isVisible()); assert.equal(shown, 0, 'cold, SAM and second-instance Play never raise hidden manager');
      assert.equal(loginWrites, 0); assert.equal(protocolWrites, 0);
      console.log('PASS: real Electron process handoff, coalesced duplicate requests, distinct mixed Home/SAM/website launches, and credential-free traces. Fake Roblox and no real registry writes.');
      clearTimeout(deadline); app.quit = quit; quit();
    } catch (error) { console.error(error); app.exit(1); }
  });
});
require('../main');
