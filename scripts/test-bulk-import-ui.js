const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-bulk-ui-'));
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox');
app.setPath('userData', path.join(temp, 'userdata'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app);
app.quit = () => {};
require('../src/robloxApi').getAvatarUrl = async () => null;
const store = require('../src/accountStore');
let windows = 0;
app.whenReady().then(() => store.addAccount({ username: 'Alpha', userId: 123, cookie: 'fake-old-cookie', graphicsQuality: 7, fastFlagPreset: 'off' }));
const deadline = setTimeout(() => { console.error('Bulk UI test timed out'); app.exit(1); }, 30000);
app.on('browser-window-created', (_event, window) => {
  window.webContents.setBackgroundThrottling(false);
  if (window.getTitle().startsWith('Import ')) {
    windows++;
    const loginSession = window.webContents.session;
    // Route all HTTPS in this temporary login session to local fixtures. No real sign-in.
    loginSession.protocol.handle('https', async request => {
      if (new URL(request.url).hostname === 'users.roblox.com') {
        const cookies = await loginSession.cookies.get({ name: '.ROBLOSECURITY' });
        const username = cookies[0]?.value;
        return new Response(JSON.stringify({ id: username === 'Alpha' ? 123 : 456, name: username }), { headers: { 'content-type': 'application/json' } });
      }
      assert.equal((await loginSession.cookies.get({ name: '.ROBLOSECURITY' })).length, 0, 'each login has an isolated empty cookie jar');
      return new Response(`<input id="login-username"><input id="login-password" type="password"><button id="login-button">Login</button><script>document.getElementById('login-button').onclick=()=>{if(document.getElementById('login-password').value!=='one:two')throw new Error('Password was changed');document.cookie='.ROBLOSECURITY='+document.getElementById('login-username').value+'; path=/; secure';};</script>`, { headers: { 'content-type': 'text/html' } });
    });
    return;
  }
  window.webContents.once('did-finish-load', async () => {
    const evaluate = code => window.webContents.executeJavaScript(code);
    try {
      await evaluate(`document.getElementById('bulkAddBtn').click(); document.getElementById('bulkAddInput').value='Alpha\\nBeta'; document.getElementById('bulkAddPasswords').value='one:two\\none:two'; document.getElementById('bulkAddStart').click();`);
      for (let i = 0; i < 200; i++) {
        if (await evaluate(`document.getElementById('bulkAddStatus').textContent.startsWith('Finished')`)) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(windows, 2);
      assert.equal(store.listAccounts().length, 2);
      assert.equal(store.listAccounts().find(a => a.username === 'Alpha').graphicsQuality, 7);
      assert.equal(store.listAccounts().find(a => a.username === 'Alpha').fastFlagPreset, 'off');
      assert.equal(await evaluate(`document.getElementById('bulkAddInput').value`), '');
      assert.match(await evaluate(`document.getElementById('bulkAddStatus').textContent`), /2 saved/);
      assert(!fs.readFileSync(path.join(app.getPath('userData'), 'accounts.json'), 'utf8').includes('one:two'));
      await evaluate(`document.getElementById('bulkAddInput').value='Malformed'; document.getElementById('bulkAddStart').click();`);
      for (let i = 0; i < 30; i++) {
        if (await evaluate(`!document.getElementById('bulkAddStart').disabled`)) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.match(await evaluate(`document.getElementById('bulkAddStatus').textContent`), /same number of rows/);
      assert.equal(windows, 2, 'malformed input does not open login windows');
      await evaluate(`document.getElementById('bulkAddInput').value='Gamma\\nDelta'; document.getElementById('bulkAddPasswords').value='one:two\\none:two'; document.getElementById('bulkAddStart').click();`);
      for (let i = 0; i < 30 && windows < 3; i++) await new Promise(resolve => setTimeout(resolve, 20));
      await evaluate(`document.getElementById('bulkAddStop').click()`);
      for (let i = 0; i < 50; i++) {
        if (await evaluate(`!document.getElementById('bulkAddStart').disabled`)) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(windows, 3, 'Stop prevents the next login');
      assert.equal(store.listAccounts().length, 2, 'Stop preserves previous saves');
      assert.match(await evaluate(`document.getElementById('bulkAddStatus').textContent`), /Stopped/);
      console.log('Real renderer + IPC + browser queue passed: isolated logins, colon passwords, saving, preserving settings, malformed input, Stop cancellation, secret clearing.');
      clearTimeout(deadline);
      app.quit = quit;
      quit();
    } catch (error) { console.error(error); app.exit(1); }
  });
});
app.on('will-quit', () => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });
require('../main');
