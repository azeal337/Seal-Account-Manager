const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
function cleanup(directory, remove = fs.rmSync, warn = console.warn) {
  const resolved = path.resolve(directory), parent = path.resolve(os.tmpdir()) + path.sep;
  if (!resolved.startsWith(parent) || !path.basename(resolved).startsWith('seal-electron-test-')) throw Error('Refusing to remove an unrelated directory.');
  try { remove(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); return true; }
  catch { warn('Temporary test cache is still locked; leaving it for Windows to clean up.'); return false; }
}
if (require.main === module) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-electron-test-'));
  const script = path.resolve(process.argv[2] || '');
  if (!script.startsWith(path.resolve(__dirname) + path.sep)) throw Error('Choose a script inside the test directory.');
  const environment = { ...process.env, SEAL_TEST_TMP_ROOT: directory };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(require('electron'), [script, ...process.argv.slice(3)], { env: environment, windowsHide: true, stdio: 'inherit' });
  let finished = false;
  function finish(code) { if(finished)return;finished=true;cleanup(directory);process.exitCode=code; }
  child.once('error', error => { console.error(error.message); finish(1); });
  child.once('exit', code => finish(code === null ? 1 : code));
}
module.exports = { cleanup };
