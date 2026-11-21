const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let asar;
try { asar = require('@electron/asar'); }
catch {
  const store = path.resolve('node_modules/.pnpm');
  const installed = fs.readdirSync(store).find(name => name.startsWith('@electron+asar@'));
  asar = require(path.join(store, installed, 'node_modules/@electron/asar'));
}
const directory = path.resolve('dist/win-unpacked/resources');
assert.equal(JSON.parse(asar.extractFile(path.join(directory, 'app.asar'), 'package.json')).version, require('../package.json').version);
const files = ['main.js', 'preload.js', 'src/index.html', 'src/bootstrapper.js', 'src/launcher.js', 'src/mutexHolder.js', 'src/externalLaunchSettings.js', 'src/quietLaunchControls.js', 'src/badgeAwardDates.js', 'src/badgeInventory.js', 'src/robloxProgress.js', 'src/badgeViews.js', 'src/renderer.js', 'src/activityWatcher.js', 'src/robloxApi.js'];
for (const file of files) {
  assert(asar.extractFile(path.join(directory, 'app.asar'), file).equals(fs.readFileSync(file)), 'Packaged file matches final source: ' + file);
}
assert(asar.extractFile(path.join(directory, 'app.asar'), 'src/accountStore.js').equals(fs.readFileSync('src/accountStore.js')), 'Packaged credential protection matches final source');
for (const file of ['src/sessionRecovery.js', 'src/backgroundMode.js', 'src/playtimeStore.js']) {
  assert(asar.extractFile(path.join(directory, 'app.asar'), file).equals(fs.readFileSync(file)), 'Packaged background tracking matches final source: ' + file);
}
for (const name of ['SealMutexHolder.exe', 'SealProcessSleeper.exe']) {
  assert(fs.readFileSync(path.join(directory, name)).equals(fs.readFileSync(path.join('src', name))), 'Packaged native helper matches rebuilt source');
}
console.log(`PASS: packaged version, ${files.length} files and both rebuilt native helpers match final source.`);
