// Seal's Roblox bootstrapper lifecycle.
//
// This module intentionally uses Roblox's own signed installer for updates.
// Seal owns launch interception and mod application, while Roblox remains the
// source of the client binaries.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, spawnSync } = require('child_process');

const PROTOCOLS = ['roblox', 'roblox-player'];
const VERSION_ENDPOINTS = [
  'https://clientsettingscdn.roblox.com/v2/client-version/WindowsPlayer',
  'https://clientsettings.roblox.com/v2/client-version/WindowsPlayer'
];
const INSTALLER_URL = 'https://www.roblox.com/download/client?os=win';
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'www.roblox.com',
  'roblox.com',
  'setup.rbxcdn.com',
  'setup-aws.rbxcdn.com',
  'setup-ak.rbxcdn.com',
  'roblox-setup.cachefly.net',
  's3.amazonaws.com'
]);
const MAX_INSTALLER_BYTES = 100 * 1024 * 1024;
const STATE_FILE = 'seal-bootstrapper.json';
const CACHE_MS = 2 * 60 * 1000;

let versionCache = null;
let versionCacheTime = 0;
let versionErrorCache = null;
let versionErrorCacheTime = 0;

function statePath(userDataPath) {
  return path.join(userDataPath, STATE_FILE);
}

function readJson(file, fallback = {}) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
  try {
    fs.renameSync(temp, file);
  } catch (err) {
    // Windows does not replace an existing destination with renameSync.
    if (!fs.existsSync(file)) throw err;
    fs.copyFileSync(temp, file);
    fs.unlinkSync(temp);
  }
}

function loadState(userDataPath) {
  return readJson(statePath(userDataPath), {});
}

function updateState(userDataPath, patch) {
  const next = { ...loadState(userDataPath), ...patch };
  writeJsonAtomic(statePath(userDataPath), next);
  return next;
}

function loadMods(userDataPath) {
  const mods = loadState(userDataPath).mods;
  if (!mods || typeof mods !== 'object') return null;
  return { ...mods };
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeRobloxForInstaller(launcher) {
  if (!launcher || typeof launcher.isRobloxRunning !== 'function') {
    throw new Error('Cannot verify whether Roblox is running. Installation was stopped.');
  }
  if (await launcher.isRobloxRunning()) {
    throw new Error('Roblox needs an install/update. Your existing games were left running. Close them yourself, then use Repair / update before launching more accounts.');
  }
  return false;
}


function saveMods(userDataPath, mods) {
  let normalized = null;
  if (mods && typeof mods === 'object') {
    normalized = { ...mods };
  }
  return updateState(userDataPath, { mods: normalized });
}

function emit(onStatus, phase, message, extra = {}) {
  const event = { phase, message, at: new Date().toISOString(), ...extra };
  if (typeof onStatus === 'function') onStatus(event);
  return event;
}

function hasActiveMods(mods) {
  return !!mods && (
    mods.fullbright === true ||
    ['font', 'cursor', 'textures', 'sounds'].some(key => mods[key] && mods[key] !== 'default')
  );
}

function isAllowedDownloadUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { return false; }
  return parsed.protocol === 'https:' && ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname.toLowerCase());
}

function requestJson(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Seal-Account-Manager-Bootstrapper/1.1' }
    }, (res) => {
      const status = Number(res.statusCode || 0);
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`Roblox version service returned HTTP ${status}.`));
        return;
      }
      const chunks = [];
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) {
          req.destroy(new Error('Roblox version response was unexpectedly large.'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('Roblox version service returned invalid JSON.')); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Roblox version check timed out.')));
    req.on('error', reject);
  });
}

async function getLatestVersionInfo(options = {}) {
  const now = Date.now();
  if (!options.force && versionCache && now - versionCacheTime < CACHE_MS) return versionCache;
  if (!options.force && versionErrorCache && now - versionErrorCacheTime < CACHE_MS) {
    throw new Error(versionErrorCache);
  }

  let lastError = null;
  for (const endpoint of VERSION_ENDPOINTS) {
    try {
      const result = await requestJson(endpoint, options.timeoutMs);
      const versionGuid = String(result.clientVersionUpload || '');
      if (!/^version-[a-z0-9]+$/i.test(versionGuid)) {
        throw new Error('Roblox version service did not provide a valid Windows player version.');
      }
      versionCache = {
        versionGuid,
        version: String(result.version || ''),
        bootstrapperVersion: String(result.bootstrapperVersion || ''),
        endpoint
      };
      versionCacheTime = now;
      versionErrorCache = null;
      versionErrorCacheTime = 0;
      return versionCache;
    } catch (err) {
      lastError = err;
    }
  }
  const finalError = lastError || new Error('Could not contact the Roblox version service.');
  versionErrorCache = finalError.message;
  versionErrorCacheTime = now;
  throw finalError;
}

function getInstallationInfo(launcher) {
  const folder = launcher.findRobloxVersionFolder();
  if (!folder) return { installed: false, folder: null, exe: null, versionGuid: null };
  const exe = path.join(folder, 'RobloxPlayerBeta.exe');
  return {
    installed: fs.existsSync(exe),
    folder,
    exe,
    versionGuid: path.basename(folder)
  };
}

function downloadToFile(url, destination, options = {}) {
  const redirects = Number(options.redirects || 0);
  if (!isAllowedDownloadUrl(url)) {
    return Promise.reject(new Error('Roblox installer redirected to an untrusted host.'));
  }
  if (redirects > 6) return Promise.reject(new Error('Too many Roblox installer redirects.'));

  return new Promise((resolve, reject) => {
    let requestCompleted = false;
    let delegatedToRedirect = false;
    const req = https.get(url, {
      headers: { 'User-Agent': 'Seal-Account-Manager-Bootstrapper/1.1' }
    }, (res) => {
      const status = Number(res.statusCode || 0);
      if (status >= 300 && status < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        delegatedToRedirect = true;
        downloadToFile(next, destination, { ...options, redirects: redirects + 1 }).then(
          result => { requestCompleted = true; resolve(result); },
          err => { requestCompleted = true; reject(err); }
        );
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`Roblox installer download returned HTTP ${status}.`));
        return;
      }

      const expected = Number(res.headers['content-length'] || 0);
      if (expected > MAX_INSTALLER_BYTES) {
        res.resume();
        reject(new Error('Roblox installer download was unexpectedly large.'));
        return;
      }

      const stream = fs.createWriteStream(destination, { flags: 'w' });
      let received = 0;
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        stream.destroy();
        try { fs.unlinkSync(destination); } catch {}
        reject(err);
      };

      res.on('data', (chunk) => {
        received += chunk.length;
        if (received > MAX_INSTALLER_BYTES) {
          req.destroy(new Error('Roblox installer exceeded the download size limit.'));
          return;
        }
        if (typeof options.onProgress === 'function') options.onProgress(received, expected || null);
      });
      res.on('error', fail);
      stream.on('error', fail);
      stream.on('finish', () => {
        if (settled) return;
        settled = true;
        stream.close(() => {
          requestCompleted = true;
          resolve({ path: destination, bytes: received, finalUrl: url });
        });
      });
      res.pipe(stream);
    });
    req.setTimeout(30000, () => req.destroy(new Error('Roblox installer download timed out.')));
    req.on('error', (err) => {
      if (requestCompleted || delegatedToRedirect) return;
      try { fs.unlinkSync(destination); } catch {}
      reject(err);
    });
  });
}

function installerSignatureIsAcceptable(signature, options = {}) {
  const status = String(signature?.Status || '').trim().toLowerCase();
  const publisher = String(signature?.Publisher || '').trim();

  // HashMismatch means the executable changed after it was signed. NotSigned
  // means there is no publisher identity to verify. NotTrusted/UnknownError can
  // be returned for an intact signature when Windows cannot reach certificate
  // revocation services or build the certificate chain on the local machine.
  const intactSignatureStatuses = new Set(['valid', 'nottrusted', 'unknownerror']);
  if (intactSignatureStatuses.has(status) && /^roblox corporation$/i.test(publisher)) return true;

  // Roblox began serving an unsigned bootstrapper from its own versioned CDN
  // path in July 2026. Only allow that exact download flow, and require the
  // executable's Roblox metadata as an additional sanity check. Signed files
  // with a bad signature never use this fallback.
  return !!options.allowUnsignedOfficial && status === 'notsigned' &&
    /^roblox corporation$/i.test(String(signature?.CompanyName || '').trim()) &&
    /^roblox bootstrapper$/i.test(String(signature?.ProductName || '').trim()) &&
    /^roblox$/i.test(String(signature?.FileDescription || '').trim()) &&
    /^roblox\.exe$/i.test(String(signature?.OriginalFilename || '').trim());
}

function isOfficialUnsignedInstallerUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { return false; }
  return parsed.protocol === 'https:' &&
    parsed.hostname.toLowerCase() === 'setup.rbxcdn.com' &&
    /^\/version-[a-z0-9]+-RobloxPlayerInstaller\.exe$/i.test(parsed.pathname);
}

function validateInstaller(file, options = {}) {
  const stat = fs.statSync(file);
  if (stat.size < 256 * 1024 || stat.size > MAX_INSTALLER_BYTES) {
    throw new Error('Downloaded Roblox installer has an invalid size.');
  }
  const handle = fs.openSync(file, 'r');
  const header = Buffer.alloc(2);
  try { fs.readSync(handle, header, 0, 2, 0); } finally { fs.closeSync(handle); }
  if (header.toString('ascii') !== 'MZ') throw new Error('Downloaded Roblox installer is not a Windows executable.');

  if (process.platform === 'win32') {
    const escaped = file.replace(/'/g, "''");
    const script = [
      `$s=Get-AuthenticodeSignature -LiteralPath '${escaped}'`,
      '$c=$s.SignerCertificate',
      "$publisher=if($c){$c.GetNameInfo('SimpleName',$false)}else{''}",
      '$v=(Get-Item -LiteralPath \'' + escaped + '\').VersionInfo',
      '[PSCustomObject]@{Status=[string]$s.Status;StatusMessage=[string]$s.StatusMessage;Publisher=[string]$publisher;Subject=if($c){[string]$c.Subject}else{\'\'};CompanyName=[string]$v.CompanyName;ProductName=[string]$v.ProductName;FileDescription=[string]$v.FileDescription;OriginalFilename=[string]$v.OriginalFilename} | ConvertTo-Json -Compress'
    ].join(';');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000
    });
    if (result.error || result.status !== 0) throw new Error('Could not verify the Roblox installer signature.');
    let signature;
    try { signature = JSON.parse(String(result.stdout || '').trim()); } catch {
      throw new Error('Could not read the Roblox installer signature.');
    }
    if (!installerSignatureIsAcceptable(signature, options)) {
      const status = String(signature.Status || 'Unknown');
      const publisher = String(signature.Publisher || '').trim() || 'none';
      throw new Error(`Roblox installer signature rejected (status: ${status}, publisher: ${publisher}).`);
    }
  }
  return true;
}

function runInstaller(file, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, [], { stdio: 'ignore', windowsHide: false });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
      reject(new Error('Roblox installer did not finish within ten minutes.'));
    }, timeoutMs);
    child.once('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.once('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Roblox installer exited with code ${code}.`));
    });
  });
}

async function installOfficialPlayer(userDataPath, onStatus, launcher) {
  const cacheDir = path.join(userDataPath, 'bootstrapper-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  // Unique files prevent simultaneous checks or another Seal process from
  // deleting/renaming a download that they did not create.
  const downloadId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const partial = path.join(cacheDir, `RobloxPlayerInstaller-${downloadId}.download`);
  const installer = path.join(cacheDir, `RobloxPlayerInstaller-${downloadId}.exe`);

  emit(onStatus, 'downloading', 'Downloading the official Roblox installer…', { progress: 0 });
  let lastProgress = -1;
  let lastProgressAt = 0;
  const download = await downloadToFile(INSTALLER_URL, partial, {
    onProgress(received, expected) {
      const progress = expected ? Math.min(99, Math.round(received / expected * 100)) : null;
      const now = Date.now();
      if (progress === lastProgress && now - lastProgressAt < 500) return;
      lastProgress = progress;
      lastProgressAt = now;
      emit(onStatus, 'downloading', 'Downloading the official Roblox installer…', { progress, received, expected });
    }
  });
  if (!fs.existsSync(partial)) {
    throw new Error('The Roblox installer download was removed before Seal could open it. Check Windows Security Protection history, then retry or install Roblox from roblox.com.');
  }
  try {
    fs.renameSync(partial, installer);
  } catch (err) {
    if (err?.code === 'ENOENT') {
      throw new Error('The Roblox installer download disappeared before verification. Check Windows Security Protection history, then retry or install Roblox from roblox.com.');
    }
    throw err;
  }
  try {
    // Authenticode detection depends on the Windows executable extension.
    // Checking the old *.download filename made genuine Roblox installers
    // appear unsigned even though their embedded signature was intact.
    validateInstaller(installer, { allowUnsignedOfficial: isOfficialUnsignedInstallerUrl(download.finalUrl) });
  } catch (err) {
    try { fs.unlinkSync(installer); } catch {}
    throw err;
  }
  emit(onStatus, 'updating', 'Running Roblox’s signed installer…');
  try {
    await closeRobloxForInstaller(launcher);
    launcher.releaseMultiInstanceHandles?.();
    await runInstaller(installer);
  } finally {
    try { fs.unlinkSync(partial); } catch {}
    try { fs.unlinkSync(installer); } catch {}
  }
}

async function ensureReady(options) {
  const { launcher, userDataPath, onStatus } = options;
  if (!launcher || !userDataPath) throw new Error('Bootstrapper configuration is incomplete.');
  const deps = options.dependencies || {};
  const fetchLatest = deps.getLatestVersionInfo || getLatestVersionInfo;
  const installPlayer = deps.installOfficialPlayer || installOfficialPlayer;

  let installed = getInstallationInfo(launcher);
  emit(onStatus, 'checking', 'Checking Roblox installation…', { installed });

  let latest = null;
  let versionError = null;
  const shouldCheckForUpdates = !installed.installed || !!options.checkForUpdates || !!options.forceCheck || !!options.forceUpdate;
  if (shouldCheckForUpdates) {
    try {
      latest = await fetchLatest({ force: !!options.forceCheck });
    } catch (err) {
      versionError = err;
      if (!installed.installed) throw new Error(`Roblox is not installed and the version check failed: ${err.message}`);
    }
  }

  const needsInstall = !installed.installed;
  const needsUpdate = !!latest && installed.versionGuid !== latest.versionGuid;
  const shouldUpdate = !!options.forceUpdate || (needsUpdate && options.autoUpdate === true);
  if (needsInstall || shouldUpdate) {
    await closeRobloxForInstaller(launcher, onStatus);
    emit(onStatus, needsInstall ? 'installing' : 'updating', needsInstall ? 'Installing Roblox…' : 'Updating Roblox…', { installed, latest });
    await installPlayer(userDataPath, onStatus, launcher);
    // Roblox's stock installer may hand work to a child process and exit first.
    // Poll briefly instead of assuming the first process exit means deployment
    // has finished.
    for (let attempt = 0; attempt < 60; attempt++) {
      installed = getInstallationInfo(launcher);
      if (installed.installed && (!latest || installed.versionGuid === latest.versionGuid)) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!installed.installed) throw new Error('The Roblox installer finished, but RobloxPlayerBeta.exe was not found.');
    if (latest && installed.versionGuid !== latest.versionGuid) {
      throw new Error(`Roblox installed ${installed.versionGuid}, but ${latest.versionGuid} was expected. Try the update again.`);
    }
  }

  const result = {
    installed,
    latest,
    updateAvailable: needsUpdate && !shouldUpdate,
    offline: !!versionError,
    versionError: versionError?.message || null
  };
  const readyMessage = result.updateAvailable
    ? 'Roblox is installed. An update is available; use Repair / update when convenient.'
    : (versionError ? 'Roblox is ready (offline version check).' : 'Roblox is ready.');
  emit(onStatus, 'ready', readyMessage, result);
  return result;
}

async function prepareAndLaunch(options) {
  const { launcher, userDataPath, uri, desktopHome, desktopTray, mods, onStatus, onSpawn } = options;
  if (!desktopHome && !/^roblox(?:-player)?:/i.test(String(uri || ''))) throw new Error('Invalid Roblox launch link.');
  const ready = await ensureReady({
    launcher,
    userDataPath,
    onStatus,
    forceCheck: options.forceCheck,
    checkForUpdates: !!options.forceCheck,
    autoUpdate: false,
    dependencies: options.dependencies
  });
  let modResult = null;
  if (typeof options.beforeLaunch === 'function') await options.beforeLaunch();
  if (hasActiveMods(mods)) {
    emit(onStatus, 'modding', 'Applying saved Roblox modifications…');
    modResult = launcher.applyRobloxMods(mods);
  }
  emit(onStatus, 'launching', 'Launching Roblox…');
  const launchResult = desktopHome ? await launcher.launchDesktopHome({ tray: desktopTray, onSpawn }) : await launcher.launchRawUri(uri, { onSpawn });
  emit(onStatus, 'launched', 'Roblox launched.', { installed: ready.installed, modResult, launchResult });
  return { ready, modResult, launchResult };
}

function protocolArgs(app) {
  return app.isPackaged ? ['--background'] : [path.resolve(process.argv[1] || '.'),'--background'];
}

function readRegistryDefault(key) {
  if (process.platform !== 'win32') return null;
  const result = spawnSync('reg.exe', ['query', key, '/ve'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  for (const line of String(result.stdout || '').split(/\r?\n/)) {
    const match = line.match(/REG_(?:EXPAND_)?SZ\s+(.*)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function runReg(args) {
  const result = spawnSync('reg.exe', args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || 'Windows registry update failed.').trim());
}

function restoreProtocolCommand(protocol, command, iconPath) {
  if (process.platform !== 'win32') return false;
  const root = `HKCU\\Software\\Classes\\${protocol}`;
  runReg(['add', root, '/ve', '/d', 'URL:Roblox Protocol', '/f']);
  runReg(['add', root, '/v', 'URL Protocol', '/d', '', '/f']);
  if (iconPath) runReg(['add', `${root}\\DefaultIcon`, '/ve', '/d', iconPath, '/f']);
  runReg(['add', `${root}\\shell\\open\\command`, '/ve', '/d', command, '/f']);
  return true;
}

function isProtocolOwned(options, protocol) {
  const {app,executable=process.execPath}=options;
  try { return app.isDefaultProtocolClient(protocol, executable, protocolArgs(app)); }
  catch { return false; }
}

function stockPlayerCommand(launcher) {
  const info = getInstallationInfo(launcher);
  return info.installed ? `"${info.exe}" "%1"` : null;
}

function enable(options) {
  const { app, launcher, userDataPath, executable=process.execPath } = options;
  const state = loadState(userDataPath);
  const previousHandlers = { ...(state.previousHandlers || {}) };
  for(const protocol of PROTOCOLS)if(/seal[- ]account[- ]manager/i.test(previousHandlers[protocol]||''))delete previousHandlers[protocol];
  const ownExe = String(executable).toLowerCase();

  for (const protocol of PROTOCOLS) {
    if (!isProtocolOwned(options, protocol) && !previousHandlers[protocol]) {
      const command = readRegistryDefault(`HKCU\\Software\\Classes\\${protocol}\\shell\\open\\command`);
      if (command && !command.toLowerCase().includes(ownExe) && !/seal[- ]account[- ]manager/i.test(command)) previousHandlers[protocol] = command;
    }
  }

  const failed = [];
  for (const protocol of PROTOCOLS) {
    const ok = app.setAsDefaultProtocolClient(protocol, executable, protocolArgs(app));
    if (!ok) failed.push(protocol);
  }
  if (failed.length) {
    const stockCommand = stockPlayerCommand(launcher);
    for (const protocol of PROTOCOLS) {
      if (isProtocolOwned(options, protocol)) {
        try { app.removeAsDefaultProtocolClient(protocol, executable, protocolArgs(app)); } catch {}
      }
      const command = previousHandlers[protocol] || stockCommand;
      if (command) {
        try { restoreProtocolCommand(protocol, command, getInstallationInfo(launcher).exe); } catch {}
      }
    }
    throw new Error(`Windows did not accept Seal for: ${failed.join(', ')}. Install the packaged app, then try again.`);
  }
  updateState(userDataPath, { enabled: true, previousHandlers });
  return status(options);
}

function disable(options) {
  const { app, launcher, userDataPath, executable=process.execPath } = options;
  const state = loadState(userDataPath);
  const previousHandlers = { ...(state.previousHandlers || {}) };
  for (const protocol of PROTOCOLS) {
    if (/seal[- ]account[- ]manager/i.test(previousHandlers[protocol] || '')) delete previousHandlers[protocol];
  }
  const stockCommand = stockPlayerCommand(launcher);

  for (const protocol of PROTOCOLS) {
    if (isProtocolOwned(options, protocol)) {
      try { app.removeAsDefaultProtocolClient(protocol, executable, protocolArgs(app)); } catch {}
    }
    const command = previousHandlers[protocol] || stockCommand;
    if (command) restoreProtocolCommand(protocol, command, getInstallationInfo(launcher).exe);
  }
  updateState(userDataPath, { enabled: false, previousHandlers: {} });
  return status(options);
}

function status(options) {
  const { app, launcher, userDataPath } = options;
  const protocols = Object.fromEntries(PROTOCOLS.map(protocol => [protocol, isProtocolOwned(options, protocol)]));
  return {
    enabled: PROTOCOLS.every(protocol => protocols[protocol]),
    protocols,
    installation: getInstallationInfo(launcher),
    lastEvent: loadState(userDataPath).lastEvent || null
  };
}

function recordEvent(userDataPath, event) {
  return updateState(userDataPath, { lastEvent: event });
}

module.exports = {
  PROTOCOLS,
  getLatestVersionInfo,
  getInstallationInfo,
  ensureReady,
  prepareAndLaunch,
  enable,
  disable,
  status,
  loadMods,
  saveMods,
  loadState,
  recordEvent,
  _test: {
    isAllowedDownloadUrl,
    isOfficialUnsignedInstallerUrl,
    installerSignatureIsAcceptable,
    validateInstaller,
    downloadToFile,
    installOfficialPlayer,
    readRegistryDefault,
    restoreProtocolCommand
  }
};
