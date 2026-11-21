(() => {
  const button = document.getElementById('antiAfkSettingsBtn');
  const popover = document.getElementById('antiAfkSettingsPopover');
  popover.addEventListener('beforetoggle', event => {
    if (event.newState !== 'open') return;
    const bounds = button.getBoundingClientRect();
    popover.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - 268))}px`;
    popover.style.top = `${Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - 205))}px`;
  });
  popover.addEventListener('keydown', event => event.stopPropagation());
  const minutes = document.getElementById('antiAfkMinutes');
  const seconds = document.getElementById('antiAfkSeconds');
  const status = document.getElementById('antiAfkIntervalStatus');
  let edited = false;
  let revision = 0;
  const label = total => `${Math.floor(total / 60)} min ${total % 60} sec`;
  async function saveInterval() {
    edited = true;
    const current = ++revision;
    const m = Number(minutes.value), s = Number(seconds.value);
    if (minutes.value === '' || seconds.value === '' || !Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0 || s > 59 || m * 60 + s < 1 || m * 60 + s > 86400) {
      status.textContent = 'Enter 0–59 seconds and a total interval from 1 second to 24 hours. Previous interval is unchanged.';
      return;
    }
    try {
      const saved = await window.api.saveAntiIdleSettings(m * 60 + s);
      if (current !== revision) return;
      window.sealAntiIdleIntervalSeconds = saved.intervalSeconds;
      status.textContent = `Saved: every ${label(saved.intervalSeconds)}.`;
      await syncAntiIdleStatus();
    } catch (error) { if (current === revision) status.textContent = `Could not save: ${error.message}`; }
  }
  for (const input of [minutes, seconds]) {
    input.addEventListener('input', () => { edited = true; });
    input.addEventListener('change', saveInterval);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); saveInterval(); } });
  }
  window.api.getAntiIdleSettings().then(settings => {
    if (edited) return;
    window.sealAntiIdleIntervalSeconds = settings.intervalSeconds;
    minutes.value = Math.floor(settings.intervalSeconds / 60);
    seconds.value = settings.intervalSeconds % 60;
    status.textContent = `Every ${label(settings.intervalSeconds)}. Changes save automatically.`;
  }).catch(error => { status.textContent = `Could not load interval: ${error.message}`; });
})();
