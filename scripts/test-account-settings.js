const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-account-settings-'));
app.setPath('userData', testDir);
const accountStore = require('../src/accountStore');

app.whenReady().then(() => {
  const account = accountStore.addAccount({
    username: 'SettingsTest',
    userId: 123,
    cookie: '_|WARNING:--test-cookie-value-long-enough-for-storage--|_'
  });

  let saved = accountStore.setLaunchSettings(account.id, {
    fpsCap: 1,
    graphicsQuality: 7,
    fastFlagPreset: 'balanced',
    volume: 3
  });
  assert.deepEqual(saved, { fpsCap: 1, graphicsQuality: 7, volume: 3, fastFlagPreset: 'balanced' });

  saved = accountStore.setLaunchSettings(account.id, { fpsCap: 5000 });
  assert.equal(saved.fpsCap, 5000);
  saved = accountStore.setLaunchSettings(account.id, { fpsCap: 0 });
  assert.equal(saved.fpsCap, 60);
  console.log('Atomic account settings and FPS range tests passed.');
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});

app.on('will-quit', () => {
  try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
});
