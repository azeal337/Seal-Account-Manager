const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const config = require('../package.json');
const executable = path.resolve(process.argv[2] || `dist/Seal-Account-Manager-${config.build.buildVersion || config.version}-Portable.exe`);
const payload = path.resolve('dist/win-unpacked');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-portable-runtime-'));
const runs = [];
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function launch(name, hold) {
  const report = path.join(temporary, name + '.json');
  const env = { ...process.env, SEAL_SMOKE_REPORT: report, SEAL_SMOKE_HOLD_MS: String(hold), SEAL_TEST_ROBLOX_ROOT: path.join(temporary, 'Roblox') };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(executable, ['--seal-launch-test', '--user-data-dir=' + path.join(temporary, name + '-data')], { env, windowsHide: true, stdio: 'ignore' });
  const run = { child, report, exited: false, error: null };
  run.done = new Promise(resolve => { child.once('error', error => { run.error = error; run.exited = true; resolve(null); }); child.once('exit', code => { run.exited = true; resolve(code); }); });
  runs.push(run);
  return run;
}
async function loaded(run) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (fs.existsSync(run.report)) {
      const report = JSON.parse(fs.readFileSync(run.report, 'utf8'));
      assert.equal(report.loaded, true);
      assert.equal(report.version, config.version);
      assert.equal(report.displayVersion, config.displayVersion);
      assert.equal(report.ffmpegPresent, true);
      return report;
    }
    if (run.exited) throw Error('Portable exited before proving renderer startup: ' + (run.error?.message || run.child.exitCode));
    await pause(100);
  }
  throw Error('Portable renderer startup timed out.');
}
async function completed(run) {
  let deadline;
  try {
    return await Promise.race([run.done, new Promise((_, reject) => { deadline = setTimeout(() => reject(Error('Portable exit timed out.')), 45000); })]);
  } finally { clearTimeout(deadline); }
}
function verifyPayload(report) {
  const directory = path.dirname(report.executable);
  for (const file of ['ffmpeg.dll', 'libEGL.dll', 'libGLESv2.dll', 'icudtl.dat', 'resources.pak', 'resources/app.asar']) {
    assert.equal(digest(path.join(directory, file)), digest(path.join(payload, file)), 'runtime file matches package: ' + file);
  }
  return directory;
}
(async () => {
  try {
    assert.equal(config.build.portable.unpackDirName, true, 'builder 24.13.3 must omit UNPACK_DIR_NAME to use a directory unique to each launch');
    const first = launch('first', 30000);
    const firstDirectory = verifyPayload(await loaded(first));
    const second = launch('second', 1000);
    const secondReport = await loaded(second);
    const secondDirectory = verifyPayload(secondReport);
    assert.notEqual(firstDirectory, secondDirectory, 'overlapping launches must not share extracted files');
    assert.equal(await completed(second), 0);
    assert.equal(first.exited, false, 'first instance stays running after second exits');
    verifyPayload({ executable: path.join(firstDirectory, 'Seal Account Manager.exe') });
    assert.equal(await completed(first), 0);
    console.log('PASS: both portable instances loaded their renderers; all six runtime files match; separate extraction folders; second exit leaves first payload intact; both exit cleanly.');
  } finally {
    for (const run of runs) if (!run.exited && run.child.pid) spawnSync('taskkill.exe', ['/PID', String(run.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    const resolved = path.resolve(temporary);
    assert(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
