const path = require('path');
const { BrowserWindow } = require('electron');
module.exports = ({ icon, disabled = () => false }) => {
  let window = null, closeTimer = null, state = null;
  function update(message, progress = null) {
    if (!state) return;
    state = { ...state, message, progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : null };
    if (window && !window.isDestroyed()) window.webContents.send('seal:launchProgress', state);
  }
  function start(username) {
    if (disabled()) return;
    clearTimeout(closeTimer);
    state = { username: username || 'Roblox account', message: 'Starting Roblox…', progress: null, outcome: null };
    if (!window || window.isDestroyed()) {
      window = new BrowserWindow({ width: 500, height: 280, frame: false, resizable: false, maximizable: false, minimizable: false, show: false, backgroundColor: '#ffffff', title: 'Launching with Seal Account Manager', icon: icon(), webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, 'launchSplashPreload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
      const current = window;
      current.webContents.once('did-finish-load', () => {
        if (!current.isDestroyed() && current === window && state) { current.webContents.send('seal:launchProgress', state); current.showInactive(); }
      });
      current.on('closed', () => { if (window === current) window = null; });
      current.loadFile(path.join(__dirname, 'launchSplash.html')).catch(() => { if (!current.isDestroyed()) current.destroy(); });
    } else { update(state.message); window.showInactive(); }
  }
  function finish(success) {
    if (!state) return;
    state = { ...state, outcome: success ? 'success' : 'error' };
    update(success ? 'Roblox launched' : 'Could not launch — see Seal for details', success ? 100 : null);
    closeTimer = setTimeout(() => { state = null; if (window && !window.isDestroyed()) window.close(); }, success ? 700 : 5000);
    closeTimer.unref?.();
  }
  return { start, update, finish };
};
