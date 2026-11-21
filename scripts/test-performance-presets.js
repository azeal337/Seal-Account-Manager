const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-performance-presets-'));
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox');

const store = require('../src/performancePresetStore');
const launcher = require('../src/launcher');

try {
  store.configure(path.join(temp, 'userdata'));
  const imported = store.analyzeImport(JSON.stringify({
    DFIntCSGLevelOfDetailSwitchingDistance: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL12: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL23: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL34: '0',
    DFFlagTextureQualityOverrideEnabled: true,
    DFIntTextureQualityOverride: 1,
    FIntDebugForceMSAASamples: 2,
    FFlagExampleSupportedByImport: false,
    DFIntTaskSchedulerTargetFps: 240
  }));

  assert.strictEqual(imported.guided.meshDetail, 'lowest');
  assert.strictEqual(imported.guided.textureQuality, '1');
  assert.strictEqual(imported.guided.msaa, '2');
  assert.strictEqual(imported.additionalFlags.FFlagExampleSupportedByImport, 'false');
  assert(!Object.prototype.hasOwnProperty.call(imported.additionalFlags, 'DFIntTaskSchedulerTargetFps'));
  assert(imported.warnings.some(message => message.includes('FPS/graphics')));
  assert(imported.warnings.some(message => message.includes('Player allowlist')));

  const saved = store.savePreset({
    name: 'Low-end alts',
    guided: { ...imported.guided, grassDistance: '50', dpiScaling: 'native' },
    additionalFlags: imported.additionalFlags
  });
  assert(/^custom:/.test(saved.id));
  assert.strictEqual(store.listPresets().length, 1);

  const compiled = store.compilePreset(saved.id);
  assert.strictEqual(compiled.flags.DFIntCSGLevelOfDetailSwitchingDistance, '0');
  assert.strictEqual(compiled.flags.DFIntTextureQualityOverride, '1');
  assert.strictEqual(compiled.flags.FIntFRMMaxGrassDistance, '50');
  assert.strictEqual(compiled.flags.DFFlagDisableDPIScale, 'True');
  assert.strictEqual(compiled.flags.FFlagExampleSupportedByImport, 'false');

  const version = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'Versions', 'version-test');
  fs.mkdirSync(version, { recursive: true });
  fs.writeFileSync(path.join(version, 'RobloxPlayerBeta.exe'), 'test');
  const rootSettings = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'ClientSettings', 'ClientAppSettings.json');
  fs.mkdirSync(path.dirname(rootSettings), { recursive: true });
  fs.writeFileSync(rootSettings, JSON.stringify({ KeepMyUnrelatedFlag: 'yes' }));

  launcher.setFastFlagPreset('custom', compiled.flags);
  let written = JSON.parse(fs.readFileSync(rootSettings, 'utf8'));
  assert.strictEqual(written.KeepMyUnrelatedFlag, 'yes');
  assert(!Object.prototype.hasOwnProperty.call(written, 'FFlagExampleSupportedByImport'));
  assert.strictEqual(written.DFIntCSGLevelOfDetailSwitchingDistance, '0');

  launcher.setFastFlagPreset('off');
  written = JSON.parse(fs.readFileSync(rootSettings, 'utf8'));
  assert.strictEqual(written.KeepMyUnrelatedFlag, 'yes');
  assert(!Object.prototype.hasOwnProperty.call(written, 'FFlagExampleSupportedByImport'));
  assert(!Object.prototype.hasOwnProperty.call(written, 'DFIntCSGLevelOfDetailSwitchingDistance'));

  const removed = store.removePreset(saved.id);
  assert.strictEqual(removed.name, 'Low-end alts');
  assert.strictEqual(store.listPresets().length, 0);
  console.log('Performance preset creation, import, application, and cleanup checks passed.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
