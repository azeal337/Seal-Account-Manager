const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');
const catalog = require('../src/flagCatalog');
const { PLAYER_FLAGS } = require('../src/fastFlagPolicy');
assert.deepEqual(new Set(catalog.entries.map(e => e.name)), PLAYER_FLAGS);
assert.equal(catalog.compile({ DFIntTextureQualityOverride: '0' }).DFFlagTextureQualityOverrideEnabled, 'True');
assert.throws(() => catalog.compile({ FFlagDebugGraphicsPreferD3D11: 'True', FFlagDebugGraphicsPreferVulkan: 'True' }), /one renderer/);
assert.throws(() => catalog.compile({ FIntFRMMinGrassDistance: '100', FIntFRMMaxGrassDistance: '0' }), /minimum/);
assert.deepEqual(catalog.compile({ UnknownFlag: 'True', DFIntDebugFRMQualityLevelOverride: '1' }), {});
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-library-focus-'));
app.setPath('userData', path.join(temp, 'userdata'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox');
process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app);
app.quit = () => {};
const store = require('../src/accountStore');
app.whenReady().then(() => store.addAccount({ username: 'TypingTest', userId: 123, cookie: 'fake-only', graphicsQuality: 7 }));
const deadline = setTimeout(() => { console.error('Library/focus test timed out'); app.exit(1); }, 30000);
app.on('browser-window-created', (_event, window) => {
  window.webContents.setBackgroundThrottling(false);
  window.webContents.once('did-finish-load', async () => {
    const evaluate = code => window.webContents.executeJavaScript(code);
    const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 50)); } throw new Error(`Timed out: ${expression}`); };
    try {
      await waitFor(`!!document.querySelector('.graphics-field input')`);
      await evaluate(`document.getElementById('startupScreen').hidden=true; window.focus(); document.querySelector('.graphics-field input').focus(); window.testInput=document.activeElement; window.testInput.value='6'; render();`);
      assert.equal(await evaluate(`document.activeElement===window.testInput && window.testInput.isConnected && window.testInput.value==='6'`), true, 'render retains the focused field and unfinished value');
      for (const selector of ['.graphics-field input', '.volume-field input', '#bulkAddInput']) {
        if (selector === '#bulkAddInput') await evaluate(`document.getElementById('bulkAddBtn').click()`);
        await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus(); void sealAlert('Test message');`);
        await waitFor(`!!document.querySelector('dialog[open]')`);
        await evaluate(`document.querySelector('dialog .btn-primary').click()`);
        await waitFor(`!document.querySelector('dialog')`);
        assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(selector)})`), true);
        await evaluate(`document.activeElement.value='';`);
        await window.webContents.insertText(selector === '#bulkAddInput' ? 'Example:dummy' : '5');
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`), selector === '#bulkAddInput' ? 'Example:dummy' : '5');
      }
      await evaluate(`document.getElementById('bulkAddClose').click(); window.confirmAnswer=null; void sealConfirm('Cancel test').then(x=>window.confirmAnswer=x);`);
      await waitFor(`!!document.querySelector('dialog[open]')`);
      await evaluate(`document.querySelector('dialog .btn-quiet').click()`);
      await waitFor(`window.confirmAnswer===false`);
      await waitFor(`document.getElementById('antiAfkIntervalStatus').textContent.startsWith('Every')`);
      for (const [minutes, seconds, expected] of [[16, 20, 980], [19, 0, 1140]]) {
        await evaluate(`document.getElementById('antiAfkMinutes').value='${minutes}'; document.getElementById('antiAfkSeconds').value='${seconds}'; document.getElementById('antiAfkSeconds').dispatchEvent(new Event('change'));`);
        await waitFor(`window.sealAntiIdleIntervalSeconds===${expected}`);
        assert.equal(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'anti-afk-settings.json'))).intervalSeconds, expected);
        assert.equal((await evaluate('window.api.getAntiIdleSettings()')).intervalSeconds, expected);
      }
      await evaluate(`document.getElementById('antiAfkSeconds').value='60'; document.getElementById('antiAfkSeconds').dispatchEvent(new Event('change'));`);
      assert.match(await evaluate(`document.getElementById('antiAfkIntervalStatus').textContent`), /Previous interval is unchanged/);
      assert.equal(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'anti-afk-settings.json'))).intervalSeconds, 1140);
      await evaluate(`openLauncher('presets')`);
      await evaluate(`document.getElementById('flagLibrarySearch').value='texture'; document.getElementById('flagLibrarySearch').dispatchEvent(new Event('input'));`);
      assert.equal(await evaluate(`document.querySelectorAll('#flagLibraryList .flag-library-card').length`), 2);
      await evaluate(`document.getElementById('flagLibraryStarters').querySelector('button').click();`);
      assert.equal(await evaluate(`JSON.parse(document.getElementById('flagLibraryPreview').textContent).DFIntTextureQualityOverride`), '0');
      await evaluate(`document.getElementById('flagLibraryClear').click(); document.getElementById('flagLibraryUndo').click(); document.getElementById('flagLibraryReview').click();`);
      await waitFor(`document.getElementById('presetNameInput').value==='Library preset'`);
      await evaluate(`document.getElementById('presetNameInput').value='Library test'; document.getElementById('presetSaveBtn').click();`);
      await waitFor(`document.getElementById('performancePresetList').textContent.includes('Library test')`);
      const presets = require('../src/performancePresetStore').listPresets();
      assert(presets.some(p => p.name === 'Library test'));
      console.log('PASS: Anti-AFK 16:20 and 19:00 UI+IPC persistence/invalid input; catalog validation, typing after dialogs, focus preservation, library search/undo/review/save.');
      clearTimeout(deadline);
      app.quit = quit;
      quit();
    } catch (error) { console.error(error); app.exit(1); }
  });
});
app.on('will-quit', () => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });
require('../main');
