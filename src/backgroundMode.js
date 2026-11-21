const fs = require('fs');
const { writeTextAtomic } = require('./atomicFile');
const normalize = raw => ({ keepRunning: raw?.keepRunning !== false, startAtLogin: raw?.startAtLogin !== false });

function createBackgroundMode({ file, app, Tray, Menu, icon, getWindow, createWindow, prepareExecutable, allowLogin = true, enabled = true, onChange = () => {} }) {
  let settings = normalize(), tray = null, quitting = false, startupPath = '', startupRegistered = false, startupError = '', count = 0;
  let changes = Promise.resolve();
  try { settings = normalize(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch {}
  const status = () => { const window=getWindow();return { ...settings, trayReady: !!tray, hidden: !window || window.isDestroyed() || !window.isVisible(), startupAvailable: allowLogin, startupRegistered, startupError, startupPath }; };
  const publish = () => { updateMenu(); try { onChange(status()); } catch {} };
  function show() {
    if (quitting) return;
    let window = getWindow();
    if (!window || window.isDestroyed()) { createWindow(); window = getWindow(); }
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    // A Windows process launched with a hidden STARTUPINFO can consume the
    // first ShowWindow call without displaying it. Restore on the same click.
    if (!window.isVisible()) window.show();
    window.focus(); publish();
  }
  function quit() { quitting = true; app.quit(); }
  function updateMenu() {
    if (!tray) return;
    tray.setToolTip(`Seal Account Manager — tracking ${count} Roblox session${count===1?'':'s'}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open SAM', click: show },
      { label: `Tracking ${count} Roblox session${count===1?'':'s'}`, enabled: false },
      { type: 'separator' },
      { label: 'Start with Windows (hidden)', type: 'checkbox', checked: settings.startAtLogin, click: item => save({ startAtLogin: item.checked }).catch(error => { startupError = error.message; publish(); }) },
      { type: 'separator' },
      { label: 'Quit SAM', click: quit }
    ]));
  }
  function ensureTray() {
    if (!enabled || tray) return !!tray;
    try {
      tray = new Tray(icon());
      tray.on('click', show); tray.on('double-click', show); updateMenu();
      return true;
    } catch (error) { startupError = 'The system tray could not be opened: '+error.message; tray = null; return false; }
  }
  function hide() {
    if (!ensureTray()) return false;
    const window = getWindow();
    if (window && !window.isDestroyed()) window.hide();
    publish(); return true;
  }
  function attach(window) {
    window.on('close', event => {
      if (!quitting && settings.keepRunning && enabled && ensureTray()) { event.preventDefault(); hide(); }
      else if (!settings.keepRunning) quitting = true;
    });
    window.on('session-end', () => { quitting = true; });
  }
  async function applyStartup(force = false) {
    if (!allowLogin) { startupRegistered = false; return; }
    try {
      if (settings.startAtLogin) startupPath = await prepareExecutable();
      // Electron 31 reads openAtLogin using the AppUserModelID, and parses
      // the supplied path as a command line on both read and write.
      const options = { name: 'com.local.sealaccountmanager', path: startupPath ? '"'+startupPath+'"' : undefined, args: ['--background'] };
      const existing = app.getLoginItemSettings(options);
      if (force || !settings.startAtLogin || existing.openAtLogin !== settings.startAtLogin) {
        app.setLoginItemSettings({ ...options, openAtLogin: settings.startAtLogin, enabled: settings.startAtLogin });
      }
      const actual = app.getLoginItemSettings(options);
      startupRegistered = settings.startAtLogin && actual.openAtLogin && actual.executableWillLaunchAtLogin !== false;
      startupError = settings.startAtLogin && !startupRegistered ? 'Windows startup is disabled. Check Startup apps in Windows settings.' : '';
    } catch (error) { startupError = 'Could not configure Windows startup: '+error.message; startupRegistered = false; }
  }
  function save(patch = {}) {
    const work = changes.then(async () => {
      const next = normalize({ ...settings, ...patch });
      writeTextAtomic(file, JSON.stringify(next)); settings = next;
      await applyStartup(typeof patch.startAtLogin === 'boolean'); publish(); return status();
    });
    changes = work.catch(() => {}); return work;
  }
  async function initialize() {
    if (!enabled) return status();
    ensureTray();
    // Serialize startup initialization with checkbox changes.
    const work = changes.then(() => applyStartup()); changes = work.catch(() => {});
    await work; publish(); return status();
  }
  function beginQuit() { quitting = true; }
  function destroy() { quitting = true; try { tray?.destroy(); } catch {} tray = null; }
  app.on('before-quit', beginQuit);
  return { initialize, attach, show, hide, quit, save, status, beginQuit, destroy,
    isQuitting: () => quitting, hasTray: () => !!tray,
    setTrackedCount: value => { const next = Math.max(0, Number(value)||0); if (next !== count) { count = next; updateMenu(); } }
  };
}
module.exports = { createBackgroundMode };
