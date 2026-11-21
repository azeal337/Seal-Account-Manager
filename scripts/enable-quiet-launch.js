// Explicit setup after verifying a portable build; never imported by app/tests.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { prepareStartupExecutable } = require('../src/startupRuntime');
const bootstrapper = require('../src/bootstrapper');
const launcher = require('../src/launcher');
const index = process.argv.indexOf('--apply');
const executable = index >= 0 ? process.argv[index + 1] : '';
if (!executable || !path.isAbsolute(executable) || !fs.existsSync(executable)) throw Error('Pass --apply with the verified portable executable.');
if (!process.env.SEAL_TEST_TMP_ROOT) throw Error('Run through the isolated parent Electron wrapper.');
app.setName('Seal Account Manager');
const userDataPath = app.getPath('userData');
app.setPath('userData', path.join(process.env.SEAL_TEST_TMP_ROOT, 'quiet-launch-setup'));
app.setAppUserModelId('com.local.sealaccountmanager');
app.whenReady().then(async () => {
  try {
    const target = await prepareStartupExecutable({ executable, portable: true, runtimeRoot: path.join(process.env.LOCALAPPDATA, 'Seal Account Manager', 'Startup'), version: require('../package.json').version });
    // This setup script runs under development Electron, but its target is the
    // packaged portable. Register only the portable's arguments, not this script.
    const registrationApp = {
      isPackaged: true,
      isDefaultProtocolClient: app.isDefaultProtocolClient.bind(app),
      setAsDefaultProtocolClient: app.setAsDefaultProtocolClient.bind(app),
      removeAsDefaultProtocolClient: app.removeAsDefaultProtocolClient.bind(app)
    };
    const protocols = bootstrapper.enable({ app: registrationApp, launcher, userDataPath, executable: target });
    if (!protocols.enabled) throw Error('Windows did not register both Roblox Play handlers.');
    const options = { name: 'com.local.sealaccountmanager', path: '"' + target + '"', args: ['--background'] };
    app.setLoginItemSettings({ ...options, openAtLogin: true, enabled: true });
    const startup = app.getLoginItemSettings(options);
    if (!startup.openAtLogin || startup.executableWillLaunchAtLogin === false) throw Error('Windows did not enable background startup.');
    console.log(JSON.stringify({ startupRegistered: true, protocols: protocols.protocols, path: target, args: options.args, scope: 'current user' }));
    app.quit();
  } catch (error) { console.error(error.message); app.exit(1); }
});
