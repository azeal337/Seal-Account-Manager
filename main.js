// main.js
const { app, BrowserWindow, ipcMain, session, nativeImage, dialog, shell, Notification, clipboard, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { displayVersion } = require('./package.json');

const { spawn, spawnSync } = require('child_process');
const accountStore = require('./src/accountStore');
const robloxApi = require('./src/robloxApi');
const launcher = require('./src/launcher');
const sealBootstrapper = require('./src/bootstrapper');
const activityWatcher = require('./src/activityWatcher');
const recovery = require('./src/sessionRecovery');
const { writeTextAtomic } = require('./src/atomicFile');
const { gameTitle } = require('./src/gameDetails');
const { DiscordPresence } = require('./src/discordPresence');
const { PlaytimeStore } = require('./src/playtimeStore');
const performancePresetStore = require('./src/performancePresetStore');

const APP_ID = 'com.local.sealaccountmanager';
const DISCORD_APPLICATION_ID = '1534294104215912618';
const DISCORD_APPLICATION_ASSET = 'seal-discord-application-icon';
const discordPresence = new DiscordPresence({
  clientId: DISCORD_APPLICATION_ID,
  active: false,
  largeImage: DISCORD_APPLICATION_ASSET,
  largeText: 'Seal Account Manager',
  smallImage: DISCORD_APPLICATION_ASSET,
  smallText: 'Seal Account Manager',
  logger: console
});
const DISCORD_ROBLOX_POLL_MS = 4000;
const DISCORD_ACTIVITY_REFRESH_MS = 15000;
const BATCH_LAUNCH_HANDOFF_MS = 0;
let discordRobloxMonitor = null;
let discordRobloxMonitorTask = null;
let discordActivityRefreshAt = 0;

function pollDiscordRobloxPresence() {
  if (discordRobloxMonitorTask) return discordRobloxMonitorTask;
  discordRobloxMonitorTask = (async () => {
    const snapshot = await launcher.getRobloxPidSnapshot();
    const pidCount = snapshot.pids.length;
    const active = pidCount > 0;
    const countChanged = discordPresence.setSessionCount(pidCount);
    const activeChanged = discordPresence.setActive(active);
    const now = Date.now();

    if (!active) {
      discordActivityRefreshAt = 0;
      return;
    }

    // Roblox can publish its own detected-game activity after Seal's first
    // update. Reassert the custom Seal activity occasionally so RPC remains
    // the current status without continuously polling or spamming Discord.
    if (activeChanged || countChanged) {
      discordActivityRefreshAt = now;
    } else if (now - discordActivityRefreshAt >= DISCORD_ACTIVITY_REFRESH_MS) {
      discordPresence.refresh();
      discordActivityRefreshAt = now;
    }
  })().catch(err => {
    console.warn('[discord] Roblox process check failed:', err.message);
  }).finally(() => {
    discordRobloxMonitorTask = null;
  });
  return discordRobloxMonitorTask;
}

function startDiscordRobloxMonitor() {
  if (discordRobloxMonitor) clearInterval(discordRobloxMonitor);
  pollDiscordRobloxPresence();
  discordRobloxMonitor = setInterval(pollDiscordRobloxPresence, DISCORD_ROBLOX_POLL_MS);
  discordRobloxMonitor.unref?.();
}

function stopDiscordRobloxMonitor() {
  if (discordRobloxMonitor) clearInterval(discordRobloxMonitor);
  discordRobloxMonitor = null;
}
const launchTestMode = process.argv.includes('--seal-launch-test');
const backgroundTestMode = launchTestMode && !!process.env.SEAL_TEST_ROBLOX_ROOT && process.argv.includes('--seal-background-test');
const startHidden = process.argv.includes('--background') || !!protocolUrlFromArgv(process.argv);
const identityTestMode = process.env.SEAL_IDENTITY_TEST === '1';
const portableMode = !!process.env.PORTABLE_EXECUTABLE_FILE;
function cleanPresetName(value, fallback) {
  const cleaned = String(value || '').replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 40) || fallback;
}

function hasActiveRobloxMods(mods) {
  // Keep this helper local to main.js because launch/delete/check IPC handlers
  // use it before deciding whether to reapply saved Roblox cosmetic mods.
  // Missing this function caused launch to fail with:
  // ReferenceError: hasActiveRobloxMods is not defined
  if (!mods || typeof mods !== 'object') return false;
  return mods.fullbright === true || ['font', 'cursor', 'textures', 'sounds'].some((key) => {
    const value = mods[key];
    return value && value !== 'default';
  });
}

// Keeps Windows taskbar/start-menu pins on the Seal icon instead of the default Electron icon.
app.setAppUserModelId(APP_ID);
// Keep the original internal name so existing encrypted accounts and settings
// stay in the same userData folder after the product is renamed in the UI.
app.setName('Seal Account Manager');

const initialProtocolUrl = protocolUrlFromArgv(process.argv);
const bypassInstanceLock = identityTestMode || (launchTestMode && !process.argv.includes('--seal-single-instance-test'));
const gotSingleInstanceLock = bypassInstanceLock || app.requestSingleInstanceLock({ robloxActivation: initialProtocolUrl });
if (!gotSingleInstanceLock) app.exit(0);

function protocolUrlFromArgv(argv = []) {
  return argv.find(arg => /^roblox(?:-player)?:/i.test(String(arg || ''))) ||
    (argv.includes('--roblox-startup') ? '--roblox-startup' : argv.includes('--roblox-home') ? '--roblox-home' : null);
}

const pendingProtocolUrls = [initialProtocolUrl].filter(Boolean);
let protocolLaunchReady = false;
const protocolLaunchTasks = new Map();

function protocolLaunchRoute(url) {
  if (url === '--roblox-startup') return 'startup-tray';
  return url === '--roblox-home' ? 'home' : 'website';
}

function enqueueProtocolLaunch(url) {
  const current = protocolLaunchTasks.get(url);
  if (current) {
    recordRobloxLaunch(protocolLaunchRoute(url), 'coalesced');
    return current;
  }
  const task = accountLaunchQueue.then(() => handleRobloxProtocolUrl(url));
  accountLaunchQueue = task.catch(() => {});
  protocolLaunchTasks.set(url, task);
  const clear = () => protocolLaunchTasks.delete(url);
  task.then(clear, clear);
  task.catch((err) => {
    publishBootstrapperEvent({ phase: 'error', message: err.message, at: new Date().toISOString() });
    console.warn('[bootstrapper] launch failed:', err.message);
  });
  return task;
}

app.on('second-instance', (_event, argv, _workingDirectory, additionalData) => {
  const url = protocolUrlFromArgv([additionalData?.robloxActivation]) || protocolUrlFromArgv(argv);
  if (url && protocolLaunchReady) enqueueProtocolLaunch(url).catch(() => {});
  else if (url) pendingProtocolUrls.push(url);
  if (!url && !argv.includes('--background')) showMainWindow();
});

function getIconPath() {
  // Windows pinned taskbar shortcuts are picky: the icon must be a real .ico
  // file outside app.asar. Check the common dev, packaged, and root locations.
  const resources = process.resourcesPath || '';
  const candidates = [
    path.join(resources, 'icon.ico'),
    path.join(resources, 'build', 'icon.ico'),
    path.join(resources, 'app.asar.unpacked', 'build', 'icon.ico'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, 'build', 'icon.ico')
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || path.join(__dirname, 'build', 'icon.ico');
}

function getIconImage() {
  try {
    const iconPath = getIconPath();
    const img = nativeImage.createFromPath(iconPath);
    return img && !img.isEmpty() ? img : undefined;
  } catch {
    return undefined;
  }
}

function getStableExecutablePath() {
  const portableExecutable = String(process.env.PORTABLE_EXECUTABLE_FILE || '').trim();
  if (portableExecutable && fs.existsSync(portableExecutable)) return path.resolve(portableExecutable);
  return process.execPath;
}

function ensurePersistentIconPath() {
  const sourceIcon = getIconPath();
  try {
    const shellAssets = path.join(app.getPath('userData'), 'shell-assets');
    const persistentIcon = path.join(shellAssets, 'Seal Account Manager.ico');
    fs.mkdirSync(shellAssets, { recursive: true });
    const sourceSize = fs.statSync(sourceIcon).size;
    const currentSize = fs.existsSync(persistentIcon) ? fs.statSync(persistentIcon).size : -1;
    if (currentSize !== sourceSize) fs.copyFileSync(sourceIcon, persistentIcon);
    return persistentIcon;
  } catch (err) {
    console.warn('[identity] could not persist the Seal icon:', err.message);
    return sourceIcon;
  }
}

function taskbarPinnedDirectory() {
  const roamingAppData = String(process.env.APPDATA || app.getPath('appData') || '').trim();
  return roamingAppData
    ? path.join(roamingAppData, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar')
    : '';
}

function normalizeWindowsPath(value) {
  try { return path.resolve(String(value || '')).replace(/[\\/]+/g, '\\').toLowerCase(); }
  catch { return String(value || '').replace(/[\\/]+/g, '\\').toLowerCase(); }
}

function looksLikeSealShortcut(shortcutPath) {
  if (/seal[- ]account[- ]manager/i.test(path.basename(shortcutPath))) return true;
  try {
    const details = shell.readShortcutLink(shortcutPath);
    if (details.args?.includes('--roblox-home')) return false;
    return details.appUserModelId === APP_ID
      || /seal[- ]account[- ]manager/i.test(path.basename(details.target || ''));
  } catch {
    return false;
  }
}

function updateExistingSealShortcuts(stableExecutable, stableIcon) {
  const roamingAppData = String(process.env.APPDATA || app.getPath('appData') || '').trim();
  const pinnedDirectory = taskbarPinnedDirectory();
  const candidates = new Set([
    pinnedDirectory && path.join(pinnedDirectory, 'Seal Account Manager.lnk'),
    roamingAppData && path.join(roamingAppData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Seal Account Manager.lnk'),
    path.join(app.getPath('desktop'), 'Seal Account Manager.lnk')
  ].filter(Boolean));
  if (pinnedDirectory && fs.existsSync(pinnedDirectory)) {
    try {
      for (const entry of fs.readdirSync(pinnedDirectory)) {
        if (!entry.toLowerCase().endsWith('.lnk')) continue;
        const shortcutPath = path.join(pinnedDirectory, entry);
        if (looksLikeSealShortcut(shortcutPath)) candidates.add(shortcutPath);
      }
    } catch (err) {
      console.warn('[identity] could not inspect taskbar pins:', err.message);
    }
  }
  const updated = [];

  for (const shortcutPath of candidates) {
    if (!fs.existsSync(shortcutPath)) continue;
    try {
      let current = null;
      try { current = shell.readShortcutLink(shortcutPath); } catch {}
      const alreadyStable = current
        && normalizeWindowsPath(current.target) === normalizeWindowsPath(stableExecutable)
        && normalizeWindowsPath(current.icon) === normalizeWindowsPath(stableIcon)
        && String(current.args || '') === ''
        && current.appUserModelId === APP_ID;
      if (alreadyStable) continue;
      const ok = shell.writeShortcutLink(shortcutPath, 'replace', {
        target: stableExecutable,
        cwd: path.dirname(stableExecutable),
        args: '',
        description: 'Seal Account Manager',
        icon: stableIcon,
        iconIndex: 0,
        appUserModelId: APP_ID
      });
      if (ok) updated.push(shortcutPath);
      else console.warn('[identity] Windows rejected shortcut update:', shortcutPath);
    } catch (err) {
      console.warn('[identity] could not update shortcut:', shortcutPath, err.message);
    }
  }

  if (updated.length) {
    // Ask Explorer to notice the replacement icon without restarting Explorer.
    spawnSync('ie4uinit.exe', ['-show'], { encoding: 'utf8', windowsHide: true });
  }
  return updated;
}

let identityRepairTimer = null;
let identityRepairWatcher = null;
let identityRepairDebounce = null;

function stopWindowsIdentityMaintenance() {
  if (identityRepairTimer) clearInterval(identityRepairTimer);
  if (identityRepairDebounce) clearTimeout(identityRepairDebounce);
  try { identityRepairWatcher?.close(); } catch {}
  identityRepairTimer = null;
  identityRepairDebounce = null;
  identityRepairWatcher = null;
}

function startWindowsIdentityMaintenance(identity) {
  if (!identity?.stableExecutable || process.platform !== 'win32' || !app.isPackaged) return;
  stopWindowsIdentityMaintenance();
  const repair = () => {
    updateExistingSealShortcuts(identity.stableExecutable, identity.stableIcon);
    syncRobloxTrayStartup();
  };
  const scheduleRepair = () => {
    if (identityRepairDebounce) clearTimeout(identityRepairDebounce);
    identityRepairDebounce = setTimeout(repair, 700);
    identityRepairDebounce.unref?.();
  };

  // Pinning usually happens after startup. Watch Explorer's pin directory and
  // rewrite the new shortcut once it finishes writing the .lnk file.
  const pinnedDirectory = taskbarPinnedDirectory();
  if (pinnedDirectory && fs.existsSync(pinnedDirectory)) {
    try { identityRepairWatcher = fs.watch(pinnedDirectory, scheduleRepair); }
    catch (err) { console.warn('[identity] could not watch taskbar pins:', err.message); }
  }
  identityRepairTimer = setInterval(repair, 5 * 60 * 1000);
  identityRepairTimer.unref?.();
  mainWindow?.on('focus', scheduleRepair);
  scheduleRepair();
}

function ensureWindowsAppIdentity() {
  if (process.platform !== 'win32' || !app.isPackaged) return false;
  // Portable builds execute from a temporary extraction directory. Point the
  // Windows identity at the original portable EXE and copy the Seal icon into
  // AppData so a taskbar pin never depends on that temporary directory.
  const stableExecutable = getStableExecutablePath();
  const stableIcon = ensurePersistentIconPath();
  const key = `HKCU\\Software\\Classes\\AppUserModelId\\${APP_ID}`;
  const values = [
    ['DisplayName', 'Seal Account Manager'],
    ['IconUri', stableIcon],
    ['RelaunchCommand', `"${stableExecutable}"`],
    ['RelaunchDisplayNameResource', 'Seal Account Manager'],
    ['RelaunchIconResource', `${stableIcon},0`]
  ];
  for (const [name, value] of values) {
    const result = spawnSync('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], {
      encoding: 'utf8', windowsHide: true
    });
    if (result.status !== 0) console.warn(`[identity] could not set ${name}:`, result.stderr || result.stdout);
  }
  const updatedShortcuts = updateExistingSealShortcuts(stableExecutable, stableIcon);
  return { ready: true, stableExecutable, stableIcon, portable: portableMode, updatedShortcuts };
}

// Track which Roblox process PIDs belong to which account, so
// "force quit" can target just the selected accounts instead of every
// Roblox window.
const accountPids = new Map(); // accountId -> Set<pid>
const accountSessions = new Map(); // accountId -> launch metadata for the dashboard
const routedRobloxPids = new Map();
const idleStartupTrayPids = new Map();
let pendingRoutedStarts = [];
const sessionReconcileTimers = new Map();
const sessionPidMisses = new Map();
const SESSION_TRACKING_GRACE_MS = 60000;
const SESSION_DISAPPEAR_GRACE_MS = 2500;
const SESSION_DISAPPEAR_CONFIRM_MISSES = 2;
let trackedPresenceCache = { at: 0, byUserId: {} };
let trackedSessionsTask = null;
let trackedSessionsFastTask = null;
let accountLaunchQueue = Promise.resolve();
const accountOperations = new Map();
const accountLaunchTasks = new Map();
let processSleeperProc = null;
let processSleeperPipe = '';
let processSleeperStarting = null;
const sleepingAccounts = new Map();
const regionCache = new Map();
let integrationSettingsCache = null;
let previousIntegrationSessions = new Map();
let playtimeStore = null;
let playtimeMonitor = null;
const PLAYTIME_POLL_MS = 5000;

const DEFAULT_INTEGRATION_SETTINGS = Object.freeze({
  regionLookup: false,
  desktopNotifications: true,
  events: {
    launched: true,
    joined: true,
    serverChanged: true,
    closed: true,
    sleep: true
  }
});

function integrationSettingsPath() {
  return path.join(app.getPath('userData'), 'activity-integrations.json');
}

function normalizeIntegrationSettings(raw = {}) {
  const events = { ...DEFAULT_INTEGRATION_SETTINGS.events, ...(raw.events || {}) };
  return {
    regionLookup: raw.regionLookup === true,
    desktopNotifications: raw.desktopNotifications !== false,
    events: Object.fromEntries(Object.keys(DEFAULT_INTEGRATION_SETTINGS.events).map(key => [key, events[key] !== false]))
  };
}

function loadIntegrationSettings() {
  if (integrationSettingsCache) return integrationSettingsCache;
  try {
    const record = JSON.parse(fs.readFileSync(integrationSettingsPath(), 'utf8'));
    integrationSettingsCache = normalizeIntegrationSettings(record);
    if (['webhookEnabled', 'webhookUrl', 'webhookProtected', 'webhookPlain', 'discord', 'hotkeys'].some(key => Object.prototype.hasOwnProperty.call(record, key))) {
      fs.writeFileSync(integrationSettingsPath(), JSON.stringify(integrationSettingsCache, null, 2), 'utf8');
    }
  } catch {
    integrationSettingsCache = normalizeIntegrationSettings();
  }
  return integrationSettingsCache;
}

function saveIntegrationSettings(raw) {
  const settings = normalizeIntegrationSettings(raw);
  fs.mkdirSync(path.dirname(integrationSettingsPath()), { recursive: true });
  fs.writeFileSync(integrationSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  integrationSettingsCache = settings;
  return settings;
}

function processSleeperPath() {
  const resources = process.resourcesPath || '';
  const candidates = [
    path.join(resources, 'SealProcessSleeper.exe'),
    path.join(resources, 'app.asar.unpacked', 'src', 'SealProcessSleeper.exe'),
    path.join(__dirname, 'src', 'SealProcessSleeper.exe')
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || '';
}

function sendSleeperCommandOnce(command, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    if (!processSleeperPipe) return reject(new Error('Session Sleep helper is not running.'));
    const socket = net.createConnection(`\\\\.\\pipe\\${processSleeperPipe}`);
    let response = '';
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch {}
      if (err) reject(err); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('Session Sleep helper did not answer.')), timeoutMs);
    timer.unref?.();
    socket.setEncoding('utf8');
    socket.once('connect', () => socket.write(`${command}\n`));
    socket.on('data', chunk => {
      response += chunk;
      const lineEnd = response.indexOf('\n');
      if (lineEnd < 0) return;
      const line = response.slice(0, lineEnd).trim();
      if (line.startsWith('ERR|')) finish(new Error(line.slice(4)));
      else finish(null, line);
    });
    socket.once('error', err => finish(err));
    socket.once('close', () => {
      if (!settled && response.trim()) finish(null, response.trim());
    });
  });
}

async function sendSleeperCommand(command, timeoutMs = 2500) {
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await sendSleeperCommandOnce(command, timeoutMs);
    } catch (err) {
      lastError = err;
      const transientPipeGap = ['ENOENT', 'ECONNREFUSED', 'EPIPE'].includes(err?.code)
        || /pipe.*(?:busy|not found)|cannot find the file/i.test(String(err?.message || ''));
      if (!transientPipeGap || attempt === 3) throw err;
      await new Promise(resolve => setTimeout(resolve, 45 + attempt * 35));
    }
  }
  throw lastError || new Error('Session Sleep helper did not answer.');
}

async function ensureProcessSleeper() {
  if (processSleeperProc && processSleeperProc.exitCode === null) return true;
  if (processSleeperStarting) return processSleeperStarting;
  processSleeperStarting = (async () => {
    const helperPath = processSleeperPath();
    if (!helperPath) throw new Error('The Session Sleep helper is missing from this build.');
    processSleeperPipe = `seal-session-sleep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const child = spawn(helperPath, [String(process.pid), processSleeperPipe], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    processSleeperProc = child;
    child.stderr?.on('data', data => console.warn('[session-sleep]', String(data).trim()));
    child.once('exit', () => {
      if (processSleeperProc === child) {
        processSleeperProc = null;
        processSleeperPipe = '';
        sleepingAccounts.clear();
        publishSleepState();
      }
    });
    let lastError = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 80));
        await sendSleeperCommand('PING', 700);
        return true;
      } catch (err) { lastError = err; }
    }
    try { child.kill(); } catch {}
    throw new Error(`Could not start Session Sleep: ${lastError?.message || 'helper did not answer'}`);
  })().finally(() => { processSleeperStarting = null; });
  return processSleeperStarting;
}

function sessionSleepState() {
  return {
    accounts: [...sleepingAccounts.entries()].map(([accountId, state]) => ({ accountId, ...state })),
    active: sleepingAccounts.size > 0
  };
}

function publishSleepState() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('sessions:sleepState', sessionSleepState());
}

async function restartProcessSleeperForRetry() {
  const child = processSleeperProc;
  processSleeperProc = null;
  processSleeperPipe = '';
  sleepingAccounts.clear();
  publishSleepState();
  if (child && child.exitCode === null) {
    try { child.kill(); } catch {}
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  await ensureProcessSleeper();
}

async function sleepAccounts(ids, options = {}) {
  const targetIds = [...new Set((Array.isArray(ids) ? ids : []).map(String))];
  const sessions = await trackedSessions();
  const byId = new Map(sessions.map(session => [session.accountId, session]));
  const mode = 'pulse';
  // Use the requested short recovery pulse while still giving the client a
  // real scheduling window to process networking before it is frozen again.
  const sleepMs = 6000;
  const wakeMs = 500;
  const pids = [];
  const acceptedIds = [];
  const unavailable = [];
  for (const accountId of targetIds) {
    const session = byId.get(accountId);
    const livePids = (session?.pids || []).filter(pid => Number.isInteger(Number(pid)) && Number(pid) > 0);
    if (!livePids.length || session?.reconnecting) { unavailable.push(accountId); continue; }
    pids.push(...livePids);
    acceptedIds.push(accountId);
  }
  if (!pids.length) throw new Error('None of those accounts has a confirmed Roblox process yet.');
  await ensureProcessSleeper();
  const command = `SET|${mode}|${sleepMs}|${wakeMs}|${[...new Set(pids)].join(',')}`;
  let response;
  try {
    // Suspending many Roblox clients can take several seconds on a low-end PC.
    // Give the helper time to finish so Seal does not report a false failure
    // after Windows already froze the processes.
    response = await sendSleeperCommand(command, 10000);
  } catch (firstError) {
    console.warn('[session-sleep] helper became unavailable; restarting once:', firstError.message);
    await restartProcessSleeperForRetry();
    response = await sendSleeperCommand(command, 10000);
  }
  const acceptedPids = Number(response.split('|')[1] || 0);
  if (!acceptedPids) throw new Error('Windows could not put those Roblox processes to sleep.');
  for (const accountId of acceptedIds) {
    const session = byId.get(accountId);
    sleepingAccounts.set(accountId, { mode, sleepMs, wakeMs, pids: [...session.pids], since: Date.now() });
  }
  publishSleepState();
  dispatchIntegrationEvent('sleep', { message: `${acceptedIds.length} Roblox session${acceptedIds.length === 1 ? '' : 's'} entered Freeze mode.` });
  return { ...sessionSleepState(), changed: acceptedIds, unavailable };
}

async function resumeAccounts(ids) {
  const targetIds = Array.isArray(ids) && ids.length ? [...new Set(ids.map(String))] : [...sleepingAccounts.keys()];
  const pids = [];
  for (const accountId of targetIds) pids.push(...(sleepingAccounts.get(accountId)?.pids || []));
  if (pids.length && processSleeperPipe) {
    await sendSleeperCommand(`RESUME|${[...new Set(pids)].join(',')}`).catch(err => console.warn('[session-sleep] resume failed:', err.message));
  }
  for (const accountId of targetIds) sleepingAccounts.delete(accountId);
  publishSleepState();
  return sessionSleepState();
}

function stopProcessSleeper() {
  if (processSleeperPipe) sendSleeperCommand('SHUTDOWN', 800).catch(() => {});
  sleepingAccounts.clear();
  publishSleepState();
}

async function lookupServerRegion(ip) {
  const cleanIp = String(ip || '').trim();
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(cleanIp)) return null;
  const cached = regionCache.get(cleanIp);
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.value;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    timer.unref?.();
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.success) return null;
    const value = {
      city: data.city || '', region: data.region || '', country: data.country || '', countryCode: data.country_code || '',
      label: [data.city, data.region, data.country].filter(Boolean).join(', ')
    };
    regionCache.set(cleanIp, { at: Date.now(), value });
    return value;
  } catch { return null; }
}

const joinPlaceId = value => /^[1-9]\d{0,18}$/.test(String(value || '')) ? String(value) : '';
const joinServerId = value => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(String(value || '')) ? String(value) : '';

function joinedServer(session) {
  if (!session || session.reconnecting) return '';
  if (session.activity?.jobId) {
    return session.serverConfirmed ? joinServerId(session.activity.jobId) : '';
  }
  return session.presence?.inGame ? joinServerId(session.presence.gameId) : '';
}

function joinNotificationDetails(session) {
  const source = session.serverConfirmed ? session.activity : session.presence;
  const placeId = joinPlaceId(source?.placeId || session.placeId);
  const universeId = joinPlaceId(source?.universeId || session.universeId);
  const gameName = gameTitle(getExperienceMetadata().lookup({ placeId, universeId }).name) ||
    gameTitle(session.presence?.inGame && (!session.serverConfirmed ||
      (universeId && String(session.presence.universeId) === universeId) ||
      (placeId && String(session.presence.placeId) === placeId)) ? session.presence.lastLocation : '');
  return { username: session.username || 'A Roblox account', placeId, universeId, jobId: joinedServer(session), gameName };
}

function eventMessage(type, payload = {}, join) {
  const name = payload.username || 'A Roblox account';
  if (type === 'launched') return `${name} opened Roblox.`;
  if (join) return `${name} joined ${join.gameName || 'a Roblox experience'}.`;
  if (type === 'closed') return `${name}'s Roblox session closed.`;
  return payload.message || `Seal event: ${type}`;
}

function dispatchIntegrationEvent(type, payload = {}) {
  const settings = loadIntegrationSettings();
  if (settings.events[type] === false) return;
  const join = type === 'joined' || type === 'serverChanged' ? joinNotificationDetails(payload) : undefined;
  const message = eventMessage(type, payload, join);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('integrations:event', { type, message, payload, join, at: Date.now() });
  if (settings.desktopNotifications && Notification.isSupported()) {
    try { new Notification({ title: 'Seal Account Manager', body: message, icon: getIconPath() }).show(); } catch {}
  }
}

function updateIntegrationEvents(sessions) {
  const next = new Map(sessions.map(session => [session.accountId, session]));
  for (const session of sessions) {
    const previous = previousIntegrationSessions.get(session.accountId);
    if (!previous && !session.reconnecting) dispatchIntegrationEvent('launched', session);
    const currentServer = joinedServer(session);
    const previousServer = joinedServer(previous);
    if (currentServer && !previousServer) dispatchIntegrationEvent('joined', session);
    else if (currentServer && previousServer && currentServer !== previousServer) dispatchIntegrationEvent('serverChanged', session);
  }
  for (const [accountId, session] of previousIntegrationSessions) {
    if (!next.has(accountId) && !session.reconnecting) dispatchIntegrationEvent('closed', session);
  }
  previousIntegrationSessions = next;
}

function launchTargetLabel(target) {
  if (target?.privateServerLinkCode || target?.privateServerShareCode) return 'Private server';
  if (target?.placeId && target?.gameInstanceId) return `Server in place ${target.placeId}`;
  if (target?.placeId) return `Place ${target.placeId}`;
  if (target?.followUsername) return `Following ${target.followUsername}`;
  return 'Roblox home';
}

function clearSessionReconciliation(accountId) {
  const timers = sessionReconcileTimers.get(accountId) || [];
  for (const timer of timers) clearTimeout(timer);
  sessionReconcileTimers.delete(accountId);
}

function scheduleSessionReconciliation(accountId) {
  clearSessionReconciliation(accountId);
  const timers = [1500, 3500, 7000, 12000, 20000, 35000].map(delay => {
    const timer = setTimeout(() => {
      trackedSessions().catch(err => console.warn('[sessions] delayed PID reconciliation failed:', err.message));
    }, delay);
    timer.unref?.();
    return timer;
  });
  sessionReconcileTimers.set(accountId, timers);
}

function startPlaytimeMonitor() {
  if (playtimeMonitor) clearInterval(playtimeMonitor);
  const poll = () => {
    pollLocalPlaytime();
    trackedSessions().catch(err => console.warn('[time] tracking check failed:', err.message));
  };
  poll();
  playtimeMonitor = setInterval(poll, PLAYTIME_POLL_MS);
  playtimeMonitor.unref?.();
}

function pollLocalPlaytime() {
  // Keep the clock and account recovery independent of online enrichment.
  if (!localTrackingTask) localTrackingTask = trackedSessionsCore({ skipNetwork: true })
    .catch(err => console.warn('[time] local tracking check failed:', err.message))
    .finally(() => { localTrackingTask = null; });
  return localTrackingTask;
}

function stopPlaytimeMonitor() {
  if (playtimeMonitor) clearInterval(playtimeMonitor);
  playtimeMonitor = null;
}

function clearAllSessionReconciliations() {
  for (const accountId of sessionReconcileTimers.keys()) clearSessionReconciliation(accountId);
}

let sessionRecovery = null;
let localTrackingTask = null;
function observeRoutedProcesses(processes, reliable) {
  const now = Date.now();
  pendingRoutedStarts = pendingRoutedStarts.filter(start => now - start.spawnedAt < 45000);
  for (const process of processes) {
    if (pendingRoutedStarts.some(start => process.startedAt >= start.spawnedAt - 100 &&
      (process.pid === start.spawnedPid || process.parentPid === start.spawnedPid) &&
      !start.beforePids.includes(process.pid))) routedRobloxPids.set(process.pid, process.startedAt);
  }
  const byPid = new Map(processes.map(process => [process.pid, process]));
  for (const [pid, startedAt] of idleStartupTrayPids) {
    const process = byPid.get(pid);
    if (process ? process.window || process.startedAt !== startedAt : reliable) idleStartupTrayPids.delete(pid);
  }
  for (const process of [...processes].sort((a, b) => a.startedAt - b.startedAt)) {
    const parent = byPid.get(process.parentPid);
    if (parent && parent.startedAt < process.startedAt && routedRobloxPids.get(parent.pid) === parent.startedAt) {
      routedRobloxPids.set(process.pid, process.startedAt);
    }
  }
  if (reliable) {
    for (const [pid, startedAt] of routedRobloxPids) {
      if (!processes.some(process => process.pid === pid && process.startedAt === startedAt)) routedRobloxPids.delete(pid);
    }
  }
}

async function trackedSessionsCore({ skipNetwork = false, skipSideEffects = false } = {}) {
  const expectedPids = [...new Set([...accountPids.values()]
    .flatMap(pids => [...pids])
    .map(Number)
    .filter(pid => Number.isInteger(pid) && pid > 0))];
  sessionRecovery ||= recovery.createRecovery(path.join(app.getPath('userData'), 'active-session-map.json'), activityWatcher);
  const [pidSnapshot, processCatalog] = await Promise.all([
    launcher.getRobloxPidSnapshot({ expectedPids }),
    sessionRecovery.scan({ withParents: pendingRoutedStarts.length > 0 || routedRobloxPids.size > 0 })
  ]);
  const livePids = new Set(pidSnapshot.pids);
  const confirmedMissingPids = new Set(pidSnapshot.confirmedMissingPids || []);
  const savedAccounts = new Map(accountStore.listAccounts().map(account => [account.id, account]));
  const liveProcesses = (processCatalog || []).filter(process => livePids.has(process.pid));
  observeRoutedProcesses(liveProcesses, !!processCatalog && pidSnapshot.reliable);
  const processByPid = new Map(liveProcesses.map(process => [process.pid, process]));
  const startedThroughSeal = pid => routedRobloxPids.has(pid) && routedRobloxPids.get(pid) === processByPid.get(pid)?.startedAt;
  const logs = sessionRecovery.recentLogs?.(liveProcesses) || [];
  if (processCatalog) {
    const recoveredSessions = sessionRecovery.recover(liveProcesses, [...savedAccounts.values()], logs);
    const recoveredByPid = new Map(recoveredSessions.map(session => [session.pid, session]));
    if (pidSnapshot.reliable) {
      // A profile link is valid only while the same sign-in is still verified.
      // Recheck it before attributing any more time after sign-out or a switch.
      for (const [accountId, meta] of accountSessions) {
        if (meta.identitySource !== recovery.DESKTOP_PROFILE_SOURCE) continue;
        const resolved = recoveredByPid.get(meta.pid);
        if (resolved?.accountId === accountId) {
          accountSessions.set(accountId, { ...resolved, beforePids: [], trackingUntil: 0 });
        } else {
          accountPids.delete(accountId);
          accountSessions.delete(accountId);
          sessionPidMisses.delete(accountId);
        }
      }
    }
    const alreadyClaimed = new Set([...accountPids.values()].flatMap(pids => [...pids]));
    for (const recovered of recoveredSessions) {
      if (!livePids.has(recovered.pid) || alreadyClaimed.has(recovered.pid)) continue;
      const pids = accountPids.get(recovered.accountId) || new Set();
      pids.add(recovered.pid);
      accountPids.set(recovered.accountId, pids);
      if (!accountSessions.has(recovered.accountId)) accountSessions.set(recovered.accountId, { ...recovered, beforePids: [], trackingUntil: 0 });
      alreadyClaimed.add(recovered.pid);
    }
  }
  const sessions = [];
  const now = Date.now();
  const liveByAccount = new Map();
  const reconnectingAccounts = new Set();

  // Never erase a dashboard entry because of one transient tasklist result.
  // Require a reliable scan and a sustained miss before removing the mapping.
  for (const [accountId, knownPids] of accountPids) {
    const activePids = [...knownPids].filter(pid => livePids.has(pid));
    if (activePids.length > 0) {
      const activeSet = new Set(activePids);
      accountPids.set(accountId, activeSet);
      liveByAccount.set(accountId, activeSet);
      sessionPidMisses.delete(accountId);
      continue;
    }

    const confirmedClosed = knownPids.size > 0 && [...knownPids].every(pid => confirmedMissingPids.has(pid));
    if (confirmedClosed) {
      accountPids.delete(accountId);
      sessionPidMisses.delete(accountId);
      continue;
    }

    let miss = sessionPidMisses.get(accountId);
    if (pidSnapshot.reliable) {
      if (!miss) miss = { since: now, reliableMisses: 0 };
      miss.reliableMisses++;
      sessionPidMisses.set(accountId, miss);
    }
    const confirmedByRepeatedRefresh = !!miss
      && miss.reliableMisses >= SESSION_DISAPPEAR_CONFIRM_MISSES
      && now - miss.since >= Math.min(500, SESSION_DISAPPEAR_GRACE_MS);
    const withinGrace = !pidSnapshot.reliable || !confirmedByRepeatedRefresh;
    if (withinGrace) reconnectingAccounts.add(accountId);
    else {
      accountPids.delete(accountId);
      sessionPidMisses.delete(accountId);
    }
  }

  const claimedPids = new Set();
  for (const pids of liveByAccount.values()) {
    for (const pid of pids) claimedPids.add(pid);
  }

  // Reconcile newest launches first. Each launch stores the PIDs that existed
  // before it started, so a later account can claim only its own new process;
  // the previous account then receives any earlier unclaimed replacement PID.
  const pendingSessions = [...accountSessions.entries()]
    .filter(([accountId, meta]) => {
      if (liveByAccount.has(accountId)) return false;
      const miss = sessionPidMisses.get(accountId);
      return Number(meta.trackingUntil || 0) >= now
        || (!!miss && now - miss.since < SESSION_DISAPPEAR_GRACE_MS);
    })
    .sort((a, b) => Number(b[1].startedAt || 0) - Number(a[1].startedAt || 0));

  for (const [accountId, meta] of pendingSessions) {
    const baseline = new Set(Array.isArray(meta.beforePids) ? meta.beforePids : []);
    const candidates = [...livePids].filter(pid => !claimedPids.has(pid) && !baseline.has(pid) &&
      !idleStartupTrayPids.has(pid) && !startedThroughSeal(pid));
    if (candidates.length === 0) continue;
    const candidateSet = new Set(candidates);
    accountPids.set(accountId, candidateSet);
    liveByAccount.set(accountId, candidateSet);
    reconnectingAccounts.delete(accountId);
    sessionPidMisses.delete(accountId);
    for (const pid of candidates) claimedPids.add(pid);
    console.log(`[sessions] reconciled ${accountId} to Roblox PID(s): ${candidates.join(', ')}`);
  }

  for (const [accountId, meta] of accountSessions) {
    const activePids = [...(liveByAccount.get(accountId) || [])];
    const reconnecting = activePids.length === 0 && reconnectingAccounts.has(accountId);
    if (activePids.length === 0) {
      if (!reconnecting && Number(meta.trackingUntil || 0) < now) {
        accountSessions.delete(accountId);
        sessionPidMisses.delete(accountId);
        clearSessionReconciliation(accountId);
      }
      if (!reconnecting) continue;
    }

    if (activePids.length) accountPids.set(accountId, new Set(activePids));
    const account = savedAccounts.get(accountId);
    sessions.push({
      accountId,
      userId: account?.userId || '',
      username: account?.username || meta.username || accountId,
      avatarUrl: account?.avatarUrl || '',
      pids: activePids.length ? activePids : [...(accountPids.get(accountId) || [])],
      startedAt: meta.startedAt || Date.now(),
      targetLabel: meta.targetLabel || 'Roblox',
      startedBySeal: meta.startedBySeal === true || activePids.some(startedThroughSeal),
      reconnecting,
      unlinkedIds: activePids.map(pid => processByPid.get(pid)).filter(process => process?.startedAt > 0).map(recovery.unlinkedId),
      unlinkedSince: meta.identitySource === recovery.DESKTOP_PROFILE_SOURCE ? meta.desktopSignedInAt : undefined,
      processScanReliable: pidSnapshot.reliable
    });
  }

  // Associate each launched client with the Player log Roblox created for it.
  // Those logs expose place/job/server information without reading Roblox memory.
  const claimedLogs = new Set([...accountSessions.values()].map(meta => meta.logFile).filter(Boolean));
  for (const session of [...sessions].sort((a, b) => Number(a.startedAt) - Number(b.startedAt))) {
    const meta = accountSessions.get(session.accountId);
    if (!meta) continue;
    if (!meta.logFile) {
      const logFile = activityWatcher.findLogForLaunch(meta.startedAt, claimedLogs);
      if (logFile) {
        meta.logFile = logFile;
        claimedLogs.add(logFile);
      }
    }
    if (!meta.logFile) continue;
    try {
      const activity = activityWatcher.parseActivity(meta.logFile);
      if (!activity) continue;
      session.activity = activity;
      session.logFile = meta.logFile;
      session.jobId = activity.jobId || null;
      session.placeId = activity.placeId || session.placeId || null;
      session.universeId = activity.universeId || null;
      session.machineAddress = activity.machineAddress || null;
      session.joinedAt = activity.joinedAt || null;
      session.serverConfirmed = !!activity.confirmed && !activity.disconnected;
      if (session.serverConfirmed && /^(Roblox home|Roblox)$/i.test(session.targetLabel || 'Roblox')) {
        session.targetLabel = activity.placeId ? `Place ${activity.placeId}` : 'In game';
      }
    } catch (err) {
      console.warn('[activity] could not parse Roblox log:', err.message);
    }
  }

  if (!skipNetwork && sessions.length && now - trackedPresenceCache.at > 12000) {
    const userIds = sessions
      .map(session => savedAccounts.get(session.accountId)?.userId)
      .filter(Boolean);
    let byUserId = {};
    for (const session of sessions) {
      try {
        const cookie = accountStore.getCookie(session.accountId);
        byUserId = await robloxApi.getPresenceMany(cookie, userIds, {
          onCookieRotated: rotatedCookie => accountStore.setCookie(session.accountId, rotatedCookie)
        });
        break;
      } catch {}
    }
    trackedPresenceCache = { at: now, byUserId };
  }

  for (const session of sessions) {
    const account = savedAccounts.get(session.accountId);
    if (account) session.username = account.username;
    const presence = now - trackedPresenceCache.at <= 30000 ? trackedPresenceCache.byUserId?.[String(account?.userId)] : null;
    if (presence) {
      session.presence = presence;
      session.placeId = session.serverConfirmed ? session.placeId || presence.placeId || null : presence.placeId || session.placeId || null;
      session.gameId = presence.gameId || session.gameId || null;
      session.jobId = session.jobId || presence.gameId || null;
      session.universeId = session.serverConfirmed ? session.universeId || presence.universeId || null : presence.universeId || session.universeId || null;
      const sameGame = !session.serverConfirmed || (presence.universeId && String(presence.universeId) === String(session.universeId)) || (presence.placeId && String(presence.placeId) === String(session.placeId));
      if (presence.inGame && sameGame) {
        session.targetLabel = presence.lastLocation || (presence.placeId ? `Place ${presence.placeId}` : 'In game');
      } else if (presence.inStudio && !session.serverConfirmed) {
        session.targetLabel = 'Roblox Studio';
      } else if (presence.webOnline && !session.serverConfirmed && session.targetLabel === 'Roblox home') {
        session.targetLabel = 'Roblox home';
      }
    }
    const sleep = sleepingAccounts.get(session.accountId);
    if (sleep) session.sleep = { ...sleep };
  }

  if (!skipNetwork && loadIntegrationSettings().regionLookup) {
    await Promise.all(sessions.map(async session => {
      if (session.machineAddress) session.serverRegion = await lookupServerRegion(session.machineAddress);
    }));
  }

  let sleepStateChanged = false;
  const sessionIds = new Set(sessions.map(session => session.accountId));
  for (const accountId of sleepingAccounts.keys()) {
    if (!sessionIds.has(accountId)) { sleepingAccounts.delete(accountId); sleepStateChanged = true; }
  }
  if (sleepStateChanged) publishSleepState();

  const unlinked = recovery.unlinkedSessions(liveProcesses, sessions, livePids, logs);
  for (const session of unlinked) session.startedBySeal = session.pids.some(startedThroughSeal);
  if (!skipSideEffects && !backgroundMode?.isQuitting() && (skipNetwork || !playtimeMonitor)) {
    playtimeStore?.update([...sessions, ...unlinked], Date.now());
    try { getServerHub().record(sessions); } catch (error) { console.warn('[servers] Could not save server history:', error.message); }
    updateIntegrationEvents(sessions);
  }
  if (processCatalog && pidSnapshot.reliable && !skipSideEffects && !process.env.SEAL_TEST_ROBLOX_ROOT && (skipNetwork || !playtimeMonitor)) {
    try { sessionRecovery.save(liveProcesses, accountSessions, accountPids, [...savedAccounts.values()]); }
    catch (error) { console.warn('[sessions] recovery map could not be saved:', error.message); }
  }
  // Include Home and external sessions before Roblox reports a user ID.
  sessions.push(...unlinked);
  if (skipNetwork || !playtimeMonitor) backgroundMode?.setTrackedCount(sessions.length);
  return sessions.sort((a, b) => a.startedAt - b.startedAt);
}

function enrichPlaytimeStats(stats) {
  // Names/icons are enriched by the persistent background metadata pipeline.
  // Returning cached time must never wait for remote presence or metadata.
  const result = stats;
  const saved = new Map(accountStore.listAccounts().map(account => [String(account.userId), account]));
  for (const account of [...result.accounts, ...result.experiences.flatMap(game => game.accounts)]) {
    const current = saved.get(String(account.userId));
    if (current) { account.username = current.username; account.avatarUrl = current.avatarUrl; }
  }
  return result;
}

function trackedSessions(options = {}) {
  if (options.fast) {
    if (trackedSessionsFastTask) return trackedSessionsFastTask;
    trackedSessionsFastTask = trackedSessionsCore({ skipNetwork: true, skipSideEffects: true }).finally(() => {
      trackedSessionsFastTask = null;
    });
    return trackedSessionsFastTask;
  }
  if (trackedSessionsTask) return trackedSessionsTask;
  trackedSessionsTask = trackedSessionsCore().finally(() => {
    trackedSessionsTask = null;
  });
  return trackedSessionsTask;
}

// ---------------------------------------------------------------------
// Anti-AFK is deliberately opt-in. It runs only while Roblox is open and
// stops its helper as soon as the final Roblox process exits.
let antiIdleProc = null;
const antiIdleSettings = require('./src/antiIdleSettings');
const antiIdleSettingsPath = () => path.join(app.getPath('userData'), 'anti-afk-settings.json');
ipcMain.handle('antiIdle:getSettings', () => antiIdleSettings.read(antiIdleSettingsPath()));
ipcMain.handle('antiIdle:saveSettings', (_event, value) => antiIdleSettings.save(antiIdleSettingsPath(), value));
let antiIdleEnabled = false;
let antiIdleMonitor = null;
let antiIdleRestartTimer = null;
let antiIdleRestartCount = 0;

function antiIdleScriptPath() {
  const resources = process.resourcesPath || '';
  const candidates = [
    path.join(resources, 'antiIdle.ps1'),
    path.join(resources, 'app.asar.unpacked', 'src', 'antiIdle.ps1'),
    path.join(__dirname, 'src', 'antiIdle.ps1')
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

function antiIdleProcessActive() {
  return !!antiIdleProc && antiIdleProc.exitCode === null && !antiIdleProc.killed;
}

function clearAntiIdleTimers() {
  if (antiIdleMonitor) clearInterval(antiIdleMonitor);
  if (antiIdleRestartTimer) clearTimeout(antiIdleRestartTimer);
  antiIdleMonitor = null;
  antiIdleRestartTimer = null;
}

function stopAntiIdle() {
  antiIdleEnabled = false;
  antiIdleRestartCount = 0;
  clearAntiIdleTimers();
  const child = antiIdleProc;
  antiIdleProc = null;
  if (child && child.exitCode === null && !child.killed) {
    try { child.kill(); } catch {}
  }
}

async function antiIdleState() {
  const pids = await launcher.listRobloxPids();
  return {
    active: antiIdleEnabled && antiIdleProcessActive(),
    enabled: antiIdleEnabled,
    robloxRunning: pids.length > 0,
    pids
  };
}

function scheduleAntiIdleRestart() {
  if (!antiIdleEnabled || antiIdleRestartTimer) return;
  if (antiIdleRestartCount >= 3) {
    console.warn('[anti-afk] helper stopped repeatedly; disabling it');
    stopAntiIdle();
    return;
  }
  antiIdleRestartCount += 1;
  antiIdleRestartTimer = setTimeout(async () => {
    antiIdleRestartTimer = null;
    if (!antiIdleEnabled) return;
    try {
      const pids = await launcher.listRobloxPids();
      if (pids.length === 0) {
        stopAntiIdle();
        return;
      }
      await spawnAntiIdleProcess();
    } catch (err) {
      console.warn('[anti-afk] restart failed:', err.message);
      scheduleAntiIdleRestart();
    }
  }, 2000);
}

function spawnAntiIdleProcess() {
  if (antiIdleProcessActive()) return Promise.resolve();
  const scriptPath = antiIdleScriptPath();
  if (!scriptPath) {
    return Promise.reject(new Error('The Anti-AFK helper is missing from this build.'));
  }

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-SettingsPath', antiIdleSettingsPath()
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    antiIdleProc = child;
    let settled = false;

    child.once('spawn', () => {
      settled = true;
      resolve();
    });
    child.stdout?.on('data', data => console.log('[anti-afk]', String(data).trim()));
    child.stderr?.on('data', data => console.warn('[anti-afk]', String(data).trim()));
    child.once('error', err => {
      if (antiIdleProc === child) antiIdleProc = null;
      if (!settled) {
        settled = true;
        reject(new Error(`Could not start Anti-AFK: ${err.message}`));
      } else if (antiIdleEnabled) {
        scheduleAntiIdleRestart();
      }
    });
    child.once('exit', () => {
      if (antiIdleProc === child) antiIdleProc = null;
      if (antiIdleEnabled) scheduleAntiIdleRestart();
    });
  });
}

function startAntiIdleMonitor() {
  if (antiIdleMonitor) return;
  antiIdleMonitor = setInterval(async () => {
    if (!antiIdleEnabled) return;
    try {
      const pids = await launcher.listRobloxPids();
      if (pids.length === 0) stopAntiIdle();
      else if (!antiIdleProcessActive()) scheduleAntiIdleRestart();
    } catch (err) {
      console.warn('[anti-afk] could not check Roblox:', err.message);
    }
  }, 10000);
}

async function startAntiIdleIfRobloxRunning() {
  const pids = await launcher.listRobloxPids();
  if (pids.length === 0) {
    throw new Error('Open Roblox first, then turn on Anti-AFK.');
  }

  antiIdleEnabled = true;
  antiIdleRestartCount = 0;
  try {
    await spawnAntiIdleProcess();
    startAntiIdleMonitor();
    return antiIdleState();
  } catch (err) {
    stopAntiIdle();
    throw err;
  }
}

async function syncAntiIdleWithRoblox() {
  const state = await antiIdleState();
  if (!state.robloxRunning && antiIdleEnabled) {
    stopAntiIdle();
    return { active: false, enabled: false, robloxRunning: false, pids: [] };
  }
  return state;
}

async function maybeResumeAntiIdleAfterLaunch(reason) {
  // Anti-AFK must never turn a successful Roblox launch into a failed launch.
  if (!antiIdleEnabled || antiIdleProcessActive()) return false;
  try {
    const pids = await launcher.listRobloxPids();
    if (pids.length === 0) return false;
    await spawnAntiIdleProcess();
    startAntiIdleMonitor();
    return true;
  } catch (err) {
    console.warn(`[anti-afk] could not resume after ${reason}:`, err.message);
    return false;
  }
}

// Network interception and process suspension remain removed.
let bootstrapMods = null;
let mainWindow;
let backgroundMode = null;
let persistentExecutableTask = null;
let protocolExecutable = null;
function preparePersistentExecutable() {
  return persistentExecutableTask ||= require('./src/startupRuntime').prepareStartupExecutable({
    executable: getStableExecutablePath(), portable: portableMode,
    runtimeRoot: path.join(process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'), 'Seal Account Manager', 'Startup'),
    version: app.getVersion()
  }).catch(error => { persistentExecutableTask = null; throw error; });
}
function bootstrapperOptions() {
  return {app,launcher,userDataPath:app.getPath('userData'),executable:protocolExecutable || getStableExecutablePath()};
}

function syncRobloxHomeShortcuts(enabled) {
  if (launchTestMode || !app.isPackaged || !protocolExecutable || process.platform !== 'win32' || !process.env.LOCALAPPDATA) return;
  const versionDirectory = launcher.findRobloxVersionFolder();
  require('./src/robloxShortcuts').updateHomeShortcuts({
    shell, enabled, executable: protocolExecutable,
    desktop: app.getPath('desktop'),
    programs: path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    startupRoot: path.join(process.env.LOCALAPPDATA, 'Seal Account Manager', 'Startup'),
    versionsDirectory: path.join(process.env.LOCALAPPDATA, 'Roblox', 'Versions'),
    backupDir: path.join(app.getPath('userData'), 'roblox-shortcut-backups'),
    player: versionDirectory ? path.join(versionDirectory, 'RobloxPlayerBeta.exe') : ''
  });
}
function syncRobloxTrayStartup() {
  if (launchTestMode || !app.isPackaged || !protocolExecutable || process.platform !== 'win32' || !process.env.LOCALAPPDATA) return;
  try {
    const userData = app.getPath('userData');
    const versionDirectory = launcher.findRobloxVersionFolder();
    const startup = backgroundMode?.status();
    require('./src/robloxStartup').syncRobloxStartup({
      enabled: startup?.startAtLogin === true && startup.startupRegistered &&
        sealBootstrapper.loadState(userData).enabled === true,
      executable: protocolExecutable,
      startupRoot: path.join(process.env.LOCALAPPDATA, 'Seal Account Manager', 'Startup'),
      versionsDirectory: path.join(process.env.LOCALAPPDATA, 'Roblox', 'Versions'),
      backupFile: path.join(userData, 'roblox-tray-startup-backup.json'),
      player: versionDirectory ? path.join(versionDirectory, 'RobloxPlayerBeta.exe') : ''
    });
  } catch (error) { console.warn('[Roblox startup]', error.message); }
}
function showMainWindow() {
  if (backgroundMode) backgroundMode.show();
  else if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
}
function createBackgroundMode() {
  return require('./src/backgroundMode').createBackgroundMode({
    file: path.join(app.getPath('userData'), 'background-settings.json'), app, Tray, Menu,
    icon: getIconPath, getWindow: () => mainWindow, createWindow,
    enabled: !launchTestMode || backgroundTestMode,
    allowLogin: !launchTestMode && app.isPackaged && process.platform === 'win32',
    prepareExecutable: preparePersistentExecutable,
    onChange: status => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('background:state', status);
      syncRobloxTrayStartup();
    }
  });
}
let bootstrapperLastEvent = null;
// Play reports status to the existing UI/tray; it never opens a launch window.
const launchSplash = require('./src/launchSplash')({ icon: getIconPath, disabled: () => true });
let robloxReadyTask = null;
let robloxReadyTaskForcesUpdate = false;

function publishBootstrapperEvent(event) {
  bootstrapperLastEvent = event;
  launchSplash.update(event.message || 'Preparing Roblox…', event.progress);
  try { sealBootstrapper.recordEvent(app.getPath('userData'), event); } catch {}
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('bootstrapper:state', event);
}

async function ensureRobloxReady(options = {}) {
  const forceUpdate = !!options.forceUpdate;
  if (robloxReadyTask) {
    // Share one check/install between simultaneous buttons, protocol launches,
    // and account launches. A forced repair waits behind a normal check.
    if (forceUpdate && !robloxReadyTaskForcesUpdate) {
      try { await robloxReadyTask; } catch {}
      return ensureRobloxReady(options);
    }
    return robloxReadyTask;
  }

  const task = sealBootstrapper.ensureReady({
    launcher,
    userDataPath: app.getPath('userData'),
    forceCheck: !!options.forceCheck,
    forceUpdate,
    checkForUpdates: !!options.forceCheck || forceUpdate,
    autoUpdate: forceUpdate,
    onStatus: publishBootstrapperEvent
  });
  robloxReadyTask = task;
  robloxReadyTaskForcesUpdate = forceUpdate;
  try {
    return await task;
  } finally {
    if (robloxReadyTask === task) {
      robloxReadyTask = null;
      robloxReadyTaskForcesUpdate = false;
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    show: !launchTestMode && !startHidden,
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#04080c',
    frame: false,
    icon: getIconImage() || getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  backgroundMode?.attach(mainWindow);
  mainWindow.on('session-end', () => { backgroundMode?.beginQuit(); stopPlaytimeMonitor(); playtimeStore?.stop(); });
  mainWindow.on('closed', () => { mainWindow = null; });
  if (launchTestMode) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[smoke] renderer loaded successfully');
      // Portable wrappers can exit successfully even when the Windows loader
      // fails before Electron starts. Let packaging tests require proof that
      // the extracted application actually loaded its renderer.
      if (process.env.SEAL_SMOKE_REPORT) {
        try {
          fs.writeFileSync(process.env.SEAL_SMOKE_REPORT, JSON.stringify({
            loaded: true, executable: process.execPath, version: app.getVersion(),
            displayVersion,
            ffmpegPresent: fs.existsSync(path.join(path.dirname(process.execPath), 'ffmpeg.dll'))
          }));
        } catch (error) {
          console.error('[smoke] could not write startup report:', error.message);
          app.exit(1);
          return;
        }
      }
      const holdMs = Math.min(30000, Math.max(150, Number(process.env.SEAL_SMOKE_HOLD_MS) || 150));
      setTimeout(() => app.quit(), holdMs);
    });
    mainWindow.webContents.once('did-fail-load', (_event, code, description) => {
      console.error(`[smoke] renderer failed to load (${code}): ${description}`);
      app.exit(1);
    });
  }
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  const publishWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('window:maximized', { maximized: mainWindow.isMaximized() });
  };
  mainWindow.on('maximize', publishWindowState);
  mainWindow.on('unmaximize', publishWindowState);
}

ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  return true;
});

ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { maximized: false };
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return { maximized: mainWindow.isMaximized() };
});

ipcMain.handle('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  return true;
});
ipcMain.handle('background:settings', () => backgroundMode?.status() || { keepRunning:true,startAtLogin:true });
ipcMain.handle('background:save', (_event, settings = {}) => backgroundMode.save({
  ...(typeof settings.keepRunning === 'boolean' ? {keepRunning:settings.keepRunning} : {}),
  ...(typeof settings.startAtLogin === 'boolean' ? {startAtLogin:settings.startAtLogin} : {})
}));
ipcMain.handle('app:version', () => displayVersion || app.getVersion());
ipcMain.handle('app:quit', () => { backgroundMode?.quit(); return true; });

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  const windowsIdentity = !launchTestMode ? ensureWindowsAppIdentity() : null;
  if (identityTestMode) {
    app.quit();
    return;
  }
  if (!launchTestMode) {
    try { launcher.repairUnsafeFpsSettings(); }
    catch (err) { console.warn('[fps] could not repair legacy settings:', err.message); }
  }
  const bootstrapperUserData = app.getPath('userData');
  performancePresetStore.configure(bootstrapperUserData);
  playtimeStore = new PlaytimeStore({
    filePath: path.join(bootstrapperUserData, 'playtime.json'),
    logger: console
  });
  bootstrapMods = sealBootstrapper.loadMods(bootstrapperUserData);
  const savedBootstrapperState = sealBootstrapper.loadState(bootstrapperUserData);
  if (!launchTestMode && app.isPackaged) {
    try { protocolExecutable = await preparePersistentExecutable(); }
    catch(error) { console.warn('[startup] persistent launcher unavailable:',error.message); }
  }
  if ((savedBootstrapperState.enabled === true || (savedBootstrapperState.enabled !== false && app.isPackaged)) && !launchTestMode) {
    try {
      // Roblox updates can reclaim protocol associations. Repair Seal's two
      // handlers whenever a user who enabled launcher mode opens the app.
      sealBootstrapper.enable(bootstrapperOptions());
      syncRobloxHomeShortcuts(true);
    } catch (err) {
      console.warn('[bootstrapper] could not repair protocol registration:', err.message);
    }
  }
  backgroundMode = createBackgroundMode();
  createWindow();
  backgroundMode.initialize().then(status => { if(startHidden && !status.trayReady && !launchTestMode)showMainWindow(); }).catch(error => console.warn('[background]',error.message));
  if (!launchTestMode) {
    scheduleGameMetadataWarmup(1000);
    scheduleBadgeMaintenance(15000);
  }
  if (!launchTestMode) {
    discordPresence.start();
    startDiscordRobloxMonitor();
    startPlaytimeMonitor();
  }
  if (backgroundTestMode) startPlaytimeMonitor();
  loadIntegrationSettings();
  if (windowsIdentity) startWindowsIdentityMaintenance(windowsIdentity);
  protocolLaunchReady = true;
  for (const url of pendingProtocolUrls.splice(0)) enqueueProtocolLaunch(url).catch(() => {});

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && (!backgroundMode?.hasTray() || backgroundMode.isQuitting())) app.quit();
});

app.on('before-quit', () => {
  backgroundMode?.beginQuit();
  badgeInventory?.stop();
  badgeAwardDates?.stop();
  experienceMetadata?.stop();
  clearTimeout(badgeMetadataTimer);
  clearTimeout(badgeMaintenanceTimer);
  stopWindowsIdentityMaintenance();
  stopDiscordRobloxMonitor();
  stopPlaytimeMonitor();
  playtimeStore?.stop();
  discordPresence.stop();
  stopAntiIdle();
  stopProcessSleeper();
  launcher.restoreFpsOverride();
  launcher.releaseMultiInstanceHandles();
  backgroundMode?.destroy();
});

// ---------------------------------------------------------------------
// IPC: account list / management
// ---------------------------------------------------------------------

ipcMain.handle('accounts:list', () => {
  return accountStore.listAccounts();
});

ipcMain.handle('time:stats', async (_event, range = {}) => {
  if (!playtimeStore) return { from: 0, to: Date.now(), totalMs: 0, accountCount: 0, experienceCount: 0, accounts: [], experiences: [] };
  const stats = playtimeStore.getStats(range);
  const accounts = accountStore.listAccounts();
  const inventory = getBadgeInventory();
  if (!launchTestMode) inventory.start(accounts, badgeInventoryAuth);
  const dates = getBadgeAwardDates();
  if (!launchTestMode || process.argv.includes('--seal-badge-dates-test')) dates.enqueue(accounts, inventory.awardReferences(accounts), {replace:true});
  const metadata = getExperienceMetadata();
  if (!launchTestMode || range.refreshMetadata === true) {
    metadata.enqueue([...stats.experiences, ...inventory.references(accounts)], { retry: range.refreshMetadata === true });
  }
  const result = inventory.merge(enrichPlaytimeStats(stats), accounts, metadata.lookup);
  result.gameMetadata = metadata.status();
  result.badgeDates = dates.status();
  return result;
});

let avatarRefreshTask = null;
const robloxProgress = require('./src/robloxProgress');
let badgeInventory = null;
let badgeAwardDates = null;
let badgeMaintenanceTimer = null;
let badgeMetadataRevision = 0;
function scheduleBadgeMaintenance(wait = 30000) {
  badgeMaintenanceTimer = setTimeout(() => {
    try {
      const accounts = accountStore.listAccounts();
      const inventory = getBadgeInventory();
      if (!inventory.start(accounts, badgeInventoryAuth).busy) inventory.start(accounts, badgeInventoryAuth, { audit: true });
    } catch (error) { console.warn('[time] background badge sync unavailable:', error.message); }
    scheduleBadgeMaintenance();
  }, wait);
  badgeMaintenanceTimer.unref?.();
}
function getBadgeAwardDates() {
  return badgeAwardDates ||= require('./src/badgeAwardDates').createBadgeAwardDates(path.join(app.getPath('userData'), 'badge-award-dates.json'), {
    fetchDates: robloxProgress.awardedDates, authFor: badgeInventoryAuth,
    onChange: status => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('time:badgeDates', status); }
  });
}
let badgeIconCache = null;
function getBadgeIconCache() {
  return badgeIconCache ||= require('./src/badgeIconCache').createBadgeIconCache(path.join(app.getPath('userData'), 'badge-icons.json'), { fetchIcons: robloxProgress.badgeIcons });
}
let experienceMetadata = null;
let badgeMetadataTimer = null;
function scheduleGameMetadataWarmup(wait = 150) {
  if (badgeMetadataTimer) return;
  badgeMetadataTimer = setTimeout(() => {
    badgeMetadataTimer = null;
    try {
      const accounts = accountStore.listAccounts();
      getExperienceMetadata().enqueue([...(playtimeStore?.getStats({}).experiences || []), ...getBadgeInventory().references(accounts)]);
      getBadgeAwardDates().enqueue(accounts, getBadgeInventory().awardReferences(accounts), {replace:true});
    } catch (error) { console.warn('[time] background game lookup unavailable:', error.message); }
  }, wait);
  badgeMetadataTimer.unref?.();
}
function getExperienceMetadata() {
  return experienceMetadata ||= require('./src/experienceMetadata').createExperienceMetadata(path.join(app.getPath('userData'), 'experience-metadata.json'), {
    resolvePlace: robloxProgress.resolvePlace, fetchDetails: robloxProgress.experienceDetails,
    fetchAvailability: robloxProgress.experienceAvailability, fetchAlternate: robloxProgress.alternateExperienceDetails,
    resolvePlaces: !launchTestMode ? placeIds => {
      for (const account of accountStore.listAccounts()) {
        const auth = badgeInventoryAuth(account.id);
        if (auth.cookie) return robloxProgress.placeDetails(placeIds, auth);
      }
      throw Error('No saved login available for bulk game lookup.');
    } : undefined,
    onChange: status => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('time:gameMetadata', status); }
  });
}
function badgeInventoryAuth(accountId) {
  return { cookie: accountStore.getCookie(accountId), onRotation: cookie => accountStore.setCookie(accountId, cookie) };
}
function getBadgeInventory() {
  return badgeInventory ||= require('./src/badgeInventory').createBadgeInventory(path.join(app.getPath('userData'), 'badge-inventory.json'), {
    fetchPage: robloxProgress.ownedBadgePage,
    verifyDates: robloxProgress.awardedDates,
    awardDates: getBadgeAwardDates(),
    onChange: status => {
      if (!launchTestMode && status.revision !== badgeMetadataRevision) {
        badgeMetadataRevision = status.revision;
        scheduleGameMetadataWarmup(1000);
      }
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('time:badgeSync', status);
    }
  });
}
ipcMain.handle('time:syncBadges', () => {
  const accounts = accountStore.listAccounts(), inventory = getBadgeInventory();
  if (!launchTestMode || process.argv.includes('--seal-badge-dates-test')) getBadgeAwardDates().enqueue(accounts, inventory.awardReferences(accounts), {replace:true,retry:true});
  return inventory.start(accounts, badgeInventoryAuth, { fresh: true });
});
ipcMain.handle('time:earnedBadges', (_event, input = {}) => {
  const accounts = accountStore.listAccounts(), dates = getBadgeAwardDates();
  const page = getBadgeInventory().ownedBadges(input, accounts);
  if (!launchTestMode || process.argv.includes('--seal-badge-dates-test')) dates.enqueue(accounts, page.badges.flatMap(badge => badge.accounts.map(account => ({userId:account.userId,badgeId:badge.id}))), {priority:true});
  page.badgeDates = dates.status();
  const icons = getBadgeIconCache().cached(page.badges.map(badge => badge.id));
  for (const badge of page.badges) badge.iconUrl = icons[badge.id] || '';
  return page;
});
ipcMain.handle('time:badgeIcons', (_event, ids = []) => {
  if (!Array.isArray(ids) || ids.length > 100) throw Error('Choose up to 100 badge icons.');
  return getBadgeIconCache().get(ids);
});
ipcMain.handle('time:badges', async (_event, payload = {}) => {
  const accounts = accountStore.listAccounts().filter(account => !payload.accountId || account.id === payload.accountId);
  const result = await robloxProgress.badges(payload, accounts, accountId => ({ cookie: accountStore.getCookie(accountId), onRotation: cookie => accountStore.setCookie(accountId, cookie) }));
  getBadgeAwardDates().rememberBadges(result.badges);
  return result;
});
ipcMain.handle('games:artwork', (_event, universeId) => robloxProgress.artwork(universeId));
ipcMain.handle('accounts:refreshAvatars', async (_event, ids = []) => {
  if (avatarRefreshTask) return avatarRefreshTask;
  avatarRefreshTask = (async () => {
    const requested = new Set((Array.isArray(ids) ? ids : []).map(String));
    const targets = accountStore.listAccounts().filter(account => requested.size === 0 || requested.has(String(account.id)));
    try { accountStore.updateProfiles(await robloxProgress.profiles(targets)); }
    catch (error) { console.warn('[profiles] username refresh unavailable:', error.message); }
    let byUserId = {};
    try {
      byUserId = await robloxApi.getAvatarUrls(targets.map(account => account.userId));
    } catch (err) {
      console.warn('[avatars] batch refresh failed:', err.message);
    }
    for (const account of targets) {
      const avatarUrl = byUserId[String(account.userId)];
      if (avatarUrl) accountStore.setAvatarUrl(account.id, avatarUrl);
    }
    return accountStore.listAccounts();
  })().finally(() => { avatarRefreshTask = null; });
  return avatarRefreshTask;
});

ipcMain.handle('accounts:remove', (_event, id) => {
  resumeAccounts([id]).catch(() => {});
  accountStore.removeAccount(id);
  accountPids.delete(id);
  accountSessions.delete(id);
  sessionPidMisses.delete(id);
  clearSessionReconciliation(id);
  return true;
});

ipcMain.handle('accounts:setFps', (_event, { id, fps }) => {
  accountStore.setFpsCap(id, fps);
  return true;
});

function saveAccountLaunchSettings(id, settings) {
  validatePerformancePresetSelection(settings?.fastFlagPreset);
  return withAccountOperation(id, 'saving settings', () => {
    // Roblox settings are shared on disk. Never reset them while another
    // account is in the middle of starting and reading its own launch values.
    const task = accountLaunchQueue.then(() => {
      validatePerformancePresetSelection(settings?.fastFlagPreset);
      if (settings?.fastFlagPreset === 'off' && launcher.findRobloxVersionFolder()) {
        launcher.resetPerformanceSettings();
      }
      const result=accountStore.setLaunchSettings(id, settings || {});
      rememberLaunchProfile(id);return result;
    });
    accountLaunchQueue = task.catch(() => {});
    return task;
  });
}

ipcMain.handle('accounts:setLaunchSettings', (_event, { id, settings }) => saveAccountLaunchSettings(id, settings));

ipcMain.handle('accounts:setGraphicsQuality', (_event, { id, graphicsQuality }) => {
  accountStore.setGraphicsQuality(id, graphicsQuality);
  return true;
});

ipcMain.handle('accounts:setVolume', (_event, { id, volume }) => {
  accountStore.setVolume(id, volume);
  return true;
});

ipcMain.handle('accounts:setFastFlagPreset', (_event, { id, preset }) => {
  return saveAccountLaunchSettings(id, { fastFlagPreset: preset });
});

function validatePerformancePresetSelection(preset) {
  if (preset === undefined || preset === null || preset === '') return true;
  const value = String(preset);
  if (['off', 'balanced', 'max'].includes(value)) return true;
  if (/^custom:/i.test(value) && performancePresetStore.getPreset(value)) return true;
  throw new Error('That performance preset no longer exists. Choose another preset and try again.');
}

let externalLaunchSettings = null;
function getExternalLaunchSettings() {
  return externalLaunchSettings ||= require('./src/externalLaunchSettings').createExternalLaunchSettings(path.join(app.getPath('userData'),'external-launch-settings.json'));
}
function rememberLaunchProfile(id) {
  try { getExternalLaunchSettings().remember(id); }
  catch(error) { console.warn('[launch] could not remember settings profile:',error.message); }
}
function performanceSettingsForAccount(account) {
  const fastFlagPreset=account?.fastFlagPreset || 'off';let customFlags={};
  if(/^custom:/i.test(fastFlagPreset)){
    const compiled=performancePresetStore.compilePreset(fastFlagPreset);
    if(!compiled)throw Error('This account uses a custom performance preset that no longer exists. Choose another preset and apply settings.');
    customFlags=compiled.flags;
  }
  return {fpsCap:account?Number(account.fpsCap)||60:60,graphicsQuality:account?Number(account.graphicsQuality)||1:1,volume:account?Math.max(0,Math.min(10,Number(account.volume??1))):1,fastFlagPreset:/^custom:/i.test(fastFlagPreset)?'custom':fastFlagPreset,customFlags};
}
function applyLaunchPerformance(settings) {
  launcher.applyPerformanceSettings(settings);
  try { launcher.setVolume(settings.volume); } catch(error) { console.warn('Could not set volume:',error.message); }
}
ipcMain.handle('launch:preferences',()=>getExternalLaunchSettings().status());
ipcMain.handle('launch:savePreferences',(_event,profile)=>getExternalLaunchSettings().select(String(profile),accountStore.listAccounts()));

ipcMain.handle('performancePresets:list', () => performancePresetStore.listPresets());
ipcMain.handle('performancePresets:analyzeImport', (_event, value) => performancePresetStore.analyzeImport(value));
ipcMain.handle('performancePresets:importFile', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import a FastFlag preset',
    properties: ['openFile'],
    filters: [{ name: 'JSON files', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const file = result.filePaths[0];
  const text = fs.readFileSync(file, 'utf8');
  return {
    canceled: false,
    suggestedName: path.basename(file, path.extname(file)).slice(0, 32),
    text,
    analysis: performancePresetStore.analyzeImport(text)
  };
});
ipcMain.handle('performancePresets:save', (_event, preset) => {
  const saved = performancePresetStore.savePreset(preset || {});
  return { preset: saved, presets: performancePresetStore.listPresets() };
});
ipcMain.handle('performancePresets:remove', (_event, id) => {
  const task = accountLaunchQueue.then(() => {
    const presetId = String(id || '');
    const assigned = accountStore.listAccounts().some(account => account.fastFlagPreset === presetId);
    if (assigned && launcher.findRobloxVersionFolder()) launcher.resetPerformanceSettings();
    const removed = performancePresetStore.removePreset(presetId);
    const resetAccounts = accountStore.replaceFastFlagPresetReferences(removed.id, 'off');
    return { removed, resetAccounts, presets: performancePresetStore.listPresets() };
  });
  accountLaunchQueue = task.catch(() => {});
  return task;
});
ipcMain.handle('performancePresets:exportFile', async (_event, id) => {
  const compiled = performancePresetStore.compilePreset(String(id || ''));
  if (!compiled) throw new Error('That preset no longer exists.');
  const safeName = compiled.preset.name.replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '-') || 'seal-performance-preset';
  const result = await dialog.showSaveDialog({
    title: 'Export FastFlag preset',
    defaultPath: `${safeName}.json`,
    filters: [{ name: 'JSON files', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, JSON.stringify(compiled.flags, null, 2), 'utf8');
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('accounts:setPinned', (_event, { id, pinned }) => {
  accountStore.setPinned(id, pinned);
  return true;
});

ipcMain.handle('accounts:reorder', (_event, ids) => {
  accountStore.setAccountOrder(Array.isArray(ids) ? ids : []);
  return true;
});

async function checkCookieForAccount(acc) {
  try {
    const cookie = accountStore.getCookie(acc.id);
    const info = await robloxApi.checkCookieActive(cookie, {
      onCookieRotated: rotatedCookie => accountStore.setCookie(acc.id, rotatedCookie)
    });
    return {
      id: acc.id,
      username: acc.username,
      userId: acc.userId,
      ok: true,
      status: 'active',
      checkedUsername: info.username,
      checkedUserId: info.userId
    };
  } catch (err) {
    return {
      id: acc.id,
      username: acc.username,
      userId: acc.userId,
      ok: false,
      status: 'expired',
      error: err.message || 'Cookie is invalid or expired'
    };
  }
}

ipcMain.handle('accounts:checkCookie', async (_event, id) => {
  const accounts = accountStore.listAccounts();
  const acc = accounts.find(a => a.id === id);
  if (!acc) throw new Error('Account not found');
  return checkCookieForAccount(acc);
});

ipcMain.handle('accounts:checkCookies', async () => {
  const accounts = accountStore.listAccounts();
  const results = [];

  for (const acc of accounts) {
    results.push(await checkCookieForAccount(acc));

    // 600ms between checks keeps us well under Roblox's rate limit.
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  return results;
});

// ---------------------------------------------------------------------
// IPC: browser-based login (opens a real Roblox login window)
// ---------------------------------------------------------------------

const ROBLOX_BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const LOGIN_VERIFY_RETRY_DELAYS = [500, 900, 1600, 2600, 4000];

async function latestRobloxCookie(loginSession) {
  const cookies = await loginSession.cookies.get({
    url: 'https://www.roblox.com/',
    name: '.ROBLOSECURITY'
  });
  return cookies
    .filter(cookie => String(cookie.value || '').trim())
    .sort((a, b) => Number(b.expirationDate || 0) - Number(a.expirationDate || 0))[0]?.value || '';
}

async function validateRobloxLoginSession(loginSession) {
  const res = await loginSession.fetch('https://users.roblox.com/v1/users/authenticated', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Referer: 'https://www.roblox.com/',
      'User-Agent': ROBLOX_BROWSER_USER_AGENT
    }
  });
  if (!res.ok) {
    const err = new Error(`Cookie is invalid or expired (status ${res.status})`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  // Chromium applies Set-Cookie rotation to this same session. Give the cookie
  // store one event-loop turn, then persist the newest value rather than the one
  // that merely happened to trigger the first navigation.
  await new Promise(resolve => setTimeout(resolve, 100));
  const cookie = await latestRobloxCookie(loginSession);
  if (!cookie) throw new Error('Roblox signed in, but did not provide a usable login cookie.');
  return { userId: data.id, username: data.name, cookie };
}

async function runRobloxBrowserLogin(existing = null, credentials = null, controller = null) {
  // Every attempt receives a fresh in-memory partition. Awaiting the wipe avoids
  // racing a stale cookie from a previous Add/Refresh attempt.
  const partition = `seal-login-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const loginSession = session.fromPartition(partition, { cache: false });
  await loginSession.clearStorageData();

  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: 520,
      height: 660,
      title: credentials ? `Import ${credentials.username} — complete verification, or close to skip` : existing ? `Re-sign in as ${existing.username}` : 'Sign in to Roblox',
      icon: getIconPath(),
      parent: mainWindow,
      modal: !credentials,
      webPreferences: {
        session: loginSession,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
    loginWin.webContents.setUserAgent(ROBLOX_BROWSER_USER_AGENT);
    loginWin.setMenuBarVisibility(false);

    let settled = false;
    let validating = false;
    let checkTimer = null;
    let pendingCheck = false;
    let pendingCheckDelay = 350;
    let rejectedCookie = '';
    let rejectedCount = 0;
    let fillTimer = null;
    let fillBusy = false;
    let filled = false;

    const clearCheckTimer = () => {
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = null;
    };

    const cleanupSession = async () => {
      clearCheckTimer();
      clearInterval(fillTimer);
      loginSession.cookies.removeListener('changed', onCookieChanged);
      try { await loginSession.clearStorageData(); } catch (err) {
        console.warn('[login] could not clear temporary Roblox session:', err.message);
      }
    };

    const finish = async (error, account) => {
      if (settled) return;
      settled = true;
      await cleanupSession();
      if (!loginWin.isDestroyed()) loginWin.destroy();
      if (error) reject(error);
      else resolve(account);
    };

    if (controller) {
      controller.cancelCurrent = () => {
        const error = new Error('Bulk login skipped.');
        error.code = 'BULK_SKIP';
        void finish(error);
      };
      if (controller.stopped) { controller.cancelCurrent(); return; }
    }
    if (credentials) {
      const { fillLoginForm } = require('./src/bulkAccountImport');
      fillTimer = setInterval(async () => {
        if (settled || filled || fillBusy || loginWin.isDestroyed()) return;
        if (!/^https:\/\/www\.roblox\.com\/login(?:[?#]|\/?$)/.test(loginWin.webContents.getURL())) return;
        fillBusy = true;
        try {
          filled = await loginWin.webContents.executeJavaScript(`(${fillLoginForm.toString()})(${JSON.stringify(credentials.username)},${JSON.stringify(credentials.password)})`);
          if (filled) { credentials.password = ''; clearInterval(fillTimer); }
        } catch { /* Navigation can replace the document before the form mounts. */ }
        finally { fillBusy = false; }
      }, 500);
    }

    const scheduleCheck = (delayMs = 350) => {
      if (settled) return;
      if (validating) {
        pendingCheckDelay = pendingCheck ? Math.min(pendingCheckDelay, delayMs) : delayMs;
        pendingCheck = true;
        return;
      }
      clearCheckTimer();
      checkTimer = setTimeout(() => {
        checkTimer = null;
        checkForCookie().catch(err => finish(new Error(`Could not verify Roblox login: ${err.message}`)));
      }, delayMs);
    };

    async function checkForCookie() {
      if (settled || validating) return;
      let rawCookie = await latestRobloxCookie(loginSession);
      if (!rawCookie) return;

      validating = true;
      pendingCheck = false;
      pendingCheckDelay = 350;
      try {
        // Roblox can write more than one cookie value while redirecting through
        // login, verification, and home. Wait briefly and always use the latest.
        await new Promise(resolveDelay => setTimeout(resolveDelay, 350));
        rawCookie = await latestRobloxCookie(loginSession);
        if (!rawCookie || settled) return;

        const { userId, username, cookie } = await validateRobloxLoginSession(loginSession);
        if (settled) return;
        if (existing && String(userId) !== String(existing.userId)) {
          await finish(new Error(`Signed in as ${username} but expected ${existing.username}. Please try again.`));
          return;
        }
        if (credentials && username.toLowerCase() !== credentials.username.toLowerCase()) {
          await finish(new Error('Signed in to a different account than the requested import.'));
          return;
        }

        const avatarUrl = await robloxApi.getAvatarUrl(userId).catch(() => null);
        if (settled) return;
        const account = accountStore.addAccount({
          id: existing?.id,
          username,
          userId,
          avatarUrl,
          cookie,
          preserveId: !!existing
        });
        await finish(null, account);
      } catch (err) {
        if (settled) return;
        const latest = await latestRobloxCookie(loginSession).catch(() => rawCookie);
        if (latest && latest !== rejectedCookie) {
          rejectedCookie = latest;
          rejectedCount = 0;
        }
        rejectedCount += 1;

        // A 401/403 during redirect is often the old value being replaced. Do
        // not close on the first cookie: retry it and immediately react if the
        // browser writes a newer value.
        if ((err.status === 401 || err.status === 403) && rejectedCount < LOGIN_VERIFY_RETRY_DELAYS.length) {
          if (!loginWin.isDestroyed()) loginWin.setTitle('Finishing Roblox sign-in…');
          scheduleCheck(LOGIN_VERIFY_RETRY_DELAYS[rejectedCount]);
          return;
        }
        await finish(new Error(`${existing ? 'Could not verify account after re-login' : 'Logged in but could not verify account'}: ${err.message}`));
      } finally {
        validating = false;
        if (pendingCheck && !settled) {
          const delayMs = pendingCheckDelay;
          pendingCheck = false;
          pendingCheckDelay = 350;
          scheduleCheck(delayMs);
        }
      }
    }

    function onCookieChanged(_event, cookie, cause, removed) {
      if (removed || cookie?.name !== '.ROBLOSECURITY' || !String(cookie.domain || '').endsWith('roblox.com')) return;
      rejectedCookie = '';
      rejectedCount = 0;
      scheduleCheck(cause === 'overwrite' ? 500 : 300);
    }

    loginSession.cookies.on('changed', onCookieChanged);
    loginWin.webContents.on('did-navigate', () => scheduleCheck(450));
    loginWin.webContents.on('did-navigate-in-page', () => scheduleCheck(450));
    loginWin.webContents.on('did-stop-loading', () => scheduleCheck(450));
    loginWin.on('closed', () => {
      if (settled) return;
      settled = true;
      const error = new Error('Login window was closed before signing in.');
      if (credentials) error.code = 'BULK_SKIP';
      cleanupSession().finally(() => reject(error));
    });

    loginWin.loadURL('https://www.roblox.com/login').catch(err => {
      finish(new Error(`Could not open Roblox sign-in: ${err.message}`));
    });
  });
}

ipcMain.handle('accounts:loginWithBrowser', async () => runRobloxBrowserLogin());

let bulkImportController = null;
ipcMain.handle('accounts:bulkImport', async (event, text) => {
  if (event.sender !== mainWindow?.webContents) throw new Error('Import is only available in Seal.');
  if (bulkImportController) throw new Error('A bulk import is already running.');
  const { parseCredentials, runBulkImport } = require('./src/bulkAccountImport');
  const entries = parseCredentials(text);
  text = '';
  const controller = { stopped: false, cancelCurrent: null };
  bulkImportController = controller;
  const stop = () => { controller.stopped = true; controller.cancelCurrent?.(); };
  event.sender.once('destroyed', stop);
  try {
    return await runBulkImport(entries, {
      controller,
      login: (entry, state) => runRobloxBrowserLogin(null, entry, state),
      report: progress => { if (!event.sender.isDestroyed()) event.sender.send('accounts:bulkImportProgress', progress); }
    });
  } finally {
    event.sender.removeListener('destroyed', stop);
    bulkImportController = null;
  }
});
ipcMain.handle('accounts:bulkImportControl', (event, action) => {
  if (event.sender !== mainWindow?.webContents || !['skip', 'stop'].includes(action)) return;
  if (bulkImportController) {
    if (action === 'stop') bulkImportController.stopped = true;
    bulkImportController.cancelCurrent?.();
  }
});

// ---------------------------------------------------------------------
// IPC: re-authenticate an existing account (refresh its cookie)
// ---------------------------------------------------------------------

ipcMain.handle('accounts:reauth', async (_event, id) => {
  const accounts = accountStore.listAccounts();
  const existing = accounts.find(a => a.id === id);
  if (!existing) throw new Error('Account not found');
  return runRobloxBrowserLogin(existing);
});


function friendlyLaunchError(err) {
  const message = err && err.message ? String(err.message) : String(err || 'Launch failed');
  if (/safeStorage\.decryptString|decrypt/i.test(message)) {
    return 'Saved login could not be decrypted. Click ↻ Refresh on this account and sign in again, then launch selected.';
  }
  if (/Close every Roblox window before Seal installs or updates Roblox/i.test(message)) {
    return 'Seal needs to install or update Roblox. It tried to close Roblox first, but Roblox is still running. Close Roblox from Task Manager and try again.';
  }
  return message;
}

async function prepareMultiInstanceLaunch({ closeExisting = false } = {}) {
  try {
    await protectExternalRobloxHome();
  } catch (error) {
    if (error.code !== 'SEAL_EXTERNAL_ROBLOX_HOME') throw error;
    return { ready: false, requiresClose: false, preservedExisting: true, message: error.message };
  }
  const robloxRunning = await launcher.isRobloxRunning();
  if (robloxRunning) {
    // A Play launch made by this Seal process already has the holder. Reusing
    // it is what allows a later Launch Selected request to add more clients
    // without closing the clients that are already open.
    try {
      await launcher.ensureMultiInstance(true);
      return {
        ready: true,
        requiresClose: false,
        preservedExisting: true,
        strategy: 'persistent-holder',
        message: 'Reusing the active multi-instance session.'
      };
    } catch (holderError) {
      if (holderError?.code !== 'SEAL_MUTEX_BUSY') throw holderError;
      return {
        ready: false,
        requiresClose: false,
        preservedExisting: true,
        message: 'Seal could not release the existing singleton lock. Windows may be blocking access, or another launcher may own it. Your existing Roblox sessions were left running.'
      };
    }
  }

  // Roblox must finish any client preparation before the holder is created.
  // Once acquired, keep it for Seal's full lifetime. Releasing it between Play
  // clicks is what caused Roblox to replace or close earlier account windows.
  await ensureRobloxReady();
  await launcher.ensureMultiInstance(true);
  return {
    ready: true,
    requiresClose: false,
    preservedExisting: false,
    strategy: 'persistent-holder'
  };
}

async function finishMultiInstanceLaunch() {
  // Intentionally retain the holder. Roblox's current single-instance signal
  // can close an earlier client as the next one starts if this is released.
  // before-quit is the only normal place that releases it.
  return { ok: true, retained: true };
}

// ---------------------------------------------------------------------
// IPC: launching
// ---------------------------------------------------------------------

ipcMain.handle('accounts:launch', async (_event, payload) => {
  const result = await launchOne(payload, false);
  await maybeResumeAntiIdleAfterLaunch('launch');
  return result;
});

ipcMain.handle('accounts:relaunch', async (_event, payload) => {
  const id = String(payload?.id || '');
  if (!id) throw new Error('Account not found');
  return withAccountOperation(id, 'applying settings', async () => {
    await protectExternalRobloxHome(null, id);
    validatePerformancePresetSelection(payload?.settings?.fastFlagPreset);
    const saved = accountStore.setLaunchSettings(id, payload?.settings || {});
    const closeResult = await forceQuitAccounts([id]);
    await new Promise(resolve => setTimeout(resolve, closeResult.closed ? 500 : 150));
    const result = await enqueueLaunchOne({ id, target: payload?.target }, false);
    await maybeResumeAntiIdleAfterLaunch('settings relaunch');
    return { saved, result };
  });
});

ipcMain.handle('accounts:launchBatchStep', async (_event, payload) => {
  // Keep this available as a one-account-at-a-time IPC so the renderer can
  // update the Launch selected button as 1/x, 2/x, 3/x instead of freezing the
  // label until the whole batch finishes.
  //
  // Every launch route shares the same persistent holder. This matches the
  // last working multi-instance release and keeps Play/Launch Selected in one
  // compatible session.

  try {
    await launchOne({ id: payload.id, target: payload.target }, true, { skipPreflight: true });
    await maybeResumeAntiIdleAfterLaunch('batch step');
    return { id: payload.id, ok: true };
  } catch (err) {
    throw new Error(friendlyLaunchError(err));
  }
});

ipcMain.handle('accounts:prepareLaunchMultiple', async (_event, options) => {
  return prepareMultiInstanceLaunch(options || {});
});

ipcMain.handle('accounts:finishLaunchMultiple', async () => {
  // Kept as an IPC compatibility point; it deliberately does not release the
  // persistent holder between batches.
  return finishMultiInstanceLaunch();
});

let serverHub = null;
function getServerHub() {
  return serverHub ||= require('./src/serverHub').createServerHub(path.join(app.getPath('userData'), 'server-hub.json'));
}
ipcMain.handle('servers:list', (_event, input) => getServerHub().list(input || {}));
ipcMain.handle('servers:history', () => {
  const saved = new Map(accountStore.listAccounts().map(a => [a.id, a]));
  return getServerHub().history().filter(h => saved.has(h.accountId)).map(h => ({ ...h, username: saved.get(h.accountId).username }));
});
ipcMain.handle('servers:timers', () => getServerHub().timers());
ipcMain.handle('servers:saveTimer', (_event, input) => getServerHub().saveTimer(input || {}));
ipcMain.handle('servers:removeTimer', (_event, id) => getServerHub().removeTimer(String(id)));

ipcMain.handle('accounts:sessions', async (_event, options) => trackedSessions({ fast: options?.fast === true }));

async function openUnlinkedProcess(token) {
  const match = /^unlinked:(\d+):(\d+)$/.exec(String(token || ''));
  if (!match) throw new Error('Invalid Roblox window.');
  sessionRecovery ||= recovery.createRecovery(path.join(app.getPath('userData'), 'active-session-map.json'), activityWatcher);
  const processes = await sessionRecovery.scan({ force: true });
  const process = processes?.find(item => item.pid === Number(match[1]) && item.startedAt === Number(match[2]));
  if (!process) throw new Error('That Roblox window has closed. Refresh the session dashboard.');
  if ([...accountPids.values()].some(pids => pids.has(process.pid))) throw new Error('That window is already linked. Refresh the session dashboard.');
  if (!process.window) {
    const livePids = new Set(processes.map(item => item.pid));
    const logs = sessionRecovery.recentLogs?.(processes) || [];
    const linked = [...accountSessions].map(([id, meta]) => ({ ...meta, pids: [...(accountPids.get(id) || [])] }));
    if (!recovery.unlinkedSessions(processes, linked, livePids, logs).some(item => item.accountId === token)) {
      throw new Error('That Roblox window has closed. Refresh the session dashboard.');
    }
  }
  return process;
}

ipcMain.handle('sessions:linkAccount', (_event, payload) => withAccountOperation(payload?.accountId, 'linking a window', async () => {
  const account = accountStore.listAccounts().find(item => item.id === payload?.accountId);
  if (!account) throw new Error('Choose a saved account.');
  const sessions = await trackedSessions({ fast: true });
  if (sessions.some(session => session.accountId === account.id)) throw new Error('That account already has a linked Roblox window.');
  const process = await openUnlinkedProcess(payload?.token);
  if ([...accountPids.values()].some(pids => pids.has(process.pid))) throw new Error('That window is already linked. Refresh the session dashboard.');
  accountPids.set(account.id, new Set([process.pid]));
  const observed = sessions.find(session => session.accountId === payload.token);
  accountSessions.set(account.id, { username: account.username, startedAt: process.startedAt, targetLabel: observed?.targetLabel || 'Roblox home', logFile: observed?.logFile || '', beforePids: [], trackingUntil: 0 });
  if (playtimeMonitor) await pollLocalPlaytime();
  return { ok: true };
}));

ipcMain.handle('sessions:sleep', async (_event, payload) => {
  return sleepAccounts(payload?.ids || [], payload || {});
});

ipcMain.handle('sessions:resume', async (_event, ids) => resumeAccounts(ids || []));
ipcMain.handle('sessions:sleepStatus', async () => sessionSleepState());

ipcMain.handle('integrations:getSettings', async () => loadIntegrationSettings());
ipcMain.handle('integrations:saveSettings', async (_event, settings) => saveIntegrationSettings(settings || {}));
ipcMain.handle('integrations:joinDetails', (_event, entries) => {
  if (!Array.isArray(entries) || entries.length > 60) throw new Error('Too many notifications.');
  const metadata = getExperienceMetadata();
  const history = entries.some(entry => entry?.legacy === true) ? getServerHub().history() : [];
  const missing = [];
  const result = entries.map(entry => {
    const placeId = joinPlaceId(entry?.placeId), universeId = joinPlaceId(entry?.universeId);
    const gameName = gameTitle(metadata.lookup({ placeId, universeId }).name);
    if (!gameName && (placeId || universeId)) missing.push({ placeId, universeId });
    if (!entry?.legacy || !placeId || !Number.isFinite(entry.timestamp)) return { gameName };
    const matches = history.filter(row => row.placeId === placeId && row.username === entry.username &&
      entry.timestamp >= row.firstSeen - 5000 && entry.timestamp <= row.lastSeen + 5000);
    const match = matches.length === 1 ? matches[0] : undefined;
    return { gameName: gameName || gameTitle(match?.name), jobId: joinServerId(match?.id) };
  });
  if (missing.length) metadata.enqueue(missing);
  return result;
});
ipcMain.handle('integrations:openServerLink', (_event, place, job) => {
  const placeId = joinPlaceId(place), jobId = joinServerId(job);
  if (!placeId || !jobId) throw new Error('This notification has no valid server link.');
  return shell.openExternal(`https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${jobId}`);
});
ipcMain.handle('system:copyText', (_event, value) => {
  clipboard.writeText(String(value || '').slice(0, 4096));
  return true;
});

ipcMain.handle('accounts:launchMultiple', async (_event, payload) => {
  const results = [];
  const ids = payload.ids || [];

  // Prepare Roblox once, then repeat the same working card-Play launch path.
  const preparation = await prepareMultiInstanceLaunch();
  if (!preparation.ready) throw new Error(preparation.message);

  try {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await launchOne({ id, target: payload.target }, true, { skipPreflight: true });
        await maybeResumeAntiIdleAfterLaunch('batch launch');
        results.push({ id, ok: true });

        if (i < ids.length - 1) await new Promise(resolve => setTimeout(resolve, BATCH_LAUNCH_HANDOFF_MS));
      } catch (err) {
        results.push({ id, ok: false, error: friendlyLaunchError(err) });
      }
    }
  } finally {
    await finishMultiInstanceLaunch();
  }
  return results;
});

function accountOperationLabel(id, action) {
  const account = accountStore.listAccounts().find(item => String(item.id) === String(id));
  return `${account?.username || 'This account'} is already ${action}`;
}

async function withAccountOperation(id, action, operation) {
  const key = String(id || '');
  const existing = accountOperations.get(key);
  if (existing) throw new Error(`${existing}. Wait for it to finish.`);
  const label = accountOperationLabel(key, action);
  accountOperations.set(key, label);
  try {
    return await operation();
  } finally {
    if (accountOperations.get(key) === label) accountOperations.delete(key);
  }
}

function enqueueLaunchOne(payload, multiInstance, options = {}) {
  // PID attribution is based on a before/after process snapshot. Serialize all
  // entry points (card Play, Launch selected, relaunch) so rapid clicks cannot
  // claim one another's Roblox process or create a false duplicate/conflict.
  const task = accountLaunchQueue.then(async () => {
    const account = accountStore.listAccounts().find(item => item.id === payload?.id);
    try { launchSplash.start(account?.username); } catch {}
    try {
      const result = await launchOneCore(payload, multiInstance, options);
      launchSplash.finish(true);
      return result;
    } catch (error) {
      launchSplash.finish(false);
      throw error;
    }
  });
  accountLaunchQueue = task.catch(() => {});
  return task;
}

// Retain only local process evidence. Launch URLs and auth data are never part of this trace.
function recordRobloxLaunch(route, phase, result) {
  try {
    const file = path.join(app.getPath('userData'), 'roblox-launch-trace.json');
    let entries = [];
    try {
      const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(stored)) entries = stored.slice(-59);
    } catch {}
    const pids = values => Array.isArray(values) ? values.filter(value => Number.isSafeInteger(value) && value > 0) : [];
    entries.push({
      at: new Date().toISOString(), version: app.getVersion(), samPid: process.pid, route, phase,
      ...(result ? { before: pids(result.beforePids), observedNew: pids(result.pids),
        spawnedPid: Number.isSafeInteger(result.spawnedPid) ? result.spawnedPid : null,
        ...(Array.isArray(result.confirmedMissingPids) ? { confirmedMissing: pids(result.confirmedMissingPids) } : {})
      } : {})
    });
    writeTextAtomic(file, JSON.stringify(entries, null, 2));
  } catch (error) { console.warn('[launcher] Could not save launch trace:', error.code || 'write failed'); }
}

async function recordRobloxLaunchResult(route, result) {
  recordRobloxLaunch(route, 'returned', result);
  if (!result?.beforePids?.length) return;
  try {
    const snapshot = await launcher.getRobloxPidSnapshot({ expectedPids: result.beforePids });
    if (snapshot.reliable) recordRobloxLaunch(route, 'checked', { ...result, confirmedMissingPids: snapshot.confirmedMissingPids || [] });
  } catch {}
}

function launchOne(payload, multiInstance, options = {}) {
  const key = String(payload?.id || '');
  // Repeated Play clicks share the actual attempt, with no extra wait error
  // and no second spawn. Once it finishes, Play can retry immediately.
  if (accountLaunchTasks.has(key)) return accountLaunchTasks.get(key);
  const task = withAccountOperation(key, 'launching', () => enqueueLaunchOne(payload, multiInstance, options));
  accountLaunchTasks.set(key, task);
  const clear = () => { if (accountLaunchTasks.get(key) === task) accountLaunchTasks.delete(key); };
  task.then(clear, clear);
  return task;
}

async function protectExternalRobloxHome(sessions, replacingAccountId) {
  const current = sessions || await trackedSessions({ fast: true });
  const protectedWindow = current.find(session => session.accountId !== replacingAccountId &&
    !session.reconnecting && !session.startedBySeal && !session.serverConfirmed);
  if (!protectedWindow) return;
  const error = new Error('SAM kept the existing Roblox window open. To launch both accounts, close that window and start both through SAM.');
  error.code = 'SEAL_EXTERNAL_ROBLOX_HOME';
  throw error;
}

async function launchOneCore(payload, multiInstance, options = {}) {
  const { id, target } = payload;

  // Protect an account from being started twice by Seal in the same session.
  // This check runs before requesting an auth ticket or changing client files.
  // Duplicate protection only needs live PIDs. Skip presence/region web calls
  // here so a stale dashboard refresh cannot delay the actual Roblox spawn.
  const activeSessions = await trackedSessions({ fast: true });
  const duplicate = activeSessions.find(session => session.accountId === id);
  if (duplicate) {
    throw new Error(`${duplicate.username} is already running. Close its active session before launching it again.`);
  }
  await protectExternalRobloxHome(activeSessions);

  // Do the potentially slow update check before requesting a short-lived auth
  // ticket. This is the same ordering a bootstrapper needs: prepare client,
  // apply settings/mods, then obtain launch credentials and start Roblox.
  if (!options.skipPreflight) await ensureRobloxReady();

  const cookie = accountStore.getCookie(id);
  launchSplash.update('Signing in to Roblox…');
  const authTicket = await robloxApi.getAuthTicket(cookie, rotatedCookie => accountStore.setCookie(id, rotatedCookie));

  const accounts = accountStore.listAccounts();
  const account = accounts.find(a => a.id === id);
  // A failed reset must stop this launch, not silently start Roblox with the
  // previous account's low-detail flags still active.
  launchSplash.update('Applying your settings…');
  applyLaunchPerformance(performanceSettingsForAccount(account));
  rememberLaunchProfile(id);
  if (hasActiveRobloxMods(bootstrapMods)) {
    try {
      launcher.applyRobloxMods(bootstrapMods);
    } catch (err) {
      console.warn('Could not apply bootstrap mods before launch:', err.message);
    }
  }

  let resolvedTarget = null;
  if (target?.placeId && target?.gameInstanceId) {
    resolvedTarget = { placeId: target.placeId, gameInstanceId: target.gameInstanceId };
  } else if (target?.privateServerLinkCode && target?.placeId) {
    resolvedTarget = { placeId: target.placeId, privateServerLinkCode: target.privateServerLinkCode };
  } else if (target?.privateServerShareCode) {
    // New private server share links only expose a share code. Resolve it
    // against Roblox's website first so the desktop client receives the
    // placeId + private server token it actually needs.
    const resolved = await robloxApi.resolvePrivateServerShareCode(cookie, target.privateServerShareCode);
    console.log('[private-server] resolved share link:', { placeId: resolved.placeId, hasPrivateServerLinkCode: !!resolved.privateServerLinkCode, source: resolved.source });
    resolvedTarget = {
      placeId: resolved.placeId,
      privateServerLinkCode: resolved.privateServerLinkCode
    };
  } else if (target?.placeId) {
    resolvedTarget = { placeId: target.placeId };
  } else if (target?.followUsername) {
    const followUserId = await robloxApi.getUserIdFromUsername(target.followUsername);
    resolvedTarget = { followUserId };
  }

  // Register the pending account before starting Roblox. Session refreshes can
  // run while the client is booting; the baseline prevents them from assigning
  // an existing window to this account.
  await protectExternalRobloxHome();
  const startedAt = Date.now();
  const initialBaseline = await launcher.listRobloxPids();
  accountSessions.set(id, {
    username: account?.username || id,
    startedAt,
    targetLabel: launchTargetLabel(target),
    startedBySeal: true,
    beforePids: initialBaseline,
    trackingUntil: startedAt + SESSION_TRACKING_GRACE_MS
  });
  scheduleSessionReconciliation(id);

  let launchResult;
  recordRobloxLaunch('sam', 'starting', { beforePids: initialBaseline });
  try {
    launchSplash.update('Starting Roblox…');
    launchResult = await launcher.launchAccount(authTicket, resolvedTarget, multiInstance, {
      beforePids: initialBaseline,
      multiInstanceReady: !!options.skipPreflight
    });
  } catch (err) {
    recordRobloxLaunch('sam', 'failed');
    accountSessions.delete(id);
    accountPids.delete(id);
    sessionPidMisses.delete(id);
    clearSessionReconciliation(id);
    throw err;
  }
  await recordRobloxLaunchResult('sam', launchResult);
  const { pids, beforePids } = launchResult;
  const meta = accountSessions.get(id) || {};
  accountSessions.set(id, {
    ...meta,
    beforePids: Array.isArray(beforePids) ? beforePids : initialBaseline,
    trackingUntil: startedAt + SESSION_TRACKING_GRACE_MS
  });

  if (pids && pids.length > 0) {
    const set = accountPids.get(id) || new Set();
    for (const pid of pids) set.add(pid);
    accountPids.set(id, set);
  }

  // Run the same reconciliation used by the periodic dashboard immediately.
  // This also filters a temporary PID that exited during the final handoff.
  await sessionRecovery?.scan({ force: true });
  await trackedSessions({ fast: true });
  if (playtimeMonitor) pollLocalPlaytime();

  return {
    accountId: id,
    username: account?.username || id,
    pids: pids || [],
    startedAt,
    targetLabel: launchTargetLabel(target)
  };
}

async function handleRobloxProtocolUrl(url) {
  const desktopTray = url === '--roblox-startup';
  const desktopHome = desktopTray || url === '--roblox-home';
  if (!desktopHome && !/^roblox(?:-player)?:/i.test(String(url || ''))) return;
  const route = protocolLaunchRoute(url);
  recordRobloxLaunch(route, 'received');
  if (desktopTray) {
    const snapshot = await launcher.getRobloxPidSnapshot();
    if (!snapshot.reliable || snapshot.pids.length) {
      recordRobloxLaunch(route, 'skipped');
      return;
    }
  }
  const profile=getExternalLaunchSettings().account(accountStore.listAccounts());
  const settings=profile?performanceSettingsForAccount(profile):launcher.captureAppliedSettings();
  const result = await sealBootstrapper.prepareAndLaunch({
    launcher,
    userDataPath: app.getPath('userData'),
    uri: desktopHome ? undefined : url,
    desktopHome,
    desktopTray,
    mods: bootstrapMods,
    onSpawn: start => {
      pendingRoutedStarts.push(start);
      recordRobloxLaunch(route, 'spawned', start);
    },
    onStatus: event => {
      if (event.phase === 'launching') recordRobloxLaunch(route, 'starting');
      publishBootstrapperEvent(event);
    },
    beforeLaunch: () => applyLaunchPerformance(settings)
  });
  const launch = result.launchResult;
  await recordRobloxLaunchResult(route, launch);
  sessionRecovery ||= recovery.createRecovery(path.join(app.getPath('userData'), 'active-session-map.json'), activityWatcher);
  const processes = await sessionRecovery.scan({ force: true, withParents: pendingRoutedStarts.length > 0 });
  if (desktopTray && launch?.beforePids?.length === 0 && Number.isFinite(launch.spawnedAt)) {
    for (const process of processes || []) {
      if (!process.window && process.startedAt >= launch.spawnedAt - 100 &&
          launch.pids?.includes(process.pid) && (process.pid === launch.spawnedPid || process.parentPid === launch.spawnedPid)) {
        idleStartupTrayPids.set(process.pid, process.startedAt);
      }
    }
  }
  if (playtimeMonitor) await pollLocalPlaytime();
  else await trackedSessions({ fast: true });
  await maybeResumeAntiIdleAfterLaunch('protocol launch');
  syncRobloxTrayStartup();
  return result;
}

// ---------------------------------------------------------------------
// IPC: presence check ("is this account in a game right now?")
// ---------------------------------------------------------------------



ipcMain.handle('roblox:importCursor', async (_event, name) => {
  const result = await dialog.showOpenDialog({
    title: 'Import Roblox cursor',
    properties: ['openFile'],
    filters: [{ name: 'Cursor image', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const source = result.filePaths[0];
  const pngHeader = fs.readFileSync(source).subarray(0, 8);
  if (!pngHeader.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    throw new Error('That file is not a valid PNG image.');
  }
  const dir = path.join(app.getPath('userData'), 'seal-custom-cursors');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'custom-cursor.png');
  fs.copyFileSync(source, dest);
  return { canceled: false, path: dest, name: cleanPresetName(name, path.basename(source, path.extname(source))) };
});


ipcMain.handle('roblox:importDeathSound', async (_event, name) => {
  const result = await dialog.showOpenDialog({
    title: 'Import Roblox death sound',
    properties: ['openFile'],
    filters: [{ name: 'Audio files', extensions: ['mp3', 'ogg', 'wav', 'm4a', 'aac', 'flac'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const source = result.filePaths[0];
  const dir = path.join(app.getPath('userData'), 'seal-custom-sounds');
  fs.mkdirSync(dir, { recursive: true });
  const originalDest = path.join(dir, 'custom-death-original' + path.extname(source).toLowerCase());
  const dest = path.join(dir, 'custom-death.mp3');
  fs.copyFileSync(source, originalDest);
  // Keep the original full-length file as the saved source. Conversion now happens
  // during Apply so Seal can match Roblox's actual target extension such as ouch.ogg.
  // Keep a MP3 compatibility copy when possible for older saved settings.
  try { launcher.convertDeathSoundToMp3(source, dest); } catch {}
  return { canceled: false, path: originalDest, name: cleanPresetName(name, path.basename(source, path.extname(source))), short: false };
});

function removeManagedFile(file, managedDir) {
  if (!file) return false;
  const resolvedFile = path.resolve(file);
  const resolvedDir = path.resolve(managedDir) + path.sep;
  if (!resolvedFile.toLowerCase().startsWith(resolvedDir.toLowerCase())) return false;
  try { fs.unlinkSync(resolvedFile); return true; } catch { return false; }
}

function reapplyAfterCustomModDeletion(kind) {
  bootstrapMods = { ...(bootstrapMods || {}) };
  if (kind === 'cursor') {
    bootstrapMods.cursor = 'default';
    bootstrapMods.customCursorPath = '';
  } else {
    bootstrapMods.sounds = 'default';
    bootstrapMods.customDeathSoundPath = '';
  }
  sealBootstrapper.saveMods(app.getPath('userData'), bootstrapMods);
  let restored = { restored: 0 };
  let reapplied = null;
  let warning = null;
  try { restored = launcher.restoreRobloxMods(); } catch (err) { warning = err.message; }
  if (hasActiveRobloxMods(bootstrapMods)) {
    try { reapplied = launcher.applyRobloxMods(bootstrapMods); }
    catch (err) { warning = [warning, err.message].filter(Boolean).join(' '); }
  }
  return { restored, reapplied, warning, mods: bootstrapMods };
}

ipcMain.handle('roblox:deleteCustomCursor', async (_event, currentPath) => {
  const dir = path.join(app.getPath('userData'), 'seal-custom-cursors');
  const deleted = removeManagedFile(currentPath, dir) || removeManagedFile(path.join(dir, 'custom-cursor.png'), dir);
  return { deleted, ...reapplyAfterCustomModDeletion('cursor') };
});

ipcMain.handle('roblox:deleteCustomDeathSound', async (_event, currentPath) => {
  const dir = path.join(app.getPath('userData'), 'seal-custom-sounds');
  let deleted = removeManagedFile(currentPath, dir);
  for (const name of ['custom-death.mp3', 'custom-death.ogg', 'custom-death.wav']) {
    deleted = removeManagedFile(path.join(dir, name), dir) || deleted;
  }
  return { deleted, ...reapplyAfterCustomModDeletion('sound') };
});

ipcMain.handle('roblox:applyMods', async (_event, mods) => {
  bootstrapMods = mods || {};
  sealBootstrapper.saveMods(app.getPath('userData'), bootstrapMods);
  return launcher.applyRobloxMods(bootstrapMods);
});
ipcMain.handle('roblox:setBootstrapMods', async (_event, mods) => {
  const wasFullbright = bootstrapMods?.fullbright === true;
  bootstrapMods = mods || null;
  sealBootstrapper.saveMods(app.getPath('userData'), bootstrapMods);
  let fullbrightRestore = null;
  let fullbrightFlagsRestore = null;
  if (wasFullbright && bootstrapMods?.fullbright !== true) {
    fullbrightRestore = launcher.setFullbright(false);
    fullbrightFlagsRestore = launcher.setFullbrightFastFlags(false);
  }
  return { ok: true, fullbrightRestore, fullbrightFlagsRestore };
});
ipcMain.handle('bootstrapper:enable', async () => {
  if(app.isPackaged)protocolExecutable=await preparePersistentExecutable();
  const status = sealBootstrapper.enable(bootstrapperOptions());
  syncRobloxHomeShortcuts(true);
  syncRobloxTrayStartup();
  return status;
});
ipcMain.handle('bootstrapper:disable', async () => {
  if (app.isPackaged && !protocolExecutable) protocolExecutable = await preparePersistentExecutable();
  const status = sealBootstrapper.disable(bootstrapperOptions());
  syncRobloxHomeShortcuts(false);
  syncRobloxTrayStartup();
  return status;
});
ipcMain.handle('bootstrapper:check', async () => {
  const ready = await ensureRobloxReady({ forceCheck: true });
  let modResult = null;
  if (hasActiveRobloxMods(bootstrapMods)) {
    publishBootstrapperEvent({ phase: 'modding', message: 'Applying saved Roblox modifications…', at: new Date().toISOString() });
    modResult = launcher.applyRobloxMods(bootstrapMods);
  }
  const event = {
    phase: 'ready',
    message: ready.updateAvailable
      ? 'Roblox is installed. Update available—use Repair / update when convenient.'
      : 'Roblox and saved modifications are ready.',
    at: new Date().toISOString(),
    ready,
    modResult
  };
  publishBootstrapperEvent(event);
  return { ready, modResult };
});
ipcMain.handle('bootstrapper:forceUpdate', async () => {
  if (cacheResetTask) await cacheResetTask;
  if (await launcher.isRobloxRunning()) {
    publishBootstrapperEvent({ phase: 'closing', message: 'Closing Roblox before repair/update…', at: new Date().toISOString() });
    await launcher.forceQuitRoblox();
    for (let attempt = 0; attempt < 20 && await launcher.isRobloxRunning(); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (await launcher.isRobloxRunning()) throw new Error('Roblox could not be closed. Close it in Task Manager, then try again.');
  }
  return ensureRobloxReady({ forceCheck: true, forceUpdate: true });
});
ipcMain.handle('bootstrapper:lastEvent', async () => bootstrapperLastEvent || sealBootstrapper.loadState(app.getPath('userData')).lastEvent || null);
let cacheResetTask = null;
let joinRouting = null;
function getJoinRouting() {
  return joinRouting ||= require('./src/joinRoutingWindows').createWindowsJoinRouting();
}
ipcMain.handle('roblox:joinConnectionStatus', () => getJoinRouting().inspect());
ipcMain.handle('roblox:repairJoinConnection', () => getJoinRouting().repair());
ipcMain.handle('roblox:resetJoinCache', (_event, options = {}) => {
  if (cacheResetTask) return cacheResetTask;
  const task = accountLaunchQueue.then(async () => {
    if (robloxReadyTask) await robloxReadyTask.catch(() => {});
    const localAppData = process.env.SEAL_TEST_ROBLOX_ROOT
      ? path.dirname(path.resolve(process.env.SEAL_TEST_ROBLOX_ROOT))
      : (process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'));
    const repair = require('./src/cacheRepair').createCacheRepair({
      localAppData,
      getProcesses: () => launcher.getRobloxPidSnapshot(),
      closeRoblox: async () => { await resumeAccounts([]).catch(() => {}); await launcher.forceQuitRoblox(); }
    });
    const result = await repair.reset({ closeRunning: options.closeRunning === true, includeFleasion: true });
    if (!result.needsClose) {
      const snapshot = await launcher.getRobloxPidSnapshot();
      if (snapshot.reliable && !snapshot.pids.length) {
        accountPids.clear(); accountSessions.clear(); sessionPidMisses.clear(); clearAllSessionReconciliations();
      }
    }
    return result;
  });
  cacheResetTask = task;
  accountLaunchQueue = task.catch(() => {});
  const clear = () => { if (cacheResetTask === task) cacheResetTask = null; };
  task.then(clear, clear);
  return task;
});
ipcMain.handle('bootstrapper:status', async () => {
  return sealBootstrapper.status(bootstrapperOptions());
});
ipcMain.handle('roblox:restoreMods', async () => launcher.restoreRobloxMods());

ipcMain.handle('accounts:checkPresence', async (_event, id) => {
  const cookie = accountStore.getCookie(id);
  const accounts = accountStore.listAccounts();
  const account = accounts.find(a => a.id === id);
  if (!account) throw new Error('Account not found');

  const presence = await robloxApi.getPresence(cookie, account.userId, {
    onCookieRotated: rotatedCookie => accountStore.setCookie(id, rotatedCookie)
  });
  return { id, ...presence };
});

ipcMain.handle('accounts:checkPresenceBatch', async (_event, ids) => {
  const selectedIds = Array.isArray(ids) ? ids : [];
  const allAccounts = accountStore.listAccounts();
  const accountById = new Map(allAccounts.map(acc => [acc.id, acc]));
  const targets = selectedIds.map(id => accountById.get(id)).filter(Boolean);

  if (targets.length === 0) return [];

  const userIds = targets.map(acc => Number(acc.userId)).filter(Number.isFinite);
  if (userIds.length === 0) {
    return targets.map(acc => ({ id: acc.id, error: 'No valid userId stored for this account' }));
  }

  const candidateIds = [...new Set([...selectedIds, ...allAccounts.map(acc => acc.id)])];
  let lastError = null;

  for (const cookieAccountId of candidateIds) {
    try {
      const cookie = accountStore.getCookie(cookieAccountId);
      const byUserId = await robloxApi.getPresenceMany(cookie, userIds, {
        onCookieRotated: rotatedCookie => accountStore.setCookie(cookieAccountId, rotatedCookie)
      });
      return targets.map(acc => {
        const presence = byUserId[String(acc.userId)] || byUserId[Number(acc.userId)];
        if (!presence) return { id: acc.id, username: acc.username, userId: acc.userId, error: 'No presence data returned' };
        return { id: acc.id, username: acc.username, userId: acc.userId, ...presence };
      });
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('[presence] batch lookup failed, falling back to one-by-one:', lastError?.message);
  const fallback = [];
  for (const acc of targets) {
    try {
      const cookie = accountStore.getCookie(acc.id);
      const presence = await robloxApi.getPresence(cookie, acc.userId, {
        onCookieRotated: rotatedCookie => accountStore.setCookie(acc.id, rotatedCookie)
      });
      fallback.push({ id: acc.id, username: acc.username, userId: acc.userId, ...presence });
    } catch (err) {
      fallback.push({ id: acc.id, username: acc.username, userId: acc.userId, error: err.message || 'Could not check presence' });
    }
  }
  return fallback;
});

// ---------------------------------------------------------------------
// IPC: force quit Roblox for selected accounts only
// ---------------------------------------------------------------------

async function forceQuitAccounts(ids) {
  const targetIds = Array.isArray(ids) ? ids : [];

  if (targetIds.length === 0) {
    // No accounts selected/tracked — fall back to closing everything,
    // since there's nothing more specific we can target.
    const wasRunning = await launcher.forceQuitRoblox();
    accountPids.clear();
    accountSessions.clear();
    sessionPidMisses.clear();
    clearAllSessionReconciliations();
    await syncAntiIdleWithRoblox();
    return { closed: wasRunning, scope: 'all' };
  }

  await resumeAccounts(targetIds).catch(() => {});

  const currentPids = new Set(await launcher.listRobloxPids());
  let closedAny = false;
  const untracked = [];

  for (const id of targetIds) {
    if (String(id).startsWith('unlinked:')) {
      const process = await openUnlinkedProcess(id);
      if (await launcher.killRobloxPid(process.pid)) closedAny = true;
      continue;
    }
    const pids = accountPids.get(id);
    if (!pids || pids.size === 0) {
      untracked.push(id);
      continue;
    }
    for (const pid of [...pids]) {
      if (currentPids.has(pid)) {
        try {
          const killed = await launcher.killRobloxPid(pid);
          if (killed) closedAny = true;
        } catch (err) {
          console.warn('Could not close Roblox PID', pid, err.message);
        }
      }
      pids.delete(pid);
    }
    accountPids.delete(id);
    accountSessions.delete(id);
    sessionPidMisses.delete(id);
    clearSessionReconciliation(id);
  }

  await syncAntiIdleWithRoblox();
  return { closed: closedAny, scope: 'selected', untracked };
}

ipcMain.handle('roblox:forceQuit', async (_event, ids) => forceQuitAccounts(ids));

ipcMain.handle('antiidle:start', () => startAntiIdleIfRobloxRunning());
ipcMain.handle('antiidle:stop', async () => {
  stopAntiIdle();
  return syncAntiIdleWithRoblox();
});
ipcMain.handle('antiidle:status', () => syncAntiIdleWithRoblox());
ipcMain.handle('silly:start', async () => { throw new Error('Network pause is not included in the clean edition.'); });
ipcMain.handle('silly:stop', async () => ({ active: false }));
ipcMain.handle('silly:toggle', async () => { throw new Error('Network pause is not included in the clean edition.'); });
ipcMain.handle('silly:status', async () => ({ active: false, accelerator: '' }));
ipcMain.handle('silly:setHotkey', async () => ({ accelerator: '', registered: false }));
ipcMain.handle('roblox:pause', async () => { throw new Error('Network pause is not included in the clean edition.'); });
ipcMain.handle('roblox:resume', async () => ({ active: false }));
ipcMain.handle('roblox:togglePause', async () => { throw new Error('Network pause is not included in the clean edition.'); });
ipcMain.handle('roblox:pauseStatus', async () => ({ active: false, accelerator: '' }));
ipcMain.handle('roblox:setPauseHotkey', async () => ({ accelerator: '', registered: false }));
ipcMain.handle('roblox:freeze', async (_event, id) => sleepAccounts([id]));
ipcMain.handle('roblox:unfreeze', async (_event, id) => resumeAccounts([id]));
ipcMain.handle('roblox:freezeStatus', async (_event, id) => sleepingAccounts.has(String(id)));
