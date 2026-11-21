const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { matchSessions, createRecovery, unlinkedSessions } = require('../src/sessionRecovery');
const accounts = [{ id: 'a', userId: 123 }, { id: 'b', userId: 456 }];
const processes = [{ pid: 1, startedAt: 100000, window: true }, { pid: 2, startedAt: 200000, window: true }, { pid: 3, startedAt: 300000, window: false }];
const logs = [{ path: 'a.log', createdAt: 101000, activity: { userId: '123', confirmed: true, placeId: 99 } }, { path: 'b.log', createdAt: 201000, activity: { userId: '456', confirmed: true } }];
assert.equal(matchSessions(processes, [], logs, accounts).length, 2);
assert.equal(matchSessions(processes, [], [{ ...logs[0], activity: { userId: '999', confirmed: true } }], accounts).length, 0);
assert.equal(matchSessions([processes[0], { pid: 4, startedAt: 100500, window: true }], [], [logs[0]], accounts).length, 0, 'ambiguous timing never guesses');
const record = { accountId: 'a', userId: 123, pid: 1, processStartedAt: 100000 };
assert.equal(matchSessions(processes, [record], [], accounts).length, 1);
assert.equal(matchSessions([{ ...processes[0], startedAt: 999000 }], [record], [], accounts).length, 0, 'reused PID rejected');
assert.equal(matchSessions([{ ...processes[0], window: false }], [record], [], accounts).length, 0, 'background-only process excluded');
const lateLog = { ...logs[0], createdAt: processes[0].startedAt + 8000 };
const livePids = new Set([1, 2, 3]);
assert.equal(matchSessions(processes, [], [lateLog], accounts)[0].accountId, 'a', 'slow client startup still associates the actual player log');
assert.equal(unlinkedSessions(processes, [], livePids, [lateLog]).length, 2, 'a bare background process never starts the clock');
assert.equal(unlinkedSessions(processes, [], livePids, [lateLog])[0].serverConfirmed, true, 'known game counts without an account');
const hiddenPlayer = [{ ...processes[0], window: false }];
assert.equal(unlinkedSessions(hiddenPlayer, [], livePids, [lateLog]).length, 1, 'a live game can precede window detection');
assert.equal(unlinkedSessions(hiddenPlayer, [], livePids, [{ ...lateLog, activity: { ...lateLog.activity, disconnected: true } }]).length, 0);
const homeLog = { ...lateLog, activity: { desktopSignedInAt: 120000 } };
const profile = { userId: '123', modifiedAt: 125000 };
const [home] = matchSessions([processes[0]], [], [homeLog], accounts, profile);
assert.equal(home.accountId, 'a', 'single Home client links without joining a game');
assert.equal(home.identitySource, 'desktop-profile');
assert.equal(matchSessions(processes, [], [homeLog], accounts, profile).length, 0, 'shared profile is ambiguous across clients');
assert.equal(matchSessions([processes[0]], [], [homeLog], accounts, { ...profile, modifiedAt: 160000 }).length, 0, 'unrelated profile writes cannot create a link');
assert.equal(matchSessions([processes[0]], [home], [homeLog], accounts, { ...profile, modifiedAt: 160000 }).length, 1, 'subsequent profile saves preserve the verified same login');
assert.equal(matchSessions([processes[0]], [home], [homeLog], accounts, { ...profile, userId: '456' })[0].accountId, 'a', 'shared profile changes cannot overwrite a verified live sign-in');
const simultaneous = { ...processes[1], startedAt: processes[0].startedAt + 6000 };
assert.equal(matchSessions([processes[0], simultaneous], [home], [homeLog], accounts)[0].accountId, 'a', 'first Play keeps the already linked Home window even when launch times overlap');
assert.equal(matchSessions([processes[0], simultaneous], [home], [{
  ...homeLog, activity: { desktopSignedInAt: 140000 }
}], accounts, profile).length, 0, 'a new sign-in needs fresh identity evidence');
assert.equal(matchSessions([processes[0], simultaneous], [home], [{
  ...homeLog, activity: { ...homeLog.activity, confirmed: true, userId: '456' }
}], accounts)[0].accountId, 'b', 'exact game identity overrides the older Home identity');
assert.equal(matchSessions([processes[0]], [home], [{ ...homeLog, activity: null }], accounts, profile).length, 0, 'logout invalidates saved profile-only link');
assert.equal(matchSessions([processes[0]], [], [lateLog], accounts, { ...profile, userId: '456' })[0].accountId, 'a', 'explicit game identity has priority');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-recovery-'));
try {
  const file = path.join(dir, 'map.json');
  const watcher = { playerLogs: () => [], parseActivity: () => null };
  const first = createRecovery(file, watcher);
  first.save(processes, new Map([['a', { startedAt: 100000, targetLabel: 'Test' }]]), new Map([['a', new Set([1])]]), accounts);
  const reopened = createRecovery(file, watcher);
  assert.equal(reopened.recover(processes, accounts)[0].accountId, 'a');
  assert.equal(reopened.recover(processes, []).length, 0, 'removed accounts are not restored');
  const localStorage = path.join(dir, 'LocalStorage');
  fs.mkdirSync(localStorage);
  const profilePath = path.join(localStorage, 'appStorage.json');
  fs.writeFileSync(profilePath, JSON.stringify({ UserId: 123 }));
  fs.utimesSync(profilePath, new Date(profile.modifiedAt), new Date(profile.modifiedAt));
  let homeActivity = homeLog.activity;
  const unsaved = createRecovery(path.join(dir, 'unsaved.json'), {
    logsDirectory: () => path.join(dir, 'logs'),
    playerLogs: () => [homeLog],
    parseActivity: () => homeActivity
  });
  assert.equal(unsaved.recover([processes[0]], accounts)[0].accountId, 'a');
  assert(!fs.existsSync(path.join(dir, 'unsaved.json')));
  assert.equal(unsaved.recover([processes[0], simultaneous], accounts)[0].accountId, 'a', 'first Play can occur before the verified Home link is saved');
  homeActivity = null;
  assert.equal(unsaved.recover([processes[0], simultaneous], accounts).length, 0, 'sign-out clears the in-memory verification');
  console.log('PASS: restart persistence, account/log association, ambiguous logs, PID reuse and background exclusion.');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
