'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PlaytimeStore } = require('../src/playtimeStore');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-playtime-test-'));
const filePath = path.join(root, 'playtime.json');
const hour = 60 * 60 * 1000;
const start = Date.UTC(2026, 0, 1, 12, 0, 0);

const accountAHome = {
  accountId: 'a-local', userId: '1001', username: 'Alpha', avatarUrl: 'alpha.png',
  pids: [101], targetLabel: 'Roblox home', presence: { webOnline: true, inGame: false }
};
const accountAGame = {
  ...accountAHome,
  targetLabel: 'Tower Test', placeId: '2001', universeId: '3001', serverConfirmed: true,
  presence: { inGame: true, universeId: '3001', placeId: '2001', lastLocation: 'Tower Test' }
};
const accountBGame = {
  accountId: 'b-local', userId: '1002', username: 'Beta', avatarUrl: 'beta.png',
  pids: [102], targetLabel: 'Tower Test', placeId: '2001', universeId: '3001', serverConfirmed: true,
  presence: { inGame: true, universeId: '3001', placeId: '2001', lastLocation: 'Tower Test' }
};

const store = new PlaytimeStore({ filePath, saveDelayMs: 60000, logger: { warn() {} } });
store.update([accountAHome], start);
store.update([accountAHome], start + hour);
store.update([accountAGame, accountBGame], start + 2 * hour);
store.update([accountAGame, accountBGame], start + 3 * hour);
store.update([], start + 4 * hour);

let stats = store.getStats({ from: 0, to: start + 4 * hour });
assert.strictEqual(stats.totalMs, 6 * hour, 'Concurrent accounts should add independent Roblox time.');
assert.strictEqual(stats.accounts[0].username, 'Alpha');
assert.strictEqual(stats.accounts[0].totalMs, 4 * hour, 'Home time must be included in account Roblox time.');
assert.strictEqual(stats.accounts[0].experiences[0].totalMs, 2 * hour, 'Only recognized game time belongs to the experience.');
assert.strictEqual(stats.accounts[1].totalMs, 2 * hour);
assert.strictEqual(stats.experiences[0].totalMs, 4 * hour);
assert.deepStrictEqual(stats.experiences[0].accounts.map(item => item.username), ['Alpha', 'Beta']);

stats = store.getStats({ from: start + 3 * hour, to: start + 4 * hour });
assert.strictEqual(stats.totalMs, 2 * hour, 'Custom ranges should clip every account segment.');
assert.strictEqual(stats.experiences[0].totalMs, 2 * hour);

store.setExperienceDetails([{ universeId: '3001', name: 'Tower Test Remastered', iconUrl: 'icon.png' }]);
store.save();
const restored = new PlaytimeStore({ filePath, logger: { warn() {} } });
stats = restored.getStats({ from: 0, to: start + 4 * hour });
assert.strictEqual(stats.experiences[0].name, 'Tower Test Remastered');
assert.strictEqual(stats.experiences[0].iconUrl, 'icon.png');

const external = new PlaytimeStore({ filePath: path.join(root, 'external.json') });
const unlinked = { accountId: 'unlinked:321:1000', unassigned: true, username: 'Unlinked Roblox' };
const second = { ...unlinked, accountId: 'unlinked:322:1000' };
external.update([unlinked, second], start);
external.update([{ ...unlinked, serverConfirmed: true, placeId: '4321' }, second], start + 1000);
external.update([unlinked, accountAHome], start + 2000);
stats = external.getStats({ from: 0, to: start + 2000 });
assert.strictEqual(stats.accounts.length, 1, 'unlinked windows share one display row');
assert.strictEqual(stats.accounts[0].totalMs, 4000);
assert.strictEqual(stats.experiences[0].totalMs, 1000, 'a confirmed game counts before identity is known');
external.update([{ ...accountAHome, unlinkedIds: [unlinked.accountId] }], start + 3000);
external.stop(start + 4000);
const afterLink = new PlaytimeStore({ filePath: path.join(root, 'external.json') }).getStats({ from: 0, to: start + 4000 });
assert.strictEqual(afterLink.totalMs, 6000, 'shared time for an identified account is counted once');
assert.strictEqual(afterLink.accounts.find(row => row.username === 'Alpha').totalMs, 4000);
assert.strictEqual(afterLink.accounts.find(row => row.unassigned).totalMs, 2000, 'another unlinked window keeps its own time');
assert.strictEqual(afterLink.experiences[0].accounts[0].username, 'Alpha', 'the game follows the identified account');

const reusedWindow = new PlaytimeStore({ filePath: path.join(root, 'reused-window.json') });
reusedWindow.update([unlinked], start);
reusedWindow.update([{ ...accountAHome, unlinkedIds: [unlinked.accountId], unlinkedSince: start + 1500 }], start + 2000);
reusedWindow.stop(start + 3000);
const reusedStats = reusedWindow.getStats({ to: start + 3000 });
assert.strictEqual(reusedStats.accounts.find(row => row.unassigned).totalMs, 1500, 'time before the verified Home sign-in stays unlinked');
assert.strictEqual(reusedStats.accounts.find(row => row.userId === '1001').totalMs, 1500);
const resolvedRoot = path.resolve(root);
if (resolvedRoot.startsWith(path.resolve(os.tmpdir()) + path.sep)) fs.rmSync(resolvedRoot, { recursive: true, force: true });
console.log('Playtime store tests passed.');
