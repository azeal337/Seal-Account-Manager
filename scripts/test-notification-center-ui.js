const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, shell } = require('electron');

const root = path.join(process.env.SEAL_TEST_TMP_ROOT, 'notifications');
fs.mkdirSync(root, { recursive: true });
app.setPath('userData', root);
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(root, 'Roblox');
process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app);
app.quit = () => {};

const oldJob = '11111111-1111-1111-1111-111111111111';
const firstJob = '22222222-2222-2222-2222-222222222222';
const secondJob = '33333333-3333-3333-3333-333333333333';
let account;
let activity;
const processCatalog = () => activity ? [{ pid: 4100, window: true, startedAt: activity.startedAt }] : [];
const opened = [];
const openFixture = async url => { opened.push(url); };
shell.openExternal = openFixture;
assert.equal(shell.openExternal, openFixture);
const launcher = require('../src/launcher');
launcher.getRobloxPidSnapshot = async () => ({ pids: processCatalog().map(row => row.pid), reliable: true });
launcher.listRobloxPids = async () => processCatalog().map(row => row.pid);
const api = require('../src/robloxApi');
api.getAvatarUrls = async () => ({});
api.getPresenceMany = async () => ({});
const metadata = require('../src/robloxProgress');
metadata.profiles = async () => [];
let releaseTitle;
const titleReady = new Promise(resolve => { releaseTitle = resolve; });
metadata.resolvePlace = async place => ({ universeId: place === '70' ? '79' : '99' });
metadata.experienceAvailability = async () => ({});
metadata.experienceDetails = async ids => {
  if (ids.includes('99')) await titleReady;
  return Object.fromEntries(ids.map(id => [id, {
    name: id === '79' ? 'Old game' : 'New game', placeId: id === '79' ? '70' : '90'
  }]));
};
require('../src/activityWatcher').parseActivity = () => activity;
require('../src/sessionRecovery').createRecovery = () => ({
  scan: async () => processCatalog(),
  recover: () => activity ? [{ accountId: account.id, pid: 4100, logFile: 'fixture.log', startedAt: activity.startedAt }] : [],
  save: () => {}
});

const historyTime = Date.now() - 50000;
app.whenReady().then(() => {
  account = require('../src/accountStore').addAccount({ username: 'Tester', userId: 123, cookie: 'fixture-only' });
  fs.writeFileSync(path.join(root, 'server-hub.json'), JSON.stringify({
    history: [{ accountId: account.id, username: 'Tester', placeId: '70', name: 'Old game',
      id: oldJob, firstSeen: historyTime, lastSeen: historyTime + 10000 }]
  }));
});

const deadline = setTimeout(() => { console.error('Notification UI test timed out'); app.exit(1); }, 20000);
app.on('browser-window-created', (_event, window) => window.webContents.once('did-finish-load', async () => {
  window.webContents.setBackgroundThrottling(false);
  const read = code => window.webContents.executeJavaScript(code);
  async function waitFor(code) {
    for (let i = 0; i < 100; i++) {
      if (await read(code)) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw Error('Timed out waiting for ' + code);
  }
  try {
    await read(`window.api.saveIntegrationSettings({desktopNotifications:false})`);
    const legacy = { id: 'legacy', message: 'Tester joined Place 70.', tone: 'success', timestamp: historyTime };
    await read(`localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([${JSON.stringify(legacy)}]));loadNotifications();openNotificationCenter();`);
    await waitFor(`document.querySelector('[data-notification-id="legacy"] summary').textContent.includes('Old game')`);
    const oldUrl = `https://www.roblox.com/games/start?placeId=70&gameInstanceId=${oldJob}`;
    assert.equal(await read(`document.querySelector('[data-notification-id="legacy"] a').href`), oldUrl);
    assert.equal(await read(`document.querySelector('[data-notification-id="legacy"]').open`), false);

    activity = { confirmed: false, jobId: firstJob, placeId: '91', universeId: '99', startedAt: Date.now() };
    await read(`window.api.listSessions()`);
    assert.equal(await read(`document.querySelectorAll('.notification-join').length`), 1);
    activity = { ...activity, confirmed: true };
    await read(`window.api.listSessions()`);
    await waitFor(`document.querySelectorAll('.notification-join').length===2`);
    assert.equal(await read(`document.querySelector('.notification-join').open`), false);
    await read(`document.querySelector('.notification-join summary').click()`);
    assert.equal(await read(`document.querySelector('.notification-join[open] dd').textContent`), '91');
    assert.equal(opened.length, 0, 'expanding a notification must not launch Roblox');
    releaseTitle();
    await waitFor(`document.querySelector('.notification-join[open] summary')?.textContent.includes('Tester joined New game.')`);
    await read(`document.querySelector('.notification-join[open] a').click()`);
    assert.equal(await read(`window.api.openNotificationServer('91', 'invalid').then(()=>false,()=>true)`), true);
    assert.deepEqual(opened, [`https://www.roblox.com/games/start?placeId=91&gameInstanceId=${firstJob}`]);

    activity = { ...activity, jobId: secondJob };
    await read(`window.api.listSessions()`);
    await waitFor(`document.querySelectorAll('.notification-join').length===3`);
    await read(`document.getElementById('notificationJoinedFilterBtn').click()`);
    assert.equal(await read(`document.querySelectorAll('#notificationCenterList .notification-item').length`), 3);
    assert.equal(await read(`document.getElementById('notificationJoinedFilterBtn').getAttribute('aria-pressed')`), 'true');
    await read(`document.getElementById('notificationResetFilterBtn').click()`);
    assert.equal(await read(`document.querySelectorAll('#notificationCenterList .notification-item').length`), 4);
    await read(`loadNotifications();renderNotificationCenter()`);
    assert.equal(await read(`document.querySelector('.notification-join a').href`), `https://www.roblox.com/games/start?placeId=91&gameInstanceId=${secondJob}`);
    console.log('PASS: confirmed join notifications, delayed and historical titles, exact subplace links, filter/reset, and stored history.');
    clearTimeout(deadline);
    app.quit = quit;
    quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
}));
require('../main');
