const fs = require('fs');
const path = require('path');
const { PLAYER_FLAGS } = require('./fastFlagPolicy');

const MAX_PRESETS = 40;
const MAX_FLAGS = 512;
const MAX_IMPORT_BYTES = 256 * 1024;

const DEFAULT_GUIDED = Object.freeze({
  meshDetail: 'default',
  textureQuality: 'default',
  msaa: 'default',
  grassDistance: 'default',
  grassMotion: 'default',
  dpiScaling: 'default',
  fullscreen: 'default',
  renderer: 'automatic',
  sky: 'game'
});

const RESERVED_ACCOUNT_FLAGS = new Set([
  'DFIntTaskSchedulerTargetFps',
  'DFIntDebugFRMQualityLevelOverride',
  'DFIntDebugGraphicsQualityLevelOverride'
]);

const MESH_KEYS = [
  'DFIntCSGLevelOfDetailSwitchingDistance',
  'DFIntCSGLevelOfDetailSwitchingDistanceL12',
  'DFIntCSGLevelOfDetailSwitchingDistanceL23',
  'DFIntCSGLevelOfDetailSwitchingDistanceL34'
];

const MESH_LEVELS = Object.freeze({
  high: ['250', '500', '750', '1000'],
  balanced: ['100', '200', '400', '800'],
  low: ['25', '50', '100', '200'],
  lowest: ['0', '0', '0', '0']
});

let configuredDirectory = '';

function configure(directory) {
  configuredDirectory = path.resolve(String(directory || ''));
  if (!configuredDirectory) throw new Error('Performance preset storage is not configured.');
  fs.mkdirSync(configuredDirectory, { recursive: true });
  return configuredDirectory;
}

function storePath() {
  if (!configuredDirectory) throw new Error('Performance preset storage is not configured.');
  return path.join(configuredDirectory, 'performance-presets.json');
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = String(value ?? fallback).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeGuided(input = {}) {
  return {
    meshDetail: normalizeChoice(input.meshDetail, ['default', 'high', 'balanced', 'low', 'lowest'], 'default'),
    textureQuality: normalizeChoice(input.textureQuality, ['default', '0', '1', '2', '3'], 'default'),
    msaa: normalizeChoice(input.msaa, ['default', '1', '2', '4'], 'default'),
    grassDistance: normalizeChoice(input.grassDistance, ['default', 'off', '50', '100', '200', '400'], 'default'),
    grassMotion: normalizeChoice(input.grassMotion, ['default', 'reduced', 'still'], 'default'),
    dpiScaling: normalizeChoice(input.dpiScaling, ['default', 'native'], 'default'),
    fullscreen: normalizeChoice(input.fullscreen, ['default', 'exclusive'], 'default'),
    renderer: normalizeChoice(input.renderer, ['automatic', 'd3d11', 'vulkan', 'opengl'], 'automatic'),
    sky: normalizeChoice(input.sky, ['game', 'gray'], 'game')
  };
}

function validFlagName(name) {
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(name)
    && !['__proto__', 'prototype', 'constructor'].includes(name.toLowerCase());
}

function sanitizeFlags(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('The imported JSON must contain one object of FastFlag names and values.');
  }
  const entries = Object.entries(input);
  if (entries.length > MAX_FLAGS) throw new Error(`This configuration contains ${entries.length} flags. Seal supports up to ${MAX_FLAGS} per preset.`);

  const flags = {};
  const warnings = [];
  const dropped = [];
  for (const [rawName, rawValue] of entries) {
    const name = String(rawName || '').trim();
    if (!validFlagName(name)) {
      dropped.push(name || '(empty name)');
      warnings.push(`${name || 'An empty entry'} was skipped because its FastFlag name is invalid.`);
      continue;
    }
    if (RESERVED_ACCOUNT_FLAGS.has(name)) {
      dropped.push(name);
      warnings.push(`${name} was skipped because Seal's separate FPS/graphics account controls manage it.`);
      continue;
    }
    if (rawValue === null) {
      flags[name] = null;
      continue;
    }
    if (!['string', 'number', 'boolean'].includes(typeof rawValue) || (typeof rawValue === 'number' && !Number.isFinite(rawValue))) {
      dropped.push(name);
      warnings.push(`${name} was skipped because its value is not text, a number, a boolean, or null.`);
      continue;
    }
    flags[name] = String(rawValue);
    if (!PLAYER_FLAGS.has(name)) {
      warnings.push(`${name} is not on Roblox's published Player allowlist. It is kept for editing/export but excluded when launching.`);
    }
  }
  return { flags, warnings, dropped };
}

function compileGuidedFlags(input = {}) {
  const guided = normalizeGuided(input);
  const flags = {};

  const mesh = MESH_LEVELS[guided.meshDetail];
  if (mesh) MESH_KEYS.forEach((key, index) => { flags[key] = mesh[index]; });

  if (guided.textureQuality !== 'default') {
    flags.DFFlagTextureQualityOverrideEnabled = 'True';
    flags.DFIntTextureQualityOverride = guided.textureQuality;
  }
  if (guided.msaa !== 'default') flags.FIntDebugForceMSAASamples = guided.msaa;

  if (guided.grassDistance !== 'default') {
    flags.FIntFRMMinGrassDistance = '0';
    flags.FIntFRMMaxGrassDistance = guided.grassDistance === 'off' ? '0' : guided.grassDistance;
  }
  if (guided.grassMotion === 'reduced') flags.FIntGrassMovementReducedMotionFactor = '50';
  if (guided.grassMotion === 'still') flags.FIntGrassMovementReducedMotionFactor = '100';
  if (guided.dpiScaling === 'native') flags.DFFlagDisableDPIScale = 'True';
  if (guided.fullscreen === 'exclusive') flags.FFlagHandleAltEnterFullscreenManually = 'False';

  if (guided.renderer === 'd3d11') flags.FFlagDebugGraphicsPreferD3D11 = 'True';
  if (guided.renderer === 'vulkan') flags.FFlagDebugGraphicsPreferVulkan = 'True';
  if (guided.renderer === 'opengl') flags.FFlagDebugGraphicsPreferOpenGL = 'True';
  if (guided.sky === 'gray') flags.FFlagDebugSkyGray = 'True';
  return flags;
}

function valuesMatch(flags, keys, values) {
  return keys.every((key, index) => String(flags[key]) === values[index]);
}

function extractGuidedFlags(input = {}) {
  const sanitized = sanitizeFlags(input);
  const flags = { ...sanitized.flags };
  const guided = { ...DEFAULT_GUIDED };
  let recognized = 0;
  const consume = (...keys) => {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(flags, key)) {
        delete flags[key];
        recognized++;
      }
    }
  };

  for (const [level, values] of Object.entries(MESH_LEVELS)) {
    if (valuesMatch(flags, MESH_KEYS, values)) {
      guided.meshDetail = level;
      consume(...MESH_KEYS);
      break;
    }
  }

  if (/^true$/i.test(String(flags.DFFlagTextureQualityOverrideEnabled)) && ['0', '1', '2', '3'].includes(String(flags.DFIntTextureQualityOverride))) {
    guided.textureQuality = String(flags.DFIntTextureQualityOverride);
    consume('DFFlagTextureQualityOverrideEnabled', 'DFIntTextureQualityOverride');
  }
  if (['1', '2', '4'].includes(String(flags.FIntDebugForceMSAASamples))) {
    guided.msaa = String(flags.FIntDebugForceMSAASamples);
    consume('FIntDebugForceMSAASamples');
  }
  if (String(flags.FIntFRMMinGrassDistance) === '0' && ['0', '50', '100', '200', '400'].includes(String(flags.FIntFRMMaxGrassDistance))) {
    guided.grassDistance = String(flags.FIntFRMMaxGrassDistance) === '0' ? 'off' : String(flags.FIntFRMMaxGrassDistance);
    consume('FIntFRMMinGrassDistance', 'FIntFRMMaxGrassDistance');
  }
  if (String(flags.FIntGrassMovementReducedMotionFactor) === '50') {
    guided.grassMotion = 'reduced';
    consume('FIntGrassMovementReducedMotionFactor');
  } else if (String(flags.FIntGrassMovementReducedMotionFactor) === '100') {
    guided.grassMotion = 'still';
    consume('FIntGrassMovementReducedMotionFactor');
  }
  if (/^true$/i.test(String(flags.DFFlagDisableDPIScale))) {
    guided.dpiScaling = 'native';
    consume('DFFlagDisableDPIScale');
  }
  if (/^false$/i.test(String(flags.FFlagHandleAltEnterFullscreenManually))) {
    guided.fullscreen = 'exclusive';
    consume('FFlagHandleAltEnterFullscreenManually');
  }

  const rendererFlags = [
    ['d3d11', 'FFlagDebugGraphicsPreferD3D11'],
    ['vulkan', 'FFlagDebugGraphicsPreferVulkan'],
    ['opengl', 'FFlagDebugGraphicsPreferOpenGL']
  ];
  const selectedRenderer = rendererFlags.find(([, key]) => /^true$/i.test(String(flags[key])));
  if (selectedRenderer) {
    guided.renderer = selectedRenderer[0];
    consume(...rendererFlags.map(([, key]) => key).filter(key => Object.prototype.hasOwnProperty.call(flags, key)));
  }
  if (/^true$/i.test(String(flags.FFlagDebugSkyGray))) {
    guided.sky = 'gray';
    consume('FFlagDebugSkyGray');
  }

  return {
    guided,
    additionalFlags: flags,
    recognizedCount: recognized,
    importedCount: Object.keys(sanitized.flags).length,
    warnings: sanitized.warnings,
    dropped: sanitized.dropped
  };
}

function analyzeImport(value) {
  let parsed = value;
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_IMPORT_BYTES) throw new Error('That JSON file is larger than 256 KB. Choose a smaller, focused preset.');
    try { parsed = JSON.parse(value); }
    catch (error) { throw new Error(`The JSON could not be read: ${error.message}`); }
  }
  return extractGuidedFlags(parsed);
}

function normalizePreset(input = {}, existingId = '') {
  const name = String(input.name || '').trim().replace(/\s+/g, ' ').slice(0, 32);
  if (!name) throw new Error('Give the preset a name first.');
  const id = /^custom:[a-z0-9_-]{6,64}$/i.test(String(existingId || input.id || ''))
    ? String(existingId || input.id)
    : `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const sanitized = sanitizeFlags(input.additionalFlags || input.importedFlags || {});
  return {
    id,
    name,
    guided: normalizeGuided(input.guided),
    additionalFlags: sanitized.flags,
    createdAt: String(input.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
    warnings: sanitized.warnings
  };
}

function readAll() {
  let parsed = [];
  try { parsed = JSON.parse(fs.readFileSync(storePath(), 'utf8')); }
  catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const presets = [];
  for (const item of parsed.slice(0, MAX_PRESETS)) {
    try { presets.push(normalizePreset(item, item.id)); } catch {}
  }
  return presets;
}

function writeAll(presets) {
  const file = storePath();
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(presets, null, 2), 'utf8');
  fs.renameSync(temp, file);
}

function listPresets() {
  return readAll();
}

function savePreset(input = {}) {
  const presets = readAll();
  const existingIndex = presets.findIndex(item => item.id === input.id);
  if (existingIndex < 0 && presets.length >= MAX_PRESETS) throw new Error(`Seal supports up to ${MAX_PRESETS} custom presets.`);
  const existing = existingIndex >= 0 ? presets[existingIndex] : null;
  const preset = normalizePreset({ ...input, createdAt: existing?.createdAt }, existing?.id || '');
  const duplicate = presets.find(item => item.id !== preset.id && item.name.toLowerCase() === preset.name.toLowerCase());
  if (duplicate) throw new Error(`A preset named “${duplicate.name}” already exists.`);
  if (existingIndex >= 0) presets[existingIndex] = preset;
  else presets.push(preset);
  writeAll(presets);
  return { ...preset, warnings: preset.warnings || [] };
}

function removePreset(id) {
  const presets = readAll();
  const preset = presets.find(item => item.id === id);
  if (!preset) throw new Error('That preset no longer exists.');
  writeAll(presets.filter(item => item.id !== id));
  return preset;
}

function getPreset(id) {
  return readAll().find(item => item.id === id) || null;
}

function compilePreset(id) {
  const preset = getPreset(id);
  if (!preset) return null;
  return {
    preset,
    flags: { ...preset.additionalFlags, ...compileGuidedFlags(preset.guided) }
  };
}

module.exports = {
  DEFAULT_GUIDED,
  RESERVED_ACCOUNT_FLAGS,
  configure,
  normalizeGuided,
  sanitizeFlags,
  compileGuidedFlags,
  extractGuidedFlags,
  analyzeImport,
  listPresets,
  savePreset,
  removePreset,
  getPreset,
  compilePreset
};
