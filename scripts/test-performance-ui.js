const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-performance-ui-'));
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox');
app.setPath('userData', path.join(temp, 'userdata'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app);
app.quit = () => {}; // Let the real renderer's smoke timer run; finish after assertions.
const launcher = require('../src/launcher');
const accountStore = require('../src/accountStore');
const store = require('../src/performancePresetStore');
let account;
const deadline = setTimeout(() => { console.error('Performance UI test timed out'); app.exit(1); }, 20000);

app.whenReady().then(() => {
  const version = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'Versions', 'version-ui');
  fs.mkdirSync(version, { recursive: true });
  fs.writeFileSync(path.join(version, 'RobloxPlayerBeta.exe'), 'fixture');
  account = accountStore.addAccount({ username: 'OffRegression', userId: 123, cookie: 'test-only-cookie', graphicsQuality: 7, fastFlagPreset: 'max' });
  launcher.setGraphicsQuality(7);
  launcher.setFastFlagPreset('max');
});

app.on('browser-window-created', (_event, window) => {
  window.webContents.setBackgroundThrottling(false);
  window.webContents.on('did-finish-load', async () => {
    try {
      const evaluate = code => window.webContents.executeJavaScript(code);
      for (let i = 0; i < 60; i++) {
        if (await evaluate('!!document.querySelector(".fastflags-field select")')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(await evaluate('document.querySelector(".graphics-field input").value'), '7');
      await evaluate('document.querySelector(".fastflags-field select").value = "off"; document.querySelector(".fastflags-field select").dispatchEvent(new Event("change"));');
      for (let i = 0; i < 60; i++) {
        if (accountStore.listAccounts()[0].fastFlagPreset === 'off') break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(accountStore.listAccounts()[0].fastFlagPreset, 'off');
      assert.equal(accountStore.listAccounts()[0].graphicsQuality, 7, 'remember boost quality for later');
      assert.equal(await evaluate('document.querySelector(".graphics-field input").disabled'), false);
      assert.equal(await evaluate('document.querySelector(".graphics-field input").value'), '7');
      assert(fs.readFileSync(path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'GlobalBasicSettings_13.xml'), 'utf8').includes('<token name="SavedQualityLevel">7</token>'));
      const settingsFile = path.join(process.env.SEAL_TEST_ROBLOX_ROOT, 'Versions', 'version-ui', 'ClientSettings', 'ClientAppSettings.json');
      assert.deepEqual(JSON.parse(fs.readFileSync(settingsFile, 'utf8')), {});
      if (process.env.SEAL_TEST_SCREENSHOT) {
        for (let i = 0; i < 40; i++) {
          if (await evaluate('document.getElementById("startupScreen").hidden')) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        const capture = await window.webContents.capturePage();
        fs.writeFileSync(process.env.SEAL_TEST_SCREENSHOT, capture.toPNG());
      }
      await evaluate('document.querySelector(".fastflags-field select").value = "max"; document.querySelector(".fastflags-field select").dispatchEvent(new Event("change"));');
      for (let i = 0; i < 60; i++) {
        if (accountStore.listAccounts()[0].fastFlagPreset === 'max') break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(await evaluate('document.querySelector(".graphics-field input").value'), '7');

      const preset = store.savePreset({ name: 'Delete regression', guided: { sky: 'gray' } });
      accountStore.setLaunchSettings(account.id, { fastFlagPreset: preset.id });
      launcher.setFastFlagPreset('custom', store.compilePreset(preset.id).flags);
      await evaluate(`window.api.removePerformancePreset(${JSON.stringify(preset.id)})`);
      assert.equal(accountStore.listAccounts()[0].fastFlagPreset, 'off');
      assert.deepEqual(JSON.parse(fs.readFileSync(settingsFile, 'utf8')), {});
      console.log('Real Electron renderer + IPC passed: Off cleans boost flags, keeps numeric graphics enabled and preserves level 7; deletion also preserves graphics.');
      clearTimeout(deadline);
      app.quit = quit;
      quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  });
});

app.on('will-quit', () => {
  launcher.restoreFpsOverride();
  assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
  // Chromium can still hold cache files during will-quit; never interrupt
  // shutdown with an uncaught cleanup error.
  try { fs.rmSync(temp, { recursive: true, force: true }); } catch {}
});
require('../main');
