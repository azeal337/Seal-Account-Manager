const { app, session } = require('electron');

app.whenReady().then(async () => {
  const loginSession = session.fromPartition(`seal-login-test-${Date.now()}`, { cache: false });
  if (typeof loginSession.fetch !== 'function') throw new Error('Electron session.fetch is unavailable');
  await loginSession.clearStorageData();
  const cookies = await loginSession.cookies.get({ url: 'https://www.roblox.com/', name: '.ROBLOSECURITY' });
  if (cookies.length !== 0) throw new Error('Fresh login partition unexpectedly contained a Roblox cookie');
  console.log('Electron login-session isolation test passed.');
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});
