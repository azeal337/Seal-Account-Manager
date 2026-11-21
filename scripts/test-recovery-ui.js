const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-recovery-ui-'));
app.setPath('userData', path.join(temp, 'userdata')); fs.mkdirSync(app.getPath('userData'), { recursive: true });
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox'); process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app); app.quit = () => {};
const launcher = require('../src/launcher');
launcher.getRobloxPidSnapshot = async () => ({ pids: [100, 101], reliable: true, confirmedMissingPids: [] });
const api = require('../src/robloxApi');
api.getPresenceMany = async () => ({}); api.getAvatarUrls = async () => ({});
api.getAuthTicket = async () => { throw Error('Must not launch an already running account'); };
require('../src/robloxProgress').profiles = async () => [];
const recovery = require('../src/sessionRecovery');
const started = Date.now() - 60000;
const processes = [{ pid: 100, startedAt: started, window: true }, { pid: 101, startedAt: started, window: false }];
const watcher = require('../src/activityWatcher');
watcher.findLogForLaunch = () => '';
let account;
recovery.createRecovery = () => ({ scan: async () => processes, recover: (snapshot, accounts) => recovery.matchSessions(snapshot, [{ accountId: account.id, userId: 123, pid: 100, processStartedAt: started, startedAt: started }], [], accounts), save: () => {} });
app.whenReady().then(() => { account = require('../src/accountStore').addAccount({ username: 'Recovered', userId: 123, cookie: 'dummy' }); });
const deadline = setTimeout(() => app.exit(1), 15000);
app.on('browser-window-created', (_event, window) => {
  window.webContents.once('did-finish-load', async () => {
    try {
      const sessions = await window.webContents.executeJavaScript('window.api.listSessions()');
      assert.equal(sessions.length, 1);
      assert.equal(sessions[0].accountId, account.id);
      assert.deepEqual(sessions[0].pids, [100]);
      const error = await window.webContents.executeJavaScript(`window.api.launch(${JSON.stringify(account.id)}, {placeId:'1'}).then(()=>'',error=>error.message)`);
      assert.match(error, /already running/);
      console.log('PASS: main IPC recovers account session, excludes background process, prevents duplicate launch before credentials/spawn.');
      clearTimeout(deadline); app.quit = quit; quit();
    } catch (error) { console.error(error); app.exit(1); }
  });
});
app.on('will-quit', () => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });
require('../main');
