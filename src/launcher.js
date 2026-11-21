// launcher.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync, exec } = require('child_process');
const https = require('https');
const mutexHolder = require('./mutexHolder');
const { supportedPlayerFlags } = require('./fastFlagPolicy');

function getRobloxRoot() {
  if (process.env.SEAL_TEST_ROBLOX_ROOT) return path.resolve(process.env.SEAL_TEST_ROBLOX_ROOT);
  return path.join(os.homedir(), 'AppData', 'Local', 'Roblox');
}

function findRobloxVersionFolders() {
  const versionsDir = path.join(getRobloxRoot(), 'Versions');
  if (!fs.existsSync(versionsDir)) return [];

  return fs
    .readdirSync(versionsDir)
    .filter(name => name.startsWith('version-'))
    .map(name => {
      const full = path.join(versionsDir, name);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch {
        mtime = 0;
      }
      return { name, full, mtime };
    })
    .filter(e => fs.existsSync(path.join(e.full, 'RobloxPlayerBeta.exe')))
    .sort((a, b) => b.mtime - a.mtime)
    .map(e => e.full);
}

function findRobloxVersionFolder() {
  return require('./playerInstallation').selectPlayerFolder(getRobloxRoot());
}

function readJsonFile(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}


const FASTFLAG_MANAGED_KEYS = [
  // Post-processing / effects
  'FFlagDisablePostFx',
  'FFlagDebugSkyGray',
  'FFlagDebugDisableFog',
  'FFlagDisableBloom',
  'FFlagDisableSunRays',
  'FFlagDisableDepthOfField',
  'FFlagDisableColorCorrection',
  'FFlagDebugDisableAtmosphere',
  'FFlagDebugDisableParticleRendering',

  // Shadows / lighting
  'FIntRenderShadowIntensity',
  'FIntRenderShadowmapBias',
  'FIntRenderShadowmapSize',
  'DFFlagDebugRenderForceTechnologyVoxel',
  'DFFlagDebugPauseVoxelizer',

  // Grass / terrain / textures
  'FIntRenderGrassDetailStrands',
  'FIntFRMMinGrassDistance',
  'FIntFRMMaxGrassDistance',
  'FIntGrassMovementReducedMotionFactor',
  'DFFlagTextureQualityOverrideEnabled',
  'DFIntTextureQualityOverride',
  'FIntTerrainArraySliceSize',
  'FIntTerrainTextureQuality',

  // Mesh / geometry LOD
  'DFIntCSGLevelOfDetailSwitchingDistance',
  'DFIntCSGLevelOfDetailSwitchingDistanceL12',
  'DFIntCSGLevelOfDetailSwitchingDistanceL23',
  'DFIntCSGLevelOfDetailSwitchingDistanceL34',
  'DFIntMeshContentProviderForceLod',
  'DFIntMeshContentProviderForceLodDistance',
  'FIntMeshPartDetailLevel',

  // Anti-aliasing / render scaling / scheduler
  'FIntDebugForceMSAASamples',
  'FIntDebugFRMOptionalMSAALevelOverride',
  'FFlagTaskSchedulerLimitTargetFpsTo2402',

  // Display/fullscreen/rendering backends used by Guided custom presets
  'DFFlagDisableDPIScale',
  'FFlagHandleAltEnterFullscreenManually',
  'FFlagDebugGraphicsPreferD3D11',
  'FFlagDebugGraphicsPreferVulkan',
  'FFlagDebugGraphicsPreferOpenGL'
];

const FULLBRIGHT_FASTFLAGS = Object.freeze({
  FIntRenderShadowIntensity: '0',
  FFlagDisablePostFx: 'True',
  FFlagDebugDisableFog: 'True',
  FFlagDebugDisableAtmosphere: 'True',
  FFlagDisableBloom: 'True',
  FFlagDisableSunRays: 'True',
  FFlagDisableDepthOfField: 'True',
  FFlagDisableColorCorrection: 'True'
});
const FULLBRIGHT_FLAGS_BACKUP_SUFFIX = '.sealfullbrightflagsbak';

function normalizeFastFlagPreset(value) {
  const preset = String(value || 'off').toLowerCase();
  if (preset === 'custom') return 'custom';
  if (preset === 'balanced' || preset === 'max') return preset;
  return 'off';
}

function getFastFlagPresetFlags(preset, customFlags = {}) {
  const normalized = normalizeFastFlagPreset(preset);
  if (normalized === 'custom') {
    const flags = {};
    for (const [key, value] of Object.entries(supportedPlayerFlags(customFlags))) {
      if (value === null) flags[key] = null;
      else if (['string', 'number', 'boolean'].includes(typeof value)) flags[key] = String(value);
    }
    return flags;
  }
  if (normalized === 'off') return {};

  // Roblox Player now honors only flags on its local configuration allowlist.
  // Keep the active presets intentionally small so every entry has a realistic
  // chance of affecting current clients instead of writing a large placebo list.
  const balanced = {
    // Allowlisted grass-distance controls
    FIntFRMMinGrassDistance: '0',
    FIntFRMMaxGrassDistance: '0',

    // Allowlisted texture-quality controls (Bloxstrap level 0)
    DFFlagTextureQualityOverrideEnabled: 'True',
    DFIntTextureQualityOverride: '0',

    // 1x is the lowest valid Bloxstrap MSAA preset.
    FIntDebugForceMSAASamples: '1'
  };

  if (normalized === 'balanced') return balanced;

  // Max FPS+ is intentionally much uglier. Graphics quality is managed
  // separately so choosing this preset never overwrites the user's quality bar.
  return {
    ...balanced,

    FFlagDebugSkyGray: 'True',
    // Allowlisted geometry LOD controls
    DFIntCSGLevelOfDetailSwitchingDistance: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL12: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL23: '0',
    DFIntCSGLevelOfDetailSwitchingDistanceL34: '0'
  };
}

function getClientAppSettingsTargets() {
  const targets = [];
  const robloxRoot = getRobloxRoot();

  // Some bootstrappers use the root ClientSettings folder, while the stock
  // Roblox client typically reads the per-version ClientSettings folder.
  targets.push(path.join(robloxRoot, 'ClientSettings', 'ClientAppSettings.json'));
  for (const folder of findRobloxVersionFolders()) {
    targets.push(path.join(folder, 'ClientSettings', 'ClientAppSettings.json'));
  }

  return [...new Set(targets)];
}

function setFullbrightFastFlags(enabled, settingsTargets = getClientAppSettingsTargets()) {
  let changed = 0;
  let already = 0;
  const errors = [];
  const writtenFiles = [];

  for (const settingsFile of [...new Set(settingsTargets)]) {
    const backupFile = settingsFile + FULLBRIGHT_FLAGS_BACKUP_SUFFIX;
    if (!enabled && !fs.existsSync(settingsFile) && !fs.existsSync(backupFile)) continue;

    try {
      const settings = readJsonFile(settingsFile);
      const before = JSON.stringify(settings);

      if (enabled) {
        if (!fs.existsSync(backupFile)) {
          const original = {};
          for (const key of Object.keys(FULLBRIGHT_FASTFLAGS)) {
            original[key] = Object.prototype.hasOwnProperty.call(settings, key)
              ? { present: true, value: settings[key] }
              : { present: false };
          }
          ensureDir(path.dirname(backupFile));
          fs.writeFileSync(backupFile, JSON.stringify(original, null, 2), 'utf8');
        }
        for (const [key, value] of Object.entries(FULLBRIGHT_FASTFLAGS)) {
          settings[key] = value;
        }
      } else {
        const backup = readJsonFile(backupFile);
        for (const key of Object.keys(FULLBRIGHT_FASTFLAGS)) {
          const prior = backup[key];
          if (prior?.present) settings[key] = prior.value;
          else delete settings[key];
        }
      }

      const after = JSON.stringify(settings);
      if (after !== before) {
        ensureDir(path.dirname(settingsFile));
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
        changed++;
        writtenFiles.push(settingsFile);
      } else {
        already++;
      }

      if (!enabled && fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
    } catch (err) {
      errors.push(`${path.basename(settingsFile)}: ${err.message}`);
    }
  }

  return {
    enabled: !!enabled,
    changed,
    already,
    targets: [...new Set(settingsTargets)].length,
    writtenFiles,
    errors,
    flags: enabled ? { ...FULLBRIGHT_FASTFLAGS } : {}
  };
}

function writeFastFlagsToClientAppSettingsFile(settingsFile, preset, customFlags = {}) {
  const settingsDir = path.dirname(settingsFile);
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });

  const settings = readClientSettings(settingsFile);
  const markerFile = settingsFile + '.seal-managed-flags.json';
  const priorMarker = readJsonFile(markerFile);
  const priorCustomKeys = Array.isArray(priorMarker.keys) ? priorMarker.keys : [];

  // Remove built-in keys and every arbitrary key the previously selected
  // custom preset owned. This prevents flags from a deleted/switched preset
  // lingering invisibly in Roblox's ClientAppSettings file.
  for (const key of new Set([...FASTFLAG_MANAGED_KEYS, ...priorCustomKeys])) {
    delete settings[key];
  }

  const normalized = normalizeFastFlagPreset(preset);
  const flags = getFastFlagPresetFlags(normalized, customFlags);
  for (const [key, value] of Object.entries(flags)) {
    if (value === null) delete settings[key];
    else settings[key] = value;
  }

  // Record ownership before writing. If a write fails, the next Off still
  // knows every imported key that might need cleaning up.
  const managedCustomKeys = normalized === 'custom' ? Object.keys(flags) : [];
  if (managedCustomKeys.length) {
    writeJsonAtomic(markerFile, { keys: [...new Set([...priorCustomKeys, ...managedCustomKeys])] });
  }
  writeJsonAtomic(settingsFile, settings);
  if (!managedCustomKeys.length && fs.existsSync(markerFile)) {
    fs.unlinkSync(markerFile);
  }
  return settingsFile;
}

function setFastFlagPreset(preset, customFlags = {}) {
  const normalized = normalizeFastFlagPreset(preset);
  const versionFolders = findRobloxVersionFolders();

  if (versionFolders.length === 0 && !fs.existsSync(getRobloxRoot())) {
    throw new Error(
      'Could not find a Roblox installation under %LOCALAPPDATA%\\Roblox. ' +
        'Launch Roblox at least once first.'
    );
  }

  const writtenFiles = [];
  const errors = [];
  for (const file of getClientAppSettingsTargets()) {
    try {
      writtenFiles.push(writeFastFlagsToClientAppSettingsFile(file, normalized, customFlags));
    } catch (err) {
      console.warn('[launcher] could not write FastFlags file:', file, err.message);
      errors.push(`${file}: ${err.message}`);
    }
  }

  if (errors.length) {
    throw new Error(`Could not apply performance settings to every Roblox installation. ${errors.join('; ')}`);
  }

  console.log('[launcher] FastFlags applied:', JSON.stringify({ preset: normalized, writtenFiles }));
  return { preset: normalized, flagCount: Object.keys(getFastFlagPresetFlags(normalized, customFlags)).length, writtenFiles };
}

function clearLegacyClientFpsCap(versionFolder) {
  const settingsDir = path.join(versionFolder, 'ClientSettings');
  const settingsFile = path.join(settingsDir, 'ClientAppSettings.json');

  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });

  const settings = readClientSettings(settingsFile);
  // This scheduler flag is not on the Player allowlist. Use the native
  // FramerateCap setting instead, and remove our legacy fallback.
  delete settings.DFIntTaskSchedulerTargetFps;

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  return settingsFile;
}

function writeClientSettingsGraphicsQuality(versionFolder, quality) {
  const settingsDir = path.join(versionFolder, 'ClientSettings');
  const settingsFile = path.join(settingsDir, 'ClientAppSettings.json');

  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });

  const settings = readClientSettings(settingsFile);
  delete settings.DFIntDebugGraphicsQualityLevelOverride;
  if (quality > 0) settings.DFIntDebugFRMQualityLevelOverride = quality;
  else delete settings.DFIntDebugFRMQualityLevelOverride;

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  return settingsFile;
}


function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureRobloxXmlItem(xml, itemClass) {
  const escapedClass = escapeRegex(itemClass);
  const itemRegex = new RegExp(`<Item\\s+class=["']${escapedClass}["'][\\s\\S]*?<Properties>[\\s\\S]*?<\\/Properties>[\\s\\S]*?<\\/Item>`, 'i');
  if (itemRegex.test(xml)) return xml;

  const block = [
    `  <Item class="${itemClass}" referent="RBX0">`,
    '    <Properties>',
    '    </Properties>',
    '  </Item>'
  ].join('\n');

  if (/<\/roblox>/i.test(xml)) {
    return xml.replace(/<\/roblox>/i, `${block}\n</roblox>`);
  }

  throw new Error('GlobalBasicSettings_13.xml exists but does not look like a Roblox settings XML file.');
}

function upsertRobloxXmlSetting(xml, tag, name, value, itemClass = null) {
  const escapedName = escapeRegex(name);
  const anyExistingSettingRegex = new RegExp(`<([a-zA-Z]+)\\s+name=["']${escapedName}["']>[^<]*<\\/\\1>`, 'i');
  const setting = `<${tag} name="${name}">${value}</${tag}>`;

  // Replace the setting if Roblox already created it. This avoids duplicate
  // SavedQualityLevel / GraphicsMode entries in the settings file.
  if (anyExistingSettingRegex.test(xml)) {
    return xml.replace(anyExistingSettingRegex, setting);
  }

  if (itemClass) {
    xml = ensureRobloxXmlItem(xml, itemClass);
    const escapedClass = escapeRegex(itemClass);
    const itemPropertiesRegex = new RegExp(`(<Item\\s+class=["']${escapedClass}["'][\\s\\S]*?<Properties>)([\\s\\S]*?)(\\s*<\\/Properties>)`, 'i');
    if (itemPropertiesRegex.test(xml)) {
      return xml.replace(itemPropertiesRegex, `$1$2\n      ${setting}$3`);
    }
  }

  if (/<\/Properties>/i.test(xml)) {
    return xml.replace(/<\/Properties>/i, `      ${setting}\n    </Properties>`);
  }
  if (/<\/roblox>/i.test(xml)) {
    return xml.replace(
      /<\/roblox>/i,
      [
        '  <Item class="UserGameSettings" referent="RBX0">',
        '    <Properties>',
        `      ${setting}`,
        '    </Properties>',
        '  </Item>',
        '</roblox>'
      ].join('\n')
    );
  }
  throw new Error('GlobalBasicSettings_13.xml exists but does not look like a Roblox settings XML file.');
}

function ensureGlobalBasicSettingsXml(settingsFile) {
  const robloxRoot = getRobloxRoot();
  if (!fs.existsSync(robloxRoot)) fs.mkdirSync(robloxRoot, { recursive: true });

  if (!fs.existsSync(settingsFile)) {
    return [
      '<roblox version="4">',
      '  <External>null</External>',
      '  <External>nil</External>',
      '  <Item class="UserGameSettings" referent="RBX0">',
      '    <Properties>',
      '    </Properties>',
      '  </Item>',
      '</roblox>',
      ''
    ].join('\n');
  }
  return fs.readFileSync(settingsFile, 'utf-8');
}

function normalizeGraphicsQuality(value) {
  if (value === 'auto' || value === 0) return 0;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, n));
}

const DEFAULT_FPS_CAP = 60;
const MAX_FPS_CAP = 2147483647;
const FPS_RESTORE_MANIFEST = 'SealFpsRestore.json';
const FPS_XML_PATTERN = /<(int|float|double)\s+name=["']FramerateCap["']>[^<]*<\/\1>/i;
let fpsRestoreGuardPid = 0;

function fpsRestoreGuardActive() {
  if (!fpsRestoreGuardPid) return false;
  try {
    process.kill(fpsRestoreGuardPid, 0);
    return true;
  } catch {
    fpsRestoreGuardPid = 0;
    return false;
  }
}

function stopFpsRestoreGuard() {
  if (fpsRestoreGuardActive()) {
    try {
      spawnSync('taskkill.exe', ['/F', '/PID', String(fpsRestoreGuardPid)], {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 3000
      });
    } catch {}
  }
  fpsRestoreGuardPid = 0;
}

function fpsRestoreManifestPath() {
  return path.join(getRobloxRoot(), FPS_RESTORE_MANIFEST);
}

function writeJsonAtomic(file, value) {
  ensureDir(path.dirname(file));
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
  try {
    fs.renameSync(temp, file);
  } catch (err) {
    if (!fs.existsSync(file)) throw err;
    fs.copyFileSync(temp, file);
    fs.unlinkSync(temp);
  }
}

function restoreFpsOverride() {
  const manifestFile = fpsRestoreManifestPath();
  const readyFile = manifestFile + '.guard-ready';
  const manifest = readJsonFile(manifestFile);
  if (!manifest || (!manifest.global && !Array.isArray(manifest.clientSettings))) return false;

  try {
    const global = manifest.global;
    if (global?.file && fs.existsSync(global.file)) {
      let xml = fs.readFileSync(global.file, 'utf8');
      if (global.present && global.tag) {
        if (FPS_XML_PATTERN.test(xml)) xml = xml.replace(FPS_XML_PATTERN, global.tag);
        else if (/<\/Properties>/i.test(xml)) xml = xml.replace(/<\/Properties>/i, `  ${global.tag}\n</Properties>`);
      } else {
        xml = xml.replace(FPS_XML_PATTERN, '');
      }
      fs.writeFileSync(global.file, xml, 'utf8');
    }

    for (const entry of manifest.nativeOnly ? [] : (manifest.clientSettings || [])) {
      if (!entry?.file || !fs.existsSync(entry.file)) continue;
      const settings = readJsonFile(entry.file);
      if (entry.present && !manifest.nativeOnly) settings.DFIntTaskSchedulerTargetFps = entry.value;
      else delete settings.DFIntTaskSchedulerTargetFps;
      fs.writeFileSync(entry.file, JSON.stringify(settings, null, 2), 'utf8');
    }
  } finally {
    try { fs.unlinkSync(manifestFile); } catch {}
    try { fs.unlinkSync(readyFile); } catch {}
    stopFpsRestoreGuard();
  }
  return true;
}

function startFpsRestoreGuard(manifestFile) {
  if (process.platform !== 'win32') return false;
  if (fpsRestoreGuardActive()) return true;

  const quotedManifest = String(manifestFile).replace(/'/g, "''");
  const readyFile = manifestFile + '.guard-ready';
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$parentPidToWatch = ${Number(process.pid)}
$manifestFile = '${quotedManifest}'
$readyFile = $manifestFile + '.guard-ready'
Set-Content -LiteralPath $readyFile -Value 'READY' -Encoding ASCII
Wait-Process -Id $parentPidToWatch -ErrorAction SilentlyContinue
if (-not (Test-Path -LiteralPath $manifestFile)) { exit 0 }
$manifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
$pattern = '<(int|float|double)\\s+name=["'']FramerateCap["'']>[^<]*</\\1>'
if ($manifest.global -and (Test-Path -LiteralPath $manifest.global.file)) {
  $xml = Get-Content -LiteralPath $manifest.global.file -Raw
  $regex = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($manifest.global.present -and $manifest.global.tag) {
    if ($regex.IsMatch($xml)) { $xml = $regex.Replace($xml, [string]$manifest.global.tag, 1) }
    elseif ($xml -match '</Properties>') { $xml = $xml -replace '</Properties>', ('  ' + [string]$manifest.global.tag + "\r\n</Properties>") }
  } else {
    $xml = $regex.Replace($xml, '', 1)
  }
  Set-Content -LiteralPath $manifest.global.file -Value $xml -Encoding UTF8
}
foreach ($entry in @($manifest.clientSettings)) {
  if ($manifest.nativeOnly) { continue }
  if (-not $entry.file -or -not (Test-Path -LiteralPath $entry.file)) { continue }
  try { $settings = Get-Content -LiteralPath $entry.file -Raw | ConvertFrom-Json }
  catch { $settings = [pscustomobject]@{} }
  if ($entry.present -and -not $manifest.nativeOnly) {
    $settings | Add-Member -NotePropertyName 'DFIntTaskSchedulerTargetFps' -NotePropertyValue $entry.value -Force
  } else {
    $settings.PSObject.Properties.Remove('DFIntTaskSchedulerTargetFps')
  }
  $settings | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $entry.file -Encoding UTF8
}
Remove-Item -LiteralPath $manifestFile -Force
Remove-Item -LiteralPath $readyFile -Force
`;

  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const quotedReady = String(readyFile).replace(/'/g, "''");
  // A short-lived PowerShell process starts the real watcher independently and
  // waits for its ready file. Using a separate launcher avoids Node's event-loop
  // spawn race if Seal is ended immediately after Play.
  const starter = `
$watcher = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}') -WindowStyle Hidden -PassThru
$deadline = [DateTime]::UtcNow.AddSeconds(4)
while ([DateTime]::UtcNow -lt $deadline -and -not $watcher.HasExited -and -not (Test-Path -LiteralPath '${quotedReady}')) {
  Start-Sleep -Milliseconds 50
}
if (Test-Path -LiteralPath '${quotedReady}') {
  Write-Output $watcher.Id
  exit 0
}
try { Stop-Process -Id $watcher.Id -Force } catch {}
exit 5
`;
  const started = spawnSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', Buffer.from(starter, 'utf16le').toString('base64')
  ], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 6000
  });
  if (started.status !== 0 || !fs.existsSync(readyFile)) return false;
  const pidMatch = String(started.stdout || '').match(/(\d+)/);
  fpsRestoreGuardPid = pidMatch ? Number(pidMatch[1]) : 0;
  return fpsRestoreGuardPid > 0;
}

function ensureFpsRestoreGuard(versionFolders) {
  const manifestFile = fpsRestoreManifestPath();
  const guardActive = fpsRestoreGuardActive();

  // A stale manifest means Windows shut down before the prior guard could run.
  // Restore it before capturing a new clean baseline.
  if (!guardActive && fs.existsSync(manifestFile)) restoreFpsOverride();

  const globalFile = path.join(getRobloxRoot(), 'GlobalBasicSettings_13.xml');
  let manifest = readJsonFile(manifestFile);
  if (!manifest.global) {
    const xml = fs.existsSync(globalFile) ? fs.readFileSync(globalFile, 'utf8') : '';
    const match = xml.match(FPS_XML_PATTERN);
    const existingValue = Number(String(match?.[0] || '').match(/>([^<]*)</)?.[1]);
    const hasSafeExistingCap = !!match && Number.isFinite(existingValue) && existingValue > 0;
    manifest = {
      // Never preserve a zero/invalid cap left by an older Seal release. On
      // restoration it is safer to remove that tag and let Roblox use default.
      global: { file: globalFile, present: hasSafeExistingCap, tag: hasSafeExistingCap ? match[0] : null },
      clientSettings: []
    };
  }
  if (!Array.isArray(manifest.clientSettings)) manifest.clientSettings = [];
  manifest.nativeOnly = true;

  const knownFiles = new Set((manifest.clientSettings || []).map(entry => entry.file));
  for (const folder of versionFolders) {
    const file = path.join(folder, 'ClientSettings', 'ClientAppSettings.json');
    if (knownFiles.has(file)) continue;
    const settings = readJsonFile(file);
    const hasValue = Object.prototype.hasOwnProperty.call(settings, 'DFIntTaskSchedulerTargetFps');
    const priorValue = Number(settings.DFIntTaskSchedulerTargetFps);
    const present = hasValue && Number.isFinite(priorValue) && priorValue > 0;
    manifest.clientSettings.push({ file, present, value: present ? settings.DFIntTaskSchedulerTargetFps : null });
    knownFiles.add(file);
  }

  writeJsonAtomic(manifestFile, manifest);
  startFpsRestoreGuard(manifestFile);
  return manifestFile;
}

function writeGlobalBasicSettingsFpsCap(fps) {
  const robloxRoot = getRobloxRoot();
  const settingsFile = path.join(robloxRoot, 'GlobalBasicSettings_13.xml');

  if (!fs.existsSync(robloxRoot)) fs.mkdirSync(robloxRoot, { recursive: true });

  const fpsValue = Math.min(MAX_FPS_CAP, Math.max(1, Math.floor(Number(fps) || DEFAULT_FPS_CAP)));

  // Roblox normally creates this file itself. If it exists, preserve the entire
  // file and only edit/insert FramerateCap. If it does not exist yet, create a
  // minimal valid settings file so Roblox has something to read.
  if (!fs.existsSync(settingsFile)) {
    const xml = [
      '<roblox version="4">',
      '  <External>null</External>',
      '  <External>nil</External>',
      '  <Item class="GlobalSettings" referent="RBX0">',
      '    <Properties>',
      `      <int name="FramerateCap">${fpsValue}</int>`,
      '    </Properties>',
      '  </Item>',
      '</roblox>',
      ''
    ].join('\n');
    fs.writeFileSync(settingsFile, xml, 'utf-8');
    return settingsFile;
  }

  let xml = fs.readFileSync(settingsFile, 'utf-8');
  const capTag = `<int name="FramerateCap">${fpsValue}</int>`;

  const existingCapRegex = /<(int|float|double)\s+name=["']FramerateCap["']>[^<]*<\/\1>/i;
  if (existingCapRegex.test(xml)) {
    xml = xml.replace(existingCapRegex, capTag);
  } else if (/<\/Properties>/i.test(xml)) {
    xml = xml.replace(/<\/Properties>/i, `  ${capTag}\n</Properties>`);
  } else if (/<\/roblox>/i.test(xml)) {
    xml = xml.replace(
      /<\/roblox>/i,
      [
        '  <Item class="GlobalSettings" referent="RBX0">',
        '    <Properties>',
        `      ${capTag}`,
        '    </Properties>',
        '  </Item>',
        '</roblox>'
      ].join('\n')
    );
  } else {
    throw new Error('GlobalBasicSettings_13.xml exists but does not look like a Roblox settings XML file.');
  }

  fs.writeFileSync(settingsFile, xml, 'utf-8');
  return settingsFile;
}

function setFpsCap(fps) {
  const requested = Math.floor(Number(fps));
  const normalized = Number.isFinite(requested) && requested > 0
    ? Math.min(MAX_FPS_CAP, Math.max(1, requested))
    : DEFAULT_FPS_CAP;
  const versionFolders = findRobloxVersionFolders();

  if (versionFolders.length === 0) {
    throw new Error(
      'Could not find a Roblox installation under %LOCALAPPDATA%\\Roblox\\Versions. ' +
        'Launch Roblox at least once first.'
    );
  }

  const writtenFiles = [];

  // Capture only the FPS values Seal is about to change. A detached guard
  // restores them if Seal is closed normally, killed in Task Manager, crashes,
  // or the portable EXE is deleted after use.
  ensureFpsRestoreGuard(versionFolders);

  // Clean obsolete scheduler flags in the root and every Player version.
  for (const folder of [getRobloxRoot(), ...versionFolders]) {
    writtenFiles.push(clearLegacyClientFpsCap(folder));
  }

  // Newer Roblox builds store the user-facing max framerate in this global file.
  writtenFiles.push(writeGlobalBasicSettingsFpsCap(normalized));

  console.log('[launcher] fps cap applied:', JSON.stringify({ fps: normalized, writtenFiles }));
  return { fps: normalized, writtenFiles };
}

function repairUnsafeFpsSettings() {
  const repairedFiles = [];
  const globalFile = path.join(getRobloxRoot(), 'GlobalBasicSettings_13.xml');
  if (fs.existsSync(globalFile)) {
    let xml = fs.readFileSync(globalFile, 'utf8');
    const match = xml.match(FPS_XML_PATTERN);
    const value = Number(String(match?.[0] || '').match(/>([^<]*)</)?.[1]);
    if (match && (!Number.isFinite(value) || value <= 0)) {
      xml = xml.replace(FPS_XML_PATTERN, `<int name="FramerateCap">${DEFAULT_FPS_CAP}</int>`);
      fs.writeFileSync(globalFile, xml, 'utf8');
      repairedFiles.push(globalFile);
    }
  }

  for (const folder of [getRobloxRoot(), ...findRobloxVersionFolders()]) {
    const file = path.join(folder, 'ClientSettings', 'ClientAppSettings.json');
    if (!fs.existsSync(file)) continue;
    const settings = readClientSettings(file);
    if (!Object.prototype.hasOwnProperty.call(settings, 'DFIntTaskSchedulerTargetFps')) continue;
    delete settings.DFIntTaskSchedulerTargetFps;
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8');
    repairedFiles.push(file);
  }

  if (repairedFiles.length) console.log('[launcher] repaired unsafe legacy FPS settings:', repairedFiles);
  return { repaired: repairedFiles.length, fps: DEFAULT_FPS_CAP, repairedFiles };
}


function setGraphicsQuality(quality, { useFastFlag = true } = {}) {
  const normalized = normalizeGraphicsQuality(quality);
  const robloxRoot = getRobloxRoot();
  const settingsFile = path.join(robloxRoot, 'GlobalBasicSettings_13.xml');
  let xml = ensureGlobalBasicSettingsXml(settingsFile);

  // SavedQualityLevel=0 is Roblox's normal automatic graphics setting.
  // GraphicsMode is a renderer enum, not the manual/automatic quality switch.
  // Remove the invalid property older Seal versions inserted into UserGameSettings.
  xml = xml.replace(/(<Item\s+class=["']UserGameSettings["'][\s\S]*?<Properties>)([\s\S]*?)(<\/Properties>)/gi,
    (_all, head, properties, tail) => head + properties.replace(/<token\s+name=["']GraphicsMode["']>[^<]*<\/token>/gi, '') + tail);
  xml = upsertRobloxXmlSetting(xml, 'token', 'SavedQualityLevel', String(normalized), 'UserGameSettings');

  fs.writeFileSync(settingsFile, xml, 'utf-8');

  const writtenFiles = [settingsFile];
  for (const folder of [getRobloxRoot(), ...findRobloxVersionFolders()]) {
    writtenFiles.push(writeClientSettingsGraphicsQuality(folder, useFastFlag ? normalized : 0));
  }

  console.log('[launcher] graphics quality applied:', JSON.stringify({ graphicsQuality: normalized, writtenFiles }));
  return { graphicsQuality: normalized, writtenFiles };
}

function readClientSettings(file) {
  if (!fs.existsSync(file)) return {};
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
    return value;
  } catch (error) {
    throw new Error(`Could not read ${file}. Repair its JSON before applying settings: ${error.message}`);
  }
}

function resetPerformanceSettings() {
  // Remove boost flags without changing the user's native graphics level.
  const flags = setFastFlagPreset('off');
  for (const folder of [getRobloxRoot(), ...findRobloxVersionFolders()]) {
    clearLegacyClientFpsCap(folder);
    writeClientSettingsGraphicsQuality(folder, 0);
  }
  return { flags, requiresRelaunch: true };
}

function applyPerformanceSettings({ fpsCap = 60, graphicsQuality = 1, fastFlagPreset = 'off', customFlags = {} } = {}) {
  // Validate before starting the native FPS override/recovery cycle.
  for (const file of getClientAppSettingsTargets()) readClientSettings(file);
  const fps = setFpsCap(fpsCap);
  if (normalizeFastFlagPreset(fastFlagPreset) === 'off') {
    const reset = resetPerformanceSettings();
    const graphics = setGraphicsQuality(graphicsQuality, { useFastFlag: false });
    return { fps, graphics, ...reset };
  }
  const graphics = setGraphicsQuality(graphicsQuality);
  const flags = setFastFlagPreset(fastFlagPreset, customFlags);
  return { fps, graphics, flags };
}

function captureAppliedSettings() {
  const xmlFile=path.join(getRobloxRoot(),'GlobalBasicSettings_13.xml');
  const xml=fs.existsSync(xmlFile)?fs.readFileSync(xmlFile,'utf8'):'';
  const number=(name,fallback)=>{const value=xml.match(new RegExp('<(?:int|token|float)\\s+name=["\']'+name+'["\']>([^<]+)</'))?.[1];return value!==undefined&&Number.isFinite(Number(value))?Number(value):fallback;};
  const files=[path.join(getRobloxRoot(),'ClientSettings','ClientAppSettings.json'),...(findRobloxVersionFolder()?[path.join(findRobloxVersionFolder(),'ClientSettings','ClientAppSettings.json')]:[])];
  const selected=files.find(file=>fs.existsSync(file));
  const customFlags=supportedPlayerFlags(selected?readClientSettings(selected):{});
  return {fpsCap:number('FramerateCap',60),graphicsQuality:Math.max(0,Math.min(10,number('SavedQualityLevel',1))),volume:Math.max(0,Math.min(10,Math.round(number('MasterVolume',0.1)*10))),fastFlagPreset:Object.keys(customFlags).length?'custom':'off',customFlags};
}

function normalizeVolume(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(0, n));
}

function setVolume(volume) {
  const normalized = normalizeVolume(volume);
  const robloxRoot = getRobloxRoot();
  const settingsFile = path.join(robloxRoot, 'GlobalBasicSettings_13.xml');
  let xml = ensureGlobalBasicSettingsXml(settingsFile);
  const scalar = (normalized / 10).toFixed(6);
  xml = upsertRobloxXmlSetting(xml, 'float', 'MasterVolume', scalar, 'UserGameSettings');
  fs.writeFileSync(settingsFile, xml, 'utf-8');
  console.log('[launcher] volume applied:', JSON.stringify({ volume: normalized, scalar, settingsFile }));
  return { volume: normalized, scalar, writtenFiles: [settingsFile] };
}


function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'SealAccountManager/1.0' }, timeout: 8000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Timed out')); });
    req.on('error', reject);
  });
}

async function findBestPublicServer(placeId) {
  const id = String(placeId || '').trim();
  if (!/^\d+$/.test(id)) throw new Error('Best server needs a numeric placeId or roblox.com/games link.');

  let cursor = '';
  const candidates = [];
  for (let page = 0; page < 4; page++) {
    const url = `https://games.roblox.com/v1/games/${id}/servers/Public?sortOrder=Asc&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const json = await fetchJson(url);
    for (const server of json.data || []) {
      if (!server || !server.id) continue;
      if (server.maxPlayers && server.playing >= server.maxPlayers) continue;
      candidates.push(server);
    }
    cursor = json.nextPageCursor || '';
    if (!cursor) break;
  }

  if (!candidates.length) throw new Error('No joinable public servers were found for that place.');

  // Roblox does not always expose ping/region to third-party launchers.
  // When ping is present, use it. Otherwise use a reasonable fallback:
  // lower population first, then higher FPS, then more open slots.
  candidates.sort((a, b) => {
    const ap = Number.isFinite(Number(a.ping)) ? Number(a.ping) : Infinity;
    const bp = Number.isFinite(Number(b.ping)) ? Number(b.ping) : Infinity;
    if (ap !== bp) return ap - bp;
    const ar = (Number(a.playing) || 0) / Math.max(1, Number(a.maxPlayers) || 1);
    const br = (Number(b.playing) || 0) / Math.max(1, Number(b.maxPlayers) || 1);
    if (ar !== br) return ar - br;
    const afps = Number(a.fps) || 0;
    const bfps = Number(b.fps) || 0;
    return bfps - afps;
  });

  const best = candidates[0];
  return {
    placeId: id,
    gameInstanceId: best.id,
    ping: Number.isFinite(Number(best.ping)) ? Number(best.ping) : null,
    fps: Number.isFinite(Number(best.fps)) ? Number(best.fps) : null,
    playing: best.playing,
    maxPlayers: best.maxPlayers,
    usedPing: Number.isFinite(Number(best.ping))
  };
}

function getContentRoots() {
  const roots = [];
  for (const folder of findRobloxVersionFolders()) {
    roots.push(path.join(folder, 'content'));
    roots.push(path.join(folder, 'ExtraContent'));
  }
  return roots.filter(fs.existsSync);
}

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function backupOnce(file) {
  if (!fs.existsSync(file)) return null;
  const backup = file + '.sealbak';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  return backup;
}

function copyIfExists(source, target, options = {}) {
  if (!source || !fs.existsSync(source) || !target) return false;
  const createdMarker = target + '.sealcreated';
  const targetExisted = fs.existsSync(target);
  try {
    const targetDir = path.dirname(target);
    ensureDir(targetDir);
    // Files created by Seal have no original Roblox file to back up. On later
    // applies, keep their marker instead of backing up the previous modded copy.
    if (targetExisted && !fs.existsSync(createdMarker)) backupOnce(target);
    else if (!options.createMissing) return false;
    fs.copyFileSync(source, target);
    if (!targetExisted && options.createMissing) {
      fs.writeFileSync(createdMarker, 'Created by Seal; remove the adjacent file when restoring.\n', 'utf8');
    }
    return true;
  } catch (err) {
    console.warn('[mods] copy failed:', source, '->', target, err.message);
    return false;
  }
}

function walkFiles(root, predicate, max = 5000) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < max) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try { if (predicate(full, entry.name)) out.push(full); } catch {}
      }
    }
  }
  return [...new Set(out)];
}

const FULLBRIGHT_BACKUP_SUFFIX = '.sealfullbrightbak';
const FULLBRIGHT_MANIFEST_FILE = 'manifest.json';

function fullbrightBackupRoot() {
  try {
    const electronApp = require('electron').app;
    return path.join(electronApp.getPath('userData'), 'fullbright-backup');
  } catch {
    return path.join(os.homedir(), 'AppData', 'Local', 'Seal Account Manager', 'fullbright-backup');
  }
}

function fullbrightManifestPath(backupRoot = fullbrightBackupRoot()) {
  return path.join(backupRoot, FULLBRIGHT_MANIFEST_FILE);
}

function readFullbrightManifest(backupRoot = fullbrightBackupRoot()) {
  const parsed = readJsonFile(fullbrightManifestPath(backupRoot));
  const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  return entries.filter(entry => entry && typeof entry.relativePath === 'string' && entry.relativePath.length > 0);
}

function safeFullbrightRelativePath(file, versionsRoot = path.join(getRobloxRoot(), 'Versions')) {
  const relativePath = path.relative(versionsRoot, file);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return relativePath;
}

function fullbrightBackupForRelativePath(relativePath, backupRoot = fullbrightBackupRoot()) {
  return path.join(backupRoot, 'files', relativePath);
}

function writeFullbrightManifest(entries, backupRoot = fullbrightBackupRoot()) {
  const manifest = fullbrightManifestPath(backupRoot);
  const normalized = [...new Map(entries.map(entry => [entry.relativePath.toLowerCase(), entry])).values()];
  ensureDir(path.dirname(manifest));
  fs.writeFileSync(manifest, JSON.stringify({ version: 1, entries: normalized }, null, 2), 'utf8');
  return normalized;
}

function fullbrightFiles(versionFolders = findRobloxVersionFolders()) {
  const originals = [];
  const backups = [];
  for (const versionFolder of versionFolders) {
    const texturesRoot = path.join(versionFolder, 'PlatformContent', 'pc', 'textures');
    if (!fs.existsSync(texturesRoot)) continue;
    originals.push(...walkFiles(
      texturesRoot,
      (_full, name) => /^brdfLUT\.[^.]+$/i.test(name),
      40
    ));
    backups.push(...walkFiles(
      texturesRoot,
      (_full, name) => name.toLowerCase().startsWith('brdflut.') && name.endsWith(FULLBRIGHT_BACKUP_SUFFIX),
      40
    ));
  }
  return {
    originals: [...new Set(originals)],
    backups: [...new Set(backups)]
  };
}

function setFullbright(enabled, versionFolders = findRobloxVersionFolders(), options = {}) {
  const before = fullbrightFiles(versionFolders);
  const versionsRoot = options.versionsRoot || path.join(getRobloxRoot(), 'Versions');
  const backupRoot = options.backupRoot || fullbrightBackupRoot();
  let manifestEntries = readFullbrightManifest(backupRoot);
  let changed = 0;
  let already = 0;
  const errors = [];

  if (enabled) {
    // Migrate Seal's older beside-the-texture backups into AppData first.
    // Keeping the backup outside Roblox mirrors Voidstrap's working design and
    // prevents Roblox from seeing or replacing the backup during an update.
    for (const legacyBackup of before.backups) {
      const original = legacyBackup.slice(0, -FULLBRIGHT_BACKUP_SUFFIX.length);
      const relativePath = safeFullbrightRelativePath(original, versionsRoot);
      if (!relativePath) continue;
      const persistentBackup = fullbrightBackupForRelativePath(relativePath, backupRoot);
      try {
        ensureDir(path.dirname(persistentBackup));
        fs.copyFileSync(legacyBackup, persistentBackup);
        manifestEntries.push({ relativePath });
        fs.unlinkSync(legacyBackup);
        changed++;
      } catch (err) {
        errors.push(`${path.basename(legacyBackup)}: ${err.message}`);
      }
    }

    for (const original of before.originals) {
      const relativePath = safeFullbrightRelativePath(original, versionsRoot);
      if (!relativePath) continue;
      const backup = fullbrightBackupForRelativePath(relativePath, backupRoot);
      try {
        ensureDir(path.dirname(backup));
        // Roblox may refresh the LUT in-place. Keep the newest copy so turning
        // Fullbright off always restores the currently installed client file.
        fs.copyFileSync(original, backup);
        manifestEntries.push({ relativePath });
        fs.unlinkSync(original);
        changed++;
      } catch (err) {
        errors.push(`${path.basename(original)}: ${err.message}`);
      }
    }
    manifestEntries = writeFullbrightManifest(manifestEntries, backupRoot);
    already = manifestEntries.filter(entry => {
      const original = path.join(versionsRoot, entry.relativePath);
      const backup = fullbrightBackupForRelativePath(entry.relativePath, backupRoot);
      return fs.existsSync(backup) && !fs.existsSync(original);
    }).length;
  } else {
    // Restore legacy backups left by v1.20 and older before cleaning them up.
    for (const backup of before.backups) {
      const original = backup.slice(0, -FULLBRIGHT_BACKUP_SUFFIX.length);
      try {
        if (!fs.existsSync(original)) {
          ensureDir(path.dirname(original));
          fs.copyFileSync(backup, original);
        }
        fs.unlinkSync(backup);
        changed++;
      } catch (err) {
        errors.push(`${path.basename(backup)}: ${err.message}`);
      }
    }

    for (const entry of manifestEntries) {
      const original = path.join(versionsRoot, entry.relativePath);
      const backup = fullbrightBackupForRelativePath(entry.relativePath, backupRoot);
      try {
        // Do not recreate a Roblox version folder that its updater removed.
        const versionName = entry.relativePath.split(/[\\/]/)[0];
        const versionFolder = path.join(versionsRoot, versionName);
        if (fs.existsSync(backup) && fs.existsSync(versionFolder) && !fs.existsSync(original)) {
          ensureDir(path.dirname(original));
          fs.copyFileSync(backup, original);
          changed++;
        }
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
      } catch (err) {
        errors.push(`${path.basename(backup)}: ${err.message}`);
      }
    }
    manifestEntries = writeFullbrightManifest([], backupRoot);
  }

  const activeEntries = readFullbrightManifest(backupRoot);
  return {
    enabled: !!enabled,
    changed,
    already,
    targets: before.originals.length + before.backups.length + manifestEntries.length,
    active: activeEntries.some(entry => {
      const original = path.join(versionsRoot, entry.relativePath);
      return fs.existsSync(fullbrightBackupForRelativePath(entry.relativePath, backupRoot)) && !fs.existsSync(original);
    }),
    backupRoot,
    errors
  };
}

function systemFontPath(kind) {
  const fonts = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
  const map = {
    arial: ['arial.ttf', 'arialbd.ttf'],
    segoe: ['segoeui.ttf', 'segoeuib.ttf'],
    comic: ['comic.ttf', 'comicbd.ttf'],
    consolas: ['consola.ttf', 'consolab.ttf'],
    verdana: ['verdana.ttf', 'verdanab.ttf'],
    tahoma: ['tahoma.ttf', 'tahomabd.ttf'],
    georgia: ['georgia.ttf', 'georgiab.ttf']
  };
  const names = map[String(kind || '').toLowerCase()] || [];
  for (const name of names) {
    const full = path.join(fonts, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function assetPath(...parts) {
  const candidates = [];
  try {
    if (appIsPackagedSafe()) {
      // Prefer real filesystem resources first. External programs like ffmpeg
      // cannot read files inside app.asar even though Electron's fs can.
      candidates.push(path.join(process.resourcesPath, 'seal-mod-assets', ...parts));
      candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'seal-mod-assets', ...parts));
    }
  } catch {}
  candidates.push(path.join(__dirname, 'seal-mod-assets', ...parts));
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  return candidates[candidates.length - 1];
}
function appIsPackagedSafe() {
  try { return !!require('electron').app?.isPackaged; } catch { return false; }
}

function audioCacheDir() {
  try {
    const electronApp = require('electron').app;
    return path.join(electronApp.getPath('userData'), 'seal-audio-cache');
  } catch {
    return path.join(os.tmpdir(), 'seal-audio-cache');
  }
}

function normalizeAudioExtension(file) {
  const ext = path.extname(String(file || '')).toLowerCase();
  return ['.mp3', '.ogg', '.wav'].includes(ext) ? ext : '.mp3';
}

function audioSourceWithExtension(source, ext) {
  if (!source) return source;
  const normalizedExt = normalizeAudioExtension(ext);
  if (path.extname(source).toLowerCase() === normalizedExt) return source;
  const sibling = path.join(path.dirname(source), path.basename(source, path.extname(source)) + normalizedExt);
  return fs.existsSync(sibling) ? sibling : source;
}

function normalizeDeathVolumePercent(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 100;
  return Math.min(400, Math.max(50, n));
}

function deathVolumePercentForMods(mods = {}) {
  const explicit = mods && Object.prototype.hasOwnProperty.call(mods, 'deathVolume');
  if (explicit) return normalizeDeathVolumePercent(mods.deathVolume);
  return 100;
}

function normalizeDeathCutoffSeconds(value) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 1.2;
  return Math.min(3.0, Math.max(0.4, n));
}

function deathCutoffSecondsForMods(mods = {}) {
  if (mods && Object.prototype.hasOwnProperty.call(mods, 'deathCutoff')) {
    return normalizeDeathCutoffSeconds(mods.deathCutoff);
  }
  if (mods && Object.prototype.hasOwnProperty.call(mods, 'deathCutoffSeconds')) {
    return normalizeDeathCutoffSeconds(mods.deathCutoffSeconds);
  }
  return 1.2;
}

function normalizeDeathCutoffSeconds(value) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 1.4;
  return Math.min(5, Math.max(0.3, Math.round(n * 10) / 10));
}

function deathCutoffSecondsForMods(mods = {}) {
  return normalizeDeathCutoffSeconds(mods.deathCutoffSeconds || mods.deathSoundCutoff || 1.4);
}

function convertDeathSoundToFormat(source, destination, options = {}) {
  if (!source || !fs.existsSync(source)) throw new Error('The selected audio file no longer exists.');
  const stat = fs.statSync(source);
  if (!stat.isFile() || stat.size < 4 || stat.size > 50 * 1024 * 1024) {
    throw new Error('Choose an audio file smaller than 50 MB.');
  }
  ensureDir(path.dirname(destination));
  const ext = normalizeAudioExtension(destination);
  const matchingSource = audioSourceWithExtension(source, ext);
  if (path.extname(matchingSource).toLowerCase() !== ext) {
    throw new Error(`The clean edition only accepts pre-converted ${ext.slice(1).toUpperCase()} audio for this Roblox sound slot.`);
  }
  fs.copyFileSync(matchingSource, destination);
  return destination;
}

function convertDeathSoundToMp3(source, destination) {
  return convertDeathSoundToFormat(source, destination);
}

function convertDeathSoundToShortMp3(source, destination) {
  return convertDeathSoundToFormat(source, destination, { shortDeath: true });
}

function cachedRobloxAudio(source, cacheName, extension = '.mp3', options = {}) {
  if (!source || !fs.existsSync(source)) return source;
  const ext = normalizeAudioExtension(extension);
  const bestSource = audioSourceWithExtension(source, ext);
  const destination = path.join(audioCacheDir(), cacheName + ext);
  const sourceStat = fs.statSync(bestSource);
  let fresh = false;
  try {
    const destStat = fs.statSync(destination);
    fresh = destStat.size > 0 && destStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {}

  // Normal mods can copy matching formats directly, but volume changes must be rendered
  // into a new audio file even when the source extension already matches the target.
  const needsProcessing = !!options.shortDeath || !!options.timedDeath || String(options.deathPlayback || '').toLowerCase() === 'timed' || String(options.deathPlayback || '').toLowerCase() === 'reliable' || normalizeDeathVolumePercent(options.volumePercent) !== 100;
  if (!needsProcessing && path.extname(bestSource).toLowerCase() === ext) return bestSource;
  return fresh ? destination : convertDeathSoundToFormat(bestSource, destination, options);
}

function cachedRobloxMp3(source, cacheName) {
  return cachedRobloxAudio(source, cacheName, '.mp3');
}

function audioForRobloxTarget(source, target, cacheName) {
  if (!source || !fs.existsSync(source)) return source;
  const ext = normalizeAudioExtension(target);
  return cachedRobloxAudio(audioSourceWithExtension(source, ext), cacheName, ext);
}

function deathPlaybackModeForMods(mods = {}) {
  const mode = String(mods.deathPlayback || mods.deathSoundPlayback || 'full').toLowerCase();
  return mode === 'timed' ? 'timed' : 'full';
}

function deathTargetModeForMods(mods = {}) {
  const mode = String(mods.deathTarget || mods.deathSoundTarget || 'auto').toLowerCase();
  if (mode === 'legacy_ouch' || mode === 'current_uuhhh') return mode;
  return 'auto';
}

function audioForRobloxDeathTarget(source, target, cacheName, mods = {}) {
  if (!source || !fs.existsSync(source)) return source;
  const ext = normalizeAudioExtension(target);
  const volumePercent = deathVolumePercentForMods(mods);
  const playbackMode = deathPlaybackModeForMods(mods);
  const cutoffSeconds = deathCutoffSecondsForMods(mods);
  // Include volume + mode + cutoff in cache name so changes regenerate instead of
  // reusing old cached files.
  return cachedRobloxAudio(
    audioSourceWithExtension(source, ext),
    `${cacheName}-v165-${playbackMode}-cut${String(cutoffSeconds).replace('.', '_')}-vol${volumePercent}`,
    ext,
    { timedDeath: playbackMode === 'timed', shortDeath: false, volumePercent, deathPlayback: playbackMode, deathCutoffSeconds: cutoffSeconds }
  );
}

function audioForRobloxShortDeathTarget(source, target, cacheName, volumePercent = 200) {
  if (!source || !fs.existsSync(source)) return source;
  const ext = normalizeAudioExtension(target);
  return cachedRobloxAudio(audioSourceWithExtension(source, ext), `${cacheName}-short-vol${normalizeDeathVolumePercent(volumePercent)}`, ext, { shortDeath: true, volumePercent });
}

function collectExistingTargets(root, relativeTargets) {
  return [...new Set(relativeTargets.map(rel => path.join(root, ...rel.split('/'))).filter(fs.existsSync))];
}

function fontTargets(root) {
  const fontsDir = path.join(root, 'fonts');
  const known = collectExistingTargets(root, [
    'fonts/BuilderSans-Regular.otf', 'fonts/BuilderSans-Medium.otf', 'fonts/BuilderSans-Bold.otf',
    'fonts/GothamSSm-Book.otf', 'fonts/GothamSSm-Medium.otf', 'fonts/GothamSSm-Bold.otf',
    'fonts/SourceSansPro-Regular.ttf', 'fonts/SourceSansPro-Bold.ttf',
    'fonts/LegacyArial.ttf', 'fonts/Arial.ttf'
  ]);
  const discovered = fs.existsSync(fontsDir)
    ? walkFiles(fontsDir, (_full, name) => /^(BuilderSans|Gotham|SourceSans|Arial|Legacy).*\.(otf|ttf)$/i.test(name), 200)
    : [];
  return [...new Set([...known, ...discovered])];
}

function cursorTargets(root) {
  const known = collectExistingTargets(root, [
    'textures/Cursors/KeyboardMouse/ArrowCursor.png',
    'textures/Cursors/KeyboardMouse/ArrowFarCursor.png',
    'textures/Cursors/KeyboardMouse/IBeamCursor.png',
    'textures/Cursors/KeyboardMouse/MouseLockedCursor.png',
    'textures/Cursors/KeyboardMouse/MouseLockedCursor@2x.png',
    'textures/Cursors/KeyboardMouse/ArrowCursor@2x.png',
    'textures/Cursors/KeyboardMouse/ArrowFarCursor@2x.png',
    'textures/Cursors/Gamepad/GamepadCursor.png'
  ]);
  const cursorsRoot = path.join(root, 'textures', 'Cursors');
  const discovered = fs.existsSync(cursorsRoot)
    ? walkFiles(cursorsRoot, (_full, name) => /cursor.*\.png$/i.test(name) || /^(Arrow|IBeam|MouseLocked|Gamepad).*\.png$/i.test(name), 500)
    : [];
  return [...new Set([...known, ...discovered])];
}


function textureTargets(root) {
  const textureRoot = path.join(root, 'textures');
  const known = collectExistingTargets(root, [
    'textures/studs.png', 'textures/wangIndex.png', 'textures/grass.png', 'textures/wood.png',
    'textures/brick.png', 'textures/diamondplate.png', 'textures/fabric.png', 'textures/marble.png',
    'textures/metal.png', 'textures/plastic.png', 'textures/slate.png',
    'textures/terrain/grass.png', 'textures/terrain/ground.png',
    'textures/MaterialTextures/grass.png', 'textures/MaterialTextures/brick.png',
    'textures/PlatformContent/pc/textures/grass.png',
    'textures/PlatformContent/pc/textures/brick.png',
    'textures/PlatformContent/pc/textures/wood.png',
    'textures/PlatformContent/pc/textures/metal.png'
  ]);

  // Roblox moves material files around between versions. Scan the texture tree
  // for normal image material files while avoiding cursors/icons/UI. Only
  // replace existing image files; do not create fake DDS files.
  const discovered = fs.existsSync(textureRoot)
    ? walkFiles(textureRoot, (full, name) => {
        const lower = full.toLowerCase();
        if (!/\.png$/i.test(name)) return false;
        if (lower.includes('cursors')) return false;
        if (lower.includes('fonts')) return false;
        if (lower.includes('sounds')) return false;
        if (lower.includes('ui') || lower.includes('icon')) return false;
        return /(grass|brick|wood|metal|plastic|slate|fabric|marble|stud|terrain|ground|material|diamond)/i.test(name + ' ' + full);
      }, 600)
    : [];
  return [...new Set([...known, ...discovered])];
}


function soundDirectories(root) {
  const dirs = [
    path.join(root, 'sounds'),
    path.join(root, 'Sounds'),
    path.join(root, 'PlatformContent', 'pc', 'sounds'),
    path.join(root, 'PlatformContent', 'pc', 'Sounds'),
    path.join(root, 'PlatformContent', 'shared', 'sounds'),
    path.join(root, 'ExtraContent', 'sounds')
  ];
  return [...new Set(dirs)];
}


const SEAL_PERSISTENT_DEATH_MARKER = 'Seal Account Manager persistent death sound patch';

function isDeathSoundMode(mode) {
  return ['mute_death', 'classic_death', 'custom_death', 'rezero_death', 'persona5_last_surprise'].includes(String(mode || ''));
}

function rbxCharacterSoundScriptTargets(root) {
  const candidates = [];
  const rootsToScan = [
    path.join(root, 'scripts'),
    path.join(root, 'Scripts'),
    path.join(root, 'scripts', 'PlayerScripts'),
    path.join(root, 'scripts', 'CoreScripts'),
    root
  ];
  for (const scanRoot of [...new Set(rootsToScan)]) {
    if (!fs.existsSync(scanRoot)) continue;
    const hits = walkFiles(scanRoot, (full, name) => {
      if (!/^RbxCharacterSounds\.(lua|luau|txt)$/i.test(name) && !/CharacterSounds/i.test(name)) return false;
      try {
        const data = fs.readFileSync(full, 'utf8');
        return /humanoid\.Died\s*:Connect/i.test(data) && /sounds\s*\.\s*Died/i.test(data);
      } catch {
        return false;
      }
    }, 80);
    candidates.push(...hits);
  }
  return [...new Set(candidates)];
}

function patchRbxCharacterSoundsForPersistentDeath(file) {
  if (!file || !fs.existsSync(file)) return { changed: false, reason: 'missing' };
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes(SEAL_PERSISTENT_DEATH_MARKER)) return { changed: false, alreadyPatched: true };

  const replacement = [
    `-- ${SEAL_PERSISTENT_DEATH_MARKER}`,
    'do',
    '  local sealOk = pcall(function()',
    '    if sounds and sounds.Died then',
    '      local sealClone = sounds.Died:Clone()',
    '      sealClone.Parent = game:GetService("SoundService")',
    '      sealClone:Play()',
    '      local sealLifetime = 8',
    '      pcall(function()',
    '        if sealClone.TimeLength and sealClone.TimeLength > 0 then',
    '          sealLifetime = math.min(15, math.max(4, sealClone.TimeLength + 1))',
    '        end',
    '      end)',
    '      game:GetService("Debris"):AddItem(sealClone, sealLifetime)',
    '    end',
    '  end)',
    'end',
    `-- /${SEAL_PERSISTENT_DEATH_MARKER}`
  ].join('\n');

  const patterns = [
    /sounds\s*\.\s*Died\s*:\s*Play\s*\(\s*\)/g,
    /sounds\s*\[\s*["']Died["']\s*\]\s*:\s*Play\s*\(\s*\)/g
  ];

  let replaced = 0;
  for (const pattern of patterns) {
    text = text.replace(pattern, () => { replaced++; return replacement; });
  }

  if (replaced === 0) {
    return { changed: false, reason: 'play call not found' };
  }

  backupOnce(file);
  fs.writeFileSync(file, text, 'utf8');
  return { changed: true, replacements: replaced };
}

function applyPersistentDeathSoundPatch(root, mods = {}) {
  if (!isDeathSoundMode(mods.sounds)) return { changed: 0, targets: 0, skipped: true };
  if (mods.deathPersistent === false || mods.persistentDeathSound === false) return { changed: 0, targets: 0, disabled: true };
  const targets = rbxCharacterSoundScriptTargets(root);
  let changed = 0;
  let already = 0;
  const errors = [];
  for (const target of targets) {
    try {
      const result = patchRbxCharacterSoundsForPersistentDeath(target);
      if (result.changed) changed++;
      else if (result.alreadyPatched) already++;
      else if (result.reason) errors.push(`${path.basename(target)}: ${result.reason}`);
    } catch (err) {
      errors.push(`${path.basename(target)}: ${err.message}`);
    }
  }
  return { changed, targets: targets.length, already, errors };
}

function soundTargets(root, mode, targetMode = 'auto') {
  const dirs = soundDirectories(root);
  const isDeathMode = isDeathSoundMode(mode);
  if (isDeathMode) {
    const relativeDeathNames = [
      'uuhhh.mp3', 'uuhhh.ogg', 'uuhhh.wav',
      'ouch.mp3', 'ouch.ogg', 'ouch.wav',
      'oof.mp3', 'oof.ogg', 'oof.wav',
      'death.mp3', 'death.ogg', 'death.wav'
    ];

    const existing = [];
    const fallback = [];
    for (const dir of dirs) {
      for (const name of relativeDeathNames) {
        const target = path.join(dir, name);
        if (fs.existsSync(target)) existing.push(target);
      }
      const normalContentSounds = dir.toLowerCase().endsWith(`${path.sep}content${path.sep}sounds`);
      if (fs.existsSync(dir) || normalContentSounds) {
        // Keep both current and legacy names as safe fallback targets. This is
        // more reliable than legacy-only because modern Roblox often uses uuhhh.mp3.
        fallback.push(path.join(dir, 'uuhhh.mp3'), path.join(dir, 'ouch.ogg'));
      }
    }

    const discovered = [];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      discovered.push(...walkFiles(dir, (_full, name) => /^(uuhhh|ouch|oof|death)\.(mp3|ogg|wav)$/i.test(name), 500));
    }

    const autoTargets = [...new Set([...existing, ...discovered, ...fallback])];
    const normalizedTarget = String(targetMode || 'auto').toLowerCase();
    const mainContentSounds = path.join(root, 'sounds');

    // These options now prioritize a specific known file, but still include the
    // auto-detected real Roblox targets so choosing the wrong target cannot make
    // the mod silently worse or write only to an unused file.
    if (normalizedTarget === 'legacy_ouch') {
      return [...new Set([path.join(mainContentSounds, 'ouch.ogg'), ...autoTargets])];
    }
    if (normalizedTarget === 'current_uuhhh') {
      return [...new Set([path.join(mainContentSounds, 'uuhhh.mp3'), ...autoTargets])];
    }
    return autoTargets;
  }

  const sets = {
    quiet: ['button.wav', 'snap.wav', 'bass.wav'],
    mute_ui: ['button.wav', 'snap.wav', 'click.wav'],
    mute_all: ['ouch.ogg', 'button.wav', 'snap.wav', 'uuhhh.wav', 'uuhhh.ogg', 'bass.wav', 'victory.wav', 'click.wav']
  };
  const names = sets[mode] || sets.quiet;
  const exact = [];
  for (const dir of dirs) {
    for (const name of names) {
      const target = path.join(dir, name);
      if (fs.existsSync(target)) exact.push(target);
    }
  }
  const wanted = new Set(names.map(n => n.toLowerCase()));
  const discovered = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    discovered.push(...walkFiles(dir, (_full, name) => {
      const n = name.toLowerCase();
      if (wanted.has(n)) return true;
      if (mode === 'mute_ui') return /(button|snap|click|hover|select).*\.(ogg|wav|mp3)$/i.test(name);
      return wanted.has(n);
    }, 500));
  }
  return [...new Set([...exact, ...discovered])];
}

function deathSoundBaseSource(mods) {
  const mode = String(mods.sounds || 'default');
  if (mode === 'classic_death') return assetPath('sounds', 'classic-death.ogg');
  if (mode === 'rezero_death') return assetPath('sounds', 'death-packs', 'rezero-return-by-death', 'return-by-death.ogg');
  if (mode === 'persona5_last_surprise') return assetPath('sounds', 'death-packs', 'persona-5-last-surprise', 'last-surprise.ogg');
  if (mode === 'custom_death' && mods.customDeathSoundPath) return mods.customDeathSoundPath;
  return assetPath('sounds', 'quiet.ogg');
}

function deathSoundSource(mods) {
  const mode = String(mods.sounds || 'default');
  if (mode === 'classic_death') return cachedRobloxMp3(assetPath('sounds', 'classic-death.ogg'), 'classic-death');
  if (mode === 'rezero_death') return cachedRobloxMp3(assetPath('sounds', 'death-packs', 'rezero-return-by-death', 'return-by-death.ogg'), 'rezero-return-by-death');
  if (mode === 'persona5_last_surprise') return cachedRobloxMp3(assetPath('sounds', 'death-packs', 'persona-5-last-surprise', 'last-surprise.ogg'), 'persona5-last-surprise');
  if (mode === 'custom_death' && mods.customDeathSoundPath) return cachedRobloxMp3(mods.customDeathSoundPath, 'custom-death');
  return cachedRobloxMp3(assetPath('sounds', 'quiet.ogg'), 'quiet-death');
}

function applyRobloxMods(mods = {}) {
  const roots = getContentRoots();
  if (!roots.length) throw new Error('Could not find Roblox content folders. Launch/update Roblox once first.');
  let changed = 0;
  const details = [];

  for (const root of roots) {
    if (mods.font && mods.font !== 'default') {
      const font = systemFontPath(mods.font);
      const targets = fontTargets(root);
      let n = 0;
      if (font) for (const target of targets) if (copyIfExists(font, target)) { changed++; n++; }
      details.push({ mod: 'font', root, sourceFound: !!font, targets: targets.length, changed: n });
    }

    if (mods.cursor && mods.cursor !== 'default') {
      const cursor = mods.cursor === 'custom' && mods.customCursorPath
        ? mods.customCursorPath
        : assetPath('cursors', mods.cursor + '.png');
      const targets = cursorTargets(root);
      let n = 0;
      for (const target of targets) if (copyIfExists(cursor, target)) { changed++; n++; }
      details.push({ mod: 'cursor', root, sourceFound: fs.existsSync(cursor), targets: targets.length, changed: n });
    }

    if (mods.textures && mods.textures !== 'default') {
      const textureFile = 'soft.png';
      const tex = assetPath('textures', textureFile);
      const targets = textureTargets(root);
      let n = 0;
      for (const target of targets) if (copyIfExists(tex, target)) { changed++; n++; }
      details.push({ mod: 'textures', root, sourceFound: fs.existsSync(tex), targets: targets.length, changed: n });
    }

    if (mods.sounds && mods.sounds !== 'default') {
      const baseSoundSource = deathSoundBaseSource(mods);
      const deathTargetMode = deathTargetModeForMods(mods);
      const targets = soundTargets(root, mods.sounds, deathTargetMode);
      const createMissing = isDeathSoundMode(mods.sounds);
      let n = 0;
      for (const target of targets) {
        const sourceForTarget = createMissing
          ? audioForRobloxDeathTarget(baseSoundSource, target, `${String(mods.sounds)}-${path.basename(target, path.extname(target))}`, mods)
          : deathSoundSource(mods);
        if (copyIfExists(sourceForTarget, target, { createMissing })) { changed++; n++; }
      }
      details.push({ mod: 'sounds', root, targetMode: deathTargetMode, sourceFound: !!baseSoundSource && fs.existsSync(baseSoundSource), targets: targets.length, changed: n });

      const persistentPatch = applyPersistentDeathSoundPatch(root, mods);
      if (!persistentPatch.skipped && !persistentPatch.disabled) {
        changed += persistentPatch.changed || 0;
        details.push({
          mod: 'death script',
          root,
          sourceFound: true,
          targets: persistentPatch.targets || 0,
          changed: persistentPatch.changed || 0,
          already: persistentPatch.already || 0,
          errors: persistentPatch.errors || []
        });
      }
    }
  }

  const fullbright = setFullbright(mods.fullbright === true);
  // Voidstrap's Fullbright deliberately avoids lighting FastFlags. Restore any
  // legacy Seal Fullbright flags so the brdfLUT removal can take effect cleanly.
  const fullbrightFlags = setFullbrightFastFlags(false);
  changed += fullbright.changed + fullbrightFlags.changed;
  const fullbrightErrors = [...fullbright.errors, ...fullbrightFlags.errors];
  if (mods.fullbright === true || fullbright.changed || fullbrightFlags.changed || fullbright.already || fullbrightFlags.already || fullbrightErrors.length) {
    details.push({
      mod: 'fullbright',
      root: findRobloxVersionFolder() || '',
      sourceFound: fullbright.targets > 0 || fullbrightFlags.targets > 0,
      targets: fullbright.targets + fullbrightFlags.targets,
      changed: fullbright.changed + fullbrightFlags.changed,
      already: fullbright.already + fullbrightFlags.already,
      enabled: fullbright.enabled,
      active: fullbright.active,
      errors: fullbrightErrors,
      lightingFlags: fullbrightFlags.flags
    });
  }
  return { changed, details, roots };
}

function restoreRobloxMods() {
  const roots = getContentRoots();
  const fullbright = setFullbright(false);
  const fullbrightFlags = setFullbrightFastFlags(false);
  let restored = fullbright.changed + fullbrightFlags.changed;
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile() && entry.name.endsWith('.sealbak')) {
          const original = full.slice(0, -'.sealbak'.length);
          fs.copyFileSync(full, original);
          restored++;
        } else if (entry.isFile() && entry.name.endsWith('.sealcreated')) {
          const created = full.slice(0, -'.sealcreated'.length);
          if (fs.existsSync(created)) fs.unlinkSync(created);
          fs.unlinkSync(full);
          restored++;
        }
      }
    }
  }
  return { restored, fullbright, fullbrightFlags };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function buildLaunchUri(authTicket, target) {
  const launchTime = Date.now();
  const browserTrackerId = Math.floor(Math.random() * 1e15);
  const joinAttemptId = generateUUID();

  // No target: open the Roblox app/home. This URI is simpler and avoids a
  // fake placeId=0 request that can behave differently across client versions.
  if (!target || (!target.placeId && !target.followUserId && !target.privateServerShareCode && !target.privateServerLinkCode)) {
    return [
      'roblox-player://1',
      '+launchmode:app',
      `+gameinfo:${authTicket}`,
      `+launchtime:${launchTime}`,
      `+browsertrackerid:${browserTrackerId}`,
      '+robloxLocale:en_us',
      '+gameLocale:en_us',
      '+channel:',
      '+LaunchExp:InApp'
    ].join('');
  }

  let placeLauncherUrl;
  if (target.followUserId) {
    placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestFollowUser&userId=${target.followUserId}`;
  } else if (target.privateServerShareCode) {
    // Fallback only: new /share links should normally be resolved in main.js
    // into { placeId, privateServerLinkCode } before reaching this function.
    placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestPrivateGame&linkCode=${encodeURIComponent(target.privateServerShareCode)}`;
  } else if (target.privateServerLinkCode) {
    // Use the resolved old-style privateServerLinkCode as PlaceLauncher linkCode.
    placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestPrivateGame&placeId=${target.placeId}&linkCode=${encodeURIComponent(target.privateServerLinkCode)}`;
  } else if (target.gameInstanceId) {
    placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGameJob&placeId=${target.placeId}&gameId=${encodeURIComponent(target.gameInstanceId)}`;
  } else {
    placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${target.placeId}&isPlayTogetherGame=false`;
  }

  const params = [
    '1',
    'launchmode:play',
    `gameinfo:${authTicket}`,
    `launchtime:${launchTime}`,
    `placelauncherurl:${encodeURIComponent(placeLauncherUrl)}`,
    `browsertrackerid:${browserTrackerId}`,
    `joinAttemptId:${joinAttemptId}`,
    'joinAttemptOrigin:PlayButton',
    'robloxLocale:en_us',
    'gameLocale:en_us',
    'LaunchExp:InApp',
    'channel:'
  ];

  return 'roblox-player://' + params.join('+');
}

function isRobloxRunning() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(false);
    exec('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /NH', { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(false);
      resolve(/RobloxPlayerBeta\.exe/i.test(stdout));
    });
  });
}

/**
 * Force-quits every running Roblox client window via taskkill.
 * Returns true if a kill command was issued, false if Roblox wasn't running
 * (or this isn't Windows).
 */
function forceQuitRoblox() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return resolve(false);

    exec('taskkill /F /IM RobloxPlayerBeta.exe /T', { windowsHide: true, timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        // Exit code 128 / "not found" just means Roblox wasn't running.
        const msg = (stderr || err.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('no tasks')) {
          return resolve(false);
        }
        return reject(new Error(stderr || err.message));
      }
      resolve(true);
    });
  });
}

async function ensureMultiInstance(required = false, options = {}) {
  if (process.platform !== 'win32') return false;
  const alreadyActive = mutexHolder.status().active;
  const status = await mutexHolder.start();
  if (status.ok) {
    // READY is emitted only after the helper owns Roblox's mutex. Reusing an
    // existing holder needs no grace period; a newly started helper only needs
    // a very small scheduling handoff before Roblox is spawned.
    if (!alreadyActive) await new Promise(resolve => setTimeout(resolve, 75));
    return true;
  }
  if (required) {
    const error = new Error(`Seal could not enable multi-instance launching. ${status.error || 'The Roblox mutex is unavailable.'}`);
    // Let the main process distinguish a real, confirmed owner from a helper
    // timeout/antivirus/startup error. Only a confirmed BUSY result should ask
    // the user to close an existing Roblox session.
    error.code = status.busy ? 'SEAL_MUTEX_BUSY' : 'SEAL_MUTEX_START_FAILED';
    throw error;
  }
  return false;
}

function releaseMultiInstanceHandles() {
  return mutexHolder.stop();
}

let lastRobloxPidSnapshot = { pids: [], at: 0 };
let robloxPidSnapshotTask = null;

function queryRobloxPids() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve({ ok: true, pids: [] });
    exec('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /NH /FO CSV', { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ ok: false, pids: [], error: err.message });
      const pids = [];
      for (const line of stdout.split(/\r?\n/)) {
        const m = line.match(/"RobloxPlayerBeta\.exe","(\d+)"/i);
        if (m) pids.push(Number(m[1]));
      }
      resolve({ ok: true, pids: [...new Set(pids)].sort((a, b) => a - b) });
    });
  });
}

async function confirmExpectedPidDisappearance(snapshot, options = {}) {
  const expectedPids = [...new Set((options.expectedPids || [])
    .map(Number)
    .filter(pid => Number.isInteger(pid) && pid > 0))];
  if (!snapshot.reliable || expectedPids.length === 0) return snapshot;

  const visible = new Set(snapshot.pids);
  const missing = expectedPids.filter(pid => !visible.has(pid));
  if (missing.length === 0) return { ...snapshot, confirmedMissingPids: [] };

  // A single tasklist result can briefly omit a busy Roblox process. Confirm
  // every disappearance with a second independent scan before the dashboard
  // removes the session.
  const delayMs = Math.max(0, Number(options.confirmMissingDelayMs ?? 300));
  if (delayMs) await wait(delayMs);
  const query = typeof options.query === 'function' ? options.query : queryRobloxPids;
  const confirmation = await query();
  if (!confirmation.ok) {
    return { ...snapshot, reliable: false, confirmedMissingPids: [], error: confirmation.error || 'Roblox process confirmation failed.' };
  }

  const now = Date.now();
  const confirmedPids = [...new Set(confirmation.pids)].sort((a, b) => a - b);
  lastRobloxPidSnapshot = { pids: confirmedPids, at: now };
  const confirmedVisible = new Set(confirmedPids);
  return {
    pids: confirmedPids,
    reliable: true,
    at: now,
    confirmedMissingPids: missing.filter(pid => !confirmedVisible.has(pid))
  };
}

async function getRobloxPidSnapshot(options = {}) {
  if (!robloxPidSnapshotTask) robloxPidSnapshotTask = (async () => {
    const query = typeof options.query === 'function' ? options.query : queryRobloxPids;
    const retryDelayMs = options.retryDelayMs ?? 180;
    let result = await query();
    if (!result.ok) {
      if (retryDelayMs > 0) await wait(retryDelayMs);
      result = await query();
    }
    const now = Date.now();
    if (result.ok) {
      lastRobloxPidSnapshot = { pids: result.pids, at: now };
      return { pids: [...result.pids], reliable: true, at: now };
    }

    // A tasklist timeout used to look exactly like "zero Roblox clients" and
    // instantly erased the dashboard. Preserve the last successful snapshot
    // while the next refresh retries instead.
    const cached = now - lastRobloxPidSnapshot.at < 30000
      ? [...lastRobloxPidSnapshot.pids]
      : [];
    return { pids: cached, reliable: false, at: now, error: result.error || 'Roblox process scan failed.' };
  })().finally(() => {
    robloxPidSnapshotTask = null;
  });
  const snapshot = await robloxPidSnapshotTask;
  return confirmExpectedPidDisappearance(snapshot, options);
}

async function listRobloxPids() {
  return (await getRobloxPidSnapshot()).pids;
}

function spawnRoblox(robloxExe, uri) {
  return new Promise((resolve, reject) => {
    const child = spawn(robloxExe, uri ? [uri] : [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });

    child.once('error', reject);
    child.once('spawn', () => {
      const pid = child.pid;
      child.unref();
      resolve(pid);
    });
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Observe the PID set until the newly created Roblox client has settled.
 * Roblox can briefly create one RobloxPlayerBeta.exe and replace it with the
 * actual client. Returning on the first sighting made Seal track that temporary
 * PID and lose the real window a moment later.
 */
async function observeNewRobloxPids(before, options = {}) {
  const listPids = typeof options.listPids === 'function' ? options.listPids : listRobloxPids;
  const pollMs = Math.max(100, Number(options.pollMs) || 250);
  const maxWaitMs = Math.max(pollMs, Number(options.maxWaitMs) || 15000);
  const settleMs = Math.max(pollMs, Number(options.settleMs) || 1400);
  const stableMs = Math.max(pollMs, Number(options.stableMs) || 500);
  const deadline = Date.now() + maxWaitMs;
  let firstSeenAt = 0;
  let stableSince = 0;
  let signature = '';
  let newPids = [];

  while (Date.now() < deadline) {
    await wait(pollMs);
    const after = await listPids();
    newPids = after.filter(pid => !before.has(pid)).sort((a, b) => a - b);
    const nextSignature = newPids.join(',');

    if (newPids.length === 0) {
      signature = '';
      stableSince = 0;
      continue;
    }

    const now = Date.now();
    if (!firstSeenAt) firstSeenAt = now;
    if (nextSignature !== signature) {
      signature = nextSignature;
      stableSince = now;
    }

    if (now - firstSeenAt >= settleMs && now - stableSince >= stableMs) {
      return newPids;
    }
  }

  // Always take one final live snapshot so a PID that died at the deadline is
  // not returned as a successful tracked session.
  const finalPids = await listPids();
  return finalPids.filter(pid => !before.has(pid)).sort((a, b) => a - b);
}

/**
 * Kills a specific RobloxPlayerBeta.exe process (and its children) by PID.
 * Returns true if a kill was issued, false if the PID is no longer running.
 */
function killRobloxPid(pid) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32' || !pid) return resolve(false);

    exec(`taskkill /F /PID ${pid} /T`, { windowsHide: true, timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || err.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('no tasks') || msg.includes('not running')) {
          return resolve(false);
        }
        return reject(new Error(stderr || err.message));
      }
      resolve(true);
    });
  });
}

async function launchAccount(authTicket, target, multiInstance, options = {}) {
  const versionFolder = findRobloxVersionFolder();
  if (!versionFolder) {
    throw new Error('Could not find Roblox installation. Launch Roblox normally at least once first.');
  }

  // Play and Launch Selected must share one holder for Seal's full lifetime.
  // Releasing it on a card Play makes Roblox's next single-instance signal
  // replace/close clients that Seal already launched.
  if (!options.multiInstanceReady) await ensureMultiInstance(true);

  const robloxExe = path.join(versionFolder, 'RobloxPlayerBeta.exe');
  const uri = buildLaunchUri(authTicket, target);

  console.log('[launcher] exe:', robloxExe);
  console.log('[launcher] starting Roblox client');

  // Snapshot which RobloxPlayerBeta.exe PIDs already exist before launching,
  // so we can identify the new one(s) this launch creates. The process we
  // spawn is often a short-lived bootstrapper that re-execs the real client
  // under a different PID, so we can't rely on the spawned PID directly.
  const before = new Set(Array.isArray(options.beforePids)
    ? options.beforePids
    : await listRobloxPids());

  const spawnedAt = Date.now();
  const spawnedPid = await spawnRoblox(robloxExe, uri);

  const newPids = await observeNewRobloxPids(before);
  return { pids: newPids, beforePids: [...before], spawnedPid, spawnedAt };
}

async function launchRawUri(uri, options) {
  if (!/^roblox(?:-player)?:/i.test(String(uri || ''))) {
    throw new Error('That does not look like a Roblox player launch link.');
  }
  return launchExternalRoblox(uri, options);
}

async function launchExternalRoblox(uri, { onSpawn } = {}) {
  const versionFolder = findRobloxVersionFolder();
  if (!versionFolder) {
    throw new Error('Could not find Roblox installation. Launch Roblox normally at least once first.');
  }
  await ensureMultiInstance(true);

  const robloxExe = path.join(versionFolder, 'RobloxPlayerBeta.exe');
  const before = new Set(await listRobloxPids());
  const spawnedAt = Date.now();
  const spawnedPid = await spawnRoblox(robloxExe, uri);
  const start = { beforePids: [...before], spawnedPid, spawnedAt };
  onSpawn?.(start);

  const newPids = await observeNewRobloxPids(before);
  return { ...start, pids: newPids };
}

process.once('exit', () => {
  restoreFpsOverride();
  releaseMultiInstanceHandles();
});
process.once('SIGINT', () => {
  restoreFpsOverride();
  releaseMultiInstanceHandles();
  process.exit(130);
});
process.once('SIGTERM', () => {
  restoreFpsOverride();
  releaseMultiInstanceHandles();
  process.exit(143);
});

module.exports = {
  captureAppliedSettings,
  applyPerformanceSettings,
  resetPerformanceSettings,
  setFpsCap,
  repairUnsafeFpsSettings,
  restoreFpsOverride,
  setGraphicsQuality,
  setVolume,
  setFastFlagPreset,
  findBestPublicServer,
  applyRobloxMods,
  restoreRobloxMods,
  setFullbright,
  setFullbrightFastFlags,
  launchAccount,
  launchRawUri,
  launchDesktopHome: ({ tray = false, onSpawn } = {}) => launchExternalRoblox(tray ? '--launch-to-tray' : undefined, { onSpawn }),
  findRobloxVersionFolder,
  ensureMultiInstance,
  releaseMultiInstanceHandles,
  isRobloxRunning,
  forceQuitRoblox,
  listRobloxPids,
  getRobloxPidSnapshot,
  observeNewRobloxPids,
  killRobloxPid,
  convertDeathSoundToMp3,
  convertDeathSoundToShortMp3,
  mutexStatus: mutexHolder.status
};
