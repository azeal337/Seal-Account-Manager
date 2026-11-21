// renderer.js
const accountsList = document.getElementById('accountsList');
const emptyState = document.getElementById('emptyState');
const joinUsernameInput = document.getElementById('joinUsername');
const selectedCountEl = document.getElementById('selectedCount');
const launchSelectedBtn = document.getElementById('launchSelectedBtn');
const gameFavoriteSelect = document.getElementById('gameFavoriteSelect');
const addGameFavoriteBtn = document.getElementById('addGameFavoriteBtn');
const deleteGameFavoriteBtn = document.getElementById('deleteGameFavoriteBtn');
const gameFavoriteNameInput = document.getElementById('gameFavoriteName');
const gameFavoriteStatus = document.getElementById('gameFavoriteStatus');
const selectAllBtn = document.getElementById('selectAllBtn');
const launchStatusEl = document.getElementById('launchStatus');
const launchConflictModal = document.getElementById('launchConflictModal');
const launchConflictCancelBtn = document.getElementById('launchConflictCancelBtn');
const launchConflictContinueBtn = document.getElementById('launchConflictContinueBtn');
const toastRegion = document.getElementById('toastRegion');
const accountSearchInput = document.getElementById('accountSearchInput');
const accountTotal = document.getElementById('accountTotal');
const selectedTotal = document.getElementById('selectedTotal');
const selectedLaunchCount = document.getElementById('selectedLaunchCount');
const sessionsList = document.getElementById('sessionsList');
const ambientCanvas = document.getElementById('ambientCanvas');
const sessionCount = document.getElementById('sessionCount');
const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
const closeAllSessionsBtn = document.getElementById('closeAllSessionsBtn');
const recoveryBanner = document.getElementById('recoveryBanner');
const recoveryText = document.getElementById('recoveryText');
const resumeRecoveryBtn = document.getElementById('resumeRecoveryBtn');
const dismissRecoveryBtn = document.getElementById('dismissRecoveryBtn');
const openServerLibraryBtn = document.getElementById('openServerLibraryBtn');
const serverLibraryModal = document.getElementById('serverLibraryModal');
const serverLibraryCloseBtn = document.getElementById('serverLibraryCloseBtn');
const serverLibraryList = document.getElementById('serverLibraryList');
const serverTargetInput = document.getElementById('serverTargetInput');
const addFolderBtn = document.getElementById('addFolderBtn');
const folderModal = document.getElementById('folderModal');
const folderModalTitle = document.getElementById('folderModalTitle');
const folderCloseBtn = document.getElementById('folderCloseBtn');
const folderNameInput = document.getElementById('folderNameInput');
const folderColorInput = document.getElementById('folderColorInput');
const folderAccountPicker = document.getElementById('folderAccountPicker');
const folderDeleteBtn = document.getElementById('folderDeleteBtn');
const folderCancelBtn = document.getElementById('folderCancelBtn');
const folderSaveBtn = document.getElementById('folderSaveBtn');

const addAccountBtn = document.getElementById('addAccountBtn');
const emptyAddAccountBtn = document.getElementById('emptyAddAccountBtn');
const checkCookiesBtn = document.getElementById('checkCookiesBtn');
const antiIdleBtn = document.getElementById('antiIdleBtn');
const forceQuitBtn = document.getElementById('forceQuitBtn');
const checkSelectedStatusBtn = document.getElementById('checkSelectedStatusBtn');
const freezeSelectedBtn = document.getElementById('freezeSelectedBtn');
const unfreezeSelectedBtn = document.getElementById('unfreezeSelectedBtn');
const customizeBtn = document.getElementById('customizeBtn');
const mainMenuNavBtn = document.getElementById('mainMenuNavBtn');
const launcherNavBtn = document.getElementById('launcherNavBtn');
const timeNavBtn = document.getElementById('timeNavBtn');
const minimizeAppBtn = document.getElementById('minimizeAppBtn');
const maximizeAppBtn = document.getElementById('maximizeAppBtn');
const closeAppBtn = document.getElementById('closeAppBtn');
const openLauncherSettingsBtn = document.getElementById('openLauncherSettingsBtn');
const launcherOverviewStatus = document.getElementById('launcherOverviewStatus');
const settingsWindowTitle = document.getElementById('settingsWindowTitle');
const settingsWindowSubtitle = document.getElementById('settingsWindowSubtitle');
const customizeModal = document.getElementById('customizeModal');
const customizeCloseBtn = document.getElementById('customizeCloseBtn');
const customizeSaveBtn = document.getElementById('customizeSaveBtn');
const customizeResetBtn = document.getElementById('customizeResetBtn');
const launcherModal = document.getElementById('launcherModal');
const launcherCloseBtn = document.getElementById('launcherCloseBtn');
const launcherCancelBtn = document.getElementById('launcherCancelBtn');
const launcherSaveBtn = document.getElementById('launcherSaveBtn');
const launcherSectionsHost = document.getElementById('launcherSectionsHost');
const launcherSettingsTabBtn = document.getElementById('launcherSettingsTabBtn');
const launcherPresetsTabBtn = document.getElementById('launcherPresetsTabBtn');
const launcherSettingsPanel = document.getElementById('launcherSettingsPanel');
const launcherPresetsPanel = document.getElementById('launcherPresetsPanel');
const launcherFooterText = document.getElementById('launcherFooterText');
const newPerformancePresetBtn = document.getElementById('newPerformancePresetBtn');
const performancePresetList = document.getElementById('performancePresetList');
const performancePresetEmpty = document.getElementById('performancePresetEmpty');
const performancePresetEditor = document.getElementById('performancePresetEditor');
const presetEditorKicker = document.getElementById('presetEditorKicker');
const presetEditorTitle = document.getElementById('presetEditorTitle');
const presetEditorCloseBtn = document.getElementById('presetEditorCloseBtn');
const presetNameInput = document.getElementById('presetNameInput');
const presetGuidedModeBtn = document.getElementById('presetGuidedModeBtn');
const presetImportModeBtn = document.getElementById('presetImportModeBtn');
const presetGuidedPanel = document.getElementById('presetGuidedPanel');
const presetImportPanel = document.getElementById('presetImportPanel');
const presetMeshDetailSelect = document.getElementById('presetMeshDetailSelect');
const presetTextureQualitySelect = document.getElementById('presetTextureQualitySelect');
const presetMsaaSelect = document.getElementById('presetMsaaSelect');
const presetGrassDistanceSelect = document.getElementById('presetGrassDistanceSelect');
const presetGrassMotionSelect = document.getElementById('presetGrassMotionSelect');
const presetDpiScalingSelect = document.getElementById('presetDpiScalingSelect');
const presetFullscreenSelect = document.getElementById('presetFullscreenSelect');
const presetRendererSelect = document.getElementById('presetRendererSelect');
const presetSkySelect = document.getElementById('presetSkySelect');
const resetPresetChoicesBtn = document.getElementById('resetPresetChoicesBtn');
const presetImportDropzone = document.getElementById('presetImportDropzone');
const presetImportFileBtn = document.getElementById('presetImportFileBtn');
const presetPasteJsonBtn = document.getElementById('presetPasteJsonBtn');
const presetJsonInput = document.getElementById('presetJsonInput');
const presetAnalyzeJsonBtn = document.getElementById('presetAnalyzeJsonBtn');
const presetImportSummary = document.getElementById('presetImportSummary');
const presetAdditionalFlagsDetails = document.getElementById('presetAdditionalFlagsDetails');
const presetAdditionalFlagsPreview = document.getElementById('presetAdditionalFlagsPreview');
const presetEditorStatus = document.getElementById('presetEditorStatus');
const presetCancelBtn = document.getElementById('presetCancelBtn');
const presetSaveBtn = document.getElementById('presetSaveBtn');
const timeModal = document.getElementById('timeModal');
const timeCloseBtn = document.getElementById('timeCloseBtn');
const timeAccountsTabBtn = document.getElementById('timeAccountsTabBtn');
const timeExperiencesTabBtn = document.getElementById('timeExperiencesTabBtn');
const timeAccountsPanel = document.getElementById('timeAccountsPanel');
const timeExperiencesPanel = document.getElementById('timeExperiencesPanel');
const timeAccountsList = document.getElementById('timeAccountsList');
const timeExperiencesList = document.getElementById('timeExperiencesList');
const timeGrandTotal = document.getElementById('timeGrandTotal');
const timeGrandSubtitle = document.getElementById('timeGrandSubtitle');
const timeRangePreset = document.getElementById('timeRangePreset');
const timeRangeLabel = document.getElementById('timeRangeLabel');
const timeCustomRange = document.getElementById('timeCustomRange');
const timeMonthsInput = document.getElementById('timeMonthsInput');
const timeWeeksInput = document.getElementById('timeWeeksInput');
const timeDaysInput = document.getElementById('timeDaysInput');
const timeHoursInput = document.getElementById('timeHoursInput');
const timeApplyRangeBtn = document.getElementById('timeApplyRangeBtn');
const timeRefreshBtn = document.getElementById('timeRefreshBtn');
const fontSelect = document.getElementById('fontSelect');
const textScaleInput = document.getElementById('textScaleInput');
const themeSelect = document.getElementById('themeSelect');
const accentSelect = document.getElementById('accentSelect');
const blackHolePaletteSelect = document.getElementById('blackHolePaletteSelect');
const backgroundSelect = document.getElementById('backgroundSelect');
const powerModeSelect = document.getElementById('powerModeSelect');
const reducedMotionSelect = document.getElementById('reducedMotionSelect');
const startupScreenSelect = document.getElementById('startupScreenSelect');
const launchAnimationSelect = document.getElementById('launchAnimationSelect');
const sessionStyleSelect = document.getElementById('sessionStyleSelect');
const customAccentInput = document.getElementById('customAccentInput');
const customBaseColorInput = document.getElementById('customBaseColorInput');
const customPanelColorInput = document.getElementById('customPanelColorInput');
const panelStyleSelect = document.getElementById('panelStyleSelect');
const panelRadiusInput = document.getElementById('panelRadiusInput');
const panelOpacityInput = document.getElementById('panelOpacityInput');
const backgroundIntensityInput = document.getElementById('backgroundIntensityInput');
const mainPageThemeSelect = document.getElementById('mainPageThemeSelect');
const customizePageThemeSelect = document.getElementById('customizePageThemeSelect');
const launcherPageThemeSelect = document.getElementById('launcherPageThemeSelect');
const applyShadowSlaveThemeBtn = document.getElementById('applyShadowSlaveThemeBtn');
const applyCleanThemeBtn = document.getElementById('applyCleanThemeBtn');
const applyMidnightThemeBtn = document.getElementById('applyMidnightThemeBtn');
const applySingularityThemeBtn = document.getElementById('applySingularityThemeBtn');
const applyMysteriesThemeBtn = document.getElementById('applyMysteriesThemeBtn');
const customizeAppearanceTabBtn = document.getElementById('customizeAppearanceTabBtn');
const customizeAdvancedTabBtn = document.getElementById('customizeAdvancedTabBtn');
const customizeLabelsTabBtn = document.getElementById('customizeLabelsTabBtn');
const undoPreviewBtn = document.getElementById('undoPreviewBtn');
const notificationCenterBtn = document.getElementById('notificationCenterBtn');
const notificationUnreadCount = document.getElementById('notificationUnreadCount');
const notificationCenterModal = document.getElementById('notificationCenterModal');
const notificationCenterCloseBtn = document.getElementById('notificationCenterCloseBtn');
const notificationCenterList = document.getElementById('notificationCenterList');
const markNotificationsReadBtn = document.getElementById('markNotificationsReadBtn');
const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
const bulkConfigBtn = document.getElementById('bulkConfigBtn');
const bulkConfigModal = document.getElementById('bulkConfigModal');
const bulkConfigCloseBtn = document.getElementById('bulkConfigCloseBtn');
const bulkConfigCancelBtn = document.getElementById('bulkConfigCancelBtn');
const bulkConfigApplyBtn = document.getElementById('bulkConfigApplyBtn');
const bulkConfigTargetSelect = document.getElementById('bulkConfigTargetSelect');
const bulkConfigTargetSummary = document.getElementById('bulkConfigTargetSummary');
const bulkFpsEnabled = document.getElementById('bulkFpsEnabled');
const bulkFpsInput = document.getElementById('bulkFpsInput');
const bulkFpsWarning = document.getElementById('bulkFpsWarning');
const bulkGraphicsEnabled = document.getElementById('bulkGraphicsEnabled');
const bulkGraphicsInput = document.getElementById('bulkGraphicsInput');
const bulkPerformanceEnabled = document.getElementById('bulkPerformanceEnabled');
const bulkPerformanceSelect = document.getElementById('bulkPerformanceSelect');
const bulkVolumeEnabled = document.getElementById('bulkVolumeEnabled');
const bulkVolumeInput = document.getElementById('bulkVolumeInput');
const bulkRelaunchInput = document.getElementById('bulkRelaunchInput');
const bulkConfigStatus = document.getElementById('bulkConfigStatus');
const launchAnimationLayer = document.getElementById('launchAnimationLayer');
const startupScreen = document.getElementById('startupScreen');
const startupKicker = document.getElementById('startupKicker');
const startupTitle = document.getElementById('startupTitle');
const startupSubtitle = document.getElementById('startupSubtitle');
const accountLayoutSelect = document.getElementById('accountLayoutSelect');
const densitySelect = document.getElementById('densitySelect');
const pauseHotkeySelect = document.getElementById('pauseHotkeySelect');
const labelAddAccountInput = document.getElementById('labelAddAccountInput');
const labelCustomizeInput = document.getElementById('labelCustomizeInput');
const labelAntiAfkInput = document.getElementById('labelAntiAfkInput');
const labelCheckCookiesInput = document.getElementById('labelCheckCookiesInput');
const labelLaunchSelectedInput = document.getElementById('labelLaunchSelectedInput');
const labelJoinTargetInput = document.getElementById('labelJoinTargetInput');
const labelFpsCapInput = document.getElementById('labelFpsCapInput');
const labelGraphicsInput = document.getElementById('labelGraphicsInput');
const labelFastFlagsInput = document.getElementById('labelFastFlagsInput');
const labelApplyInput = document.getElementById('labelApplyInput');
const labelCheckSelectedStatusInput = document.getElementById('labelCheckSelectedStatusInput');
const labelFreezeInput = document.getElementById('labelFreezeInput');
const labelUnfreezeInput = document.getElementById('labelUnfreezeInput');
const labelForceQuitInput = document.getElementById('labelForceQuitInput');
const pauseOffLabelInput = document.getElementById('pauseOffLabelInput');
const pauseOnLabelInput = document.getElementById('pauseOnLabelInput');
const robloxFontSelect = document.getElementById('robloxFontSelect');
const robloxCursorSelect = document.getElementById('robloxCursorSelect');
const robloxTextureSelect = document.getElementById('robloxTextureSelect');
const robloxLightingSelect = document.getElementById('robloxLightingSelect');
const importCursorBtn = document.getElementById('importCursorBtn');
const deleteCursorBtn = document.getElementById('deleteCursorBtn');
const customCursorName = document.getElementById('customCursorName');
const importDeathSoundBtn = document.getElementById('importDeathSoundBtn');
const deleteDeathSoundBtn = document.getElementById('deleteDeathSoundBtn');
const customDeathSoundName = document.getElementById('customDeathSoundName');
const robloxSoundSelect = document.getElementById('robloxSoundSelect');
const deathSoundVolumeInput = document.getElementById('deathSoundVolumeInput');
const deathSoundVolumeLabel = document.getElementById('deathSoundVolumeLabel');
const deathSoundPlaybackSelect = document.getElementById('deathSoundPlaybackSelect');
const deathSoundTargetSelect = document.getElementById('deathSoundTargetSelect');
const deathSoundCutoffInput = document.getElementById('deathSoundCutoffInput');
const deathSoundCutoffLabel = document.getElementById('deathSoundCutoffLabel');
const deathSoundPersistentInput = document.getElementById('deathSoundPersistentInput');
const applyModsBtn = document.getElementById('applyModsBtn');
const restoreModsBtn = document.getElementById('restoreModsBtn');
const bootstrapperBtn = document.getElementById('bootstrapperBtn');
const bootstrapperCheckBtn = document.getElementById('bootstrapperCheckBtn');
const bootstrapperUpdateBtn = document.getElementById('bootstrapperUpdateBtn');
const bootstrapperStatusText = document.getElementById('bootstrapperStatusText');
const freezeSelectedDashboardBtn = document.getElementById('freezeSelectedDashboardBtn');
const serverRegionLookupInput = document.getElementById('serverRegionLookupInput');
const desktopNotificationsInput = document.getElementById('desktopNotificationsInput');

let antiIdleOn = false;

const DEFAULT_LABELS = {
  addAccount: '+ Add account',
  customize: 'Customize',
  antiAfk: 'Anti-AFK',
  checkCookies: 'Check sessions',
  launchSelected: 'Launch selected',
  joinTarget: 'Destination',
  fpsCap: 'FPS cap',
  graphics: 'Graphics\nquality',
  fastFlags: 'Performance',
  apply: 'Apply settings',
  checkSelectedStatus: 'Check status',
  freeze: 'Freeze selected',
  unfreeze: 'Unfreeze selected',
  forceQuit: 'Close selected'
};

const DEFAULT_UI_PREFS = {
  designVersion: 10,
  theme: 'void',
  accent: 'mono',
  blackHolePalette: 'inferno',
  background: 'black-hole',
  powerMode: 'low',
  reducedMotion: 'auto',
  startupScreen: 'brief',
  launchAnimation: 'minimal',
  sessionStyle: 'cards',
  customAccent: '#9d8cff',
  customBaseColor: '#05050a',
  customPanelColor: '#0c0b14',
  panelStyle: 'soft',
  panelRadius: 14,
  panelOpacity: 85,
  backgroundIntensity: 75,
  pageThemes: { main: 'inherit', customize: 'inherit', launcher: 'inherit' },
  accountLayout: 'compact',
  density: 'compact',
  fontFamily: 'Nunito, Segoe UI, sans-serif',
  textScale: 100,
  pauseHotkey: 'F8',
  pauseOffLabel: '⏸ Pause',
  pauseOnLabel: '▶ Resume',
  labels: { ...DEFAULT_LABELS }
};
let uiPrefs = { ...DEFAULT_UI_PREFS, labels: { ...DEFAULT_LABELS } };
let pauseHotkeyLabel = 'F8';
let customCursorPath = localStorage.getItem('sealCustomCursorPath') || '';
let customCursorFileName = localStorage.getItem('sealCustomCursorFileName') || '';
let customDeathSoundPath = localStorage.getItem('sealCustomDeathSoundPath') || '';
let customDeathSoundFileName = localStorage.getItem('sealCustomDeathSoundFileName') || '';

const NOTIFICATIONS_KEY = 'sealNotificationsV1';
let notifications = [];
let showJoinedNotifications = false;
let joinNotificationRefreshTimer = null;
let joinNotificationRefreshQueued = false;
const expandedJoinNotifications = new Set();
const notificationJoinedFilterBtn = document.getElementById('notificationJoinedFilterBtn');
const notificationResetFilterBtn = document.getElementById('notificationResetFilterBtn');

function migrateJoinNotification(item) {
  if (item.join) return item;
  const match = String(item.message).match(/^(.+?) joined (.+)\.$/);
  if (!match) return item;
  const placeId = match[2].match(/^Place ([1-9]\d{0,18})$/)?.[1] || '';
  return { ...item, join: { username: match[1], placeId, gameName: placeId ? '' : match[2], legacy: !!placeId } };
}

function loadNotifications() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    notifications = Array.isArray(parsed) ? parsed.filter(item => item && item.message).slice(0, 60).map(migrateJoinNotification) : [];
  } catch {
    notifications = [];
  }
}

function saveNotifications() {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 60)));
}

function notificationTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function updateNotificationBadge() {
  const unread = notifications.filter(item => !item.read).length;
  if (notificationUnreadCount) {
    notificationUnreadCount.textContent = unread > 99 ? '99+' : String(unread);
    notificationUnreadCount.hidden = unread === 0;
  }
  notificationCenterBtn?.classList.toggle('has-unread', unread > 0);
}

function createJoinDetails(join) {
  const details = document.createElement('dl');
  details.className = 'notification-join-details';
  const placeLabel = document.createElement('dt');
  placeLabel.textContent = 'Place ID';
  const place = document.createElement('dd');
  place.textContent = join.placeId || 'Unavailable';
  const serverLabel = document.createElement('dt');
  serverLabel.textContent = 'Server link';
  const server = document.createElement('dd');
  if (/^[1-9]\d{0,18}$/.test(join.placeId) && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(join.jobId)) {
    const link = document.createElement('a');
    link.href = sessionJoinUrl(join);
    link.textContent = link.href;
    link.addEventListener('click', async event => {
      event.preventDefault();
      try { await window.api.openNotificationServer(join.placeId, join.jobId); }
      catch (error) { showToast(error.message || 'Could not open this server link.', 'error'); }
    });
    server.appendChild(link);
  } else {
    server.textContent = 'Unavailable';
  }
  details.append(placeLabel, place, serverLabel, server);
  return details;
}

function renderNotificationCenter() {
  if (!notificationCenterList) return;
  const previousRows = notificationCenterList.querySelectorAll('details[data-notification-id]');
  for (const row of previousRows) {
    if (row.open) expandedJoinNotifications.add(row.dataset.notificationId);
    else expandedJoinNotifications.delete(row.dataset.notificationId);
  }
  const currentIds = new Set(notifications.map(item => item.id));
  for (const id of expandedJoinNotifications) if (!currentIds.has(id)) expandedJoinNotifications.delete(id);
  notificationJoinedFilterBtn?.setAttribute('aria-pressed', String(showJoinedNotifications));
  if (notificationResetFilterBtn) notificationResetFilterBtn.disabled = !showJoinedNotifications;
  notificationCenterList.innerHTML = '';
  const visible = showJoinedNotifications ? notifications.filter(item => item.join) : notifications;
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'notification-empty';
    empty.innerHTML = showJoinedNotifications ? '<span>✓</span><strong>No games joined</strong>' :
      '<span>✓</span><strong>All quiet</strong><small>Launches, errors, recovery notices, and setting changes will appear here.</small>';
    notificationCenterList.appendChild(empty);
    updateNotificationBadge();
    return;
  }
  for (const item of visible) {
    const row = document.createElement(item.join ? 'details' : 'article');
    row.className = `notification-item notification-${item.tone || 'info'}${item.read ? '' : ' unread'}`;
    const mark = document.createElement('span');
    mark.className = 'notification-tone-mark';
    mark.textContent = item.tone === 'error' ? '!' : item.tone === 'success' ? '✓' : '•';
    const copy = document.createElement('div');
    const message = document.createElement('strong');
    message.textContent = item.join ? `${item.join.username} joined ${item.join.gameName || 'a Roblox experience'}.` : item.message;
    const time = document.createElement('small');
    time.textContent = notificationTime(item.timestamp);
    copy.append(message, time);
    if (item.join) {
      row.classList.add('notification-join');
      row.dataset.notificationId = item.id;
      row.open = expandedJoinNotifications.has(item.id);
      const summary = document.createElement('summary');
      const chevron = document.createElement('span');
      chevron.className = 'notification-join-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '⌄';
      summary.append(mark, copy, chevron);
      row.append(summary, createJoinDetails(item.join));
    } else {
      row.append(mark, copy);
    }
    notificationCenterList.appendChild(row);
  }
  updateNotificationBadge();
}

function scheduleJoinNotificationRefresh() {
  if (notificationCenterModal?.hidden || !window.api.resolveJoinNotifications) return;
  if (!notifications.some(item => item.join && (item.join.legacy || (!item.join.gameName && (item.join.placeId || item.join.universeId))))) return;
  if (joinNotificationRefreshTimer) { joinNotificationRefreshQueued = true; return; }
  joinNotificationRefreshTimer = setTimeout(async () => {
    const pending = notifications.filter(item => item.join && (item.join.legacy || !item.join.gameName));
    try {
      const details = await window.api.resolveJoinNotifications(pending.map(item => ({ ...item.join, timestamp: item.timestamp })));
      let changed = false;
      pending.forEach((item, index) => {
        const detail = details[index];
        if (!detail || !notifications.includes(item)) return;
        if (item.join.legacy || (detail.gameName && !item.join.gameName)) {
          item.join.gameName ||= detail.gameName;
          item.join.jobId ||= detail.jobId;
          item.join.legacy = false;
          changed = true;
        }
      });
      if (changed) { saveNotifications(); renderNotificationCenter(); }
    } catch {}
    finally {
      joinNotificationRefreshTimer = null;
      if (joinNotificationRefreshQueued) {
        joinNotificationRefreshQueued = false;
        scheduleJoinNotificationRefresh();
      }
    }
  }, 200);
}

function addNotification(message, tone = 'info', event = {}) {
  if (!message) return;
  const previous = notifications[0];
  if (previous && previous.message === message && previous.join?.jobId === event.join?.jobId && Date.now() - previous.timestamp < 2500) return;
  notifications.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, message: String(message), tone,
    timestamp: event.at || Date.now(), read: false, ...(event.join ? { join: event.join } : {}) });
  notifications = notifications.slice(0, 60);
  saveNotifications();
  renderNotificationCenter();
  if (event.join) scheduleJoinNotificationRefresh();
}

loadNotifications();
updateNotificationBadge();

function setLaunchStatus(message = '', tone = '') {
  if (!launchStatusEl) return;
  launchStatusEl.textContent = message;
  launchStatusEl.dataset.tone = tone;
}

function showToast(message, tone = 'info', duration = 4500) {
  if (!toastRegion || !message) return;
  const text = String(message);
  const toastClass = `toast toast-${tone}`;
  if ([...toastRegion.children].some(toast => toast.className === toastClass && toast.textContent === text)) return;
  addNotification(text, tone);
  const toast = document.createElement('div');
  toast.className = toastClass;
  toast.textContent = text;
  toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), duration);
}

function openNotificationCenter() {
  if (!notificationCenterModal) return;
  notificationCenterModal.hidden = false;
  notificationCenterModal.setAttribute('aria-hidden', 'false');
  notifications = notifications.map(item => ({ ...item, read: true }));
  saveNotifications();
  renderNotificationCenter();
  scheduleJoinNotificationRefresh();
}

function closeNotificationCenter() {
  if (!notificationCenterModal) return;
  notificationCenterModal.hidden = true;
  notificationCenterModal.setAttribute('aria-hidden', 'true');
}

notificationCenterBtn?.addEventListener('click', openNotificationCenter);
notificationJoinedFilterBtn?.addEventListener('click', () => {
  showJoinedNotifications = !showJoinedNotifications;
  renderNotificationCenter();
  scheduleJoinNotificationRefresh();
});
notificationResetFilterBtn?.addEventListener('click', () => {
  showJoinedNotifications = false;
  renderNotificationCenter();
});
notificationCenterCloseBtn?.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
  closeNotificationCenter();
});
notificationCenterCloseBtn?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  closeNotificationCenter();
});
notificationCenterModal?.addEventListener('click', event => {
  if (event.target === notificationCenterModal) closeNotificationCenter();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && notificationCenterModal && !notificationCenterModal.hidden) closeNotificationCenter();
});
markNotificationsReadBtn?.addEventListener('click', () => {
  notifications = notifications.map(item => ({ ...item, read: true }));
  saveNotifications();
  renderNotificationCenter();
});
clearNotificationsBtn?.addEventListener('click', () => {
  notifications = [];
  saveNotifications();
  renderNotificationCenter();
});

renderNotificationCenter();

const BLACK_HOLE_PALETTES = {
  inferno: {
    halo: [[255, 61, 18], [176, 17, 4], [255, 151, 54]],
    disk: [[255, 250, 222], [255, 86, 24], [184, 18, 5], [255, 166, 74]],
    orbiters: [[255, 73, 24], [255, 133, 38], [255, 211, 132], [255, 250, 224]],
    outer: [255, 81, 22], inner: [255, 218, 151], photon: [255, 251, 233], lens: [255, 120, 35]
  },
  cosmic: {
    halo: [[106, 155, 255], [153, 107, 255], [255, 174, 111]],
    disk: [[244, 248, 255], [140, 192, 255], [205, 157, 255], [255, 208, 151]],
    orbiters: [[139, 197, 255], [211, 168, 255], [255, 218, 166], [244, 248, 255]],
    outer: [180, 207, 255], inner: [231, 190, 255], photon: [244, 248, 255], lens: [190, 158, 255]
  },
  solar: {
    halo: [[255, 198, 58], [255, 126, 22], [255, 236, 158]],
    disk: [[255, 255, 238], [255, 211, 79], [255, 132, 27], [255, 235, 151]],
    orbiters: [[255, 184, 46], [255, 220, 106], [255, 142, 29], [255, 253, 224]],
    outer: [255, 196, 58], inner: [255, 229, 137], photon: [255, 255, 239], lens: [255, 151, 32]
  },
  ice: {
    halo: [[55, 169, 255], [38, 95, 220], [158, 239, 255]],
    disk: [[237, 253, 255], [75, 190, 255], [45, 97, 228], [139, 231, 255]],
    orbiters: [[79, 178, 255], [116, 224, 255], [76, 111, 242], [241, 254, 255]],
    outer: [76, 184, 255], inner: [150, 232, 255], photon: [241, 254, 255], lens: [73, 119, 241]
  },
  emerald: {
    halo: [[53, 229, 157], [14, 128, 97], [145, 255, 215]],
    disk: [[235, 255, 246], [56, 222, 155], [12, 126, 92], [139, 252, 205]],
    orbiters: [[54, 218, 150], [126, 255, 207], [19, 145, 104], [238, 255, 247]],
    outer: [62, 222, 158], inner: [150, 255, 215], photon: [239, 255, 248], lens: [31, 158, 116]
  },
  mono: {
    halo: [[220, 225, 232], [109, 116, 126], [255, 255, 255]],
    disk: [[255, 255, 255], [211, 216, 223], [103, 109, 118], [239, 242, 246]],
    orbiters: [[199, 204, 211], [236, 239, 243], [132, 139, 149], [255, 255, 255]],
    outer: [214, 219, 226], inner: [245, 247, 250], photon: [255, 255, 255], lens: [153, 160, 170]
  },
  nightmare: {
    halo: [[129, 89, 255], [45, 20, 92], [207, 196, 255]],
    disk: [[244, 241, 255], [142, 103, 255], [61, 27, 125], [202, 187, 255]],
    orbiters: [[135, 96, 255], [220, 210, 255], [79, 39, 157], [255, 221, 151]],
    outer: [125, 85, 255], inner: [221, 211, 255], photon: [248, 245, 255], lens: [107, 64, 211]
  }
};

function startAmbientBackground() {
  if (!ambientCanvas) return;
  const context = ambientCanvas.getContext('2d', { alpha: true });
  if (!context) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  let width = 1;
  let height = 1;
  let scale = 1;
  let lastTime = 0;
  let animationRequest = 0;
  let particles = [];
  let orbiters = [];

  const lowPowerEnabled = () => uiPrefs.powerMode === 'low';
  const motionReduced = () => uiPrefs.reducedMotion === 'on' || (uiPrefs.reducedMotion !== 'off' && motionPreference.matches);

  function blackHoleMetrics() {
    const coreRadius = Math.max(150, Math.min(230, Math.min(width, height) * 0.22));
    const diskRadius = Math.max(coreRadius * 3.7, Math.min(920, width * 0.52));
    return { coreRadius, diskRadius };
  }

  function seedParticles() {
    const lowPower = lowPowerEnabled();
    const count = lowPower
      ? Math.max(10, Math.min(24, Math.round((width * height) / 70000)))
      : Math.max(55, Math.min(125, Math.round((width * height) / 9000)));
    const { coreRadius, diskRadius } = blackHoleMetrics();
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.35 + Math.random() * 1.15,
      alpha: 0.12 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: motionReduced() ? 0 : 0.003 + Math.random() * 0.008,
      sway: 0.006 + Math.random() * 0.014,
      depth: 0.35 + (index % 7) / 10
    }));
    orbiters = Array.from({ length: lowPower ? 28 : 420 }, (_, index) => ({
      angle: Math.random() * Math.PI * 2,
      radius: coreRadius * 1.16 + Math.pow(Math.random(), 0.7) * (diskRadius - coreRadius * 1.16),
      size: 0.5 + Math.random() * 2.2,
      alpha: 0.14 + Math.random() * 0.62,
      speed: (motionReduced() ? 0 : 0.0001 + Math.random() * 0.00032) * (index % 3 === 0 ? -1 : 1),
      offset: (Math.random() - 0.5) * coreRadius * 0.65,
      phase: Math.random() * Math.PI * 2,
      tint: index % 4
    }));
  }

  function resizeAmbientCanvas() {
    const bounds = ambientCanvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    scale = Math.min(lowPowerEnabled() ? 0.5 : 2, window.devicePixelRatio || 1);
    ambientCanvas.width = Math.round(width * scale);
    ambientCanvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    seedParticles();
  }

  function cancelAmbientFrame() {
    if (!animationRequest) return;
    window.cancelAnimationFrame(animationRequest);
    animationRequest = 0;
  }

  function scheduleAmbientFrame() {
    // Low Power keeps the rendered scene as a static canvas. Avoiding a
    // permanent requestAnimationFrame loop removes the renderer/GPU wakeups
    // that previously continued up to 24 times per second.
    if (lowPowerEnabled() || animationRequest || document.hidden || !document.hasFocus() || motionReduced()) return;
    animationRequest = window.requestAnimationFrame(drawAmbientFrame);
  }

  function requestSingleAmbientFrame() {
    if (animationRequest || document.hidden || !document.hasFocus()) return;
    animationRequest = window.requestAnimationFrame(drawAmbientFrame);
  }

  function drawAlternateBackground(scene, time, palette, lowPower) {
    const intensity = Math.max(0.2, Math.min(1.4, Number(uiPrefs.backgroundIntensity || 75) / 100));
    const stillTime = motionReduced() ? 0 : time;
    if (scene === 'none') return;

    if (scene === 'shadow-realm') {
      const centerX = width * 0.5;
      const centerY = height * 0.49;
      const radius = Math.max(220, Math.min(430, Math.min(width, height) * 0.39));
      const pulse = lowPower ? 1 : 1 + Math.sin(stillTime * 0.0008) * 0.018;
      const sky = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 2.7);
      sky.addColorStop(0, rgba(palette.halo[0], 0.18 * intensity));
      sky.addColorStop(0.42, rgba(palette.halo[1], 0.1 * intensity));
      sky.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX, centerY);
      context.rotate(-0.08);
      const gateGlow = context.createRadialGradient(0, 0, radius * 0.72, 0, 0, radius * 1.28);
      gateGlow.addColorStop(0, 'rgba(0,0,0,0)');
      gateGlow.addColorStop(0.72, 'rgba(0,0,0,0)');
      gateGlow.addColorStop(0.82, rgba(palette.photon, 0.74 * intensity));
      gateGlow.addColorStop(0.88, rgba(palette.outer, 0.48 * intensity));
      gateGlow.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gateGlow;
      context.beginPath();
      context.arc(0, 0, radius * 1.3 * pulse, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = lowPower ? 0 : 34;
      context.shadowColor = rgba(palette.outer, 0.75);
      context.strokeStyle = rgba(palette.inner, 0.56 * intensity);
      context.lineWidth = 2.2;
      context.beginPath();
      context.arc(0, 0, radius * 1.08 * pulse, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = 'rgba(0,0,0,0.995)';
      context.beginPath();
      context.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
      context.fill();

      const runeCount = lowPower ? 12 : 24;
      const runeRotation = stillTime * 0.000055;
      context.shadowBlur = 0;
      context.lineWidth = 1;
      for (let index = 0; index < runeCount; index++) {
        const angle = runeRotation + (Math.PI * 2 * index) / runeCount;
        const runeRadius = radius * 1.18;
        const x = Math.cos(angle) * runeRadius;
        const y = Math.sin(angle) * runeRadius;
        context.save();
        context.translate(x, y);
        context.rotate(angle + Math.PI / 2);
        context.strokeStyle = rgba(index % 5 === 0 ? palette.disk[3] : palette.inner, (index % 5 === 0 ? 0.65 : 0.31) * intensity);
        context.beginPath();
        context.moveTo(-5, 0);
        context.lineTo(0, index % 2 ? -8 : -5);
        context.lineTo(5, 0);
        context.lineTo(0, index % 3 ? 7 : 10);
        context.closePath();
        context.stroke();
        context.restore();
      }
      context.restore();

      const horizon = context.createLinearGradient(0, height * 0.68, 0, height);
      horizon.addColorStop(0, 'rgba(0,0,0,0)');
      horizon.addColorStop(0.55, rgba(palette.halo[1], 0.1 * intensity));
      horizon.addColorStop(1, 'rgba(0,0,0,0.82)');
      context.fillStyle = horizon;
      context.fillRect(0, height * 0.58, width, height * 0.42);

      if (!lowPower) {
        for (let index = 0; index < 7; index++) {
          const phase = stillTime * (0.00012 + index * 0.000008) + index * 0.9;
          context.strokeStyle = rgba(index % 2 ? palette.outer : palette.inner, (0.035 + index * 0.004) * intensity);
          context.lineWidth = 18 + index * 7;
          context.beginPath();
          context.moveTo(-80, height * (0.18 + index * 0.1));
          context.bezierCurveTo(width * 0.22, height * (0.05 + Math.sin(phase) * 0.08), width * 0.72, height * (0.93 + Math.cos(phase) * 0.06), width + 90, height * (0.25 + index * 0.075));
          context.stroke();
        }
      }
      return;
    }

    if (scene === 'aurora') {
      const night = context.createLinearGradient(0, 0, 0, height);
      night.addColorStop(0, rgba(palette.halo[1], 0.18 * intensity));
      night.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = night;
      context.fillRect(0, 0, width, height);
      const bands = lowPower ? 3 : 6;
      for (let band = 0; band < bands; band++) {
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.25, rgba(palette.halo[band % palette.halo.length], 0.08 * intensity));
        gradient.addColorStop(0.55, rgba(palette.disk[(band + 1) % palette.disk.length], 0.19 * intensity));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.strokeStyle = gradient;
        context.lineWidth = 72 + band * 15;
        context.beginPath();
        for (let x = -80; x <= width + 80; x += 35) {
          const y = height * (0.18 + band * 0.075) + Math.sin(x * 0.004 + stillTime * 0.00025 + band) * (34 + band * 6);
          if (x === -80) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      }
      return;
    }

    if (scene === 'starfall') {
      const streaks = lowPower ? 12 : 34;
      context.lineCap = 'round';
      for (let index = 0; index < streaks; index++) {
        const cycle = ((stillTime * (0.02 + (index % 5) * 0.004)) + index * 137) % (width + height + 300);
        const x = (index * 193 + cycle) % (width + 320) - 160;
        const y = (index * 97 + cycle * 0.42) % (height + 220) - 110;
        const length = 25 + (index % 7) * 8;
        const trail = context.createLinearGradient(x, y, x - length, y - length * 0.45);
        trail.addColorStop(0, rgba(palette.photon, 0.72 * intensity));
        trail.addColorStop(1, 'rgba(0,0,0,0)');
        context.strokeStyle = trail;
        context.lineWidth = index % 6 === 0 ? 2 : 1;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - length, y - length * 0.45);
        context.stroke();
      }
      return;
    }

    if (scene === 'abyss-ocean') {
      const ocean = context.createLinearGradient(0, height * 0.25, 0, height);
      ocean.addColorStop(0, 'rgba(0,0,0,0)');
      ocean.addColorStop(0.55, rgba(palette.halo[1], 0.12 * intensity));
      ocean.addColorStop(1, rgba(palette.outer, 0.1 * intensity));
      context.fillStyle = ocean;
      context.fillRect(0, 0, width, height);
      const waves = lowPower ? 7 : 15;
      for (let index = 0; index < waves; index++) {
        const baseY = height * (0.47 + index * 0.035);
        context.strokeStyle = rgba(index % 4 === 0 ? palette.inner : palette.outer, (0.05 + (index % 3) * 0.018) * intensity);
        context.lineWidth = index % 4 === 0 ? 2 : 1;
        context.beginPath();
        for (let x = -40; x <= width + 40; x += 24) {
          const y = baseY + Math.sin(x * 0.012 + stillTime * 0.0003 + index * 0.7) * (8 + index * 1.2);
          if (x === -40) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      }
      return;
    }

    if (scene === 'void-mist') {
      const clouds = lowPower ? 7 : 16;
      for (let index = 0; index < clouds; index++) {
        const phase = index * 1.77 + stillTime * (0.000035 + (index % 3) * 0.000012);
        const x = width * (0.12 + (index % 5) * 0.21) + Math.sin(phase) * width * 0.16;
        const y = height * (0.1 + (index % 4) * 0.27) + Math.cos(phase * 0.7) * height * 0.13;
        const radius = Math.min(width, height) * (0.2 + (index % 4) * 0.055);
        const mist = context.createRadialGradient(x, y, 0, x, y, radius);
        mist.addColorStop(0, rgba(palette.halo[index % palette.halo.length], (0.045 + (index % 3) * 0.018) * intensity));
        mist.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = mist;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }
  }

  function drawAmbientFrame(time = 0) {
    animationRequest = 0;
    const lowPower = lowPowerEnabled();
    if (!motionReduced() && (document.hidden || !document.hasFocus())) return;
    const delta = Math.min(32, time - lastTime || 16);
    const palette = BLACK_HOLE_PALETTES[uiPrefs.blackHolePalette] || BLACK_HOLE_PALETTES.inferno;
    const { coreRadius, diskRadius } = blackHoleMetrics();
    const centerX = width * (0.5 + Math.sin(time * 0.000035) * 0.007);
    const centerY = height * (0.55 + Math.cos(time * 0.00003) * 0.007);
    const tilt = -0.09;
    lastTime = time;
    context.clearRect(0, 0, width, height);
    const backgroundScene = uiPrefs.background || 'black-hole';
    if (backgroundScene === 'grey-fog') {
      const sceneTime = lowPower || motionReduced() ? 0 : time;
      drawSealGreyFogScene(context, width, height, sceneTime, Number(uiPrefs.backgroundIntensity) / 100);
      scheduleAmbientFrame();
      return;
    }

    for (const particle of particles) {
      particle.y += particle.speed * delta * particle.depth;
      particle.x += Math.sin(time * particle.sway * 0.001 + particle.phase) * 0.018 * particle.depth;
      if (particle.y > height + 3) { particle.y = -3; particle.x = Math.random() * width; }
      if (particle.x > width + 3) particle.x = -3;
      if (particle.x < -3) particle.x = width + 3;
      const shimmer = motionReduced() ? 0.7 : 0.54 + Math.sin(time * 0.0012 + particle.phase) * 0.34;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${Math.max(0.04, particle.alpha * shimmer)})`;
      context.fill();
    }

    if (backgroundScene !== 'black-hole') {
      drawAlternateBackground(backgroundScene, time, palette, lowPower);
      scheduleAmbientFrame();
      return;
    }

    context.save();
    context.globalAlpha = Math.max(0.2, Math.min(1.4, Number(uiPrefs.backgroundIntensity || 75) / 100));
    const halo = context.createRadialGradient(centerX, centerY, coreRadius * 0.5, centerX, centerY, coreRadius * 5.15);
    halo.addColorStop(0, rgba(palette.halo[0], 0.2));
    halo.addColorStop(0.31, rgba(palette.halo[1], 0.12));
    halo.addColorStop(0.67, rgba(palette.halo[2], 0.045));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 5.15, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.translate(centerX, centerY);
    context.rotate(tilt);
    context.scale(1, 0.29);
    const diskGlow = context.createRadialGradient(0, 0, coreRadius * 0.68, 0, 0, diskRadius);
    diskGlow.addColorStop(0, 'rgba(255,255,255,0)');
    diskGlow.addColorStop(0.08, rgba(palette.disk[0], 0.72));
    diskGlow.addColorStop(0.18, rgba(palette.disk[1], 0.46));
    diskGlow.addColorStop(0.42, rgba(palette.disk[2], 0.22));
    diskGlow.addColorStop(0.72, rgba(palette.disk[3], 0.09));
    diskGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = diskGlow;
    context.beginPath();
    context.arc(0, 0, diskRadius, 0, Math.PI * 2);
    context.fill();

    for (const orbiter of orbiters) {
      orbiter.angle += orbiter.speed * delta;
      const orbitPulse = Math.sin(time * 0.00045 + orbiter.phase) * 6;
      const x = Math.cos(orbiter.angle) * (orbiter.radius + orbitPulse);
      const y = Math.sin(orbiter.angle) * (orbiter.radius + orbitPulse) + orbiter.offset;
      const frontLight = 0.42 + (Math.sin(orbiter.angle) + 1) * 0.31;
      context.beginPath();
      context.arc(x, y, orbiter.size, 0, Math.PI * 2);
      context.fillStyle = rgba(palette.orbiters[orbiter.tint], orbiter.alpha * frontLight);
      context.fill();
    }

    const flare = context.createLinearGradient(-diskRadius, 0, diskRadius, 0);
    flare.addColorStop(0, 'rgba(0,0,0,0)');
    flare.addColorStop(0.18, rgba(palette.outer, 0.18));
    flare.addColorStop(0.44, rgba(palette.photon, 0.72));
    flare.addColorStop(0.56, rgba(palette.photon, 0.72));
    flare.addColorStop(0.82, rgba(palette.outer, 0.18));
    flare.addColorStop(1, 'rgba(0,0,0,0)');
    context.shadowBlur = lowPower ? 0 : 24;
    context.shadowColor = rgba(palette.outer, 0.72);
    context.strokeStyle = flare;
    context.lineWidth = 3.2;
    context.beginPath();
    context.moveTo(-diskRadius, 0);
    context.lineTo(diskRadius, 0);
    context.stroke();
    context.restore();

    context.save();
    context.shadowBlur = lowPower ? 0 : 30;
    context.shadowColor = rgba(palette.outer, 0.7);
    context.beginPath();
    context.ellipse(centerX, centerY, coreRadius * 3.9, coreRadius * 0.94, tilt, 0, Math.PI * 2);
    context.strokeStyle = rgba(palette.outer, 0.52);
    context.lineWidth = 3.5;
    context.stroke();
    if (!lowPower) {
      context.shadowColor = rgba(palette.inner, 0.8);
      context.beginPath();
      context.ellipse(centerX, centerY, coreRadius * 2.5, coreRadius * 0.7, tilt, 0, Math.PI * 2);
      context.strokeStyle = rgba(palette.inner, 0.55);
      context.lineWidth = 2.4;
      context.stroke();
    }
    context.restore();

    context.save();
    context.shadowBlur = lowPower ? 0 : 34;
    context.shadowColor = rgba(palette.photon, 0.85);
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 1.31, 0, Math.PI * 2);
    context.strokeStyle = rgba(palette.outer, 0.82);
    context.lineWidth = 5;
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 1.28, Math.PI * 1.06, Math.PI * 1.94);
    context.strokeStyle = rgba(palette.photon, 0.92);
    context.lineWidth = 6;
    context.stroke();
    context.restore();

    const eventHorizon = context.createRadialGradient(centerX - coreRadius * 0.18, centerY - coreRadius * 0.16, 1, centerX, centerY, coreRadius * 1.27);
    eventHorizon.addColorStop(0, 'rgba(0,0,0,1)');
    eventHorizon.addColorStop(0.82, 'rgba(0,0,0,1)');
    eventHorizon.addColorStop(0.95, 'rgba(0,0,0,0.98)');
    eventHorizon.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = eventHorizon;
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 1.28, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 1.36, Math.PI * 0.04, Math.PI * 0.96);
    context.strokeStyle = rgba(palette.photon, 0.74);
    context.lineWidth = 2.2;
    context.stroke();
    if (!lowPower) {
      context.beginPath();
      context.arc(centerX, centerY, coreRadius * 1.7, Math.PI * 1.08, Math.PI * 1.9);
      context.strokeStyle = rgba(palette.lens, 0.25);
      context.lineWidth = 1.5;
      context.stroke();
    }

    context.restore();
    scheduleAmbientFrame();
  }

  resizeAmbientCanvas();
  window.addEventListener('resize', () => {
    resizeAmbientCanvas();
    if (lowPowerEnabled() || motionReduced()) requestSingleAmbientFrame();
  }, { passive: true });
  window.addEventListener('seal:appearance-changed', () => {
    cancelAmbientFrame();
    lastTime = 0;
    resizeAmbientCanvas();
    requestSingleAmbientFrame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAmbientFrame();
    else if (lowPowerEnabled() || motionReduced()) requestSingleAmbientFrame();
    else scheduleAmbientFrame();
  });
  window.addEventListener('blur', cancelAmbientFrame);
  window.addEventListener('focus', () => {
    if (lowPowerEnabled() || motionReduced()) requestSingleAmbientFrame();
    else scheduleAmbientFrame();
  });
  motionPreference.addEventListener?.('change', () => {
    cancelAmbientFrame();
    lastTime = 0;
    seedParticles();
    requestSingleAmbientFrame();
  });
  animationRequest = window.requestAnimationFrame(drawAmbientFrame);
}

startAmbientBackground();

function confirmCloseRobloxForBatch() {
  if (!launchConflictModal) return sealConfirm('Roblox is already open. Close it and continue?');
  launchConflictModal.hidden = false;
  launchConflictContinueBtn?.focus();

  return new Promise(resolve => {
    const finish = (answer) => {
      launchConflictModal.hidden = true;
      launchConflictCancelBtn?.removeEventListener('click', cancel);
      launchConflictContinueBtn?.removeEventListener('click', proceed);
      launchConflictModal.removeEventListener('click', backdrop);
      resolve(answer);
    };
    const cancel = () => finish(false);
    const proceed = () => finish(true);
    const backdrop = event => { if (event.target === launchConflictModal) cancel(); };
    launchConflictCancelBtn?.addEventListener('click', cancel);
    launchConflictContinueBtn?.addEventListener('click', proceed);
    launchConflictModal.addEventListener('click', backdrop);
  });
}

function normalizeFpsCap(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 60;
  return Math.min(2147483647, Math.max(1, n));
}

function clampDeathVolume(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 200;
  return Math.min(400, Math.max(50, n));
}
function updateDeathVolumeLabel() {
  if (!deathSoundVolumeInput) return;
  deathSoundVolumeInput.value = String(clampDeathVolume(deathSoundVolumeInput.value));
  if (deathSoundVolumeLabel) deathSoundVolumeLabel.textContent = `${deathSoundVolumeInput.value}%`;
}
function clampDeathCutoff(value) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 1.4;
  return Math.min(5, Math.max(0.3, Math.round(n * 10) / 10));
}
function updateDeathCutoffLabel() {
  if (!deathSoundCutoffInput) return;
  deathSoundCutoffInput.value = String(clampDeathCutoff(deathSoundCutoffInput.value));
  if (deathSoundCutoffLabel) deathSoundCutoffLabel.textContent = `${deathSoundCutoffInput.value}s`;
}
function normalizeDeathPlayback(value) {
  return value === 'timed' ? 'timed' : 'full';
}
function normalizeDeathTarget(value) {
  const target = String(value || 'legacy_ouch');
  if (target === 'auto' || target === 'current_uuhhh') return target;
  return 'legacy_ouch';
}
if (deathSoundVolumeInput) {
  deathSoundVolumeInput.value = localStorage.getItem('sealDeathSoundVolume') || '200';
  updateDeathVolumeLabel();
}
if (deathSoundPlaybackSelect) {
  deathSoundPlaybackSelect.value = normalizeDeathPlayback(localStorage.getItem('sealDeathSoundPlayback') || 'full');
}
if (deathSoundTargetSelect) {
  deathSoundTargetSelect.value = normalizeDeathTarget(localStorage.getItem('sealDeathSoundTarget') || 'auto');
}
if (deathSoundCutoffInput) {
  deathSoundCutoffInput.value = localStorage.getItem('sealDeathSoundCutoff') || '1.4';
  updateDeathCutoffLabel();
}
if (deathSoundPersistentInput) {
  deathSoundPersistentInput.checked = localStorage.getItem('sealDeathSoundPersistent') !== 'false';
}
if (customCursorName && customCursorFileName) customCursorName.value = customCursorFileName;
if (customDeathSoundName && customDeathSoundFileName) customDeathSoundName.value = customDeathSoundFileName;

function updateCustomAssetButtons() {
  if (deleteCursorBtn) deleteCursorBtn.disabled = !customCursorPath;
  if (deleteDeathSoundBtn) deleteDeathSoundBtn.disabled = !customDeathSoundPath;
}
updateCustomAssetButtons();

function currentRobloxMods() {
  return {
    font: robloxFontSelect?.value || 'default',
    cursor: robloxCursorSelect?.value || 'default',
    customCursorPath,
    textures: robloxTextureSelect?.value || 'default',
    fullbright: robloxLightingSelect?.value === 'fullbright',
    sounds: robloxSoundSelect?.value || 'default',
    deathPlayback: 'full',
    deathTarget: 'auto',
    deathPersistent: false,
    customDeathSoundPath
  };
}

function saveBootstrapMods() {
  const mods = currentRobloxMods();
  localStorage.setItem('sealBootstrapMods', JSON.stringify(mods));
  localStorage.removeItem('sealDeathSoundVolume');
  localStorage.setItem('sealDeathSoundPlayback', 'full');
  localStorage.setItem('sealDeathSoundTarget', 'auto');
  localStorage.removeItem('sealDeathSoundCutoff');
  localStorage.setItem('sealDeathSoundPersistent', 'false');
  window.api.setBootstrapMods?.(mods).catch(() => {});
}

function ensureSelectOption(select, value, label) {
  if (!select || !value) return;
  let option = [...select.options].find(o => o.value === value);
  if (!option) {
    option = document.createElement('option');
    option.value = value;
    select.appendChild(option);
  }
  option.textContent = label || value;
}

function removeSelectOption(select, value) {
  if (!select) return;
  const option = [...select.options].find(item => item.value === value);
  option?.remove();
}

function mergedPrefs(raw = {}) {
  const labels = { ...DEFAULT_LABELS, ...(raw.labels || {}) };
  const oldDefaults = {
    customize: 'Settings',
    checkCookies: 'Check cookies',
    joinTarget: 'Join target',
    fastFlags: 'FF',
    checkSelectedStatus: 'Check selected status',
    forceQuit: 'Force quit selected'
  };
  if (Number(raw.designVersion || 0) < 2) {
    for (const [key, oldValue] of Object.entries(oldDefaults)) {
      if (labels[key] === oldValue) labels[key] = DEFAULT_LABELS[key];
    }
  }
  const migratedAppearance = Number(raw.designVersion || 0) < 5
    ? {
        theme: DEFAULT_UI_PREFS.theme,
        accent: DEFAULT_UI_PREFS.accent,
        fontFamily: DEFAULT_UI_PREFS.fontFamily,
        accountLayout: DEFAULT_UI_PREFS.accountLayout,
        density: DEFAULT_UI_PREFS.density
      }
    : {};
  const migratedPowerMode = Number(raw.designVersion || 0) < 6 ? { powerMode: 'low' } : {};
  const oldMysteriesPreset = Number(raw.designVersion || 0) < 10 && raw.theme === 'lord-of-the-mysteries' && raw.background === 'none';
  const migratedBackground = ['black-hole', 'shadow-realm', 'aurora', 'none', 'grey-fog'].includes(raw.background)
    ? {}
    : { background: DEFAULT_UI_PREFS.background };
  if (oldMysteriesPreset) {
    migratedBackground.background = 'grey-fog';
    if ([90, 92].includes(raw.panelOpacity)) migratedBackground.panelOpacity = 75;
  }
  const pageThemes = Number(raw.designVersion || 0) < 9
    ? { ...DEFAULT_UI_PREFS.pageThemes }
    : { ...DEFAULT_UI_PREFS.pageThemes, ...(raw.pageThemes || {}) };
  return { ...DEFAULT_UI_PREFS, ...raw, ...migratedAppearance, ...migratedPowerMode, ...migratedBackground, designVersion: DEFAULT_UI_PREFS.designVersion, pageThemes, labels };
}

function loadUiPrefs() {
  try { uiPrefs = mergedPrefs(JSON.parse(localStorage.getItem('sealUiPrefs') || '{}')); }
  catch { uiPrefs = mergedPrefs(); }
  applyUiPrefs();
  window.api.setPauseHotkey?.(uiPrefs.pauseHotkey).then((state) => {
    pauseHotkeyLabel = state?.accelerator || uiPrefs.pauseHotkey || 'F8';
    if (pauseHotkeySelect) pauseHotkeySelect.value = displayHotkey(pauseHotkeyLabel);
    updatePauseUI(isPaused);
  }).catch(() => updatePauseUI(isPaused));
}

function fillInput(el, value) { if (el) el.value = value || ''; }

function displayHotkey(value) {
  return String(value || 'F8').replace(/\+/g, ' + ');
}

const THEME_LABELS = {
  inherit: 'Use main theme',
  void: 'Void', seal: 'Deep ocean', midnight: 'Midnight', mint: 'Evergreen',
  sunset: 'Ember', light: 'Porcelain', 'shadow-slave': 'Shadow Slave',
  'lord-of-the-mysteries': 'Lord of the Mysteries'
};

function populatePageThemeSelect(select, allowInherit = true) {
  if (!select || select.options.length) return;
  for (const [value, label] of Object.entries(THEME_LABELS)) {
    if (!allowInherit && value === 'inherit') continue;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
}

populatePageThemeSelect(mainPageThemeSelect);
populatePageThemeSelect(customizePageThemeSelect);
populatePageThemeSelect(launcherPageThemeSelect);

function normalizedHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
}

function hexToRgb(value) {
  const hex = normalizedHex(value, '#9d8cff').slice(1);
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function activeThemePage() {
  return document.body.dataset.settingsPage || 'main';
}

const mysteriesLabels = Array.from(document.querySelectorAll('[data-mysteries-label]'), element => ({
  element, original: element.textContent
}));

function applyPageTheme(page = activeThemePage()) {
  const previousTheme = document.body.dataset.theme;
  const selectedTheme = uiPrefs.pageThemes?.[page];
  document.body.dataset.theme = selectedTheme && selectedTheme !== 'inherit'
    ? selectedTheme
    : (uiPrefs.theme || DEFAULT_UI_PREFS.theme);
  const mysteries = document.body.dataset.theme === 'lord-of-the-mysteries';
  if (mysteries) {
    drawMysteriesTarotCards();
    if (previousTheme !== document.body.dataset.theme) renderSessions();
  }
  for (const { element, original } of mysteriesLabels) {
    const label = mysteries ? element.dataset.mysteriesLabel : original;
    if (element.textContent !== label) element.textContent = label;
  }
}

function eventToPauseAccelerator(event) {
  const rawKey = String(event.key || '').trim();
  const rawCode = String(event.code || '').trim();
  if (!rawKey) return '';

  const keyMap = {
    ' ': 'Space', Spacebar: 'Space', Escape: 'Esc', Esc: 'Esc',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Delete: 'Delete',
    Backspace: 'Backspace', Tab: 'Tab', Enter: 'Enter', Return: 'Enter',
    Home: 'Home', End: 'End'
  };

  let key = keyMap[rawKey] || rawKey;
  if (/^Key[A-Z]$/i.test(rawCode)) key = rawCode.slice(3).toUpperCase();
  else if (/^Digit[0-9]$/i.test(rawCode)) key = rawCode.slice(5);
  else if (/^Numpad[0-9]$/i.test(rawCode)) key = 'num' + rawCode.slice(6);
  else if (/^F\d{1,2}$/i.test(rawKey)) key = rawKey.toUpperCase();
  else if (key.length === 1) key = key.toUpperCase();

  const modifierOnly = ['CONTROL','CTRL','SHIFT','ALT','META','COMMAND','OPTION'];
  if (modifierOnly.includes(key.toUpperCase())) return '';

  const mods = [];
  if (event.ctrlKey && key !== 'Control') mods.push('Ctrl');
  if (event.altKey && key !== 'Alt') mods.push('Alt');
  if (event.shiftKey && key !== 'Shift' && key.length !== 1) mods.push('Shift');
  if (event.metaKey && key !== 'Meta') mods.push('Command');
  return [...mods, key].join('+');
}


function applyUiPrefs() {
  uiPrefs = mergedPrefs(uiPrefs);
  document.documentElement.style.setProperty('--app-font', uiPrefs.fontFamily);
  document.documentElement.style.setProperty('--text-scale', `${Number(uiPrefs.textScale) || 100}%`);
  const accentRgb = hexToRgb(uiPrefs.customAccent);
  document.documentElement.style.setProperty('--custom-accent', normalizedHex(uiPrefs.customAccent, DEFAULT_UI_PREFS.customAccent));
  document.documentElement.style.setProperty('--custom-accent-rgb', accentRgb.join(', '));
  document.documentElement.style.setProperty('--custom-base', normalizedHex(uiPrefs.customBaseColor, DEFAULT_UI_PREFS.customBaseColor));
  document.documentElement.style.setProperty('--custom-panel', normalizedHex(uiPrefs.customPanelColor, DEFAULT_UI_PREFS.customPanelColor));
  document.documentElement.style.setProperty('--panel-radius', `${Math.max(6, Math.min(28, Number(uiPrefs.panelRadius) || 14))}px`);
  document.documentElement.style.setProperty('--panel-opacity', String(Math.max(0.55, Math.min(1, Number(uiPrefs.panelOpacity || 85) / 100))));
  document.documentElement.style.setProperty('--background-intensity', String(Math.max(0.2, Math.min(1.4, Number(uiPrefs.backgroundIntensity || 75) / 100))));
  applyPageTheme();
  document.body.dataset.accent = uiPrefs.accent || DEFAULT_UI_PREFS.accent;
  document.body.dataset.blackHolePalette = uiPrefs.blackHolePalette || DEFAULT_UI_PREFS.blackHolePalette;
  document.body.dataset.background = uiPrefs.background || DEFAULT_UI_PREFS.background;
  document.body.dataset.powerMode = uiPrefs.powerMode === 'low' ? 'low' : 'full';
  document.body.dataset.reducedMotion = uiPrefs.reducedMotion || 'auto';
  document.body.dataset.panelStyle = uiPrefs.panelStyle || 'soft';
  document.body.dataset.sessionStyle = uiPrefs.sessionStyle || 'cards';
  document.body.dataset.layout = uiPrefs.accountLayout || 'cards';
  document.body.dataset.density = uiPrefs.density || 'comfortable';
  const shadowSlaveMode = document.body.dataset.theme === 'shadow-slave';
  const brandSubtitle = document.querySelector('.brand-lockup .brand-copy > span');
  const accountsKicker = document.querySelector('.workbench-heading .section-kicker');
  const launchKicker = document.querySelector('.launch-card .section-kicker');
  const sessionsKicker = document.querySelector('.sessions-card .section-kicker');
  if (brandSubtitle) brandSubtitle.textContent = shadowSlaveMode ? 'NIGHTMARE SPELL EDITION' : 'ACCOUNT MANAGER';
  if (accountsKicker) accountsKicker.textContent = shadowSlaveMode ? 'AWAKENED ACCOUNTS' : 'YOUR ACCOUNTS';
  if (launchKicker) launchKicker.textContent = shadowSlaveMode ? 'DREAM GATE' : 'LAUNCH DESK';
  if (sessionsKicker) sessionsKicker.textContent = shadowSlaveMode ? 'ACTIVE COHORT' : 'LIVE NOW';
  pauseHotkeyLabel = uiPrefs.pauseHotkey || pauseHotkeyLabel || 'F8';

  if (themeSelect) themeSelect.value = uiPrefs.theme || DEFAULT_UI_PREFS.theme;
  if (accentSelect) accentSelect.value = uiPrefs.accent || DEFAULT_UI_PREFS.accent;
  if (blackHolePaletteSelect) blackHolePaletteSelect.value = uiPrefs.blackHolePalette || DEFAULT_UI_PREFS.blackHolePalette;
  if (backgroundSelect) backgroundSelect.value = uiPrefs.background || DEFAULT_UI_PREFS.background;
  if (powerModeSelect) powerModeSelect.value = uiPrefs.powerMode === 'low' ? 'low' : 'full';
  if (reducedMotionSelect) reducedMotionSelect.value = uiPrefs.reducedMotion || DEFAULT_UI_PREFS.reducedMotion;
  if (startupScreenSelect) startupScreenSelect.value = uiPrefs.startupScreen || DEFAULT_UI_PREFS.startupScreen;
  if (launchAnimationSelect) launchAnimationSelect.value = uiPrefs.launchAnimation || DEFAULT_UI_PREFS.launchAnimation;
  if (sessionStyleSelect) sessionStyleSelect.value = uiPrefs.sessionStyle || DEFAULT_UI_PREFS.sessionStyle;
  if (customAccentInput) customAccentInput.value = normalizedHex(uiPrefs.customAccent, DEFAULT_UI_PREFS.customAccent);
  if (customBaseColorInput) customBaseColorInput.value = normalizedHex(uiPrefs.customBaseColor, DEFAULT_UI_PREFS.customBaseColor);
  if (customPanelColorInput) customPanelColorInput.value = normalizedHex(uiPrefs.customPanelColor, DEFAULT_UI_PREFS.customPanelColor);
  if (panelStyleSelect) panelStyleSelect.value = uiPrefs.panelStyle || DEFAULT_UI_PREFS.panelStyle;
  if (panelRadiusInput) panelRadiusInput.value = String(uiPrefs.panelRadius || DEFAULT_UI_PREFS.panelRadius);
  if (panelOpacityInput) panelOpacityInput.value = String(uiPrefs.panelOpacity || DEFAULT_UI_PREFS.panelOpacity);
  if (backgroundIntensityInput) backgroundIntensityInput.value = String(uiPrefs.backgroundIntensity || DEFAULT_UI_PREFS.backgroundIntensity);
  if (mainPageThemeSelect) mainPageThemeSelect.value = uiPrefs.pageThemes?.main || 'inherit';
  if (customizePageThemeSelect) customizePageThemeSelect.value = uiPrefs.pageThemes?.customize || 'inherit';
  if (launcherPageThemeSelect) launcherPageThemeSelect.value = uiPrefs.pageThemes?.launcher || 'inherit';
  if (accountLayoutSelect) accountLayoutSelect.value = uiPrefs.accountLayout || 'cards';
  if (densitySelect) densitySelect.value = uiPrefs.density || 'comfortable';
  if (fontSelect) fontSelect.value = uiPrefs.fontFamily;
  if (textScaleInput) textScaleInput.value = String(uiPrefs.textScale || 100);
  if (pauseHotkeySelect) pauseHotkeySelect.value = displayHotkey(uiPrefs.pauseHotkey || 'F8');
  fillInput(pauseOffLabelInput, uiPrefs.pauseOffLabel);
  fillInput(pauseOnLabelInput, uiPrefs.pauseOnLabel);
  fillInput(labelAddAccountInput, uiPrefs.labels.addAccount);
  fillInput(labelCustomizeInput, uiPrefs.labels.customize);
  fillInput(labelAntiAfkInput, uiPrefs.labels.antiAfk);
  fillInput(labelCheckCookiesInput, uiPrefs.labels.checkCookies);
  fillInput(labelLaunchSelectedInput, uiPrefs.labels.launchSelected);
  fillInput(labelJoinTargetInput, uiPrefs.labels.joinTarget);
  fillInput(labelFpsCapInput, uiPrefs.labels.fpsCap);
  fillInput(labelGraphicsInput, uiPrefs.labels.graphics.replace('\n', ' '));
  fillInput(labelFastFlagsInput, uiPrefs.labels.fastFlags);
  fillInput(labelApplyInput, uiPrefs.labels.apply);
  fillInput(labelCheckSelectedStatusInput, uiPrefs.labels.checkSelectedStatus);
  fillInput(labelFreezeInput, uiPrefs.labels.freeze);
  fillInput(labelUnfreezeInput, uiPrefs.labels.unfreeze);
  fillInput(labelForceQuitInput, uiPrefs.labels.forceQuit);

  if (customizeBtn) {
    const customizeLabel = customizeBtn.querySelector('span:last-child');
    if (customizeLabel) customizeLabel.textContent = uiPrefs.labels.customize;
    else customizeBtn.textContent = uiPrefs.labels.customize;
  }
  if (addAccountBtn) addAccountBtn.textContent = uiPrefs.labels.addAccount;
  if (checkCookiesBtn) checkCookiesBtn.textContent = uiPrefs.labels.checkCookies;
  if (launchSelectedBtn && !launchSelectedBtn.textContent.startsWith('Launching')) launchSelectedBtn.textContent = uiPrefs.labels.launchSelected;
  if (checkSelectedStatusBtn && !checkSelectedStatusBtn.textContent.startsWith('Checking')) checkSelectedStatusBtn.textContent = uiPrefs.labels.checkSelectedStatus;
  if (freezeSelectedBtn && !freezeSelectedBtn.textContent.includes('Freezing')) freezeSelectedBtn.textContent = uiPrefs.labels.freeze;
  if (unfreezeSelectedBtn && !unfreezeSelectedBtn.textContent.includes('Unfreezing')) unfreezeSelectedBtn.textContent = uiPrefs.labels.unfreeze;
  if (forceQuitBtn && !forceQuitBtn.textContent.startsWith('Closing')) forceQuitBtn.textContent = uiPrefs.labels.forceQuit;
  const joinLabel = document.querySelector('label[for="joinUsername"]');
  if (joinLabel) joinLabel.textContent = uiPrefs.labels.joinTarget;
  setAntiIdleUI(antiIdleOn);
  if (pauseBtn) updatePauseUI(isPaused);
  window.dispatchEvent(new Event('seal:appearance-changed'));
  render();
}

function saveUiPrefs() {
  uiPrefs = mergedPrefs({
    designVersion: DEFAULT_UI_PREFS.designVersion,
    theme: themeSelect?.value || DEFAULT_UI_PREFS.theme,
    accent: accentSelect?.value || DEFAULT_UI_PREFS.accent,
    blackHolePalette: blackHolePaletteSelect?.value || DEFAULT_UI_PREFS.blackHolePalette,
    background: backgroundSelect?.value || DEFAULT_UI_PREFS.background,
    powerMode: powerModeSelect?.value === 'low' ? 'low' : 'full',
    reducedMotion: reducedMotionSelect?.value || DEFAULT_UI_PREFS.reducedMotion,
    startupScreen: startupScreenSelect?.value || DEFAULT_UI_PREFS.startupScreen,
    launchAnimation: launchAnimationSelect?.value || DEFAULT_UI_PREFS.launchAnimation,
    sessionStyle: sessionStyleSelect?.value || DEFAULT_UI_PREFS.sessionStyle,
    customAccent: normalizedHex(customAccentInput?.value, DEFAULT_UI_PREFS.customAccent),
    customBaseColor: normalizedHex(customBaseColorInput?.value, DEFAULT_UI_PREFS.customBaseColor),
    customPanelColor: normalizedHex(customPanelColorInput?.value, DEFAULT_UI_PREFS.customPanelColor),
    panelStyle: panelStyleSelect?.value || DEFAULT_UI_PREFS.panelStyle,
    panelRadius: Math.max(6, Math.min(28, Number(panelRadiusInput?.value) || DEFAULT_UI_PREFS.panelRadius)),
    panelOpacity: Math.max(55, Math.min(100, Number(panelOpacityInput?.value) || DEFAULT_UI_PREFS.panelOpacity)),
    backgroundIntensity: Math.max(20, Math.min(140, Number(backgroundIntensityInput?.value) || DEFAULT_UI_PREFS.backgroundIntensity)),
    pageThemes: {
      main: mainPageThemeSelect?.value || 'inherit',
      customize: customizePageThemeSelect?.value || 'inherit',
      launcher: launcherPageThemeSelect?.value || 'inherit'
    },
    accountLayout: accountLayoutSelect?.value || DEFAULT_UI_PREFS.accountLayout,
    density: densitySelect?.value || DEFAULT_UI_PREFS.density,
    fontFamily: fontSelect?.value || DEFAULT_UI_PREFS.fontFamily,
    textScale: Number(textScaleInput?.value) || 100,
    pauseHotkey: (pauseHotkeySelect?.value || 'F8').replace(/\s*\+\s*/g, '+').trim(),
    pauseOffLabel: pauseOffLabelInput?.value.trim() || DEFAULT_UI_PREFS.pauseOffLabel,
    pauseOnLabel: pauseOnLabelInput?.value.trim() || DEFAULT_UI_PREFS.pauseOnLabel,
    labels: {
      addAccount: labelAddAccountInput?.value.trim() || DEFAULT_LABELS.addAccount,
      customize: labelCustomizeInput?.value.trim() || DEFAULT_LABELS.customize,
      antiAfk: labelAntiAfkInput?.value.trim() || DEFAULT_LABELS.antiAfk,
      checkCookies: labelCheckCookiesInput?.value.trim() || DEFAULT_LABELS.checkCookies,
      launchSelected: labelLaunchSelectedInput?.value.trim() || DEFAULT_LABELS.launchSelected,
      joinTarget: labelJoinTargetInput?.value.trim() || DEFAULT_LABELS.joinTarget,
      fpsCap: labelFpsCapInput?.value.trim() || DEFAULT_LABELS.fpsCap,
      graphics: (labelGraphicsInput?.value.trim() || 'Graphics quality').replace(/\s+/g, '\n'),
      fastFlags: labelFastFlagsInput?.value.trim() || DEFAULT_LABELS.fastFlags,
      apply: labelApplyInput?.value.trim() || DEFAULT_LABELS.apply,
      checkSelectedStatus: labelCheckSelectedStatusInput?.value.trim() || DEFAULT_LABELS.checkSelectedStatus,
      freeze: labelFreezeInput?.value.trim() || DEFAULT_LABELS.freeze,
      unfreeze: labelUnfreezeInput?.value.trim() || DEFAULT_LABELS.unfreeze,
      forceQuit: labelForceQuitInput?.value.trim() || DEFAULT_LABELS.forceQuit
    }
  });
  localStorage.setItem('sealUiPrefs', JSON.stringify(uiPrefs));
  applyUiPrefs();
  window.api.setPauseHotkey?.(uiPrefs.pauseHotkey).then((state) => {
    pauseHotkeyLabel = state?.accelerator || uiPrefs.pauseHotkey;
    if (pauseHotkeySelect) pauseHotkeySelect.value = displayHotkey(pauseHotkeyLabel);
    updatePauseUI(isPaused);
  }).catch((err) => sealAlert('Hotkey failed: ' + err.message));
}

const launcherSettingsSection = document.querySelector('.launcher-settings-section');
if (launcherSettingsSection && launcherSectionsHost) {
  launcherSettingsSection.classList.add('launcher-page-card', 'launcher-client-card');
  launcherSectionsHost.prepend(launcherSettingsSection);
}

let previewHistory = [];
let activeCustomizeTab = 'appearance';

function setCustomizeTab(tab = 'appearance') {
  const next = ['appearance', 'advanced', 'labels'].includes(tab) ? tab : 'appearance';
  activeCustomizeTab = next;
  if (customizeModal) customizeModal.dataset.customizeTab = next;
  customizeAppearanceTabBtn?.classList.toggle('active', next === 'appearance');
  customizeAdvancedTabBtn?.classList.toggle('active', next === 'advanced');
  customizeLabelsTabBtn?.classList.toggle('active', next === 'labels');
  if (settingsWindowTitle) {
    settingsWindowTitle.textContent = next === 'labels'
      ? 'Button names'
      : (next === 'advanced' ? 'Advanced appearance' : 'Customize Seal');
  }
  if (settingsWindowSubtitle) {
    settingsWindowSubtitle.textContent = next === 'labels'
      ? 'Rename the controls you use most without mixing them into visual settings.'
      : (next === 'advanced'
        ? 'Fine-tune colors, panels, brightness, and individual page themes.'
        : 'Start with a complete look, then change only what matters to you.');
  }
  customizeModal?.querySelector('.settings-sections')?.scrollTo({ top: 0, behavior: 'instant' });
}

function openCustomize() {
  if (customizeModal?.hidden) previewHistory = [];
  document.body.dataset.settingsPage = 'customize';
  applyPageTheme('customize');
  customizeModal.hidden = false;
  setCustomizeTab(activeCustomizeTab);
  if (undoPreviewBtn) undoPreviewBtn.disabled = previewHistory.length === 0;
  customizeModal.querySelector('.settings-sections')?.scrollTo({ top: 0, behavior: 'instant' });
}

customizeAppearanceTabBtn?.addEventListener('click', () => setCustomizeTab('appearance'));
customizeAdvancedTabBtn?.addEventListener('click', () => setCustomizeTab('advanced'));
customizeLabelsTabBtn?.addEventListener('click', () => setCustomizeTab('labels'));
function closeCustomize() {
  customizeModal.hidden = true;
  delete document.body.dataset.settingsPage;
  try { uiPrefs = mergedPrefs(JSON.parse(localStorage.getItem('sealUiPrefs') || '{}')); }
  catch { uiPrefs = mergedPrefs(); }
  previewHistory = [];
  applyUiPrefs();
  setPrimaryNav(mainMenuNavBtn);
}

const DEFAULT_PERFORMANCE_GUIDED = Object.freeze({
  meshDetail: 'default', textureQuality: 'default', msaa: 'default', grassDistance: 'default',
  grassMotion: 'default', dpiScaling: 'default', fullscreen: 'default', renderer: 'automatic', sky: 'game'
});
let performancePresets = [];
let activeLauncherTab = 'settings';
let editingPerformancePresetId = '';
let presetAdditionalFlags = {};

function performancePresetById(id) {
  return performancePresets.find(preset => preset.id === id) || null;
}

function populatePerformanceSelect(select, selectedValue = 'off', includeManage = false) {
  if (!select) return;
  select.replaceChildren();
  const builtIns = [['max', 'Max FPS+'], ['balanced', 'Boost'], ['off', 'Off']];
  for (const [value, label] of builtIns) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  if (performancePresets.length) {
    const group = document.createElement('optgroup');
    group.label = 'Your presets';
    for (const preset of performancePresets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      group.appendChild(option);
    }
    select.appendChild(group);
  }
  if (includeManage) {
    const manage = document.createElement('option');
    manage.value = '__manage_presets__';
    manage.textContent = 'Manage presets…';
    select.appendChild(manage);
  }
  const available = [...select.querySelectorAll('option')].some(option => option.value === selectedValue);
  if (!available && /^custom:/i.test(String(selectedValue || ''))) {
    const missing = document.createElement('option');
    missing.value = selectedValue;
    missing.textContent = 'Missing custom preset';
    select.insertBefore(missing, includeManage ? select.lastElementChild : null);
  }
  select.value = available || /^custom:/i.test(String(selectedValue || '')) ? selectedValue : 'off';
}

function performancePresetSummary(preset) {
  const guided = { ...DEFAULT_PERFORMANCE_GUIDED, ...(preset?.guided || {}) };
  const parts = [];
  if (guided.meshDetail !== 'default') parts.push(`${guided.meshDetail} geometry`);
  if (guided.textureQuality !== 'default') parts.push(`texture ${guided.textureQuality}`);
  if (guided.msaa !== 'default') parts.push(`${guided.msaa}× MSAA`);
  if (guided.grassDistance !== 'default') parts.push(guided.grassDistance === 'off' ? 'grass off' : `${guided.grassDistance}-stud grass`);
  if (guided.renderer !== 'automatic') parts.push(guided.renderer.toUpperCase());
  if (guided.sky === 'gray') parts.push('gray sky');
  const additional = Object.keys(preset?.additionalFlags || {}).length;
  if (additional) parts.push(`${additional} imported flag${additional === 1 ? '' : 's'}`);
  return parts.length ? parts.slice(0, 4).join(' · ') : 'Roblox defaults';
}

function renderPerformancePresetList() {
  if (!performancePresetList || !performancePresetEmpty) return;
  performancePresetList.replaceChildren();
  performancePresetEmpty.hidden = performancePresets.length > 0;
  for (const preset of performancePresets) {
    const card = document.createElement('article');
    card.className = 'performance-preset-card';
    const copy = document.createElement('div');
    copy.className = 'performance-preset-card-copy';
    const title = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = preset.name;
    const assignedCount = accounts.filter(account => account.fastFlagPreset === preset.id).length;
    const assigned = document.createElement('b');
    assigned.textContent = `${assignedCount} ASSIGNED`;
    title.append(name, assigned);
    const summary = document.createElement('small');
    summary.textContent = performancePresetSummary(preset);
    if (preset.warnings?.length) summary.textContent += ' · Some imported flags excluded';
    copy.append(title, summary);

    const actions = document.createElement('div');
    actions.className = 'performance-preset-card-actions';
    const edit = document.createElement('button');
    edit.className = 'btn btn-quiet';
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => openPerformancePresetEditor(preset));
    const exportButton = document.createElement('button');
    exportButton.className = 'btn btn-quiet';
    exportButton.type = 'button';
    exportButton.textContent = 'Export';
    exportButton.addEventListener('click', async () => {
      try {
        const result = await window.api.exportPerformancePreset(preset.id);
        if (!result?.canceled) showToast(`Exported ${preset.name}.`, 'success');
      } catch (error) {
        showToast(`Could not export preset: ${error.message}`, 'error');
      }
    });
    const remove = document.createElement('button');
    remove.className = 'btn btn-danger-subtle';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', async () => {
      const warning = assignedCount
        ? `Remove “${preset.name}”? ${assignedCount} assigned account${assignedCount === 1 ? '' : 's'} will return to Off.`
        : `Remove “${preset.name}”?`;
      if (!await sealConfirm(warning)) return;
      try {
        const result = await window.api.removePerformancePreset(preset.id);
        performancePresets = result.presets || [];
        accounts = await window.api.listAccounts();
        renderPerformancePresetList();
        populatePerformanceSelect(bulkPerformanceSelect, 'off');
        render();
        showToast(`${preset.name} removed${result.resetAccounts ? ` · ${result.resetAccounts} account${result.resetAccounts === 1 ? '' : 's'} reset` : ''}.`, 'success');
      } catch (error) {
        showToast(`Could not remove preset: ${error.message}`, 'error');
      }
    });
    actions.append(edit, exportButton, remove);
    card.append(copy, actions);
    performancePresetList.appendChild(card);
  }
}

async function loadPerformancePresets() {
  performancePresets = await window.api.listPerformancePresets?.() || [];
  renderPerformancePresetList();
  const bulkSelected = bulkPerformanceSelect?.value || 'off';
  populatePerformanceSelect(bulkPerformanceSelect, bulkSelected, false);
  return performancePresets;
}

function setLauncherTab(tab = 'settings') {
  activeLauncherTab = tab === 'presets' ? 'presets' : 'settings';
  const presetsActive = activeLauncherTab === 'presets';
  launcherSettingsTabBtn?.classList.toggle('active', !presetsActive);
  launcherPresetsTabBtn?.classList.toggle('active', presetsActive);
  if (launcherSettingsPanel) launcherSettingsPanel.hidden = presetsActive;
  if (launcherPresetsPanel) launcherPresetsPanel.hidden = !presetsActive;
  if (launcherSaveBtn) launcherSaveBtn.hidden = presetsActive;
  if (launcherFooterText) launcherFooterText.textContent = presetsActive
    ? 'Preset changes save from the editor and apply the next time an account launches.'
    : 'Launcher settings are separate from appearance.';
  if (presetsActive) {
    loadPerformancePresets().then(renderPerformancePresetList).catch(error => showToast(`Could not load presets: ${error.message}`, 'error'));
  }
}

function setPresetGuidedValues(values = {}) {
  const guided = { ...DEFAULT_PERFORMANCE_GUIDED, ...values };
  if (presetMeshDetailSelect) presetMeshDetailSelect.value = guided.meshDetail;
  if (presetTextureQualitySelect) presetTextureQualitySelect.value = guided.textureQuality;
  if (presetMsaaSelect) presetMsaaSelect.value = guided.msaa;
  if (presetGrassDistanceSelect) presetGrassDistanceSelect.value = guided.grassDistance;
  if (presetGrassMotionSelect) presetGrassMotionSelect.value = guided.grassMotion;
  if (presetDpiScalingSelect) presetDpiScalingSelect.value = guided.dpiScaling;
  if (presetFullscreenSelect) presetFullscreenSelect.value = guided.fullscreen;
  if (presetRendererSelect) presetRendererSelect.value = guided.renderer;
  if (presetSkySelect) presetSkySelect.value = guided.sky;
}

function currentPresetGuidedValues() {
  return {
    meshDetail: presetMeshDetailSelect?.value || 'default',
    textureQuality: presetTextureQualitySelect?.value || 'default',
    msaa: presetMsaaSelect?.value || 'default',
    grassDistance: presetGrassDistanceSelect?.value || 'default',
    grassMotion: presetGrassMotionSelect?.value || 'default',
    dpiScaling: presetDpiScalingSelect?.value || 'default',
    fullscreen: presetFullscreenSelect?.value || 'default',
    renderer: presetRendererSelect?.value || 'automatic',
    sky: presetSkySelect?.value || 'game'
  };
}

function setPresetEditorMode(mode = 'guided') {
  const importing = mode === 'import';
  presetGuidedModeBtn?.classList.toggle('active', !importing);
  presetImportModeBtn?.classList.toggle('active', importing);
  if (presetGuidedPanel) presetGuidedPanel.hidden = importing;
  if (presetImportPanel) presetImportPanel.hidden = !importing;
}

function closePerformancePresetEditor() {
  if (performancePresetEditor) performancePresetEditor.hidden = true;
  editingPerformancePresetId = '';
  presetAdditionalFlags = {};
  if (presetEditorStatus) presetEditorStatus.textContent = '';
}

function openPerformancePresetEditor(preset = null) {
  editingPerformancePresetId = preset?.id || '';
  presetAdditionalFlags = { ...(preset?.additionalFlags || {}) };
  if (presetNameInput) presetNameInput.value = preset?.name || '';
  setPresetGuidedValues(preset?.guided || DEFAULT_PERFORMANCE_GUIDED);
  if (presetJsonInput) presetJsonInput.value = Object.keys(presetAdditionalFlags).length ? JSON.stringify(presetAdditionalFlags, null, 2) : '';
  if (presetImportSummary) {
    presetImportSummary.className = 'preset-import-summary';
    presetImportSummary.textContent = Object.keys(presetAdditionalFlags).length
      ? `${Object.keys(presetAdditionalFlags).length} additional imported flag${Object.keys(presetAdditionalFlags).length === 1 ? '' : 's'} saved in this preset.`
      : 'No JSON analyzed yet.';
  }
  if (presetAdditionalFlagsDetails) presetAdditionalFlagsDetails.hidden = Object.keys(presetAdditionalFlags).length === 0;
  if (presetAdditionalFlagsPreview) presetAdditionalFlagsPreview.textContent = JSON.stringify(presetAdditionalFlags, null, 2);
  if (presetEditorKicker) presetEditorKicker.textContent = preset ? 'EDIT PRESET' : 'NEW PRESET';
  if (presetEditorTitle) presetEditorTitle.textContent = preset ? `Edit ${preset.name}` : 'Create a performance preset';
  if (presetSaveBtn) presetSaveBtn.textContent = preset ? 'Save preset' : 'Create preset';
  if (presetEditorStatus) presetEditorStatus.textContent = (preset?.warnings || []).join('\n');
  setPresetEditorMode('guided');
  if (performancePresetEditor) performancePresetEditor.hidden = false;
  window.setTimeout(() => {
    performancePresetEditor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    presetNameInput?.focus();
  }, 0);
}

async function analyzePerformancePresetJson(text, suggestedName = '') {
  if (!String(text || '').trim()) throw new Error('Paste JSON or choose a JSON file first.');
  const analysis = await window.api.analyzePerformancePresetImport(text);
  setPresetGuidedValues(analysis.guided || DEFAULT_PERFORMANCE_GUIDED);
  presetAdditionalFlags = { ...(analysis.additionalFlags || {}) };
  if (presetNameInput && !presetNameInput.value.trim() && suggestedName) presetNameInput.value = suggestedName;
  if (presetAdditionalFlagsPreview) presetAdditionalFlagsPreview.textContent = JSON.stringify(presetAdditionalFlags, null, 2);
  if (presetAdditionalFlagsDetails) presetAdditionalFlagsDetails.hidden = Object.keys(presetAdditionalFlags).length === 0;
  const warningLines = analysis.warnings || [];
  if (presetImportSummary) {
    presetImportSummary.className = `preset-import-summary ${warningLines.length ? 'warning' : 'success'}`;
    presetImportSummary.textContent = [
      `${analysis.importedCount || 0} valid flag${analysis.importedCount === 1 ? '' : 's'} found.`,
      `${analysis.recognizedCount || 0} mapped into explained Guided settings.`,
      `${Object.keys(presetAdditionalFlags).length} kept under Additional imported flags.`,
      ...warningLines.map(line => `⚠ ${line}`)
    ].join('\n');
  }
  if (presetEditorStatus) presetEditorStatus.textContent = warningLines.length
    ? 'Import analyzed with warnings. Review the summary before creating the preset.'
    : 'Import analyzed successfully. You can review Guided settings or create the preset.';
  return analysis;
}

async function openLauncher(tab = 'settings') {
  document.body.dataset.settingsPage = 'launcher';
  applyPageTheme('launcher');
  if (launcherModal) launcherModal.hidden = false;
  setLauncherTab(tab);
  launcherModal?.querySelector('.launcher-page-sections')?.scrollTo({ top: 0, behavior: 'instant' });
  if (tab !== 'presets') {
    refreshJoinConnectionStatus();
    await loadIntegrationSettings().catch(err => showToast(`Could not load integrations: ${err.message}`, 'error'));
    await syncSessionSleepState().catch(() => {});
  }
}

function closeLauncher() {
  if (launcherModal) launcherModal.hidden = true;
  closePerformancePresetEditor();
  delete document.body.dataset.settingsPage;
  applyPageTheme('main');
  setPrimaryNav(mainMenuNavBtn);
}

let activeTimeTab = 'accounts';
let playtimeStats = null;
let playtimeLoading = false;
let timeAutoRefresh = null;
const expandedTimeAccounts = new Set();
const expandedTimeExperiences = new Set();
const trackedGameLibrary = window.SealGameLibrary.createGameLibrary(localStorage);
for (const [id,value] of [['timeGameSort',trackedGameLibrary.getState().sort],['timeGameFilter',trackedGameLibrary.getState().filter]]) {
  const field=document.getElementById(id);if(field)field.value=value;
}

function formatPlaytime(milliseconds) {
  if (!(Number(milliseconds) > 0)) return '0s';
  const totalMinutes = Math.max(0, Math.floor((Number(milliseconds) || 0) / 60000));
  if (totalMinutes <= 0) return '0m';
  const years = Math.floor(totalMinutes / 525600);
  const days = Math.floor((totalMinutes % 525600) / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (years) return `${years}y ${days}d`;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function timeInputValue(input, maximum) {
  const value = Math.floor(Number(input?.value) || 0);
  return Math.max(0, Math.min(maximum, value));
}

function selectedTimeRange() {
  const preset = timeRangePreset?.value || 'all';
  const now = Date.now();
  if (preset === 'all') return { from: 0, to: now, label: 'All time' };
  const presetHours = { hour: 1, day: 24, week: 24 * 7, month: 24 * 30, twoMonths: 24 * 60, threeMonths: 24 * 90 };
  if (presetHours[preset]) {
    const label = timeRangePreset?.selectedOptions?.[0]?.textContent || 'Selected range';
    return { from: now - presetHours[preset] * 60 * 60 * 1000, to: now, label };
  }

  const months = timeInputValue(timeMonthsInput, 120);
  const weeks = timeInputValue(timeWeeksInput, 520);
  const days = timeInputValue(timeDaysInput, 3650);
  const hours = timeInputValue(timeHoursInput, 87600);
  const fromDate = new Date(now);
  if (months) fromDate.setMonth(fromDate.getMonth() - months);
  const from = Math.max(0, fromDate.getTime() - (((weeks * 7 + days) * 24 + hours) * 60 * 60 * 1000));
  const parts = [];
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (weeks) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`);
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  return { from, to: now, label: parts.length ? `Last ${parts.join(', ')}` : 'Right now' };
}

function createTimeVisual(url, fallback, className = '') {
  const visual = document.createElement('span');
  visual.className = `time-rank-visual ${className}`.trim();
  const fallbackText = document.createElement('b');
  fallbackText.textContent = String(fallback || 'S').slice(0, 1).toUpperCase();
  visual.appendChild(fallbackText);
  const source = className === 'experience' ? String(url || '').trim() : currentAvatarUrl(url);
  if (source) {
    const image = document.createElement('img');
    image.src = source;
    image.alt = '';
    image.addEventListener('error', () => image.remove());
    visual.appendChild(image);
  }
  return visual;
}

function createTimeEmpty(title, message) {
  const empty = document.createElement('div');
  empty.className = 'time-empty-state';
  const mark = document.createElement('span');
  mark.textContent = '◷';
  const copy = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const detail = document.createElement('small');
  detail.textContent = message;
  copy.append(heading, detail);
  empty.append(mark, copy);
  return empty;
}

const timeGameAvailabilityLabels = new Map([
  ['private', 'Private'], ['archived', 'Archived'],
  ['removed', 'Unavailable'], ['unapproved', 'Unavailable'], ['review', 'Unavailable'],
  ['unpublished', 'Unavailable'], ['temporary', 'Unavailable'], ['unavailable', 'Unavailable']
]);

function createTimeSubrow(item, kind) {
  const row = document.createElement('div');
  row.className = 'time-subrow';
  row.appendChild(createTimeVisual(
    kind === 'account' ? item.avatarUrl : item.iconUrl,
    kind === 'account' ? item.username : item.name,
    kind
  ));
  const copy = document.createElement('span');
  copy.className = 'time-subrow-copy';
  const name = document.createElement('strong');
  name.textContent = kind === 'account' ? item.username : item.name;
  const label = document.createElement('small');
  label.textContent = item.earnedBadgeCount
    ? `${item.earnedBadgeCount} earned badge${item.earnedBadgeCount===1?'':'s'}${item.totalMs ? '' : ' · No recorded time'}`
    : kind === 'account' ? 'Account contribution' : 'Tracked game';
  const availability = kind === 'experience' && timeGameAvailabilityLabels.get(item.gameAvailability);
  if (availability) label.textContent += ' · ' + availability;
  copy.append(name, label);
  const duration = document.createElement('b');
  duration.textContent = formatPlaytime(item.totalMs);
  row.append(copy, duration);
  return row;
}

function createTimeRankCard(item, index, kind) {
  const key = String(item.key || `${kind}-${index}`);
  const expandedSet = kind === 'account' ? expandedTimeAccounts : expandedTimeExperiences;
  const children = kind === 'account' ? item.experiences : item.accounts;
  const card = document.createElement('article');
  card.className = 'time-rank-card';
  if(kind==='experience'){
    card.dataset.gameKey=key;
    card.classList.toggle('game-pinned',trackedGameLibrary.has(item,'pins'));
  }

  const summary = document.createElement('button');
  summary.className = 'time-rank-summary';
  summary.type = 'button';
  summary.setAttribute('aria-expanded', expandedSet.has(key) ? 'true' : 'false');
  const rank = document.createElement('span');
  rank.className = 'time-rank-number';
  rank.textContent = String(index + 1).padStart(2, '0');
  const title = kind === 'account' ? item.username : item.name;
  summary.appendChild(rank);
  summary.appendChild(createTimeVisual(kind === 'account' ? item.avatarUrl : item.iconUrl, title, kind));
  const copy = document.createElement('span');
  copy.className = 'time-rank-copy';
  const heading = document.createElement('strong');
  heading.textContent = title;
  const meta = document.createElement('small');
  meta.textContent = kind === 'account'
    ? `${item.experiences.length} tracked game${item.experiences.length === 1 ? '' : 's'}`
    : `${item.accounts.length} contributing account${item.accounts.length === 1 ? '' : 's'}`;
  if (kind === 'experience') meta.textContent = `${item.accounts.length} account${item.accounts.length===1?'':'s'} · ${item.earnedBadgeCount||0} owned badge${item.earnedBadgeCount===1?'':'s'}${trackedGameLibrary.has(item,'pins')?' · Pinned':''}`;
  const availability = kind === 'experience' && timeGameAvailabilityLabels.get(item.gameAvailability);
  if (availability) meta.textContent += ' · ' + availability;
  copy.append(heading, meta);
  if(kind==='experience'){
    const first=document.createElement('time');first.className='time-game-age';
    if(Number.isFinite(Date.parse(item.firstPlayedAt || ''))){first.dateTime=item.firstPlayedAt;first.textContent=(item.firstPlayedSource==='badge'?'First played (badge estimate) ':'First played (SAM record) ')+new Date(item.firstPlayedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});first.title=item.firstPlayedSource==='badge'?'Earliest badge earned across your saved accounts. You had played by this date; your actual first visit may be earlier.':'Earliest game session recorded by SAM across your accounts; earlier visits may be unrecorded.';}
    else{first.textContent='First played unknown';first.title='No recorded session or badge award date is available yet. Badge dates load in the background.';}
    copy.append(first);
  }
  const duration = document.createElement('b');
  duration.className = 'time-rank-duration';
  duration.textContent = formatPlaytime(item.totalMs);
  const chevron = document.createElement('span');
  chevron.className = 'time-rank-chevron';
  chevron.textContent = '⌄';
  summary.append(copy, duration, chevron);

  const details = document.createElement('div');
  details.className = 'time-rank-details';
  details.hidden = !expandedSet.has(key);
  let populated = false;
  function populateDetails() {
    if (populated) return;
    populated = true;
    if (children.length) {
      const rows=document.createElement('div');rows.className='time-child-rows';details.appendChild(rows);
      const more=document.createElement('button');more.className='btn btn-quiet';let shown=0;
      function appendPage(){
        for(const child of children.slice(shown,shown+50)){
          rows.appendChild(createTimeSubrow(child, kind === 'account' ? 'experience' : 'account'));
          if(child.earnedBadgeCount)rows.appendChild(createSealEarnedBadges(kind==='account'?child:{...item,earnedBadgeCount:child.earnedBadgeCount},kind==='account'?item.accountId:child.accountId));
          if(kind==='account'&&(child.universeId||child.placeId))rows.appendChild(createSealBadges(child,item.accountId));
        }
        shown=Math.min(children.length,shown+50);more.hidden=shown>=children.length;more.textContent='Show more ('+shown+'/'+children.length+')';
      }
      more.onclick=appendPage;appendPage();details.appendChild(more);
    } else {
      details.appendChild(createTimeEmpty(kind==='account'?'No tracked games':'No contributing accounts',kind==='account'?'This account’s Home, loading, and unidentified time still counts in its Roblox total.':'No account time was recorded for this game in the selected range.'));
    }
    if(kind==='experience'&&(item.universeId||item.placeId))details.appendChild(createSealBadges(item));
  }
  if(!details.hidden)populateDetails();
  summary.addEventListener('click', () => {
    if (expandedSet.has(key)) expandedSet.delete(key);
    else expandedSet.add(key);
    details.hidden = !expandedSet.has(key);
    if (!details.hidden) populateDetails();
    summary.setAttribute('aria-expanded', expandedSet.has(key) ? 'true' : 'false');
  });
  if(kind==='experience'){
    const row=document.createElement('div');row.className='time-game-row';
    const actions=document.createElement('div');actions.className='time-game-actions';
    for(const [type,label,icon] of [['favorites','Favorite','<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>'],['pins','Pin','<path d="M12 17v5M5 17h14l-3-7V4h1V2H7v2h1v6Z"/>']]){
      const button=document.createElement('button'),pressed=trackedGameLibrary.has(item,type);button.type='button';button.className='time-game-action';button.dataset.action=type;button.setAttribute('aria-pressed',String(pressed));button.title=pressed?(type==='pins'?'Unpin game':'Remove favorite'):(label+' game');button.setAttribute('aria-label',button.title+' '+title);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icon+'</svg>';
      button.addEventListener('click',()=>{try{trackedGameLibrary.toggle(item,type);renderTimeStats();}catch(error){showToast('Could not save game preference: '+error.message,'error');}});actions.append(button);
    }
    const validId = value => /^[1-9]\d{0,18}$/.test(String(value || ''));
    const placeId = [item.placeId, item.sourcePlaceId].find(validId);
    const gameId = placeId || (validId(item.universeId) ? item.universeId : '');
    if (gameId) {
      const idType = placeId ? 'Place ID' : 'Universe ID';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-game-action';
      button.dataset.action = 'copy-id';
      button.title = `Copy game ID (${idType})`;
      button.setAttribute('aria-label', `${button.title} for ${title}`);
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
      button.addEventListener('click', async () => {
        try {
          await window.api.copyText(String(gameId));
          showToast(`${idType} copied.`, 'success', 2000);
        } catch (error) {
          showToast(`Could not copy game ID: ${error.message}`, 'error');
        }
      });
      actions.append(button);
    }
    row.append(summary,actions);card.append(row,details);
  }else card.append(summary, details);
  return card;
}

let visibleTimeGames = 50;
function renderTimeStats() {
  if (!timeAccountsList || !timeExperiencesList) return;
  timeAccountsList.innerHTML = '';
  timeExperiencesList.innerHTML = '';
  const stats = playtimeStats || { totalMs: 0, accounts: [], experiences: [] };
  if (timeGrandTotal) timeGrandTotal.textContent = formatPlaytime(stats.totalMs);
  if (timeGrandSubtitle) {
    timeGrandSubtitle.textContent = stats.accounts.some(account => account.unassigned)
      ? 'Includes time from unlinked Roblox windows'
      : stats.accountCount
      ? `Across ${stats.accountCount} account${stats.accountCount === 1 ? '' : 's'}`
      : 'Across accounts tracked by SAM';
  }

  if (stats.accounts.length) {
    stats.accounts.forEach((account, index) => timeAccountsList.appendChild(createTimeRankCard(account, index, 'account')));
  } else {
    timeAccountsList.appendChild(createTimeEmpty('No Roblox time yet', 'Open Roblox while SAM is running. You can close SAM to the tray.'));
  }
  if (stats.experiences.length) {
    const query=String(document.getElementById('timeGameSearch')?.value||'').trim().toLowerCase();
    const games=trackedGameLibrary.games(stats.experiences,query);
    games.slice(0,visibleTimeGames).forEach((experience,index)=>timeExperiencesList.appendChild(createTimeRankCard(experience,index,'experience')));
    if(!games.length)timeExperiencesList.appendChild(createTimeEmpty('No matching games','Try another name or choose All games.'));
    if(games.length>visibleTimeGames){const more=document.createElement('button');more.id='timeMoreGames';more.className='btn btn-quiet';more.textContent='Show more games ('+visibleTimeGames+'/'+games.length+')';more.onclick=()=>{visibleTimeGames+=50;renderTimeStats();};timeExperiencesList.appendChild(more);}
  } else {
    timeExperiencesList.appendChild(createTimeEmpty('No tracked games yet', 'Roblox time is still counted while accounts are on Home, loading, or in an unidentified game.'));
  }
}

async function loadTimeStats(options = {}) {
  if (playtimeLoading || !window.api.getPlaytimeStats) return;
  playtimeLoading = true;
  if (timeRefreshBtn) { timeRefreshBtn.disabled = true; timeRefreshBtn.textContent = 'Refreshing…'; }
  const range = selectedTimeRange();
  if (timeRangeLabel) timeRangeLabel.textContent = range.label;
  try {
    playtimeStats = await window.api.getPlaytimeStats({ from: range.from, to: range.to, refreshMetadata: options?.refreshMetadata === true });
    renderBadgeSyncStatus(playtimeStats.badgeSync);
    renderGameMetadataStatus(playtimeStats.gameMetadata);
    renderBadgeDatesStatus(playtimeStats.badgeDates);
    renderTimeStats();
  } catch (err) {
    if (!playtimeStats) {
      timeAccountsList?.replaceChildren(createTimeEmpty('Time could not load', err.message || 'Try again in a moment.'));
      timeExperiencesList?.replaceChildren(createTimeEmpty('Time could not load', err.message || 'Try again in a moment.'));
    }
    showToast(`Could not load Time: ${err.message}`, 'error', 6000);
  } finally {
    playtimeLoading = false;
    if (timeRefreshBtn) { timeRefreshBtn.disabled = false; timeRefreshBtn.textContent = 'Refresh'; }
  }
}

let timeMetadataRefreshTimer=null;
let timeBadgeDatesRefreshTimer=null;
function renderBadgeDatesStatus(status){
  const label=document.getElementById('timeBadgeDatesStatus');if(!label||!status)return;
  label.hidden=!status.total;
  label.textContent=`${status.known}/${status.total} badge award dates saved`+(status.pending?` · ${status.pending} queued`:'')+(status.unavailable?` · ${status.unavailable} unavailable from Roblox`:'')+(status.message?' · '+status.message:status.failed?.length?' · '+status.failed[0].error:'')+'.';
}
window.api.onBadgeDates?.(status=>{
  renderBadgeDatesStatus(status);
  if(!timeModal||timeModal.hidden)return;
  if(!timeBadgeDatesRefreshTimer)timeBadgeDatesRefreshTimer=setTimeout(()=>{timeBadgeDatesRefreshTimer=null;if(!timeModal.hidden)loadTimeStats();},750);
});
function renderGameMetadataStatus(status){const label=document.getElementById('timeMetadataStatus');if(label){label.hidden=!status?.busy&&!status?.pending;label.textContent=status?.retryAt>Date.now()?'Roblox is limiting game lookups. Retrying shortly…':status?.busy?`Loading game names and icons… ${status.pending} remaining`:'';}}
window.api.onGameMetadata?.(status=>{
  scheduleJoinNotificationRefresh();
  renderGameMetadataStatus(status);
  if(!timeModal||timeModal.hidden)return;
  if(!status.busy){clearTimeout(timeMetadataRefreshTimer);timeMetadataRefreshTimer=null;loadTimeStats();}
  else if(!timeMetadataRefreshTimer)timeMetadataRefreshTimer=setTimeout(()=>{timeMetadataRefreshTimer=null;if(!timeModal.hidden)loadTimeStats();},250);
});

let lastBadgeSyncSequence = 0;
function renderBadgeSyncStatus(status) {
  const text=document.getElementById('timeBadgeStatus'),button=document.getElementById('timeSyncBadgesBtn');
  if (!status || status.sequence < lastBadgeSyncSequence) return;
  lastBadgeSyncSequence = status.sequence ?? lastBadgeSyncSequence;
  if(button){button.disabled=status.busy;button.textContent=status.busy?'Syncing badges…':'Sync badges';}
  if(!text)return;
  const saved = `${status.badgeCount.toLocaleString()} owned badges saved.`;
  let activity = '';
  if (status.busy) activity = status.completed < status.accountCount
    ? ` Loading badges for ${status.completed}/${status.accountCount} accounts.`
    : ' Checking for new badges…';
  else if (status.checking) activity = ' Checking older badges for removals in the background.';
  const failure = status.failed?.length ? ` ${status.failed.length} account(s) could not sync. ${status.failed[0].error}` : '';
  text.textContent = saved + (status.message ? ' ' + status.message : activity) + failure;
}
document.getElementById('timeGameSearch')?.addEventListener('input',()=>{visibleTimeGames=50;renderTimeStats();});
for(const [id,setting] of [['timeGameSort','sort'],['timeGameFilter','filter']])document.getElementById(id)?.addEventListener('change',event=>{
  try{trackedGameLibrary.setView({[setting]:event.target.value});visibleTimeGames=50;renderTimeStats();}
  catch(error){event.target.value=trackedGameLibrary.getState()[setting];showToast('Could not save game preference: '+error.message,'error');}
});
let timeBadgeRefreshTimer=null;
window.api.onBadgeSync?.(status=>{
  if (status.sequence < lastBadgeSyncSequence) return;
  renderBadgeSyncStatus(status);
  if (!timeModal || timeModal.hidden || playtimeStats?.badgeSync?.revision === status.revision || timeBadgeRefreshTimer) return;
  timeBadgeRefreshTimer = setTimeout(() => {
    timeBadgeRefreshTimer = null;
    if (!timeModal.hidden) loadTimeStats();
  }, 800);
});
document.getElementById('timeSyncBadgesBtn')?.addEventListener('click',async()=>{
  try{renderBadgeSyncStatus(await window.api.syncEarnedBadges());}
  catch(error){showToast(`Could not sync badges: ${error.message}`,'error');}
});

function setTimeTab(tab = 'accounts') {
  activeTimeTab = tab === 'experiences' ? 'experiences' : 'accounts';
  timeAccountsTabBtn?.classList.toggle('active', activeTimeTab === 'accounts');
  timeExperiencesTabBtn?.classList.toggle('active', activeTimeTab === 'experiences');
  if (timeAccountsPanel) timeAccountsPanel.hidden = activeTimeTab !== 'accounts';
  if (timeExperiencesPanel) timeExperiencesPanel.hidden = activeTimeTab !== 'experiences';
}

function openTime() {
  document.body.dataset.settingsPage = 'time';
  applyPageTheme('main');
  if (timeModal) timeModal.hidden = false;
  setTimeTab(activeTimeTab);
  loadTimeStats();
  if (timeAutoRefresh) clearInterval(timeAutoRefresh);
  timeAutoRefresh = setInterval(() => {
    if (!timeModal?.hidden && !document.hidden) loadTimeStats();
  }, 15000);
}

function closeTime() {
  clearTimeout(timeMetadataRefreshTimer);timeMetadataRefreshTimer=null;
  clearTimeout(timeBadgeRefreshTimer);timeBadgeRefreshTimer=null;
  if (timeModal) timeModal.hidden = true;
  if (timeAutoRefresh) clearInterval(timeAutoRefresh);
  timeAutoRefresh = null;
  delete document.body.dataset.settingsPage;
  applyPageTheme('main');
  setPrimaryNav(mainMenuNavBtn);
}

function setPrimaryNav(button) {
  for (const item of [mainMenuNavBtn, customizeBtn, launcherNavBtn, timeNavBtn]) item?.classList.toggle('nav-active', item === button);
}

mainMenuNavBtn?.addEventListener('click', () => {
  closeCustomize();
  closeLauncher();
  closeTime();
  document.querySelector('.dashboard')?.scrollTo({ top: 0, behavior: 'smooth' });
  setPrimaryNav(mainMenuNavBtn);
});
customizeBtn?.addEventListener('click', () => { closeLauncher(); closeTime(); setPrimaryNav(customizeBtn); openCustomize(); });
launcherNavBtn?.addEventListener('click', () => { closeCustomize(); closeTime(); setPrimaryNav(launcherNavBtn); openLauncher(); });
timeNavBtn?.addEventListener('click', () => { closeCustomize(); closeLauncher(); setPrimaryNav(timeNavBtn); openTime(); });
openLauncherSettingsBtn?.addEventListener('click', () => { closeCustomize(); closeTime(); setPrimaryNav(launcherNavBtn); openLauncher(); });
timeAccountsTabBtn?.addEventListener('click', () => setTimeTab('accounts'));
timeExperiencesTabBtn?.addEventListener('click', () => setTimeTab('experiences'));
timeCloseBtn?.addEventListener('click', closeTime);
timeModal?.addEventListener('click', event => { if (event.target === timeModal) closeTime(); });
timeRefreshBtn?.addEventListener('click', () => loadTimeStats({refreshMetadata:true}));
timeRangePreset?.addEventListener('change', () => {
  if (timeCustomRange) timeCustomRange.hidden = timeRangePreset.value !== 'custom';
  if (timeRangePreset.value !== 'custom') loadTimeStats();
  else if (timeRangeLabel) timeRangeLabel.textContent = selectedTimeRange().label;
});
timeApplyRangeBtn?.addEventListener('click', loadTimeStats);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && timeModal && !timeModal.hidden) closeTime();
});
minimizeAppBtn?.addEventListener('click', () => window.api.minimizeWindow?.());
function updateMaximizeButton(state = {}) {
  if (!maximizeAppBtn) return;
  const maximized = !!state.maximized;
  maximizeAppBtn.innerHTML = maximized ? '&#10064;' : '&#9633;';
  maximizeAppBtn.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
  maximizeAppBtn.title = maximized ? 'Restore window' : 'Maximize window';
}
maximizeAppBtn?.addEventListener('click', async () => {
  const state = await window.api.toggleMaximizeWindow?.();
  updateMaximizeButton(state);
});
window.api.onWindowMaximized?.(updateMaximizeButton);
document.querySelector('.app-header')?.addEventListener('dblclick', event => {
  if (!event.target.closest('button')) maximizeAppBtn?.click();
});
closeAppBtn?.addEventListener('click', () => window.api.closeWindow?.());
customizeCloseBtn?.addEventListener('click', closeCustomize);
launcherCloseBtn?.addEventListener('click', closeLauncher);
launcherCancelBtn?.addEventListener('click', closeLauncher);
launcherModal?.addEventListener('click', event => { if (event.target === launcherModal) closeLauncher(); });
launcherSettingsTabBtn?.addEventListener('click', () => setLauncherTab('settings'));
launcherPresetsTabBtn?.addEventListener('click', () => setLauncherTab('presets'));
newPerformancePresetBtn?.addEventListener('click', () => openPerformancePresetEditor());
presetEditorCloseBtn?.addEventListener('click', closePerformancePresetEditor);
presetCancelBtn?.addEventListener('click', closePerformancePresetEditor);
presetGuidedModeBtn?.addEventListener('click', () => setPresetEditorMode('guided'));
presetImportModeBtn?.addEventListener('click', () => setPresetEditorMode('import'));
resetPresetChoicesBtn?.addEventListener('click', () => {
  setPresetGuidedValues(DEFAULT_PERFORMANCE_GUIDED);
  if (presetEditorStatus) presetEditorStatus.textContent = 'Guided choices restored to Roblox defaults. Additional imported flags were left unchanged.';
});
presetImportFileBtn?.addEventListener('click', async () => {
  try {
    const result = await window.api.importPerformancePresetFile();
    if (result?.canceled) return;
    if (presetJsonInput) presetJsonInput.value = result.text || '';
    await analyzePerformancePresetJson(result.text, result.suggestedName);
  } catch (error) {
    if (presetImportSummary) {
      presetImportSummary.className = 'preset-import-summary warning';
      presetImportSummary.textContent = error.message;
    }
  }
});
presetPasteJsonBtn?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (presetJsonInput) presetJsonInput.value = text;
    await analyzePerformancePresetJson(text);
  } catch (error) {
    if (presetImportSummary) {
      presetImportSummary.className = 'preset-import-summary warning';
      presetImportSummary.textContent = `Could not paste JSON: ${error.message}`;
    }
    presetJsonInput?.focus();
  }
});
presetAnalyzeJsonBtn?.addEventListener('click', async () => {
  try { await analyzePerformancePresetJson(presetJsonInput?.value || ''); }
  catch (error) {
    if (presetImportSummary) {
      presetImportSummary.className = 'preset-import-summary warning';
      presetImportSummary.textContent = error.message;
    }
  }
});
for (const eventName of ['dragenter', 'dragover']) {
  presetImportDropzone?.addEventListener(eventName, event => {
    event.preventDefault();
    presetImportDropzone.classList.add('drag-over');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  presetImportDropzone?.addEventListener(eventName, event => {
    event.preventDefault();
    presetImportDropzone.classList.remove('drag-over');
  });
}
presetImportDropzone?.addEventListener('drop', async event => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    if (!/\.json$/i.test(file.name)) throw new Error('Drop a .json file here.');
    const text = await file.text();
    if (presetJsonInput) presetJsonInput.value = text;
    await analyzePerformancePresetJson(text, file.name.replace(/\.json$/i, '').slice(0, 32));
  } catch (error) {
    if (presetImportSummary) {
      presetImportSummary.className = 'preset-import-summary warning';
      presetImportSummary.textContent = error.message;
    }
  }
});
presetSaveBtn?.addEventListener('click', async () => {
  const name = String(presetNameInput?.value || '').trim();
  if (!name) {
    if (presetEditorStatus) presetEditorStatus.textContent = 'Give the preset a name first.';
    presetNameInput?.focus();
    return;
  }
  presetSaveBtn.disabled = true;
  const originalText = presetSaveBtn.textContent;
  presetSaveBtn.textContent = 'Saving…';
  try {
    const result = await window.api.savePerformancePreset({
      id: editingPerformancePresetId || undefined,
      name,
      guided: currentPresetGuidedValues(),
      additionalFlags: presetAdditionalFlags
    });
    performancePresets = result.presets || [];
    closePerformancePresetEditor();
    renderPerformancePresetList();
    populatePerformanceSelect(bulkPerformanceSelect, bulkPerformanceSelect?.value || 'off', false);
    render();
    showToast(`${result.preset.name} is now available under Performance.`, 'success');
  } catch (error) {
    if (presetEditorStatus) presetEditorStatus.textContent = error.message;
  } finally {
    presetSaveBtn.disabled = false;
    presetSaveBtn.textContent = originalText;
  }
});

let sessionSleepAccounts = new Map();

function sessionSleepPrefs() {
  return { mode: 'pulse', sleepMs: 6000, wakeMs: 500 };
}

function applySessionSleepState(state = {}) {
  sessionSleepAccounts = new Map((state.accounts || []).map(item => [String(item.accountId), item]));
  frozenAccounts.clear();
  for (const accountId of sessionSleepAccounts.keys()) frozenAccounts.add(accountId);
  updateDashboardFreezeButton();
  updateSelectionUI();
  renderSessions();
}

async function syncSessionSleepState() {
  const state = await window.api.sessionSleepStatus?.();
  applySessionSleepState(state || {});
  return state;
}

async function sleepAccountIds(ids) {
  const uniqueIds = [...new Set((ids || []).map(String))];
  if (!uniqueIds.length) return showToast('Choose one or more running accounts first.', 'error');
  try {
    const state = await window.api.sleepSessions(uniqueIds, sessionSleepPrefs());
    applySessionSleepState(state || {});
    const unavailable = state?.unavailable?.length || 0;
    showToast(`${state?.changed?.length || 0} session${state?.changed?.length === 1 ? '' : 's'} frozen${unavailable ? ` · ${unavailable} not ready` : ''}.`, 'success');
    await refreshSessions();
  } catch (err) {
    showToast(`Freeze failed: ${err.message}`, 'error', 6500);
  }
}

function toggleFreezeAccountIds(ids) {
  const uniqueIds = [...new Set((ids || []).map(String))];
  const runningIds = new Set((activeSessions || []).filter(session => !session.reconnecting).map(session => String(session.accountId)));
  const relevantIds = uniqueIds.filter(id => runningIds.has(id) || sessionSleepAccounts.has(id));
  const allFrozen = relevantIds.length > 0 && relevantIds.every(id => sessionSleepAccounts.has(id));
  return allFrozen ? resumeAccountIds(uniqueIds) : sleepAccountIds(uniqueIds);
}

function freezeTargetsAreActive(ids) {
  const runningIds = new Set((activeSessions || []).filter(session => !session.reconnecting).map(session => String(session.accountId)));
  const relevantIds = [...new Set((ids || []).map(String))].filter(id => runningIds.has(id) || sessionSleepAccounts.has(id));
  return relevantIds.length > 0 && relevantIds.every(id => sessionSleepAccounts.has(id));
}

function updateDashboardFreezeButton() {
  if (!freezeSelectedDashboardBtn) return;
  const ids = [...selected];
  const runningIds = new Set((activeSessions || []).filter(session => !session.reconnecting).map(session => String(session.accountId)));
  const actionableIds = ids.filter(id => runningIds.has(String(id)) || sessionSleepAccounts.has(String(id)));
  const allFrozen = freezeTargetsAreActive(ids);
  freezeSelectedDashboardBtn.disabled = actionableIds.length === 0;
  freezeSelectedDashboardBtn.textContent = allFrozen ? 'Wake selected' : 'Freeze selected';
  freezeSelectedDashboardBtn.classList.toggle('active', allFrozen);
  freezeSelectedDashboardBtn.title = allFrozen
    ? 'Wake the selected frozen Roblox sessions'
    : 'Freeze selected tracked sessions for 6 seconds, recover for 0.5 seconds, then repeat';
}

async function resumeAccountIds(ids = []) {
  try {
    const state = await window.api.resumeSessions(ids);
    applySessionSleepState(state || {});
    showToast(ids.length ? 'Selected sessions woke up.' : 'Every frozen session woke up.', 'success');
    await refreshSessions();
  } catch (err) {
    showToast(`Could not wake the session: ${err.message}`, 'error');
  }
}

function currentIntegrationSettings() {
  return {
    regionLookup: !!serverRegionLookupInput?.checked,
    desktopNotifications: desktopNotificationsInput?.checked !== false,
    events: {
      launched: true,
      joined: true,
      serverChanged: true,
      closed: true,
      sleep: true
    }
  };
}

function fillIntegrationSettings(settings = {}) {
  if (serverRegionLookupInput) serverRegionLookupInput.checked = !!settings.regionLookup;
  if (desktopNotificationsInput) desktopNotificationsInput.checked = settings.desktopNotifications !== false;
}

async function loadIntegrationSettings() {
  const settings = await window.api.getIntegrationSettings?.();
  fillIntegrationSettings(settings || {});
  return settings;
}

async function saveLauncherSettings(closeAfter = false) {
  if (launcherSaveBtn) { launcherSaveBtn.disabled = true; launcherSaveBtn.textContent = 'Saving...'; }
  try {
    saveBootstrapMods();
    const settings = await window.api.saveIntegrationSettings(currentIntegrationSettings());
    fillIntegrationSettings(settings || {});
    showToast('Launcher settings saved.', 'success');
    if (closeAfter) closeLauncher();
  } catch (err) {
    showToast(`Could not save launcher settings: ${err.message}`, 'error', 6500);
  } finally {
    if (launcherSaveBtn) { launcherSaveBtn.disabled = false; launcherSaveBtn.textContent = 'Save launcher settings'; }
  }
}

launcherSaveBtn?.addEventListener('click', () => saveLauncherSettings(true));
freezeSelectedDashboardBtn?.addEventListener('click', () => toggleFreezeAccountIds([...selected]));
window.api.onSessionSleepState?.(applySessionSleepState);
window.api.onIntegrationEvent?.(event => addNotification(event?.message || 'Seal activity event', event?.type === 'closed' ? 'info' : 'success', event));
customizeSaveBtn?.addEventListener('click', () => { saveUiPrefs(); previewHistory = []; closeCustomize(); showToast('Appearance changes saved.', 'success'); });
customizeResetBtn?.addEventListener('click', () => { localStorage.removeItem('sealUiPrefs'); uiPrefs = mergedPrefs(); applyUiPrefs(); });

function previewAppearance() {
  const previous = JSON.stringify(uiPrefs);
  if (previewHistory[previewHistory.length - 1] !== previous) previewHistory.push(previous);
  previewHistory = previewHistory.slice(-30);
  uiPrefs = mergedPrefs({
    ...uiPrefs,
    theme: themeSelect?.value || DEFAULT_UI_PREFS.theme,
    accent: accentSelect?.value || DEFAULT_UI_PREFS.accent,
    blackHolePalette: blackHolePaletteSelect?.value || DEFAULT_UI_PREFS.blackHolePalette,
    background: backgroundSelect?.value || DEFAULT_UI_PREFS.background,
    powerMode: powerModeSelect?.value === 'low' ? 'low' : 'full',
    reducedMotion: reducedMotionSelect?.value || DEFAULT_UI_PREFS.reducedMotion,
    startupScreen: startupScreenSelect?.value || DEFAULT_UI_PREFS.startupScreen,
    launchAnimation: launchAnimationSelect?.value || DEFAULT_UI_PREFS.launchAnimation,
    sessionStyle: sessionStyleSelect?.value || DEFAULT_UI_PREFS.sessionStyle,
    customAccent: normalizedHex(customAccentInput?.value, DEFAULT_UI_PREFS.customAccent),
    customBaseColor: normalizedHex(customBaseColorInput?.value, DEFAULT_UI_PREFS.customBaseColor),
    customPanelColor: normalizedHex(customPanelColorInput?.value, DEFAULT_UI_PREFS.customPanelColor),
    panelStyle: panelStyleSelect?.value || DEFAULT_UI_PREFS.panelStyle,
    panelRadius: Number(panelRadiusInput?.value) || DEFAULT_UI_PREFS.panelRadius,
    panelOpacity: Number(panelOpacityInput?.value) || DEFAULT_UI_PREFS.panelOpacity,
    backgroundIntensity: Number(backgroundIntensityInput?.value) || DEFAULT_UI_PREFS.backgroundIntensity,
    pageThemes: {
      main: mainPageThemeSelect?.value || 'inherit',
      customize: customizePageThemeSelect?.value || 'inherit',
      launcher: launcherPageThemeSelect?.value || 'inherit'
    },
    accountLayout: accountLayoutSelect?.value || DEFAULT_UI_PREFS.accountLayout,
    density: densitySelect?.value || DEFAULT_UI_PREFS.density,
    fontFamily: fontSelect?.value || DEFAULT_UI_PREFS.fontFamily,
    textScale: Number(textScaleInput?.value) || 100
  });
  applyUiPrefs();
  if (undoPreviewBtn) undoPreviewBtn.disabled = previewHistory.length === 0;
}

for (const control of [themeSelect, accentSelect, backgroundSelect, blackHolePaletteSelect, powerModeSelect, reducedMotionSelect, startupScreenSelect, launchAnimationSelect, sessionStyleSelect, panelStyleSelect, accountLayoutSelect, densitySelect, fontSelect, mainPageThemeSelect, customizePageThemeSelect, launcherPageThemeSelect]) {
  control?.addEventListener('change', previewAppearance);
}
for (const control of [textScaleInput, customAccentInput, customBaseColorInput, customPanelColorInput, panelRadiusInput, panelOpacityInput, backgroundIntensityInput]) {
  control?.addEventListener('input', previewAppearance);
}

undoPreviewBtn?.addEventListener('click', () => {
  const snapshot = previewHistory.pop();
  if (!snapshot) return;
  try { uiPrefs = mergedPrefs(JSON.parse(snapshot)); } catch { uiPrefs = mergedPrefs(); }
  applyUiPrefs();
  undoPreviewBtn.disabled = previewHistory.length === 0;
});

applyShadowSlaveThemeBtn?.addEventListener('click', () => {
  if (themeSelect) themeSelect.value = 'shadow-slave';
  if (accentSelect) accentSelect.value = 'custom';
  if (customAccentInput) customAccentInput.value = '#a895ff';
  if (customBaseColorInput) customBaseColorInput.value = '#030208';
  if (customPanelColorInput) customPanelColorInput.value = '#0b0913';
  if (backgroundSelect) backgroundSelect.value = 'shadow-realm';
  if (blackHolePaletteSelect) blackHolePaletteSelect.value = 'nightmare';
  if (launchAnimationSelect) launchAnimationSelect.value = 'gateway';
  if (sessionStyleSelect) sessionStyleSelect.value = 'runes';
  if (panelStyleSelect) panelStyleSelect.value = 'floating';
  if (panelRadiusInput) panelRadiusInput.value = '16';
  if (panelOpacityInput) panelOpacityInput.value = '82';
  if (backgroundIntensityInput) backgroundIntensityInput.value = '115';
  if (mainPageThemeSelect) mainPageThemeSelect.value = 'shadow-slave';
  if (customizePageThemeSelect) customizePageThemeSelect.value = 'shadow-slave';
  if (launcherPageThemeSelect) launcherPageThemeSelect.value = 'shadow-slave';
  previewAppearance();
});

function setAppearancePreset(preset) {
  const values = {
    clean: { theme: 'void', accent: 'mono', background: 'none', palette: 'mono', panel: 'solid', radius: 12, opacity: 96, intensity: 65, session: 'cards', animation: 'minimal' },
    midnight: { theme: 'midnight', accent: 'ice', background: 'aurora', palette: 'ice', panel: 'soft', radius: 16, opacity: 86, intensity: 95, session: 'glow', animation: 'starlight' },
    singularity: { theme: 'void', accent: 'amber', background: 'black-hole', palette: 'inferno', panel: 'soft', radius: 16, opacity: 82, intensity: 125, session: 'glow', animation: 'ripple' },
    mysteries: { theme: 'lord-of-the-mysteries', accent: 'amber', background: 'grey-fog', palette: 'mono', panel: 'soft', radius: 12, opacity: 75, intensity: 75, session: 'cards', animation: 'minimal' }
  }[preset];
  if (!values) return;
  if (themeSelect) themeSelect.value = values.theme;
  if (accentSelect) accentSelect.value = values.accent;
  if (backgroundSelect) backgroundSelect.value = values.background;
  if (blackHolePaletteSelect) blackHolePaletteSelect.value = values.palette;
  if (panelStyleSelect) panelStyleSelect.value = values.panel;
  if (panelRadiusInput) panelRadiusInput.value = String(values.radius);
  if (panelOpacityInput) panelOpacityInput.value = String(values.opacity);
  if (backgroundIntensityInput) backgroundIntensityInput.value = String(values.intensity);
  if (sessionStyleSelect) sessionStyleSelect.value = values.session;
  if (launchAnimationSelect) launchAnimationSelect.value = values.animation;
  if (mainPageThemeSelect) mainPageThemeSelect.value = 'inherit';
  if (customizePageThemeSelect) customizePageThemeSelect.value = 'inherit';
  if (launcherPageThemeSelect) launcherPageThemeSelect.value = 'inherit';
  previewAppearance();
}

applyCleanThemeBtn?.addEventListener('click', () => setAppearancePreset('clean'));
applyMidnightThemeBtn?.addEventListener('click', () => setAppearancePreset('midnight'));
applySingularityThemeBtn?.addEventListener('click', () => setAppearancePreset('singularity'));
applyMysteriesThemeBtn?.addEventListener('click', () => setAppearancePreset('mysteries'));
pauseHotkeySelect?.addEventListener('focus', () => {
  pauseHotkeySelect.value = 'Press a key...';
  pauseHotkeySelect.select?.();
});
pauseHotkeySelect?.addEventListener('blur', () => {
  pauseHotkeySelect.value = displayHotkey(uiPrefs.pauseHotkey || pauseHotkeyLabel || 'F8');
});
pauseHotkeySelect?.addEventListener('keydown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.key === 'Escape') {
    pauseHotkeySelect.blur();
    return;
  }
  const accelerator = eventToPauseAccelerator(event);
  if (!accelerator) return;
  pauseHotkeySelect.value = displayHotkey(accelerator);
  uiPrefs.pauseHotkey = accelerator;
});
customizeModal?.addEventListener('click', (event) => { if (event.target === customizeModal) closeCustomize(); });

importCursorBtn?.addEventListener('click', async () => {
  try {
    const label = customCursorName?.value.trim() || customCursorFileName || 'My cursor';
    const result = await window.api.importRobloxCursor(label);
    if (!result || result.canceled) return;
    customCursorPath = result.path || '';
    customCursorFileName = result.name || label || 'My cursor';
    localStorage.setItem('sealCustomCursorPath', customCursorPath);
    localStorage.setItem('sealCustomCursorFileName', customCursorFileName);
    if (customCursorName) customCursorName.value = customCursorFileName;
    ensureSelectOption(robloxCursorSelect, 'custom', customCursorFileName);
    if (robloxCursorSelect) robloxCursorSelect.value = 'custom';
    updateCustomAssetButtons();
    saveBootstrapMods();
    await window.api.applyRobloxMods(currentRobloxMods());
    sealAlert('Cursor imported and applied. Fully close and reopen Roblox to see it.');
  } catch (err) {
    sealAlert('Could not import cursor: ' + err.message);
  }
});

deleteCursorBtn?.addEventListener('click', async () => {
  try {
    await window.api.deleteCustomCursor(customCursorPath);
    customCursorPath = '';
    customCursorFileName = '';
    localStorage.removeItem('sealCustomCursorPath');
    localStorage.removeItem('sealCustomCursorFileName');
    removeSelectOption(robloxCursorSelect, 'custom');
    if (robloxCursorSelect) robloxCursorSelect.value = 'default';
    if (customCursorName) customCursorName.value = 'My cursor';
    updateCustomAssetButtons();
    saveBootstrapMods();
    sealAlert('Custom cursor deleted and Roblox cursor files restored. Restart Roblox.');
  } catch (err) {
    sealAlert('Could not delete cursor: ' + err.message);
  }
});

robloxCursorSelect?.addEventListener('change', () => {
  if (robloxCursorSelect.value === 'custom' && !customCursorPath) {
    sealAlert('Import a PNG cursor first.');
    robloxCursorSelect.value = 'default';
  }
  saveBootstrapMods();
});

deleteDeathSoundBtn?.addEventListener('click', async () => {
  try {
    await window.api.deleteCustomDeathSound(customDeathSoundPath);
    customDeathSoundPath = '';
    customDeathSoundFileName = '';
    localStorage.removeItem('sealCustomDeathSoundPath');
    localStorage.removeItem('sealCustomDeathSoundFileName');
    removeSelectOption(robloxSoundSelect, 'custom_death');
    if (robloxSoundSelect) robloxSoundSelect.value = 'default';
    if (customDeathSoundName) customDeathSoundName.value = 'My death sound';
    updateCustomAssetButtons();
    saveBootstrapMods();
    sealAlert('Custom death sound deleted and Roblox sound files restored. Restart Roblox.');
  } catch (err) {
    sealAlert('Could not delete death sound: ' + err.message);
  }
});

importDeathSoundBtn?.addEventListener('click', async () => {
  try {
    const label = customDeathSoundName?.value.trim() || customDeathSoundFileName || 'My death sound';
    const result = await window.api.importRobloxDeathSound(label);
    if (!result || result.canceled) return;
    customDeathSoundPath = result.path || '';
    customDeathSoundFileName = result.name || label || 'My death sound';
    localStorage.setItem('sealCustomDeathSoundPath', customDeathSoundPath);
    localStorage.setItem('sealCustomDeathSoundFileName', customDeathSoundFileName);
    if (customDeathSoundName) customDeathSoundName.value = customDeathSoundFileName;
    ensureSelectOption(robloxSoundSelect, 'custom_death', customDeathSoundFileName);
    if (robloxSoundSelect) robloxSoundSelect.value = 'custom_death';
    updateCustomAssetButtons();
    saveBootstrapMods();
    const applied = await window.api.applyRobloxMods(currentRobloxMods());
    const soundResults = Array.isArray(applied?.details)
      ? applied.details.filter(detail => detail.mod === 'sounds')
      : [];
    const soundChanges = soundResults.reduce((total, detail) => total + (detail.changed || 0), 0);
    if (soundChanges === 0) {
      const diagnostics = soundResults.map(detail =>
        `${detail.root}: ${detail.changed}/${detail.targets}${detail.sourceFound ? '' : ' (source missing)'}`
      ).join('\n');
      throw new Error('The sound imported, but Seal could not install it into Roblox.\n\n' + (diagnostics || 'No Roblox sound target was found.'));
    }
    sealAlert(`Death sound imported and applied to ${soundChanges} Roblox installation(s). Fully close and reopen Roblox to hear it.`);
  } catch (err) {
    sealAlert('Could not import death sound: ' + err.message);
  }
});

robloxSoundSelect?.addEventListener('change', () => {
  if (robloxSoundSelect.value === 'custom_death' && !customDeathSoundPath) {
    sealAlert('Import a death sound first.');
    robloxSoundSelect.value = 'default';
  }
  saveBootstrapMods();
});

robloxFontSelect?.addEventListener('change', saveBootstrapMods);
robloxTextureSelect?.addEventListener('change', saveBootstrapMods);
robloxLightingSelect?.addEventListener('change', saveBootstrapMods);
deathSoundPlaybackSelect?.addEventListener('change', () => {
  if (deathSoundCutoffInput) deathSoundCutoffInput.disabled = deathSoundPlaybackSelect.value === 'full';
  saveBootstrapMods();
});
if (deathSoundCutoffInput && deathSoundPlaybackSelect) deathSoundCutoffInput.disabled = deathSoundPlaybackSelect.value === 'full';

applyModsBtn?.addEventListener('click', async () => {
  applyModsBtn.disabled = true;
  applyModsBtn.textContent = 'Applying...';
  try {
    const mods = currentRobloxMods();
    saveBootstrapMods();
    const result = await window.api.applyRobloxMods(mods);
    const changed = result.changed || 0;
    const detailText = Array.isArray(result.details)
      ? result.details.map(d => {
          const extra = [];
          if (d.already) extra.push(`${d.already} already patched`);
          if (Array.isArray(d.errors) && d.errors.length) extra.push(d.errors.slice(0, 2).join('; '));
          return `${d.mod}: ${d.changed}/${d.targets}${d.sourceFound ? '' : ' (source missing)'}${extra.length ? ' (' + extra.join(', ') + ')' : ''}`;
        }).join('\n')
      : '';
    if (changed === 0) {
      sealAlert('No Roblox mod files were changed.\n\nThis usually means Roblox moved the asset folders, the selected mod file was missing, the mod was already applied, or no non-default mod is selected.\n\n' + detailText);
    } else {
      sealAlert(`Roblox mods applied. ${changed} file(s) changed. Fully close and reopen Roblox to see/hear them.\n\n${detailText}`);
    }
  } catch (err) {
    sealAlert('Could not apply Roblox mods: ' + err.message);
  } finally {
    applyModsBtn.disabled = false;
    applyModsBtn.textContent = 'Apply supported mods';
  }
});

restoreModsBtn?.addEventListener('click', async () => {
  restoreModsBtn.disabled = true;
  restoreModsBtn.textContent = 'Restoring...';
  try {
    const result = await window.api.restoreRobloxMods();
    if (robloxLightingSelect) robloxLightingSelect.value = 'normal';
    saveBootstrapMods();
    sealAlert(`Roblox mods restored. ${result.restored || 0} file(s) restored. Restart Roblox.`);
  } catch (err) {
    sealAlert('Could not restore Roblox mods: ' + err.message);
  } finally {
    restoreModsBtn.disabled = false;
    restoreModsBtn.textContent = 'Restore Roblox files';
  }
});

function getAntiIdleActive(state) {
  if (typeof state === 'boolean') return state;
  return !!state?.active;
}

try {
  const savedMods = JSON.parse(localStorage.getItem('sealBootstrapMods') || 'null');
  if (savedMods && typeof savedMods === 'object') {
    if (customCursorFileName) ensureSelectOption(robloxCursorSelect, 'custom', customCursorFileName);
    if (customDeathSoundFileName) ensureSelectOption(robloxSoundSelect, 'custom_death', customDeathSoundFileName);
    if (robloxFontSelect && savedMods.font) robloxFontSelect.value = savedMods.font;
    if (robloxCursorSelect && savedMods.cursor) robloxCursorSelect.value = savedMods.cursor;
    if (robloxTextureSelect && savedMods.textures) robloxTextureSelect.value = ['default', 'soft'].includes(savedMods.textures) ? savedMods.textures : 'default';
    if (robloxLightingSelect) robloxLightingSelect.value = savedMods.fullbright === true ? 'fullbright' : 'normal';
    if (robloxSoundSelect && savedMods.sounds) robloxSoundSelect.value = savedMods.sounds;
    window.api.setBootstrapMods?.({
      ...currentRobloxMods(),
      font: savedMods.font || currentRobloxMods().font,
      cursor: savedMods.cursor || currentRobloxMods().cursor,
      customCursorPath: savedMods.customCursorPath || customCursorPath,
      textures: ['default', 'soft'].includes(savedMods.textures) ? savedMods.textures : 'default',
      fullbright: savedMods.fullbright === true,
      sounds: savedMods.sounds || currentRobloxMods().sounds,
      customDeathSoundPath: savedMods.customDeathSoundPath || customDeathSoundPath,
      deathPlayback: 'full',
      deathTarget: 'auto',
      deathPersistent: false
    });
  }
} catch {}

async function refreshBootstrapperButton() {
  if (!bootstrapperBtn) return;
  try {
    const state = await window.api.bootstrapperStatus?.();
    bootstrapperBtn.textContent = state?.enabled ? 'Disable Seal launcher' : 'Enable Seal launcher';
    bootstrapperBtn.classList.toggle('btn-accent', !!state?.enabled);
    bootstrapperBtn.classList.toggle('btn-ghost', !state?.enabled);
    const version = state?.installation?.versionGuid || 'Roblox not found';
    const protocols = state?.protocols || {};
    const route = state?.enabled
      ? 'Browser launches route through Seal'
      : `Routing off (roblox: ${protocols.roblox ? 'Seal' : 'other'}, roblox-player: ${protocols['roblox-player'] ? 'Seal' : 'other'})`;
    if (bootstrapperStatusText) bootstrapperStatusText.textContent = `${route} • ${version}`;
    if (launcherOverviewStatus) launcherOverviewStatus.textContent = `${route} • ${version}`;
  } catch {
    bootstrapperBtn.textContent = 'Enable Seal launcher';
    if (bootstrapperStatusText) bootstrapperStatusText.textContent = 'Could not read launcher status.';
    if (launcherOverviewStatus) launcherOverviewStatus.textContent = 'Could not read launcher status.';
  }
}

function showBootstrapperState(state) {
  if (!bootstrapperStatusText || !state) return;
  const progress = Number.isFinite(state.progress) ? ` ${state.progress}%` : '';
  const message = `${state.message || state.phase || 'Working…'}${progress}`;
  bootstrapperStatusText.textContent = message;
  if (launcherOverviewStatus) launcherOverviewStatus.textContent = message;
}

bootstrapperBtn?.addEventListener('click', async () => {
  bootstrapperBtn.disabled = true;
  try {
    const state = await window.api.bootstrapperStatus?.();
    if (state?.enabled) await window.api.bootstrapperDisable?.();
    else await window.api.bootstrapperEnable?.();
    await refreshBootstrapperButton();
  } catch (err) {
    sealAlert('Bootstrapper mode failed: ' + err.message);
  } finally {
    bootstrapperBtn.disabled = false;
  }
});
refreshBootstrapperButton();

bootstrapperCheckBtn?.addEventListener('click', async () => {
  bootstrapperCheckBtn.disabled = true;
  bootstrapperCheckBtn.textContent = 'Checking…';
  try {
    const result = await window.api.bootstrapperCheck?.();
    await refreshBootstrapperButton();
    if (result?.ready?.updateAvailable) {
      showBootstrapperState({ message: 'Update available—Seal will wait until you choose Repair / update.' });
    }
  } catch (err) {
    showBootstrapperState({ message: 'Check failed: ' + err.message });
    sealAlert('Seal launcher check failed: ' + err.message);
  } finally {
    bootstrapperCheckBtn.disabled = false;
    bootstrapperCheckBtn.textContent = 'Check Roblox & mods';
  }
});

bootstrapperUpdateBtn?.addEventListener('click', async () => {
  bootstrapperUpdateBtn.disabled = true;
  bootstrapperUpdateBtn.textContent = 'Updating…';
  try {
    await window.api.bootstrapperForceUpdate?.();
    await window.api.bootstrapperCheck?.();
    await refreshBootstrapperButton();
  } catch (err) {
    showBootstrapperState({ message: 'Update failed: ' + err.message });
    sealAlert('Roblox repair/update failed: ' + err.message);
  } finally {
    bootstrapperUpdateBtn.disabled = false;
    bootstrapperUpdateBtn.textContent = 'Repair/update (closes Roblox)';
  }
});

async function refreshJoinConnectionStatus() {
  const status=document.getElementById('joinConnectionStatus');
  try { const result=await window.api.getJoinConnectionStatus?.(); if(status&&result)status.textContent=result.message; }
  catch { if(status)status.textContent='Connection routing could not be checked. Try Repair join connection.'; }
}
document.getElementById('repairJoinConnectionBtn')?.addEventListener('click',async event=>{
  const button=event.currentTarget,status=document.getElementById('joinConnectionStatus');
  button.disabled=true;button.textContent='Repairing connection…';
  if(status)status.textContent='Checking Roblox join routing. Approve the Windows administrator prompt if it appears.';
  try { const result=await window.api.repairJoinConnection(); if(status)status.textContent=result.message; showToast(result.message,result.ok?'success':result.cancelled?'info':'error',9000); }
  catch(error){if(status)status.textContent='Connection repair failed: '+error.message;showToast('Connection repair failed: '+error.message,'error',9000);}
  finally{button.disabled=false;button.textContent='Repair join connection';}
});

document.getElementById('resetJoinCacheBtn')?.addEventListener('click', async event => {
  const button=event.currentTarget,status=document.getElementById('joinCacheResetStatus');
  button.disabled=true;button.textContent='Resetting cache…';
  if(status)status.textContent='Checking Roblox and preparing its cache reset…';
  try{
    let result=await window.api.resetJoinCache({closeRunning:false});
    if(result.needsClose){
      const confirmed=await sealConfirm('Close all Roblox clients and reset their join cache? SAM accounts, settings, playtime, and badges stay saved.');
      if(!confirmed){if(status)status.textContent='Cancelled. No cache files were changed.';return;}
      if(status)status.textContent='Closing Roblox and resetting its join cache…';
      result=await window.api.resetJoinCache({closeRunning:true});
    }
    if(status)status.textContent=result.message;
    showToast(result.message,result.ok?'success':'error',7000);
    await refreshSessions({fast:true});
  }catch(error){if(status)status.textContent='Could not reset the cache: '+error.message;showToast('Cache reset failed: '+error.message,'error',7000);}
  finally{button.disabled=false;button.textContent='Reset join cache';}
});

window.api.onBootstrapperState?.(showBootstrapperState);
window.api.bootstrapperLastEvent?.().then(showBootstrapperState).catch(() => {});

function setAntiIdleUI(on, state = {}) {
  antiIdleOn = !!on;
  const robloxRunning = typeof state === 'object' ? state.robloxRunning : undefined;
  antiIdleBtn.textContent = `${uiPrefs.labels?.antiAfk || 'Anti-AFK'} ${antiIdleOn ? 'on' : 'off'}`;
  const intervalSeconds = window.sealAntiIdleIntervalSeconds || 240;
  const intervalLabel = `${Math.floor(intervalSeconds / 60)} min ${intervalSeconds % 60} sec`;
  antiIdleBtn.title = antiIdleOn
    ? `Active: clicks each Roblox window every ${intervalLabel} and stops when Roblox closes.`
    : (robloxRunning === false ? 'Open Roblox first, then turn on Anti-AFK.' : `Click each Roblox window every ${intervalLabel}.`);
  antiIdleBtn.classList.toggle('active', antiIdleOn);
  antiIdleBtn.disabled = !antiIdleOn && robloxRunning === false;
}

antiIdleBtn.addEventListener('click', async () => {
  antiIdleBtn.disabled = true;
  try {
    if (antiIdleOn) {
      await window.api.antiIdleStop();
      setAntiIdleUI(false, { robloxRunning: false });
    } else {
      const state = await window.api.antiIdleStart();
      setAntiIdleUI(getAntiIdleActive(state), state);
    }
  } catch (err) {
    sealAlert(`Anti-AFK failed: ${err.message}`);
  } finally {
    await syncAntiIdleStatus();
  }
});

const pauseBtn = document.getElementById('pauseBtn');
let isPaused = false;
function updatePauseUI(active = isPaused, accelerator = pauseHotkeyLabel) {
  isPaused = !!active;
  pauseHotkeyLabel = accelerator || pauseHotkeyLabel || uiPrefs.pauseHotkey || 'F8';
  pauseBtn.textContent = isPaused ? `${uiPrefs.pauseOnLabel} (${pauseHotkeyLabel})` : `${uiPrefs.pauseOffLabel} (${pauseHotkeyLabel})`;
  pauseBtn.title = `Click or press ${pauseHotkeyLabel} to ${isPaused ? 'resume' : 'pause'}.`;
  pauseBtn.classList.toggle('btn-accent', isPaused);
  pauseBtn.classList.toggle('btn-ghost', !isPaused);
}

async function togglePauseFromButton() {
  pauseBtn.disabled = true;
  try {
    const state = await window.api.toggleSilly();
    updatePauseUI(!!state?.active, state?.accelerator);
  } catch (err) {
    sealAlert('Failed to toggle pause: ' + err.message);
    await syncPauseStatus();
  } finally {
    pauseBtn.disabled = false;
  }
}

async function syncPauseStatus() {
  try {
    const state = await window.api.sillyStatus();
    updatePauseUI(!!state?.active, state?.accelerator);
  } catch {
    updatePauseUI(false);
  }
}

pauseBtn.addEventListener('click', togglePauseFromButton);
if (window.api.onSillyState) {
  window.api.onSillyState((state) => updatePauseUI(!!state?.active, state?.accelerator));
}


let accounts = [];
let avatarsRefreshedThisRun = false;
let avatarRevision = Date.now();
const selected = new Set();
const launchingAccountIds = new Set();
const cookieStatuses = new Map();
const presenceStatuses = new Map();
const sessionTarotDeck = window.SealTarotDeck.createTarotDeck(localStorage);
let activeSessions = [];
const expandedSessionDetails = new Set();
let dragSelecting = false;
let dragSelectValue = true;
let reorderDragId = null;
let folderReorderDragId = null;
let suppressCardClickAfterDrag = false;
const frozenAccounts = new Set();

function updateAccountOperationButtons(id) {
  const busy = launchingAccountIds.has(id);
  const card = accountsList?.querySelector(`[data-account-id="${CSS.escape(id)}"]`);
  const playBtn = card?.querySelector('.btn-play');
  const applyBtn = card?.querySelector('.btn-relaunch');
  if (playBtn) {
    playBtn.disabled = busy;
    playBtn.textContent = busy ? '…' : '▶';
  }
  if (applyBtn) {
    applyBtn.disabled = busy;
    applyBtn.textContent = busy ? '...' : (uiPrefs.labels.apply || '↻ Apply');
  }
}

function setAccountsOperationBusy(ids, busy) {
  for (const id of ids) {
    if (busy) launchingAccountIds.add(id);
    else launchingAccountIds.delete(id);
    updateAccountOperationButtons(id);
  }
}

function busyAccountIds(ids) {
  return ids.filter(id => launchingAccountIds.has(id));
}
const ACCOUNT_FOLDERS_KEY = 'sealAccountFoldersV1';
const ACTIVE_FOLDER_KEY = 'sealActiveAccountFolderV1';
const FOLDER_DOCK_COLLAPSED_KEY = 'sealFolderDockCollapsedV1';
const DEFAULT_FOLDER_COLOR = '#5865f2';
const FOLDER_COLOR_PALETTE = ['#5865f2', '#57f287', '#eb459e', '#fee75c', '#ed4245', '#4cc9f0', '#b58df1'];
let editingFolderId = '';
let activeFolderId = localStorage.getItem(ACTIVE_FOLDER_KEY) || '';
let folderDockCollapsed = localStorage.getItem(FOLDER_DOCK_COLLAPSED_KEY) === 'true';

function normalizeFolderColor(value, fallback = DEFAULT_FOLDER_COLOR) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
}

function loadAccountFolders() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNT_FOLDERS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const seenIds = new Set();
    return raw.map((folder, index) => ({
      id: String(folder?.id || '').trim(),
      name: String(folder?.name || '').trim().slice(0, 32),
      color: normalizeFolderColor(folder?.color, FOLDER_COLOR_PALETTE[index % FOLDER_COLOR_PALETTE.length]),
      accountIds: [...new Set((Array.isArray(folder?.accountIds) ? folder.accountIds : []).map(String))]
    })).filter(folder => {
      if (!folder.id || !folder.name || seenIds.has(folder.id)) return false;
      seenIds.add(folder.id);
      return true;
    });
  } catch {
    return [];
  }
}

let accountFolders = loadAccountFolders();

function saveAccountFolders() {
  const validIds = new Set(accounts.map(account => account.id));
  accountFolders = accountFolders.map(folder => ({
    ...folder,
    accountIds: folder.accountIds.filter(id => validIds.has(id))
  }));
  localStorage.setItem(ACCOUNT_FOLDERS_KEY, JSON.stringify(accountFolders));
}

function folderForAccount(accountId) {
  return accountFolders.find(folder => folder.accountIds.includes(accountId)) || null;
}

function setActiveFolder(folderId = '') {
  activeFolderId = accountFolders.some(folder => folder.id === folderId) ? folderId : '';
  localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderId);
}

function assignAccountFolder(accountId, folderId) {
  for (const folder of accountFolders) {
    folder.accountIds = folder.accountIds.filter(id => id !== accountId);
  }
  const target = accountFolders.find(folder => folder.id === folderId);
  if (target) target.accountIds.push(accountId);
  saveAccountFolders();
}

function bulkTargetIds() {
  const target = bulkConfigTargetSelect?.value || 'selected';
  if (target === 'all') return accounts.map(account => account.id);
  if (target === 'folder') {
    const folder = accountFolders.find(item => item.id === activeFolderId);
    if (folder) return folder.accountIds.filter(id => accounts.some(account => account.id === id));
    return accounts.filter(account => !folderForAccount(account.id)).map(account => account.id);
  }
  return [...selected].filter(id => accounts.some(account => account.id === id));
}

function updateBulkTargetSummary() {
  if (!bulkConfigTargetSummary) return;
  const ids = bulkTargetIds();
  const folder = accountFolders.find(item => item.id === activeFolderId);
  const target = bulkConfigTargetSelect?.value || 'selected';
  const label = target === 'all' ? 'Every saved account' : target === 'folder' ? (folder?.name || 'Unfiled accounts') : 'Current selection';
  bulkConfigTargetSummary.textContent = `${label} • ${ids.length} account${ids.length === 1 ? '' : 's'}`;
  if (bulkConfigApplyBtn) bulkConfigApplyBtn.disabled = ids.length === 0;
}

function openBulkConfiguration() {
  if (!bulkConfigModal) return;
  if (bulkConfigTargetSelect) {
    bulkConfigTargetSelect.value = selected.size ? 'selected' : (accountFolders.length ? 'folder' : 'all');
  }
  if (bulkConfigStatus) bulkConfigStatus.textContent = '';
  updateBulkTargetSummary();
  bulkConfigModal.hidden = false;
}

function closeBulkConfiguration() {
  if (bulkConfigModal) bulkConfigModal.hidden = true;
}

bulkConfigBtn?.addEventListener('click', openBulkConfiguration);
bulkConfigCloseBtn?.addEventListener('click', closeBulkConfiguration);
bulkConfigCancelBtn?.addEventListener('click', closeBulkConfiguration);
bulkConfigTargetSelect?.addEventListener('change', updateBulkTargetSummary);
bulkFpsInput?.addEventListener('input', () => {
  const value = Math.floor(Number(bulkFpsInput.value));
  if (bulkFpsWarning) bulkFpsWarning.hidden = !(Number.isFinite(value) && value > 0 && value < 5);
});
bulkConfigModal?.addEventListener('click', event => {
  if (event.target === bulkConfigModal) closeBulkConfiguration();
});

bulkConfigApplyBtn?.addEventListener('click', async () => {
  const ids = bulkTargetIds();
  const enabled = {
    fps: !!bulkFpsEnabled?.checked,
    graphics: !!bulkGraphicsEnabled?.checked,
    performance: !!bulkPerformanceEnabled?.checked,
    volume: !!bulkVolumeEnabled?.checked
  };
  if (!ids.length) return;
  if (!Object.values(enabled).some(Boolean)) {
    if (bulkConfigStatus) bulkConfigStatus.textContent = 'Select at least one setting to change.';
    return;
  }
  const busyIds = busyAccountIds(ids);
  if (busyIds.length) {
    if (bulkConfigStatus) bulkConfigStatus.textContent = `${accountLabel(busyIds[0])} is already launching or applying settings.`;
    return;
  }

  const values = {
    fps: normalizeFpsCap(bulkFpsInput?.value || '60'),
    graphics: Math.max(1, Math.min(10, Math.floor(Number(bulkGraphicsInput?.value) || 1))),
    performance: ['max', 'balanced', 'off'].includes(bulkPerformanceSelect?.value) || performancePresetById(bulkPerformanceSelect?.value)
      ? bulkPerformanceSelect.value
      : 'off',
    volume: Math.max(0, Math.min(10, Math.floor(Number(bulkVolumeInput?.value) || 0)))
  };
  bulkConfigApplyBtn.disabled = true;
  setAccountsOperationBusy(ids, true);
  const originalText = bulkConfigApplyBtn.textContent;
  const failed = [];
  try {
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      bulkConfigApplyBtn.textContent = `Saving ${index + 1}/${ids.length}`;
      try {
        const settings = {};
        if (enabled.fps) settings.fpsCap = values.fps;
        if (enabled.graphics) settings.graphicsQuality = values.graphics;
        if (enabled.performance) settings.fastFlagPreset = values.performance;
        if (enabled.volume) settings.volume = values.volume;
        const saved = await window.api.setLaunchSettings(id, settings);
        const account = accounts.find(item => item.id === id);
        if (account) {
          if (enabled.fps) account.fpsCap = saved.fpsCap;
          if (enabled.graphics) account.graphicsQuality = saved.graphicsQuality;
          if (enabled.performance) account.fastFlagPreset = saved.fastFlagPreset;
          if (enabled.volume) account.volume = saved.volume;
        }
      } catch (error) {
        failed.push(`${accountLabel(id)}: ${error.message || error}`);
      }
    }

    if (bulkRelaunchInput?.checked) {
      const runningIds = ids.filter(id => activeSessions.some(session => session.accountId === id));
      if (runningIds.length) {
        bulkConfigApplyBtn.textContent = `Relaunching ${runningIds.length}`;
        await window.api.forceQuitRoblox(runningIds);
        await delay(500);
        const preparation = await window.api.prepareLaunchMultiple(false);
        if (!preparation?.ready) throw new Error(preparation?.message || 'Could not prepare relaunching.');
        try {
          for (let index = 0; index < runningIds.length; index++) {
            await window.api.launchBatchStep(runningIds[index], buildTarget(), index, preparation.strategy);
            if (index < runningIds.length - 1) await delay(BATCH_LAUNCH_HANDOFF_MS);
          }
        } finally {
          await window.api.finishLaunchMultiple?.().catch(() => {});
        }
        await refreshSessions();
      }
    }

    render();
    if (failed.length) {
      if (bulkConfigStatus) bulkConfigStatus.textContent = `${ids.length - failed.length} saved; ${failed.length} failed.`;
      showToast(`Bulk settings finished with ${failed.length} error${failed.length === 1 ? '' : 's'}.`, 'error');
    } else {
      if (bulkConfigStatus) bulkConfigStatus.textContent = `${ids.length} account${ids.length === 1 ? '' : 's'} updated.`;
      showToast(`Bulk settings saved for ${ids.length} account${ids.length === 1 ? '' : 's'}.`, 'success');
      window.setTimeout(closeBulkConfiguration, 700);
    }
  } catch (error) {
    if (bulkConfigStatus) bulkConfigStatus.textContent = error.message || String(error);
    showToast(`Bulk configuration stopped: ${error.message || error}`, 'error');
  } finally {
    setAccountsOperationBusy(ids, false);
    bulkConfigApplyBtn.textContent = originalText;
    updateBulkTargetSummary();
  }
});

function closeFolderEditor() {
  if (folderModal) folderModal.hidden = true;
  editingFolderId = '';
}

function openFolderEditor(folderId = '') {
  if (!folderModal || !folderAccountPicker || !folderNameInput) return;
  const folder = accountFolders.find(item => item.id === folderId) || null;
  editingFolderId = folder?.id || '';
  if (folderModalTitle) folderModalTitle.textContent = folder ? 'Edit folder' : 'Create a folder';
  folderNameInput.value = folder?.name || '';
  if (folderColorInput) folderColorInput.value = normalizeFolderColor(folder?.color);
  if (folderDeleteBtn) folderDeleteBtn.hidden = !folder;
  folderAccountPicker.innerHTML = '';

  for (const account of accounts) {
    const choice = document.createElement('label');
    choice.className = 'folder-account-choice';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = account.id;
    checkbox.checked = !!folder?.accountIds.includes(account.id);
    const avatar = document.createElement('img');
    avatar.src = currentAvatarUrl(account.avatarUrl) || '';
    avatar.alt = '';
    const text = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = account.username;
    const small = document.createElement('small');
    small.textContent = `ID ${account.userId}`;
    text.append(strong, small);
    choice.append(checkbox, avatar, text);
    folderAccountPicker.appendChild(choice);
  }

  folderModal.hidden = false;
  folderNameInput.focus();
}

addFolderBtn?.addEventListener('click', () => openFolderEditor());
folderCloseBtn?.addEventListener('click', closeFolderEditor);
folderCancelBtn?.addEventListener('click', closeFolderEditor);
folderModal?.addEventListener('click', event => {
  if (event.target === folderModal) closeFolderEditor();
});
folderSaveBtn?.addEventListener('click', () => {
  const name = String(folderNameInput?.value || '').trim();
  if (!name) {
    folderNameInput?.focus();
    showToast('Give the folder a name first.', 'error');
    return;
  }
  const chosen = [...folderAccountPicker.querySelectorAll('input:checked')].map(input => input.value);
  for (const folder of accountFolders) {
    folder.accountIds = folder.accountIds.filter(id => !chosen.includes(id));
  }
  const existing = accountFolders.find(folder => folder.id === editingFolderId);
  if (existing) {
    existing.name = name.slice(0, 32);
    existing.color = normalizeFolderColor(folderColorInput?.value);
    existing.accountIds = chosen;
    setActiveFolder(existing.id);
  } else {
    const created = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.slice(0, 32),
      color: normalizeFolderColor(folderColorInput?.value, FOLDER_COLOR_PALETTE[accountFolders.length % FOLDER_COLOR_PALETTE.length]),
      accountIds: chosen
    };
    accountFolders.push(created);
    setActiveFolder(created.id);
  }
  saveAccountFolders();
  closeFolderEditor();
  render();
});
folderDeleteBtn?.addEventListener('click', async () => {
  const folder = accountFolders.find(item => item.id === editingFolderId);
  if (!folder || !await sealConfirm(`Delete the folder "${folder.name}"? The accounts will stay saved.`)) return;
  accountFolders = accountFolders.filter(item => item.id !== folder.id);
  if (activeFolderId === folder.id) setActiveFolder('');
  saveAccountFolders();
  closeFolderEditor();
  render();
});

function currentAvatarUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return `${url}${url.includes('?') ? '&' : '?'}sealAvatar=${avatarRevision}`;
}

async function refresh() {
  try {
    accounts = await window.api.listAccounts();
  } catch (error) {
    showToast(`Could not load saved accounts. ${error.message || 'Check the account data folder and try again.'}`, 'error', 12000);
    return false;
  }
  saveAccountFolders();
  render();
  showRecoveryIfAvailable();
  if (!avatarsRefreshedThisRun && window.api.refreshAvatars) {
    avatarsRefreshedThisRun = true;
    window.api.refreshAvatars().then(updated => {
      if (!Array.isArray(updated)) return;
      accounts = updated;
      avatarRevision = Date.now();
      render();
      refreshSessions();
    }).catch(err => console.warn('Could not refresh account avatars:', err));
  }
}

function formatSessionAge(startedAt) {
  const elapsed = Math.max(0, Date.now() - Number(startedAt || Date.now()));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'just started';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function sessionJoinUrl(session) {
  if (!session?.placeId) return '';
  const serverId = session.jobId || session.gameId || '';
  return serverId
    ? `https://www.roblox.com/games/start?placeId=${encodeURIComponent(session.placeId)}&gameInstanceId=${encodeURIComponent(serverId)}`
    : `https://www.roblox.com/games/${encodeURIComponent(session.placeId)}`;
}

function loadSessionJoinTarget(joinUrl, exactServerId = '') {
  if (!joinUrl || !joinUsernameInput) return false;
  joinUsernameInput.value = joinUrl;
  joinUsernameInput.dispatchEvent(new Event('input', { bubbles: true }));

  // Verify the same parser used by Launch selected before telling the user the
  // target is ready. This prevents a UI-only success state from hiding a lost
  // or malformed Roblox server ID.
  const parsedTarget = buildTarget();
  if (exactServerId && parsedTarget?.gameInstanceId !== exactServerId) {
    showToast('Seal could not read this server ID. Refresh the session details and try again.', 'error', 6500);
    return false;
  }

  // Keep the input parked at the readable start of the URL. Focusing it moved
  // the caret to the far-right server ID and made the destination look broken.
  joinUsernameInput.title = joinUrl;
  joinUsernameInput.setSelectionRange?.(0, 0);
  joinUsernameInput.blur();
  const launchCard = document.querySelector('.launch-card');
  launchCard?.scrollIntoView?.({ behavior: motionIsReduced() ? 'auto' : 'smooth', block: 'nearest' });
  launchCard?.classList.remove('target-loaded');
  window.requestAnimationFrame(() => launchCard?.classList.add('target-loaded'));
  window.setTimeout(() => launchCard?.classList.remove('target-loaded'), 1500);
  setLaunchStatus(exactServerId ? 'Exact server ready' : 'Experience ready', 'success');
  showToast(
    exactServerId
      ? 'Exact server loaded. Select accounts that are not already running, then press Launch selected.'
      : 'Experience loaded. Choose the accounts you want, then press Launch selected.',
    'success',
    5000
  );
  return true;
}

function serverJoinCard(session, joinUrl) {
  const card = document.createElement('section');
  card.className = 'server-join-card';
  const serverId = String(session?.jobId || session?.gameId || '');
  const exact = !!(session?.placeId && serverId);
  card.dataset.targetKind = exact ? 'exact-server' : (session?.placeId ? 'experience' : 'unavailable');

  const header = document.createElement('div');
  header.className = 'server-join-header';
  const copy = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.textContent = exact ? 'Exact server' : 'Join destination';
  const title = document.createElement('strong');
  title.textContent = exact ? 'Join this running server' : (session?.placeId ? 'Open this experience' : 'Waiting for Roblox');
  const hint = document.createElement('small');
  hint.textContent = exact
    ? `Place ${session.placeId} · launch an unopened account into it`
    : (session?.placeId ? `Place ${session.placeId} · exact server ID unavailable` : 'The place and server ID have not been detected yet.');
  copy.append(kicker, title, hint);
  const ready = document.createElement('span');
  ready.className = `server-join-state${exact ? ' ready' : ''}`;
  ready.textContent = exact ? 'Ready' : (session?.placeId ? 'Place only' : 'Waiting');
  header.append(copy, ready);
  card.appendChild(header);

  if (serverId) {
    const idLine = document.createElement('div');
    idLine.className = 'server-join-id';
    const label = document.createElement('span');
    label.textContent = 'Server ID';
    const value = document.createElement('code');
    value.textContent = serverId;
    value.title = serverId;
    idLine.append(label, value);
    card.appendChild(idLine);
  }

  const actions = document.createElement('div');
  actions.className = 'server-join-actions';
  if (serverId) {
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-quiet server-join-copy';
    copyButton.type = 'button';
    copyButton.textContent = 'Copy server ID';
    copyButton.addEventListener('click', async () => {
      await window.api.copyText?.(serverId);
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = 'Copy server ID'; }, 1200);
    });
    actions.appendChild(copyButton);
  }

  const useButton = document.createElement('button');
  useButton.className = 'btn btn-primary server-detail-use server-join-use';
  useButton.type = 'button';
  useButton.disabled = !joinUrl;
  useButton.textContent = exact ? 'Load exact server' : 'Load experience';
  useButton.addEventListener('click', () => loadSessionJoinTarget(joinUrl, exact ? serverId : ''));
  actions.appendChild(useButton);
  card.appendChild(actions);
  return card;
}

function serverDetailRow(label, value, copyValue = '', action = null) {
  const row = document.createElement('div');
  row.className = 'server-detail-row';
  const copy = document.createElement('div');
  const name = document.createElement('span');
  name.textContent = label;
  const content = document.createElement('strong');
  content.textContent = value || 'Unavailable';
  copy.append(name, content);
  row.appendChild(copy);
  const buttons = document.createElement('aside');
  buttons.className = 'server-detail-actions';
  if (copyValue) {
    const button = document.createElement('button');
    button.className = 'btn btn-quiet server-detail-copy';
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      await window.api.copyText?.(copyValue);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1200);
    });
    buttons.appendChild(button);
  }
  if (action?.label && typeof action.onClick === 'function') {
    const button = document.createElement('button');
    button.className = 'btn btn-quiet server-detail-use';
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    buttons.appendChild(button);
  }
  if (buttons.childElementCount) row.appendChild(buttons);
  return row;
}

function tarotSessionKey(session) {
  return JSON.stringify([session.accountId, session.startedAt]);
}

function renderSessions() {
  if (!sessionsList || !sessionCount) return;
  const linkChoices = new Map([...sessionsList.querySelectorAll('.session-unlinked')].map(item => [item.dataset.sessionToken, item.querySelector('select')?.value || '']));
  sessionsList.innerHTML = '';
  updateDashboardFreezeButton();
  if (closeAllSessionsBtn) closeAllSessionsBtn.disabled = activeSessions.length === 0;
  const linkedCount = activeSessions.filter(session => !session.unassigned).length;
  const unlinkedCount = activeSessions.length - linkedCount;
  sessionCount.textContent = [
    linkedCount ? `${linkedCount} tracked session${linkedCount === 1 ? '' : 's'}` : '',
      unlinkedCount ? `${unlinkedCount} tracked without an account` : ''
  ].filter(Boolean).join(' · ') || 'No open sessions';

  if (activeSessions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'session-empty';
    empty.textContent = 'Open Roblox from the website, the Roblox app, or SAM to start tracking.';
    sessionsList.appendChild(empty);
    return;
  }

  const tarotCards = document.body.dataset.theme === 'lord-of-the-mysteries'
    ? sessionTarotDeck.cardsForSessions(activeSessions.filter(session => !session.unassigned).map(tarotSessionKey))
    : null;

  for (const session of activeSessions) {
    if (session.unassigned) {
      const item = document.createElement('div');
      item.className = 'session-item session-unlinked';
      item.dataset.sessionToken = session.accountId;
      const info = document.createElement('div');
      info.className = 'session-info';
      const name = document.createElement('strong');
      name.textContent = 'Open Roblox window';
      const note = document.createElement('span');
      note.textContent = 'Tracking time · Link the account already signed in';
      info.append(name, note);
      const choices = document.createElement('select');
      choices.className = 'session-link-account';
      choices.setAttribute('aria-label', 'Account signed in to this Roblox window');
      const placeholder = document.createElement('option');
      placeholder.value = ''; placeholder.textContent = 'Signed-in account…'; choices.appendChild(placeholder);
      for (const account of accounts) {
        const option = document.createElement('option');
        option.value = account.id; option.textContent = account.username; choices.appendChild(option);
      }
      choices.value = linkChoices.get(session.accountId) || '';
      const link = document.createElement('button');
      link.className = 'btn btn-quiet session-link'; link.textContent = 'Link'; link.disabled = !choices.value;
      choices.addEventListener('change', () => { link.disabled = !choices.value; });
      link.addEventListener('click', async () => {
        link.disabled = true;
        try { await window.api.linkSessionAccount(session.accountId, choices.value); await refreshSessions({ fast: true }); }
        catch (error) { showToast(error.message, 'error'); link.disabled = !choices.value; }
      });
      const close = document.createElement('button');
      close.className = 'btn btn-danger-subtle session-close'; close.textContent = 'Close';
      close.addEventListener('click', async () => {
        close.disabled = true;
        try { await window.api.forceQuitRoblox([session.accountId]); await refreshSessions({ fast: true }); }
        catch (error) { showToast(error.message, 'error'); close.disabled = false; }
      });
      const actions = document.createElement('div');
      actions.className = 'session-item-actions'; actions.append(link, close);
      item.append(info, choices, actions); sessionsList.appendChild(item);
      continue;
    }
    const item = document.createElement('div');
    item.className = `session-item${session.reconnecting ? ' session-reconnecting' : ''}`;
    decorateSealSession(item, session);

    const avatar = document.createElement('img');
    avatar.src = currentAvatarUrl(session.avatarUrl) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" rx="10" fill="%23242a34"/%3E%3C/svg%3E';
    avatar.alt = '';
    const portrait = document.createElement('span');
    portrait.className = 'session-avatar';
    portrait.appendChild(avatar);

    const info = document.createElement('div');
    info.className = 'session-info';
    const name = document.createElement('strong');
    name.textContent = session.username;
    const meta = document.createElement('span');
    meta.textContent = session.reconnecting
      ? `${session.targetLabel || 'Roblox'} • confirming process • last PID ${session.pids?.[0] || '—'}`
      : `${session.targetLabel || 'Roblox'} • ${formatSessionAge(session.startedAt)} • PID ${session.pids?.[0] || '—'}${session.sleep ? ' • Frozen' : ''}`;
    info.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'session-item-actions';

    const detailsButton = document.createElement('button');
    detailsButton.className = 'btn btn-quiet session-details-toggle';
    detailsButton.type = 'button';
    const detailsExpanded = expandedSessionDetails.has(String(session.accountId));
    detailsButton.textContent = detailsExpanded ? 'Hide' : 'Details';

    const sleepButton = document.createElement('button');
    sleepButton.className = `btn btn-quiet session-sleep-toggle${session.sleep ? ' active' : ''}`;
    sleepButton.type = 'button';
    sleepButton.textContent = session.sleep ? 'Wake' : 'Freeze';
    sleepButton.disabled = !!session.reconnecting;
    sleepButton.addEventListener('click', () => session.sleep ? resumeAccountIds([session.accountId]) : sleepAccountIds([session.accountId]));

    const close = document.createElement('button');
    close.className = 'btn btn-danger-subtle session-close';
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', async () => {
      close.disabled = true;
      try {
        await window.api.forceQuitRoblox([session.accountId]);
        await refreshSessions();
      } catch (err) {
        showToast(`Could not close ${session.username}: ${err.message}`, 'error');
      }
    });

    actions.append(detailsButton, sleepButton, close);
    item.append(portrait, info, actions);
    const card = tarotCards?.get(tarotSessionKey(session));
    if (card) {
      const cardName = document.createElement('span');
      cardName.className = 'session-tarot-name';
      cardName.textContent = card.name;
      portrait.dataset.tarotSymbol = card.symbol;
      item.style.setProperty('--session-tarot-ink', card.color);
      item.appendChild(cardName);
    }

    const details = document.createElement('div');
    details.className = 'session-server-details';
    details.hidden = !detailsExpanded;
    item.classList.toggle('details-open', detailsExpanded);
    const region = session.serverRegion?.label || (session.machineAddress ? 'Lookup off or unavailable' : 'Waiting for Roblox server');
    const joinUrl = sessionJoinUrl(session);
    details.append(
      serverDetailRow('Experience', session.targetLabel || 'Roblox'),
      serverDetailRow('Place ID', session.placeId ? String(session.placeId) : '', session.placeId ? String(session.placeId) : ''),
      serverDetailRow('Approximate region', region),
      serverDetailRow('Server address', session.machineAddress || '', session.machineAddress || ''),
      serverDetailRow('Time in server', formatSessionAge(session.joinedAt || session.startedAt)),
      serverJoinCard(session, joinUrl)
    );
    detailsButton.addEventListener('click', () => {
      details.hidden = !details.hidden;
      if (details.hidden) expandedSessionDetails.delete(String(session.accountId));
      else expandedSessionDetails.add(String(session.accountId));
      detailsButton.textContent = details.hidden ? 'Details' : 'Hide';
      item.classList.toggle('details-open', !details.hidden);
    });
    item.appendChild(details);
    sessionsList.appendChild(item);
  }
}

async function refreshSessions(options = {}) {
  try {
    activeSessions = await window.api.listSessions?.({ fast: options?.fast === true }) || [];
  } catch (err) {
    // Keep the last good dashboard instead of flashing every session away when
    // one IPC/process scan refresh fails.
    console.warn('Could not refresh tracked sessions:', err);
  }
  const currentIds = new Set(activeSessions.map(session => String(session.accountId)));
  for (const accountId of expandedSessionDetails) {
    if (!currentIds.has(accountId)) expandedSessionDetails.delete(accountId);
  }
  renderSessions();
  const runningIds = new Set(activeSessions.map(session => session.accountId));
  accountsList?.querySelectorAll('.account-card').forEach(card => {
    card.classList.toggle('running', runningIds.has(card.dataset.accountId));
  });
}

refreshSessionsBtn?.addEventListener('click', refreshSessions);
closeAllSessionsBtn?.addEventListener('click', async () => {
  const sessions = [...activeSessions];
  if (sessions.length === 0) return;
  const confirmed = await sealConfirm(`Close all ${sessions.length} open Roblox session${sessions.length === 1 ? '' : 's'}?`);
  if (!confirmed) return;

  closeAllSessionsBtn.disabled = true;
  closeAllSessionsBtn.textContent = 'Closing…';
  try {
    await window.api.forceQuitRoblox(sessions.map(session => session.accountId));
    await refreshSessions();
    showToast('All open Roblox sessions were closed.', 'success', 3500);
  } catch (err) {
    showToast(`Could not close every session: ${err.message}`, 'error', 6000);
  } finally {
    closeAllSessionsBtn.textContent = 'Close all';
    closeAllSessionsBtn.disabled = activeSessions.length === 0;
  }
});

async function activeSessionForAccount(accountId) {
  await refreshSessions();
  return activeSessions.find(session => session.accountId === accountId) || null;
}

function isInteractiveTarget(target) {
  return !!target.closest('button, input, textarea, select, label, a');
}

function setSelected(id, value) {
  if (value) selected.add(id);
  else selected.delete(id);

  const card = accountsList.querySelector(`[data-account-id="${CSS.escape(id)}"]`);
  if (card) {
    card.classList.toggle('selected', selected.has(id));
    const check = card.querySelector('.account-check');
    if (check) check.checked = selected.has(id);
  }
  updateSelectionUI();
}

function beginDragSelect(id) {
  dragSelecting = true;
  dragSelectValue = !selected.has(id);
  setSelected(id, dragSelectValue);
}

function applyDragSelect(id) {
  if (!dragSelecting) return;
  setSelected(id, dragSelectValue);
}

window.addEventListener('pointerup', () => { dragSelecting = false; });
window.addEventListener('blur', () => { dragSelecting = false; });

async function persistCurrentOrder() {
  try { await window.api.reorderAccounts(accounts.map(acc => acc.id)); }
  catch (err) { console.warn('Could not save account order:', err); }
}

function moveAccountBefore(dragId, beforeId) {
  if (!dragId || dragId === beforeId) return;
  const from = accounts.findIndex(a => a.id === dragId);
  const to = accounts.findIndex(a => a.id === beforeId);
  if (from < 0 || to < 0) return;
  const [item] = accounts.splice(from, 1);
  const nextTo = accounts.findIndex(a => a.id === beforeId);
  accounts.splice(nextTo, 0, item);
  render();
  persistCurrentOrder();
}

function accountMatchesSearch(account, query) {
  if (!query) return true;
  const folderName = folderForAccount(account.id)?.name || '';
  return String(account.username || '').toLowerCase().includes(query) ||
    String(account.userId || '').includes(query) ||
    folderName.toLowerCase().includes(query);
}

function visibleAccountsForCurrentView(query = '') {
  if (query) return accounts.filter(account => accountMatchesSearch(account, query));
  if (accountFolders.length === 0) return accounts;
  if (!activeFolderId) return accounts.filter(account => !folderForAccount(account.id));
  return accounts.filter(account => folderForAccount(account.id)?.id === activeFolderId);
}

function moveFolderBefore(dragId, beforeId) {
  if (!dragId || dragId === beforeId) return;
  const from = accountFolders.findIndex(folder => folder.id === dragId);
  const to = accountFolders.findIndex(folder => folder.id === beforeId);
  if (from < 0 || to < 0) return;
  const [folder] = accountFolders.splice(from, 1);
  const nextTo = accountFolders.findIndex(item => item.id === beforeId);
  accountFolders.splice(nextTo, 0, folder);
  saveAccountFolders();
  render();
}

function accountFolderPreview(folder) {
  const stack = document.createElement('span');
  stack.className = 'folder-icon-stack';
  const members = folder
    ? folder.accountIds.map(id => accounts.find(account => account.id === id)).filter(Boolean).slice(0, 4)
    : [];

  if (!folder) {
    const home = document.createElement('span');
    home.className = 'folder-home-glyph';
    home.textContent = '⌂';
    stack.appendChild(home);
    return stack;
  }

  if (members.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'folder-home-glyph';
    empty.textContent = folder.name.slice(0, 1).toUpperCase() || 'F';
    stack.appendChild(empty);
    return stack;
  }

  for (const account of members) {
    if (account.avatarUrl) {
      const avatar = document.createElement('img');
      avatar.src = currentAvatarUrl(account.avatarUrl);
      avatar.alt = '';
      stack.appendChild(avatar);
    } else {
      const initials = document.createElement('span');
      initials.textContent = String(account.username || '?').slice(0, 1).toUpperCase();
      stack.appendChild(initials);
    }
  }
  return stack;
}

function createFolderTile(folder) {
  const folderId = folder?.id || '';
  const memberCount = folder
    ? folder.accountIds.filter(id => accounts.some(account => account.id === id)).length
    : accounts.filter(account => !folderForAccount(account.id)).length;
  const tile = document.createElement('div');
  tile.className = 'account-folder-tile';
  tile.dataset.folderId = folderId;
  tile.style.setProperty('--folder-color', folder ? normalizeFolderColor(folder.color) : '#74787d');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `account-folder-icon${activeFolderId === folderId ? ' active' : ''}`;
  button.title = folder
    ? `${folder.name}: ${memberCount} account${memberCount === 1 ? '' : 's'}. Click to open; drag to move the folder.`
    : `Unfiled: ${memberCount} account${memberCount === 1 ? '' : 's'}. Drop an account here to remove it from a folder.`;
  button.appendChild(accountFolderPreview(folder));
  const name = document.createElement('span');
  name.className = 'folder-icon-name';
  name.textContent = folder?.name || 'Unfiled';
  const count = document.createElement('span');
  count.className = 'folder-icon-count';
  count.textContent = String(memberCount);
  button.append(name, count);
  button.addEventListener('click', () => {
    setActiveFolder(activeFolderId === folderId && folder ? '' : folderId);
    render();
  });

  if (folder) {
    button.draggable = true;
    button.addEventListener('dragstart', event => {
      folderReorderDragId = folder.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-seal-folder', folder.id);
      tile.classList.add('reordering');
    });
    button.addEventListener('dragend', () => {
      folderReorderDragId = null;
      tile.classList.remove('reordering');
      accountsList.querySelectorAll('.folder-drag-over').forEach(node => node.classList.remove('folder-drag-over'));
    });
  }

  button.addEventListener('dragover', event => {
    if (!reorderDragId && (!folderReorderDragId || folderReorderDragId === folderId)) return;
    event.preventDefault();
    tile.classList.add('folder-drag-over');
  });
  button.addEventListener('dragleave', () => tile.classList.remove('folder-drag-over'));
  button.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();
    tile.classList.remove('folder-drag-over');
    if (reorderDragId) {
      assignAccountFolder(reorderDragId, folderId);
      setActiveFolder(folderId);
      reorderDragId = null;
      render();
      return;
    }
    if (folder && folderReorderDragId) moveFolderBefore(folderReorderDragId, folder.id);
  });

  tile.appendChild(button);
  if (folder) {
    const memberIds = folder.accountIds.filter(id => accounts.some(account => account.id === id));
    const allSelected = memberIds.length > 0 && memberIds.every(id => selected.has(id));
    const selectFolder = document.createElement('button');
    selectFolder.className = `folder-icon-select${allSelected ? ' active' : ''}`;
    selectFolder.type = 'button';
    selectFolder.innerHTML = allSelected ? '&minus;' : '&#10003;';
    selectFolder.disabled = memberIds.length === 0;
    selectFolder.title = allSelected
      ? `Clear ${folder.name} from selection`
      : `Select all ${memberIds.length} accounts in ${folder.name}`;
    selectFolder.setAttribute('aria-label', selectFolder.title);
    selectFolder.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      for (const id of memberIds) {
        if (allSelected) selected.delete(id);
        else selected.add(id);
      }
      render();
    });
    tile.appendChild(selectFolder);

    const edit = document.createElement('button');
    edit.className = 'folder-icon-edit';
    edit.type = 'button';
    edit.textContent = '•••';
    edit.title = `Edit ${folder.name}`;
    edit.addEventListener('click', () => openFolderEditor(folder.id));
    tile.appendChild(edit);
  }
  return tile;
}

function createFolderDock() {
  const dock = document.createElement('section');
  dock.className = `account-folder-dock${folderDockCollapsed ? ' collapsed' : ''}`;
  const label = document.createElement('div');
  label.className = 'folder-dock-label';
  const labelCopy = document.createElement('div');
  labelCopy.className = 'folder-dock-copy';
  const labelTitle = document.createElement('strong');
  labelTitle.textContent = 'Folders';
  const labelHint = document.createElement('span');
  labelHint.textContent = folderDockCollapsed
    ? `${accountFolders.length} hidden folder${accountFolders.length === 1 ? '' : 's'}`
    : 'Click to open · drag to reorder · drop accounts to move';
  labelCopy.append(labelTitle, labelHint);

  const collapse = document.createElement('button');
  collapse.className = 'folder-stack-toggle';
  collapse.type = 'button';
  collapse.setAttribute('aria-expanded', String(!folderDockCollapsed));
  collapse.title = folderDockCollapsed ? 'Show every folder' : 'Collapse folders into one stack';
  const collapseStack = document.createElement('span');
  collapseStack.className = 'folder-collapse-stack';
  for (const folder of accountFolders.slice(0, 3)) {
    const layer = document.createElement('i');
    layer.style.setProperty('--stack-color', normalizeFolderColor(folder.color));
    collapseStack.appendChild(layer);
  }
  const collapseText = document.createElement('span');
  collapseText.textContent = folderDockCollapsed ? 'Show folders' : 'Hide folders';
  collapse.append(collapseStack, collapseText);
  collapse.addEventListener('click', () => {
    folderDockCollapsed = !folderDockCollapsed;
    localStorage.setItem(FOLDER_DOCK_COLLAPSED_KEY, String(folderDockCollapsed));
    render();
  });
  label.append(labelCopy, collapse);
  dock.appendChild(label);

  const icons = document.createElement('div');
  icons.className = 'folder-icon-row';
  icons.appendChild(createFolderTile(null));
  for (const folder of accountFolders) icons.appendChild(createFolderTile(folder));
  icons.addEventListener('dragover', event => {
    if (folderReorderDragId && event.target === icons) event.preventDefault();
  });
  icons.addEventListener('drop', event => {
    if (!folderReorderDragId || event.target !== icons) return;
    event.preventDefault();
    const from = accountFolders.findIndex(folder => folder.id === folderReorderDragId);
    if (from < 0) return;
    const [folder] = accountFolders.splice(from, 1);
    accountFolders.push(folder);
    saveAccountFolders();
    render();
  });
  dock.appendChild(icons);
  accountsList.appendChild(dock);
}

function createFolderWorkspace(query, visibleAccounts) {
  const section = document.createElement('section');
  section.className = 'account-folder-workspace';
  const heading = document.createElement('div');
  heading.className = 'account-folder-workspace-head';
  const title = document.createElement('div');
  const activeFolder = accountFolders.find(folder => folder.id === activeFolderId);
  const name = document.createElement('strong');
  name.textContent = query ? 'Search results' : (activeFolder?.name || 'Unfiled accounts');
  const count = document.createElement('span');
  count.textContent = `${visibleAccounts.length} account${visibleAccounts.length === 1 ? '' : 's'}`;
  title.append(name, count);
  heading.appendChild(title);
  if (!query && activeFolder) {
    const actions = document.createElement('div');
    actions.className = 'folder-workspace-actions';
    const memberIds = activeFolder.accountIds.filter(id => accounts.some(account => account.id === id));
    const allFolderSelected = memberIds.length > 0 && memberIds.every(id => selected.has(id));
    const allFolderFrozen = freezeTargetsAreActive(memberIds);
    const selectFolder = document.createElement('button');
    selectFolder.className = 'btn btn-quiet folder-select-btn';
    selectFolder.type = 'button';
    selectFolder.disabled = memberIds.length === 0;
    selectFolder.textContent = allFolderSelected ? 'Clear folder selection' : 'Select folder';
    selectFolder.addEventListener('click', () => {
      for (const id of memberIds) {
        if (allFolderSelected) selected.delete(id);
        else selected.add(id);
      }
      render();
    });
    const sleepFolder = document.createElement('button');
    sleepFolder.className = 'btn btn-quiet folder-sleep-btn';
    sleepFolder.type = 'button';
    sleepFolder.disabled = memberIds.length === 0;
    sleepFolder.textContent = allFolderFrozen ? 'Wake folder' : 'Freeze folder';
    sleepFolder.title = 'Freeze or wake every running Roblox account in this folder';
    sleepFolder.addEventListener('click', () => toggleFreezeAccountIds(memberIds));
    const edit = document.createElement('button');
    edit.className = 'btn btn-quiet folder-edit-btn';
    edit.type = 'button';
    edit.textContent = 'Edit folder';
    edit.addEventListener('click', () => openFolderEditor(activeFolder.id));
    actions.append(selectFolder, sleepFolder, edit);
    heading.appendChild(actions);
  }
  const grid = document.createElement('div');
  grid.className = 'account-folder-grid';
  section.append(heading, grid);
  accountsList.appendChild(section);
  return grid;
}

async function togglePinned(id) {
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  acc.pinned = !acc.pinned;
  await window.api.setPinned(id, acc.pinned);
  await refresh();
}


let accountRenderPending = false;
accountsList.addEventListener('focusout', () => {
  setTimeout(() => {
    if (accountRenderPending && !accountsList.contains(document.activeElement)) render();
  }, 0);
});
function render() {
  if (accountsList.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) {
    accountRenderPending = true;
    return;
  }
  accountRenderPending = false;
  accountsList.innerHTML = '';
  if (activeFolderId && !accountFolders.some(folder => folder.id === activeFolderId)) setActiveFolder('');
  const query = String(accountSearchInput?.value || '').trim().toLowerCase();
  const visibleAccounts = visibleAccountsForCurrentView(query);
  emptyState.hidden = visibleAccounts.length > 0;
  if (accountTotal) accountTotal.textContent = String(accounts.length);
  const runningIds = new Set(activeSessions.map(session => session.accountId));
  const hasFolders = accountFolders.length > 0;
  accountsList.classList.toggle('has-folders', hasFolders);
  if (hasFolders) createFolderDock();
  const cardsTarget = hasFolders ? createFolderWorkspace(query, visibleAccounts) : accountsList;

  for (const acc of visibleAccounts) {
    const card = document.createElement('div');
    card.className = 'account-card' + (selected.has(acc.id) ? ' selected' : '');
    card.dataset.accountId = acc.id;
    if (frozenAccounts.has(acc.id)) card.classList.add('frozen');
    if (runningIds.has(acc.id)) card.classList.add('running');

    card.title = 'Click or drag across cards to select. Use the move handle to reorder or move this account into a folder.';
    card.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      beginDragSelect(acc.id);
    });

    card.addEventListener('pointerenter', () => { applyDragSelect(acc.id); });

    // Checkbox
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'account-check';
    check.checked = selected.has(acc.id);
    check.addEventListener('change', () => setSelected(acc.id, check.checked));
    card.appendChild(check);

    // Number badge (slot position, 1-indexed)
    const numberBadge = document.createElement('span');
    numberBadge.className = 'account-number';
    numberBadge.textContent = accounts.indexOf(acc) + 1;
    numberBadge.title = 'Account #' + (accounts.indexOf(acc) + 1);
    card.appendChild(numberBadge);

    const pinBtn = document.createElement('button');
    pinBtn.className = 'btn-icon btn-pin' + (acc.pinned ? ' pinned' : '');
    pinBtn.textContent = acc.pinned ? '★' : '☆';
    pinBtn.title = acc.pinned ? 'Unpin account' : 'Pin account to top';
    pinBtn.addEventListener('click', () => togglePinned(acc.id));
    card.appendChild(pinBtn);

    const dragHandle = document.createElement('button');
    dragHandle.type = 'button';
    dragHandle.className = 'btn-icon drag-handle';
    dragHandle.textContent = '⠿';
    dragHandle.title = 'Drag to reorder or move into a folder';
    dragHandle.draggable = true;
    dragHandle.addEventListener('pointerdown', (event) => {
      // Do not let handle presses start drag-select. This area is reorder-only.
      event.stopPropagation();
    });
    dragHandle.addEventListener('click', (event) => {
      // Reorder handle is not a select button.
      event.preventDefault();
      event.stopPropagation();
    });
    dragHandle.addEventListener('dragstart', (event) => {
      reorderDragId = acc.id;
      dragSelecting = false;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', acc.id);
      card.classList.add('reordering');
    });
    dragHandle.addEventListener('dragend', () => {
      reorderDragId = null;
      card.classList.remove('reordering');
      accountsList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      accountsList.querySelectorAll('.folder-drag-over').forEach(el => el.classList.remove('folder-drag-over'));
    });
    card.addEventListener('dragover', (event) => {
      if (!reorderDragId || reorderDragId === acc.id) return;
      event.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (event) => {
      if (!reorderDragId) return;
      event.preventDefault();
      card.classList.remove('drag-over');
      assignAccountFolder(reorderDragId, folderForAccount(acc.id)?.id || '');
      moveAccountBefore(reorderDragId, acc.id);
    });
    card.appendChild(dragHandle);

    // Avatar
    const avatar = document.createElement('img');
    avatar.className = 'account-avatar';
    avatar.src = currentAvatarUrl(acc.avatarUrl) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" rx="20" fill="%23242935"/%3E%3C/svg%3E';
    card.appendChild(avatar);

    // Info
    const info = document.createElement('div');
    info.className = 'account-info';
    const name = document.createElement('div');
    name.className = 'account-name';
    name.textContent = acc.username;
    const uid = document.createElement('div');
    uid.className = 'account-id';
    uid.textContent = `ID ${acc.userId}`;
    info.appendChild(name);
    info.appendChild(uid);
    card.appendChild(info);

    // Cookie status badge + optional refresh button
    const status = cookieStatuses.get(acc.id);
    if (status) {
      const badge = document.createElement('span');
      badge.className = `cookie-status ${status.ok ? 'status-active' : 'status-expired'}`;
      badge.textContent = status.ok ? 'Active' : 'Expired';
      badge.title = status.ok
        ? 'Session is active.'
        : (status.error || 'Session expired — click Refresh to re-login.');
      card.appendChild(badge);

      if (!status.ok) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-ghost btn-reauth';
        refreshBtn.textContent = '↻ Refresh';
        refreshBtn.title = 'Re-login to refresh the session';
        refreshBtn.addEventListener('click', () => reauthAccount(acc.id));
        card.appendChild(refreshBtn);
      }
    }

    // In-game presence badge + check button
    const presence = presenceStatuses.get(acc.id);
    if (presence) {
      const presenceBadge = document.createElement('span');
      if (presence.checking) {
        presenceBadge.className = 'presence-status presence-checking';
        presenceBadge.textContent = 'Checking';
        presenceBadge.title = 'Status check is running...';
      } else if (presence.error) {
        presenceBadge.className = 'presence-status presence-offline';
        presenceBadge.textContent = 'Unknown';
        presenceBadge.title = presence.error;
      } else if (presence.inGame) {
        presenceBadge.className = 'presence-status presence-ingame';
        presenceBadge.textContent = 'In game';
        presenceBadge.title = presence.lastLocation ? `In game: ${presence.lastLocation}` : 'Currently in a Roblox experience';
      } else if (presence.inStudio) {
        presenceBadge.className = 'presence-status presence-online';
        presenceBadge.textContent = 'Studio';
        presenceBadge.title = 'Currently in Roblox Studio';
      } else if (presence.webOnline) {
        presenceBadge.className = 'presence-status presence-online';
        presenceBadge.textContent = 'Website';
        presenceBadge.title = 'Active on the Roblox website; no game was detected';
      } else if (presence.invisible) {
        presenceBadge.className = 'presence-status presence-offline';
        presenceBadge.textContent = 'Private';
        presenceBadge.title = 'Roblox is hiding this account’s presence';
      } else {
        presenceBadge.className = 'presence-status presence-offline';
        presenceBadge.textContent = 'Offline';
        presenceBadge.title = 'Offline';
      }
      card.appendChild(presenceBadge);
    }

    const presenceBtn = document.createElement('button');
    presenceBtn.className = 'btn btn-ghost btn-presence';
    presenceBtn.textContent = 'Status';
    presenceBtn.title = "Check whether this account is offline, online, in Studio, or in game";
    presenceBtn.addEventListener('click', () => checkPresence(acc.id));
    card.appendChild(presenceBtn);

    // FPS cap
    const fpsField = document.createElement('div');
    fpsField.className = 'fps-field';
    const fpsLabel = document.createElement('label');
    fpsLabel.textContent = uiPrefs.labels.fpsCap || 'FPS cap';
    const fpsWarning = document.createElement('span');
    fpsWarning.className = 'fps-low-warning';
    fpsWarning.textContent = ' ⚠';
    fpsWarning.title = 'Very low FPS caps may make Roblox appear frozen or prevent a game from loading normally.';
    fpsWarning.hidden = true;
    fpsLabel.appendChild(fpsWarning);
    const fpsInput = document.createElement('input');
    fpsInput.type = 'number';
    fpsInput.min = '1';
    fpsInput.step = '1';
    fpsInput.placeholder = '60';
    fpsInput.value = String(acc.fpsCap || 60);
    fpsInput.title = 'Any positive whole number. Empty, zero, or a negative value safely resets to 60 FPS.';
    const updateFpsWarning = () => {
      const value = Math.floor(Number(fpsInput.value));
      const veryLow = Number.isFinite(value) && value > 0 && value < 5;
      fpsWarning.hidden = !veryLow;
      fpsField.classList.toggle('has-low-fps', veryLow);
    };
    async function saveCardSettings() {
      const fps = normalizeFpsCap(fpsInput.value);
      fpsInput.value = fps ? String(fps) : '';
      const graphicsQuality = readCardGraphicsQuality(gfxInput, acc.id);
      if (!gfxInput.disabled) gfxInput.value = String(graphicsQuality);
      const fastFlagPreset = ffSelect.value || 'max';
      const volume = Math.max(0, Math.min(10, parseInt(volumeInput.value, 10) || 0));
      volumeInput.value = String(volume);
      const saved = await window.api.setLaunchSettings(acc.id, {
        fpsCap: fps,
        graphicsQuality,
        fastFlagPreset,
        volume
      });
      acc.fpsCap = saved.fpsCap;
      acc.graphicsQuality = saved.graphicsQuality;
      acc.fastFlagPreset = saved.fastFlagPreset;
      acc.volume = saved.volume;
    }

    fpsInput.addEventListener('change', async () => {
      await saveCardSettings();
      updateFpsWarning();
    });
    fpsInput.addEventListener('input', updateFpsWarning);
    updateFpsWarning();
    fpsField.appendChild(fpsLabel);
    fpsField.appendChild(fpsInput);
    card.appendChild(fpsField);

    // Graphics quality 1-10
    const gfxField = document.createElement('div');
    gfxField.className = 'graphics-field';
    const gfxLabel = document.createElement('label');
    gfxLabel.textContent = uiPrefs.labels.graphics || 'Graphics\nquality';
    const gfxInput = document.createElement('input');
    gfxInput.type = 'number';
    gfxInput.min = '1';
    gfxInput.max = '10';
    const initialFastFlagPreset = acc.fastFlagPreset || 'max';
    gfxInput.value = acc.graphicsQuality || 1;
    gfxInput.title = 'Roblox graphics quality: 1 = lowest, 10 = highest. This stays available when Performance is Off.';
    gfxInput.addEventListener('change', async () => {
      await saveCardSettings();
    });
    gfxField.appendChild(gfxLabel);
    gfxField.appendChild(gfxInput);
    card.appendChild(gfxField);

    // FastFlags preset
    const ffField = document.createElement('div');
    ffField.className = 'fastflags-field';
    const ffLabel = document.createElement('label');
    ffLabel.textContent = uiPrefs.labels.fastFlags || 'FF';
    const ffSelect = document.createElement('select');
    ffSelect.title = 'Off removes Seal boost flags and keeps your chosen graphics level. Relaunch a running account with Apply to see the change.';
    populatePerformanceSelect(ffSelect, initialFastFlagPreset, true);
    const updateGraphicsMode = () => {
      gfxInput.disabled = false;
      gfxInput.placeholder = '1';
      gfxInput.value = String(acc.graphicsQuality || 1);
    };
    updateGraphicsMode();
    ffSelect.addEventListener('change', async () => {
      if (ffSelect.value === '__manage_presets__') {
        ffSelect.value = acc.fastFlagPreset || 'off';
        closeCustomize();
        closeTime();
        setPrimaryNav(launcherNavBtn);
        await openLauncher('presets');
        return;
      }
      try {
        await saveCardSettings();
        updateGraphicsMode();
        if (ffSelect.value === 'off') {
          showToast('Seal boost flags removed. Your graphics level is unchanged. Use Apply to relaunch a running account.', 'info', 6500);
        } else {
          showToast('Performance preset saved. Use Apply to relaunch a running account.', 'info', 4000);
        }
      } catch (error) {
        ffSelect.value = acc.fastFlagPreset || 'off';
        updateGraphicsMode();
        showToast(`Could not change performance settings: ${error.message}`, 'error', 7000);
      }
    });
    ffField.appendChild(ffLabel);
    ffField.appendChild(ffSelect);
    card.appendChild(ffField);

    // Roblox master volume, 0-10. New accounts default to 1 so alt sessions stay quiet.
    const volumeField = document.createElement('div');
    volumeField.className = 'volume-field';
    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = 'Volume';
    const volumeInput = document.createElement('input');
    volumeInput.type = 'number';
    volumeInput.min = '0';
    volumeInput.max = '10';
    volumeInput.step = '1';
    volumeInput.value = Number.isFinite(Number(acc.volume)) ? String(acc.volume) : '1';
    volumeInput.title = 'Roblox master volume: 0 is muted, 1 is the quiet default, and 10 is full volume';
    volumeInput.addEventListener('change', saveCardSettings);
    volumeField.append(volumeLabel, volumeInput);
    card.appendChild(volumeField);

    // Relaunch with new FPS cap / graphics quality / FastFlags — closes this account's Roblox (if running)
    // and relaunches with the FPS field's current value applied.
    const relaunchBtn = document.createElement('button');
    relaunchBtn.className = 'btn btn-ghost btn-relaunch';
    relaunchBtn.disabled = launchingAccountIds.has(acc.id);
    relaunchBtn.textContent = launchingAccountIds.has(acc.id) ? '...' : (uiPrefs.labels.apply || '↻ Apply');
    relaunchBtn.title = 'Save FPS, graphics, performance, and volume; then relaunch this account with them applied';
    relaunchBtn.addEventListener('click', () => relaunchWithSettings(acc.id, fpsInput, gfxInput, ffSelect, volumeInput));
    card.appendChild(relaunchBtn);

    // Launch button
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play';
    playBtn.title = 'Launch this account';
    playBtn.disabled = launchingAccountIds.has(acc.id);
    playBtn.textContent = launchingAccountIds.has(acc.id) ? '…' : '▶';
    playBtn.addEventListener('click', async () => {
      if (launchingAccountIds.has(acc.id)) return;
      setAccountsOperationBusy([acc.id], true);
      try {
        await saveCardSettings();
        await launchSingle(acc.id);
      } catch (err) {
        showToast(`Could not launch ${accountLabel(acc.id)}: ${err.message || err}`, 'error');
      } finally {
        // Session refreshes can rebuild the account card while Roblox starts,
        // so restore both operation buttons on whichever card is current.
        setAccountsOperationBusy([acc.id], false);
      }
    });
    card.appendChild(playBtn);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon';
    removeBtn.title = 'Remove account';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => removeAccount(acc.id));
    card.appendChild(removeBtn);

    cardsTarget.appendChild(card);
  }

  updateSelectionUI();
}

function updateSelectionUI() {
  for (const id of [...selected]) {
    if (!accounts.find(a => a.id === id)) selected.delete(id);
  }
  for (const id of [...cookieStatuses.keys()]) {
    if (!accounts.find(a => a.id === id)) cookieStatuses.delete(id);
  }
  for (const id of [...presenceStatuses.keys()]) {
    if (!accounts.find(a => a.id === id)) presenceStatuses.delete(id);
  }
  selectedCountEl.textContent = `${selected.size} selected`;
  if (selectedTotal) selectedTotal.textContent = String(selected.size);
  if (selectedLaunchCount) selectedLaunchCount.textContent = String(selected.size);
  if (selectAllBtn) {
    const query = String(accountSearchInput?.value || '').trim().toLowerCase();
    const visibleAccounts = visibleAccountsForCurrentView(query);
    const allSelected = visibleAccounts.length > 0 && visibleAccounts.every(account => selected.has(account.id));
    selectAllBtn.textContent = allSelected ? 'Clear selection' : 'Select all';
    selectAllBtn.disabled = visibleAccounts.length === 0;
  }
  launchSelectedBtn.disabled = selected.size === 0;
  if (bulkConfigBtn) bulkConfigBtn.disabled = accounts.length === 0;
  forceQuitBtn.disabled = selected.size === 0;
  checkSelectedStatusBtn.disabled = selected.size === 0;
  updateDashboardFreezeButton();
  freezeSelectedBtn.disabled = selected.size === 0;
  unfreezeSelectedBtn.disabled = selected.size === 0;
}

selectAllBtn?.addEventListener('click', () => {
  const query = String(accountSearchInput?.value || '').trim().toLowerCase();
  const visibleAccounts = visibleAccountsForCurrentView(query);
  const shouldSelectAll = visibleAccounts.some(account => !selected.has(account.id));
  if (!query) selected.clear();
  if (shouldSelectAll) {
    for (const account of visibleAccounts) selected.add(account.id);
  } else {
    for (const account of visibleAccounts) selected.delete(account.id);
  }
  render();
});

let searchRenderTimer = 0;
accountSearchInput?.addEventListener('input', () => {
  clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, 80);
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// launchBatchStep already waits for a stable new Roblox PID. This tiny handoff
// keeps the UI responsive without adding another several-second blind delay.
const BATCH_LAUNCH_HANDOFF_MS = 0;

function accountLabel(id) {
  const acc = accounts.find(a => a.id === id);
  return acc?.username || id;
}


const GAME_FAVORITES_KEY = 'sealGameFavorites';

function normalizeFavorite(item) {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || '').trim();
  const target = String(item.target || '').trim();
  if (!name || !target) return null;
  return { name, target };
}

function loadGameFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GAME_FAVORITES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const out = [];
    for (const item of parsed) {
      const fav = normalizeFavorite(item);
      if (!fav) continue;
      const key = `${fav.name.toLowerCase()}|${fav.target.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(fav);
    }
    return out;
  } catch {
    return [];
  }
}

function saveGameFavorites(favorites) {
  const clean = favorites.map(normalizeFavorite).filter(Boolean).slice(0, 50);
  localStorage.setItem(GAME_FAVORITES_KEY, JSON.stringify(clean));
  return clean;
}

function setGameFavoriteStatus(message, isError = false) {
  if (!gameFavoriteStatus) return;
  gameFavoriteStatus.textContent = message || '';
  gameFavoriteStatus.classList.toggle('error', Boolean(isError));
  if (message && !isError) {
    window.clearTimeout(setGameFavoriteStatus._timer);
    setGameFavoriteStatus._timer = window.setTimeout(() => {
      if (gameFavoriteStatus.textContent === message) gameFavoriteStatus.textContent = '';
    }, 2500);
  }
}

function favoriteNameFromTarget(target) {
  const placeMatch = target.match(/roblox\.com\/games\/(\d+)/i) || target.match(/^\s*(\d{3,})\s*$/);
  if (placeMatch) return `Game ${placeMatch[1]}`;
  const trimmed = target.replace(/^https?:\/\//i, '').replace(/^www\./i, '').slice(0, 36);
  return trimmed || 'Saved game';
}

function renderGameFavorites(selectTarget = '') {
  if (!gameFavoriteSelect) return;
  const selectedValue = selectTarget || gameFavoriteSelect.value;
  gameFavoriteSelect.innerHTML = '<option value="">Choose a saved server</option>';
  for (const fav of loadGameFavorites()) {
    const option = document.createElement('option');
    option.value = fav.target;
    option.textContent = fav.name;
    option.title = fav.target;
    gameFavoriteSelect.appendChild(option);
  }
  if ([...gameFavoriteSelect.options].some(o => o.value === selectedValue)) {
    gameFavoriteSelect.value = selectedValue;
  } else {
    gameFavoriteSelect.value = '';
  }
  if (deleteGameFavoriteBtn) deleteGameFavoriteBtn.disabled = !gameFavoriteSelect.value;
  renderServerLibrary();
}

function addGameFavoriteFromJoinTarget() {
  const target = serverTargetInput?.value.trim() || joinUsernameInput?.value.trim() || '';
  if (!target) {
    setGameFavoriteStatus('Paste a game or private-server link first.', true);
    (serverTargetInput || joinUsernameInput)?.focus();
    return;
  }

  const name = (gameFavoriteNameInput?.value.trim() || favoriteNameFromTarget(target)).slice(0, 40);
  const favorites = loadGameFavorites()
    .filter(f => f.name.toLowerCase() !== name.toLowerCase() && f.target.toLowerCase() !== target.toLowerCase());
  favorites.push({ name, target });
  saveGameFavorites(favorites);
  renderGameFavorites(target);
  if (gameFavoriteNameInput) gameFavoriteNameInput.value = name;
  if (serverTargetInput) serverTargetInput.value = '';
  if (deleteGameFavoriteBtn) deleteGameFavoriteBtn.disabled = false;
  setGameFavoriteStatus(`Saved destination: ${name}`);
}

function renderServerLibrary() {
  if (!serverLibraryList) return;
  const favorites = loadGameFavorites();
  serverLibraryList.innerHTML = '';

  if (favorites.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'session-empty';
    empty.textContent = 'No saved destinations yet. Add a private-server link or game above.';
    serverLibraryList.appendChild(empty);
    return;
  }

  for (const favorite of favorites) {
    const item = document.createElement('div');
    item.className = 'server-item';

    const mark = document.createElement('div');
    mark.className = 'server-mark';
    mark.textContent = favorite.target.includes('privateServer') || favorite.target.includes('/share?') ? 'P' : 'G';

    const copy = document.createElement('div');
    copy.className = 'server-copy';
    const name = document.createElement('strong');
    name.textContent = favorite.name;
    const target = document.createElement('span');
    target.textContent = favorite.target;
    copy.append(name, target);

    const use = document.createElement('button');
    use.className = 'btn btn-primary';
    use.type = 'button';
    use.textContent = 'Use';
    use.addEventListener('click', () => {
      joinUsernameInput.value = favorite.target;
      renderGameFavorites(favorite.target);
      serverLibraryModal.hidden = true;
      showToast(`${favorite.name} selected.`, 'success', 2500);
    });

    const remove = document.createElement('button');
    remove.className = 'btn btn-danger-subtle';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      saveGameFavorites(loadGameFavorites().filter(item =>
        !(item.name === favorite.name && item.target === favorite.target)));
      renderGameFavorites();
      setGameFavoriteStatus(`Deleted ${favorite.name}`);
    });

    item.append(mark, copy, use, remove);
    serverLibraryList.appendChild(item);
  }
}

gameFavoriteSelect?.addEventListener('change', () => {
  const target = gameFavoriteSelect.value;
  const fav = loadGameFavorites().find(f => f.target === target);
  if (target) joinUsernameInput.value = target;
  if (gameFavoriteNameInput) gameFavoriteNameInput.value = fav?.name || '';
  if (deleteGameFavoriteBtn) deleteGameFavoriteBtn.disabled = !target;
  if (target) setGameFavoriteStatus(`Loaded favorite: ${fav?.name || target}`);
});
addGameFavoriteBtn?.addEventListener('click', addGameFavoriteFromJoinTarget);
gameFavoriteNameInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addGameFavoriteFromJoinTarget();
  }
});
deleteGameFavoriteBtn?.addEventListener('click', () => {
  const target = gameFavoriteSelect?.value;
  if (!target) return;
  const fav = loadGameFavorites().find(f => f.target === target);
  const favorites = loadGameFavorites().filter(f => f.target !== target);
  saveGameFavorites(favorites);
  renderGameFavorites();
  if (gameFavoriteNameInput) gameFavoriteNameInput.value = '';
  setGameFavoriteStatus(`Deleted favorite${fav ? `: ${fav.name}` : ''}`);
});
openServerLibraryBtn?.addEventListener('click', () => {
  if (serverTargetInput) serverTargetInput.value = joinUsernameInput?.value.trim() || '';
  renderServerLibrary();
  serverLibraryModal.hidden = false;
  gameFavoriteNameInput?.focus();
});
serverLibraryCloseBtn?.addEventListener('click', () => { serverLibraryModal.hidden = true; });
serverLibraryModal?.addEventListener('click', event => {
  if (event.target === serverLibraryModal) serverLibraryModal.hidden = true;
});
serverTargetInput?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addGameFavoriteFromJoinTarget();
  }
});
renderGameFavorites();

function buildTarget() {
  let value = joinUsernameInput.value.trim();
  if (!value) return undefined;
  const favoriteMatch = loadGameFavorites().find(f => f.name.toLowerCase() === value.toLowerCase());
  if (favoriteMatch) value = favoriteMatch.target;

  // Supports:
  // 1) Roblox username
  // 2) placeId or roblox.com/games/PLACE_ID links
  // 3) old private server links: roblox.com/games/PLACE_ID/...?...privateServerLinkCode=CODE
  // 4) new private server share links: roblox.com/share?code=CODE&type=Server
  // 5) exact public server links: /games/start?placeId=...&gameInstanceId=...
  // 6) just the 32-character share code by itself
  const placeMatch = value.match(/roblox\.com\/games\/(\d+)/i)
    || value.match(/[?&]placeId=(\d+)/i)
    || value.match(/^\s*(\d{3,})\s*$/);
  const gameInstanceMatch = value.match(/[?&](?:gameInstanceId|gameId)=([a-f0-9-]{16,64})/i);
  const oldPrivateMatch = value.match(/[?&]privateServerLinkCode=([^&#]+)/i);
  const shareCodeMatch = value.match(/[?&]code=([^&#]+).*?(?:[?&]type=Server|$)/i)
    || value.match(/^\s*([a-f0-9]{32})\s*$/i);

  if (oldPrivateMatch) {
    const code = decodeURIComponent(oldPrivateMatch[1]);
    const placeId = placeMatch ? placeMatch[1] : null;
    if (!placeId) {
      sealAlert('Old privateServerLinkCode link detected, but I could not find the placeId. Use the full roblox.com/games/... link.');
      return undefined;
    }
    return { placeId, privateServerLinkCode: code };
  }

  if (shareCodeMatch) {
    const code = decodeURIComponent(shareCodeMatch[1]);
    return { privateServerShareCode: code };
  }

  if (placeMatch && gameInstanceMatch) {
    return { placeId: placeMatch[1], gameInstanceId: decodeURIComponent(gameInstanceMatch[1]) };
  }

  if (placeMatch) return { placeId: placeMatch[1] };
  return { followUsername: value };
}

let launchAnimationTimer = 0;
function motionIsReduced() {
  return uiPrefs.reducedMotion === 'on' || (uiPrefs.reducedMotion !== 'off' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function playLaunchAnimation(label = 'Opening session') {
  if (!launchAnimationLayer || uiPrefs.launchAnimation === 'none') return;
  window.clearTimeout(launchAnimationTimer);
  const style = motionIsReduced() ? 'minimal' : (uiPrefs.launchAnimation || 'minimal');
  launchAnimationLayer.dataset.animation = style;
  const title = launchAnimationLayer.querySelector('.launch-animation-copy strong');
  if (title) title.textContent = label;
  launchAnimationLayer.hidden = false;
  launchAnimationLayer.classList.remove('active');
  window.requestAnimationFrame(() => launchAnimationLayer.classList.add('active'));
  launchAnimationTimer = window.setTimeout(() => {
    launchAnimationLayer.classList.remove('active');
    window.setTimeout(() => { launchAnimationLayer.hidden = true; }, 220);
  }, style === 'gateway' ? 1250 : 760);
}

function showStartupExperience() {
  if (!startupScreen || uiPrefs.startupScreen === 'off') return;
  const shadowTheme = uiPrefs.pageThemes?.main === 'shadow-slave' || uiPrefs.theme === 'shadow-slave';
  startupKicker.textContent = shadowTheme ? 'THE NIGHTMARE SPELL AWAKENS' : 'SEAL ACCOUNT MANAGER';
  startupTitle.textContent = shadowTheme ? 'Welcome, Awakened' : 'Welcome back';
  startupSubtitle.textContent = shadowTheme ? 'The Dream Gateway is ready' : 'Preparing your launch desk';
  startupScreen.dataset.theme = shadowTheme ? 'shadow-slave' : 'seal';
  startupScreen.dataset.mode = uiPrefs.startupScreen;
  startupScreen.hidden = false;
  window.requestAnimationFrame(() => startupScreen.classList.add('active'));
  const duration = motionIsReduced() ? 450 : (uiPrefs.startupScreen === 'full' ? 1850 : 850);
  window.setTimeout(() => {
    startupScreen.classList.remove('active');
    window.setTimeout(() => { startupScreen.hidden = true; }, 320);
  }, duration);
}

async function launchSingle(id) {
  const label = accountLabel(id);
  const existing = await activeSessionForAccount(id);
  if (existing) {
    setLaunchStatus(`${label} is already open`, 'success');
    showToast(`${label} already has a running Roblox session.`, 'info', 3500);
    return;
  }

  setLaunchStatus(`Starting ${label}…`);
  try {
    playLaunchAnimation(`Opening ${label}`);
    await window.api.launch(id, buildTarget());
    await syncAntiIdleStatus();
    await refreshSessions();
    setLaunchStatus(`${label} launched`, 'success');
    showToast(`${label} launched.`, 'success', 3000);
  } catch (err) {
    const appeared = await activeSessionForAccount(id);
    if (appeared) {
      setLaunchStatus(`${label} is open`, 'success');
      showToast(`${label} is running. Seal ignored a late launch warning.`, 'info', 4000);
    } else {
      setLaunchStatus(`${label} could not open`, 'error');
      showToast(`Could not open ${label}: ${err.message}`, 'error', 7000);
    }
  }
}

function readCardGraphicsQuality(input, accountId) {
  const value = input?.disabled
    ? accounts.find(account => account.id === accountId)?.graphicsQuality
    : input?.value;
  return Math.max(1, Math.min(10, parseInt(value, 10) || 1));
}

async function relaunchWithSettings(id, fpsInput, gfxInput, ffSelect, volumeInput) {
  if (launchingAccountIds.has(id)) {
    showToast(`${accountLabel(id)} is already launching or applying settings.`, 'info', 3500);
    return;
  }
  setAccountsOperationBusy([id], true);

  try {
    const fps = normalizeFpsCap(fpsInput.value);
    fpsInput.value = fps ? String(fps) : '';
    const graphicsQuality = readCardGraphicsQuality(gfxInput, id);
    if (!gfxInput.disabled) gfxInput.value = String(graphicsQuality);
    const fastFlagPreset = ffSelect?.value || 'off';
    const volume = Math.max(0, Math.min(10, parseInt(volumeInput?.value || '1', 10) || 0));
    if (volumeInput) volumeInput.value = String(volume);
    await window.api.relaunch(id, buildTarget(), {
      fpsCap: fps,
      graphicsQuality,
      fastFlagPreset,
      volume
    });
    await syncAntiIdleStatus();
    await refreshSessions();
  } catch (err) {
    sealAlert(`Relaunch failed: ${err.message}`);
  } finally {
    setAccountsOperationBusy([id], false);
  }
}

async function saveVisibleSettingsForId(id) {
  const card = accountsList.querySelector(`[data-account-id="${CSS.escape(id)}"]`);
  if (!card) return;

  const fpsInput = card.querySelector('.fps-field input');
  const gfxInput = card.querySelector('.graphics-field input');
  const ffSelect = card.querySelector('.fastflags-field select');
  const volumeInput = card.querySelector('.volume-field input');

  const fps = normalizeFpsCap(fpsInput?.value || '');
  if (fpsInput) fpsInput.value = fps ? String(fps) : '';
  const graphicsQuality = readCardGraphicsQuality(gfxInput, id);
  if (gfxInput && !gfxInput.disabled) gfxInput.value = String(graphicsQuality);

  const fastFlagPreset = ffSelect?.value || 'off';
  const volume = Math.max(0, Math.min(10, parseInt(volumeInput?.value || '1', 10) || 0));
  if (volumeInput) volumeInput.value = String(volume);
  await window.api.setLaunchSettings(id, {
    fpsCap: fps,
    graphicsQuality,
    fastFlagPreset,
    volume
  });
}

async function saveVisibleSettingsForIds(ids) {
  for (const id of ids) {
    await saveVisibleSettingsForId(id);
  }
}

const LAUNCH_RECOVERY_KEY = 'sealLaunchRecoveryV1';

function loadLaunchRecovery() {
  try {
    const recovery = JSON.parse(localStorage.getItem(LAUNCH_RECOVERY_KEY) || 'null');
    if (!recovery || !Array.isArray(recovery.ids) || recovery.ids.length === 0) return null;
    if (Date.now() - Number(recovery.updatedAt || 0) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(LAUNCH_RECOVERY_KEY);
      return null;
    }
    return recovery;
  } catch {
    localStorage.removeItem(LAUNCH_RECOVERY_KEY);
    return null;
  }
}

function saveLaunchRecovery(recovery) {
  localStorage.setItem(LAUNCH_RECOVERY_KEY, JSON.stringify({
    ...recovery,
    updatedAt: Date.now()
  }));
}

function clearLaunchRecovery() {
  localStorage.removeItem(LAUNCH_RECOVERY_KEY);
  if (recoveryBanner) recoveryBanner.hidden = true;
}

function showRecoveryIfAvailable() {
  if (!recoveryBanner) return;
  const recovery = loadLaunchRecovery();
  const availableIds = recovery?.ids?.filter(id => accounts.some(account => account.id === id)) || [];
  if (!recovery || availableIds.length === 0) {
    recoveryBanner.hidden = true;
    return;
  }
  const completed = Math.max(0, Math.min(availableIds.length, Number(recovery.nextIndex) || 0));
  const remaining = Math.max(1, availableIds.length - completed);
  if (recoveryText) {
    recoveryText.textContent = `${remaining} account${remaining === 1 ? '' : 's'} remained. Seal can safely rebuild the complete launch group.`;
  }
  recoveryBanner.hidden = false;
}

resumeRecoveryBtn?.addEventListener('click', () => {
  const recovery = loadLaunchRecovery();
  if (!recovery) return showRecoveryIfAvailable();
  const ids = recovery.ids.filter(id => accounts.some(account => account.id === id));
  selected.clear();
  for (const id of ids) selected.add(id);
  if (joinUsernameInput) joinUsernameInput.value = recovery.targetText || '';
  render();
  launchSelectedBtn.click();
});

dismissRecoveryBtn?.addEventListener('click', clearLaunchRecovery);

launchSelectedBtn.addEventListener('click', async () => {
  const ids = [...selected];
  if (ids.length === 0) return;
  const busyIds = busyAccountIds(ids);
  if (busyIds.length) {
    showToast(`${accountLabel(busyIds[0])} is already launching or applying settings.`, 'info', 4000);
    return;
  }

  const target = buildTarget();
  const results = [];
  const recoveryState = {
    ids,
    targetText: joinUsernameInput?.value.trim() || '',
    nextIndex: 0
  };
  saveLaunchRecovery(recoveryState);
  launchSelectedBtn.disabled = true;
  setAccountsOperationBusy(ids, true);
  playLaunchAnimation(`Opening ${ids.length} session${ids.length === 1 ? '' : 's'}`);

  try {
    // Resolve already-running selections before preparing the shared Play
    // pipeline. Launch Selected must behave like clicking the working Play
    // button on each remaining account.
    await refreshSessions({ fast: true });
    const alreadyRunningIds = new Set(activeSessions.map(session => session.accountId));
    if (ids.every(id => alreadyRunningIds.has(id))) {
      setLaunchStatus(`${ids.length} selected account${ids.length === 1 ? ' is' : 's are'} already open`, 'success');
      showToast('The selected session is already running and was left alone.', 'success');
      clearLaunchRecovery();
      return;
    }

    setLaunchStatus('Preparing multi-account launch…');
    const preparation = await window.api.prepareLaunchMultiple(false);
    if (!preparation?.ready) {
      throw new Error(preparation?.message || 'Seal could not prepare multi-account launching.');
    }
    if (preparation.preservedExisting) {
      setLaunchStatus('Keeping current Roblox windows open • adding selected accounts');
    }

    await refreshSessions({ fast: true });
    for (const session of activeSessions) alreadyRunningIds.add(session.accountId);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      recoveryState.nextIndex = i;
      saveLaunchRecovery(recoveryState);
      launchSelectedBtn.textContent = `Launching ${i + 1}/${ids.length}...`;
      if (alreadyRunningIds.has(id)) {
        results.push({ id, ok: true, alreadyRunning: true });
        setLaunchStatus(`${accountLabel(id)} is already open • continuing`);
        recoveryState.nextIndex = i + 1;
        saveLaunchRecovery(recoveryState);
        continue;
      }
      setLaunchStatus(`Starting ${accountLabel(id)} · ${i + 1} of ${ids.length}`);

      try {
        await saveVisibleSettingsForId(id);
        await window.api.launchBatchStep(id, target, i, preparation.strategy);
        results.push({ id, ok: true });
        await syncAntiIdleStatus();
      } catch (err) {
        const message = err.message || String(err);
        const appeared = await activeSessionForAccount(id);
        if (appeared) {
          results.push({ id, ok: true, alreadyRunning: true, warning: message });
          alreadyRunningIds.add(id);
        } else {
          results.push({ id, ok: false, error: message });
        }

        // Continue through the selection just like separate Play clicks; one
        // account failure must not prevent the remaining accounts from trying.
      }

      recoveryState.nextIndex = i + 1;
      saveLaunchRecovery(recoveryState);
      if (i < ids.length - 1) await delay(BATCH_LAUNCH_HANDOFF_MS);
    }

    const failed = results.filter(r => !r.ok);
    const alreadyOpen = results.filter(r => r.alreadyRunning);
    const launched = results.filter(r => r.ok && !r.alreadyRunning);
    if (failed.length) {
      setLaunchStatus(`${launched.length} launched • ${alreadyOpen.length} already open • ${failed.length} could not open`, 'error');
      showToast(
        failed.map(f => `${accountLabel(f.id)}: ${f.error}`).join(' • '),
        'error',
        9000
      );
    } else if (alreadyOpen.length) {
      setLaunchStatus(`${launched.length} launched • ${alreadyOpen.length} already open`, 'success');
      showToast('Launch group is ready. Accounts that were already open were left alone.', 'success');
    } else {
      setLaunchStatus(`${results.length} account${results.length === 1 ? '' : 's'} launched`, 'success');
      showToast('Selected accounts launched successfully.', 'success');
    }
    clearLaunchRecovery();
  } catch (err) {
    const message = err.message || String(err);
    setLaunchStatus('Launch could not start', 'error');
    showToast(message, 'error', 8000);
    clearLaunchRecovery();
  } finally {
    await window.api.finishLaunchMultiple?.().catch(() => {});
    setAccountsOperationBusy(ids, false);
    launchSelectedBtn.textContent = uiPrefs.labels.launchSelected || 'Launch selected';
    launchSelectedBtn.disabled = selected.size === 0;
    await refreshSessions();
  }
});

checkCookiesBtn.addEventListener('click', async () => {
  const ids = accounts.map(acc => acc.id);
  checkCookiesBtn.disabled = true;

  try {
    if (ids.length === 0) {
      sealAlert('No accounts to check yet.');
      return;
    }

    cookieStatuses.clear();
    const results = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      checkCookiesBtn.textContent = `Checking ${i + 1}/${ids.length}...`;
      try {
        const result = await window.api.checkCookie(id);
        cookieStatuses.set(id, result);
        results.push(result);
      } catch (err) {
        const acc = accounts.find(a => a.id === id);
        const result = {
          id,
          username: acc?.username,
          userId: acc?.userId,
          ok: false,
          status: 'expired',
          error: err.message || 'Cookie check failed'
        };
        cookieStatuses.set(id, result);
        results.push(result);
      }

      if (i < ids.length - 1) {
        await delay(600);
      }
    }

    render();

    const active = results.filter(r => r.ok).length;
    const expired = results.length - active;
    if (expired > 0) {
      sealAlert(`${active} active, ${expired} expired.\nClick ↻ Refresh on any expired account to re-login.`);
    } else {
      sealAlert(`All ${active} sessions are active.`);
    }
  } catch (err) {
    sealAlert(`Check failed: ${err.message}`);
  } finally {
    checkCookiesBtn.disabled = false;
    checkCookiesBtn.textContent = 'Check cookies';
  }
});

// ---------------------------------------------------------------------
// Add account — opens Roblox login in a browser window
// ---------------------------------------------------------------------

addAccountBtn.addEventListener('click', async () => {
  addAccountBtn.disabled = true;
  addAccountBtn.textContent = 'Signing in...';
  try {
    await window.api.loginWithBrowser();
    await loadUiPrefs();
refresh();
  } catch (err) {
    if (!err.message.includes('closed before')) {
      sealAlert(`Could not add account: ${err.message}`);
    }
  } finally {
    addAccountBtn.disabled = false;
    addAccountBtn.textContent = '+ Add account';
  }
});
emptyAddAccountBtn?.addEventListener('click', () => addAccountBtn.click());

const bulkAddModal = document.getElementById('bulkAddModal');
const bulkAddInput = document.getElementById('bulkAddInput');
const bulkAddPasswords = document.getElementById('bulkAddPasswords');
function updateBulkAddCounts() {
  const count = value => { const rows = value.split(/\r?\n/); while (rows.length && rows.at(-1) === '') rows.pop(); return rows.length; };
  document.getElementById('bulkAddRowCounts').textContent = `${count(bulkAddInput.value)} usernames · ${count(bulkAddPasswords.value)} passwords`;
}
bulkAddInput.addEventListener('input', updateBulkAddCounts);
bulkAddPasswords.addEventListener('input', updateBulkAddCounts);
const bulkAddStatus = document.getElementById('bulkAddStatus');
const bulkAddStart = document.getElementById('bulkAddStart');
const bulkAddClose = document.getElementById('bulkAddClose');
const bulkAddSkip = document.getElementById('bulkAddSkip');
const bulkAddStop = document.getElementById('bulkAddStop');
let bulkAddRunning = false;
document.getElementById('bulkAddBtn').addEventListener('click', () => {
  bulkAddModal.hidden = false;
  if (!bulkAddRunning) bulkAddInput.focus();
});
bulkAddClose.addEventListener('click', () => {
  if (bulkAddRunning) return;
  bulkAddInput.value = '';
  bulkAddPasswords.value = '';
  updateBulkAddCounts();
  bulkAddModal.hidden = true;
  document.getElementById('bulkAddBtn').focus();
});
function showBulkImportProgress(progress) {
  bulkAddInput.value = bulkAddPasswords.value = '';
  updateBulkAddCounts();
  const list = document.getElementById('bulkAddResults');
  list.replaceChildren();
  for (const result of progress.results) {
    const row = document.createElement('li');
    row.textContent = `${result.username}: ${result.status}`;
    list.append(row);
  }
  if (progress.done) {
    const saved = progress.results.filter(row => row.status === 'saved').length;
    bulkAddStatus.textContent = `${progress.stopped ? 'Stopped' : 'Finished'}: ${saved} saved, ${progress.results.filter(row => row.status === 'skipped').length} skipped, ${progress.results.filter(row => row.status === 'failed').length} failed, ${progress.total - progress.results.length} not attempted.`;
  } else {
    bulkAddStatus.textContent = `Account ${progress.current} of ${progress.total}: ${progress.username}. Complete verification in the Roblox window, or skip if sign-in fails.`;
  }
}
window.api.onBulkImportProgress(showBulkImportProgress);
bulkAddSkip.addEventListener('click', () => window.api.bulkImportControl('skip'));
bulkAddStop.addEventListener('click', () => window.api.bulkImportControl('stop'));
bulkAddStart.addEventListener('click', async () => {
  if (bulkAddRunning) return;
  bulkAddRunning = true;
  bulkAddStart.disabled = bulkAddClose.disabled = bulkAddInput.disabled = bulkAddPasswords.disabled = addAccountBtn.disabled = true;
  bulkAddSkip.hidden = bulkAddStop.hidden = false;
  bulkAddStatus.textContent = 'Checking import…';
  document.getElementById('bulkAddResults').replaceChildren();
  try {
    const promise = window.api.bulkImport({ usernames: bulkAddInput.value, passwords: bulkAddPasswords.value });
    showBulkImportProgress(await promise);
  } catch (error) {
    bulkAddStatus.textContent = error.message || 'Import could not start.';
  } finally {
    bulkAddRunning = false;
    bulkAddStart.disabled = bulkAddClose.disabled = bulkAddInput.disabled = bulkAddPasswords.disabled = addAccountBtn.disabled = false;
    bulkAddSkip.hidden = bulkAddStop.hidden = true;
    await refresh();
  }
});

// ---------------------------------------------------------------------
// Re-authenticate an expired account
// ---------------------------------------------------------------------

async function removeAccount(id) {
  const acc = accounts.find(a => a.id === id);
  const name = acc ? acc.username : id;
  const confirmed = await sealConfirm(`Remove "${name}" from the account list?\n\nThis only removes it from the app — it won't log out or affect the Roblox account itself.`);
  if (!confirmed) return;
  await window.api.removeAccount(id);
  for (const folder of accountFolders) folder.accountIds = folder.accountIds.filter(accountId => accountId !== id);
  saveAccountFolders();
  selected.delete(id);
  frozenAccounts.delete(id);
  await loadUiPrefs();
refresh();
}

async function reauthAccount(id) {
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;

  const btn = accountsList.querySelector(`[data-account-id="${CSS.escape(id)}"] .btn-reauth`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Opening...';
  }

  try {
    await window.api.reauth(id);
    // Mark as active now so the badge updates immediately
    cookieStatuses.set(id, { ok: true });
    await loadUiPrefs();
refresh();
  } catch (err) {
    if (!err.message.includes('closed before')) {
      sealAlert(`Re-login failed: ${err.message}`);
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = '↻ Refresh';
    }
  }
}

// ---------------------------------------------------------------------
// Check whether an account is currently in a game
// ---------------------------------------------------------------------

async function checkPresence(id) {
  const btn = accountsList.querySelector(`[data-account-id="${CSS.escape(id)}"] .btn-presence`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Checking...';
  }

  try {
    const result = await window.api.checkPresence(id);
    presenceStatuses.set(id, result);
  } catch (err) {
    presenceStatuses.set(id, { error: err.message || 'Could not check presence' });
  } finally {
    render();
  }
}

// ---------------------------------------------------------------------
// Check selected accounts for online/offline/in-game status
// ---------------------------------------------------------------------


async function checkSelectedStatus() {
  if (selected.size === 0) {
    sealAlert('Select one or more accounts first to check their status.');
    return;
  }

  const ids = [...selected];
  checkSelectedStatusBtn.disabled = true;
  checkSelectedStatusBtn.textContent = `Checking 0/${ids.length}...`;

  // Clear only the selected accounts so old badges do not make the new check look stale.
  for (const id of ids) presenceStatuses.set(id, { id, checking: true });
  render();
  checkSelectedStatusBtn.disabled = true;
  checkSelectedStatusBtn.textContent = `Checking 0/${ids.length}...`;

  try {
    const results = await window.api.checkPresenceBatch(ids);
    const byId = new Map((results || []).map(result => [result.id, result]));

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const result = byId.get(id) || { id, error: 'No result returned' };
      presenceStatuses.set(id, result);
      checkSelectedStatusBtn.textContent = `Checking ${i + 1}/${ids.length}...`;

      // Tiny UI delay keeps the progress readable without slowing the actual API call much.
      if (i < ids.length - 1) await delay(80);
    }

    render();

    const failed = ids.filter(id => presenceStatuses.get(id)?.error);
    if (failed.length) {
      sealAlert('Some statuses could not be checked:\n' + failed.map(id => `- ${accountLabel(id)}: ${presenceStatuses.get(id).error}`).join('\n'));
    } else {
      const checked = ids.map(id => presenceStatuses.get(id) || {});
      const inGame = checked.filter(status => status.inGame).length;
      const website = checked.filter(status => status.webOnline).length;
      const studio = checked.filter(status => status.inStudio).length;
      const privateCount = checked.filter(status => status.invisible).length;
      const offline = checked.length - inGame - website - studio - privateCount;
      showToast(`${inGame} in game · ${website} website · ${studio} Studio · ${privateCount} private · ${offline} offline`, 'info', 5500);
    }
  } catch (err) {
    // Fallback one-by-one if the batch endpoint fails completely.
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const result = await window.api.checkPresence(id);
        presenceStatuses.set(id, result);
      } catch (oneErr) {
        presenceStatuses.set(id, { id, error: oneErr.message || 'Could not check presence' });
      }
      checkSelectedStatusBtn.textContent = `Checking ${i + 1}/${ids.length}...`;
      if (i < ids.length - 1) await delay(400);
    }
    render();
    sealAlert(`Batch status check failed, so Seal used the slower fallback. Debug: ${err.message}`);
  } finally {
    checkSelectedStatusBtn.textContent = uiPrefs.labels.checkSelectedStatus || 'Check status';
    checkSelectedStatusBtn.disabled = selected.size === 0;
  }
}

checkSelectedStatusBtn.addEventListener('click', checkSelectedStatus);

// ---------------------------------------------------------------------
// Force quit all running Roblox clients
// ---------------------------------------------------------------------

forceQuitBtn.addEventListener('click', async () => {
  if (selected.size === 0) {
    sealAlert('Select one or more accounts first to force quit their Roblox windows.');
    return;
  }

  const ids = [...selected];
  forceQuitBtn.disabled = true;

  try {
    let closedAny = false;
    const untracked = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      forceQuitBtn.textContent = `Closing ${i + 1}/${ids.length}...`;
      const result = await window.api.forceQuitRoblox([id]);
      if (result.closed) closedAny = true;
      if (result.untracked && result.untracked.length) untracked.push(...result.untracked);
    }

    await syncAntiIdleStatus();

    if (closedAny) {
      sealAlert(`Closed Roblox for ${ids.length} selected account(s).`);
    } else if (untracked.length === ids.length) {
      sealAlert("None of the selected accounts have a tracked Roblox window (they weren't launched from this app this session, or already closed).");
    } else {
      sealAlert('Roblox was not running for the selected account(s).');
    }
  } catch (err) {
    sealAlert(`Could not close Roblox: ${err.message}`);
  } finally {
    forceQuitBtn.disabled = false;
    forceQuitBtn.textContent = uiPrefs.labels.forceQuit || 'Force quit selected';
    await refreshSessions();
  }
});

// ---------------------------------------------------------------------
// Freeze / Unfreeze selected accounts
// ---------------------------------------------------------------------

freezeSelectedBtn.addEventListener('click', async () => {
  const ids = [...selected];
  if (ids.length === 0) return;

  freezeSelectedBtn.disabled = true;
  const failed = [];

  try {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      freezeSelectedBtn.textContent = `❄ Freezing ${i + 1}/${ids.length}...`;
      try {
        await window.api.freezeAccount(id);
        frozenAccounts.add(id);
      } catch (err) {
        failed.push({ id, err: err.message });
      }
    }
  } finally {
    freezeSelectedBtn.textContent = uiPrefs.labels.freeze || '❄ Freeze selected';
    freezeSelectedBtn.disabled = selected.size === 0;
    render();
  }

  if (failed.length) sealAlert('Some accounts failed to freeze:\n' + failed.map(f => `- ${accountLabel(f.id)}: ${f.err}`).join('\n'));
});

unfreezeSelectedBtn.addEventListener('click', async () => {
  const ids = [...selected];
  if (ids.length === 0) return;

  unfreezeSelectedBtn.disabled = true;
  const failed = [];

  try {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      unfreezeSelectedBtn.textContent = `❄ Unfreezing ${i + 1}/${ids.length}...`;
      try {
        await window.api.unfreezeAccount(id);
        frozenAccounts.delete(id);
      } catch (err) {
        failed.push({ id, err: err.message });
      }
    }
  } finally {
    unfreezeSelectedBtn.textContent = uiPrefs.labels.unfreeze || '❄ Unfreeze selected';
    unfreezeSelectedBtn.disabled = selected.size === 0;
    render();
  }

  if (failed.length) sealAlert('Some accounts failed to unfreeze:\n' + failed.map(f => `- ${accountLabel(f.id)}: ${f.err}`).join('\n'));
});

// ---------------------------------------------------------------------
async function syncAntiIdleStatus() {
  try {
    const state = await window.api.antiIdleStatus();
    setAntiIdleUI(getAntiIdleActive(state), state);
  } catch {
    setAntiIdleUI(false);
  }
}

let lastRuntimePollAt = 0;
function pollRuntimeState(force = false) {
  if (!force && document.hidden) return;
  const now = Date.now();
  // A live dashboard needs timely PID-close detection. Empty Low Power
  // dashboards remain on the slower interval, while active sessions use a
  // lightweight five-second check.
  const minimumInterval = activeSessions.length > 0
    ? 5000
    : (uiPrefs.powerMode === 'low' ? 15000 : 5000);
  if (!force && now - lastRuntimePollAt < minimumInterval) return;
  lastRuntimePollAt = now;
  syncAntiIdleStatus();
  refreshSessions();
}

syncPauseStatus();
syncSessionSleepState().catch(() => {});
pollRuntimeState(true);
setInterval(pollRuntimeState, 5000);
setInterval(async () => {
  try {
    const updated = await window.api.refreshAvatars();
    if (Array.isArray(updated)) { accounts = updated; render(); }
  } catch { /* Keep saved profiles available while Roblox is unreachable. */ }
}, 300000);
loadUiPrefs();
showStartupExperience();
loadPerformancePresets()
  .catch(error => console.warn('Could not load performance presets:', error))
  .finally(refresh);
