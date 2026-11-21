const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-quiet-launch-'));
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temporary, 'Roblox');
const calls = [];
// Intercept before bootstrapper captures spawnSync. No real registry changes.
const originalSpawnSync = childProcess.spawnSync;
childProcess.spawnSync = (file, args) => {
  assert.equal(file, 'reg.exe'); calls.push(args);
  return { status: 0, stdout: args[0] === 'query' ? '    (Default)    REG_SZ    "C:\\Temp\\old\\Seal Account Manager.exe" "%1"' : '' };
};
const bootstrapper = require('../src/bootstrapper');
childProcess.spawnSync = originalSpawnSync;

(async () => {
  try {
    const file = path.join(temporary, 'preferences.json');
    const create = require('../src/externalLaunchSettings').createExternalLaunchSettings;
    let preferences = create(file);
    const accounts = [{ id: 'a', username: 'A', cookie: 'do-not-persist' }, { id: 'b', username: 'B' }];
    assert.equal(preferences.account(accounts), null);
    preferences.remember('a'); preferences = create(file);
    assert.equal(preferences.account(accounts).id, 'a');
    preferences.select('b', accounts); preferences.remember('a');
    assert.equal(preferences.account(accounts).id, 'b');
    assert.throws(() => preferences.select('missing', accounts), /saved account/);
    assert.throws(() => preferences.account([accounts[0]]), /removed/);
    preferences.select('last', accounts);
    assert.equal(preferences.account([]), null);
    assert(!fs.readFileSync(file, 'utf8').includes('do-not-persist'));

    const launcher = require('../src/launcher');
    const version = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'Versions', 'version-fixture');
    fs.mkdirSync(path.join(version, 'ClientSettings'), { recursive: true });
    fs.writeFileSync(path.join(version, 'RobloxPlayerBeta.exe'), 'fixture');
    const flags = path.join(version, 'ClientSettings', 'ClientAppSettings.json');
    fs.writeFileSync(flags, JSON.stringify({ FFlagDebugSkyGray: true, UnrelatedUserSetting: 'keep' }));
    fs.writeFileSync(path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'GlobalBasicSettings_13.xml'), '<roblox><int name="FramerateCap">240</int><token name="SavedQualityLevel">7</token><float name="MasterVolume">0.3</float></roblox>');
    assert.deepEqual(launcher.captureAppliedSettings(), { fpsCap: 240, graphicsQuality: 7, volume: 3, fastFlagPreset: 'custom', customFlags: { FFlagDebugSkyGray: true } });
    fs.writeFileSync(flags, '{bad-json');
    assert.throws(() => launcher.captureAppliedSettings(), /JSON|settings/i);
    fs.writeFileSync(flags, '{}');

    const registration = [], owned = new Set();
    const executable = path.join(temporary, 'Startup', 'Seal-Account-Manager.exe');
    const fakeApp = {
      isPackaged: true,
      isDefaultProtocolClient: (protocol, exe, args) => { assert.equal(exe, executable); assert.deepEqual(args, ['--background']); return owned.has(protocol); },
      setAsDefaultProtocolClient: (protocol, exe, args) => { registration.push({ protocol, exe, args }); owned.add(protocol); return true; },
      removeAsDefaultProtocolClient: protocol => { owned.delete(protocol); return true; }
    };
    const options = { app: fakeApp, executable, launcher, userDataPath: temporary };
    fs.writeFileSync(path.join(temporary, 'seal-bootstrapper.json'), JSON.stringify({ previousHandlers: { roblox: '"C:\\Temp\\Seal Account Manager.exe" "%1"' } }));
    assert(bootstrapper.enable(options).enabled);
    assert.equal(registration.length, 2);
    assert.deepEqual(bootstrapper.loadState(temporary).previousHandlers, {}, 'old transient Seal handlers are never restored');
    bootstrapper.disable(options);
    assert(calls.filter(args => args[0] === 'add' && args.some(arg => /shell\\open\\command$/.test(arg))).every(args => args.includes('"' + path.join(version, 'RobloxPlayerBeta.exe') + '" "%1"')));

    const sequence = [], uri = 'roblox-player:1+launchmode:play+gameinfo:fixture-only';
    const fakeLauncher = {
      findRobloxVersionFolder: () => version,
      applyRobloxMods: () => { sequence.push('mods'); return {}; },
      launchRawUri: async value => { assert.equal(value, uri); sequence.push('launch'); return { pids: [101] }; }
    };
    await bootstrapper.prepareAndLaunch({ launcher: fakeLauncher, userDataPath: temporary, uri, mods: { fullbright: true }, beforeLaunch: async () => { await Promise.resolve(); sequence.push('settings'); } });
    assert.deepEqual(sequence, ['settings', 'mods', 'launch']);
    await assert.rejects(bootstrapper.prepareAndLaunch({ launcher: fakeLauncher, userDataPath: temporary, uri, beforeLaunch: () => { throw Error('fixture settings failure'); } }), /settings failure/);
    assert.equal(sequence.length, 3, 'settings failure must stop before spawning Roblox');
    console.log('PASS: persisted external profiles; native settings capture and supported flags; stable background protocol commands with safe stock restoration; settings before mods/spawn and unchanged launch ticket. Fake registry and Roblox only.');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
