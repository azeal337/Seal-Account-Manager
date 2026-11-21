const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

if (process.argv[2] === '--guard-child') {
  process.env.SEAL_TEST_ROBLOX_ROOT = process.argv[3];
  require('../src/launcher').setFpsCap(20);
  console.log('GUARD_READY');
  setInterval(() => {}, 1000);
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; });
}

async function run() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-performance-off-'));
  process.env.SEAL_TEST_ROBLOX_ROOT = temp;
  const launcher = require('../src/launcher');
  const { PLAYER_FLAGS } = require('../src/fastFlagPolicy');
  const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const json = file => JSON.parse(read(file));
  const roots = [temp, ...['old', 'new'].map(name => path.join(temp, 'Versions', `version-${name}`))];
  const files = roots.map(root => path.join(root, 'ClientSettings', 'ClientAppSettings.json'));
  const xml = path.join(temp, 'GlobalBasicSettings_13.xml');
  let child;
  try {
    for (const [index, root] of roots.entries()) {
      fs.mkdirSync(path.join(root, 'ClientSettings'), { recursive: true });
      if (index) fs.writeFileSync(path.join(root, 'RobloxPlayerBeta.exe'), 'fixture');
      fs.writeFileSync(files[index], JSON.stringify({
        UnrelatedUserSetting: 'keep', DFIntTaskSchedulerTargetFps: 999,
        DFIntDebugFRMQualityLevelOverride: 1, DFIntDebugGraphicsQualityLevelOverride: 1,
        FFlagOldImportedBoost: 'True', FFlagDisablePostFx: 'True'
      }));
      fs.writeFileSync(files[index] + '.seal-managed-flags.json', JSON.stringify({ keys: ['FFlagOldImportedBoost'] }));
    }
    fs.writeFileSync(xml, '<roblox><Item class="UserGameSettings"><Properties><int name="FramerateCap">144</int><token name="GraphicsMode">1</token><token name="SavedQualityLevel">7</token><float name="MasterVolume">0.3</float></Properties></Item></roblox>');

    // Reproduce the real launch sequence: FPS + forced quality + Max, then Off.
    launcher.applyPerformanceSettings({ fpsCap: 240, graphicsQuality: 1, fastFlagPreset: 'max' });
    for (const file of files) {
      assert.equal(json(file).DFIntTextureQualityOverride, '0');
      assert(!('DFIntTaskSchedulerTargetFps' in json(file)));
      for (const key of Object.keys(json(file)).filter(key => key !== 'UnrelatedUserSetting')) assert(PLAYER_FLAGS.has(key));
    }
    launcher.applyPerformanceSettings({ fpsCap: 240, graphicsQuality: 7, fastFlagPreset: 'off' });
    for (const file of files) assert.deepEqual(json(file), { UnrelatedUserSetting: 'keep' });
    assert(read(xml).includes('<token name="SavedQualityLevel">7</token>'));
    assert(!read(xml).includes('name="GraphicsMode"'));
    assert(read(xml).includes('<int name="FramerateCap">240</int>'));
    assert(read(xml).includes('<float name="MasterVolume">0.3</float>'));

    // Custom -> custom -> Off removes every old supported and legacy imported key.
    launcher.applyPerformanceSettings({ fastFlagPreset: 'custom', graphicsQuality: 5, customFlags: {
      FFlagDebugGraphicsPreferVulkan: true, FIntDebugForceMSAASamples: 2, FFlagUnsupportedImport: true
    } });
    assert(!('FFlagUnsupportedImport' in json(files[0])));
    launcher.setFastFlagPreset('custom', { FFlagDebugSkyGray: true });
    assert(!('FFlagDebugGraphicsPreferVulkan' in json(files[0])));
    const beforeOffXml = read(xml);
    launcher.resetPerformanceSettings();
    launcher.resetPerformanceSettings(); // Off is idempotent.
    assert.equal(read(xml), beforeOffXml, 'turning off boost must not change native graphics settings');
    for (const file of files) {
      assert.deepEqual(json(file), { UnrelatedUserSetting: 'keep' });
      assert(!fs.existsSync(file + '.seal-managed-flags.json'));
    }

    // A broken version-specific file must fail visibly, even if root succeeds.
    fs.writeFileSync(files[2], '{broken-json');
    assert.throws(() => launcher.resetPerformanceSettings(), /every Roblox installation/);
    assert.equal(read(files[2]), '{broken-json');
    fs.writeFileSync(files[2], JSON.stringify({ UnrelatedUserSetting: 'keep' }));

    launcher.restoreFpsOverride();
    assert(read(xml).includes('<int name="FramerateCap">144</int>'));
    for (const file of files) assert(!('DFIntTaskSchedulerTargetFps' in json(file)));

    // Force-ending the app still restores native FPS and never resurrects the obsolete flag.
    if (process.platform === 'win32') {
      child = spawn(process.execPath, [__filename, '--guard-child', temp], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Guard child timed out')), 15000);
        let output = '';
        child.stdout.on('data', data => { output += data; if (output.includes('GUARD_READY')) { clearTimeout(timer); resolve(); } });
        child.once('error', error => { clearTimeout(timer); reject(error); });
      });
      assert(read(xml).includes('<int name="FramerateCap">20</int>'));
      execFileSync('taskkill.exe', ['/F', '/PID', String(child.pid)], { windowsHide: true, stdio: 'ignore' });
      child = null;
      const manifest = path.join(temp, 'SealFpsRestore.json');
      for (let attempt = 0; attempt < 40 && fs.existsSync(manifest); attempt++) await new Promise(resolve => setTimeout(resolve, 150));
      assert(!fs.existsSync(manifest));
      assert(read(xml).includes('<int name="FramerateCap">144</int>'));
      for (const file of files) assert(!('DFIntTaskSchedulerTargetFps' in json(file)));
    }
    console.log('Performance Off regression passed: all versions, native graphics, custom cleanup, error reporting, native FPS and forced-exit recovery.');
  } finally {
    if (child) child.kill();
    launcher.restoreFpsOverride();
    assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
