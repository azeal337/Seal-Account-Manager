// Starts Seal's minimal native mutex-only component.
// Uses the normal holder first; the native helper can release only matching
// singleton mutex handles in existing Roblox processes when the mutex is busy.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let child = null;
let lastError = null;
let startPromise = null;
let currentAttempt = null;
let ready = false;

function helperCandidates(moduleDir = __dirname, resourcesPath = process.resourcesPath) {
  const candidates = [];

  // Executables cannot be started from inside Electron's app.asar archive.
  // electron-builder copies asarUnpack files to this parallel directory.
  if (resourcesPath) {
    candidates.push(path.join(resourcesPath, 'SealMutexHolder.exe'));
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'src', 'SealMutexHolder.exe'));
  }

  // Development/source builds keep the helper beside this module.
  candidates.push(path.join(moduleDir, 'SealMutexHolder.exe'));
  return [...new Set(candidates)];
}

function helperPath(moduleDir = __dirname, resourcesPath = process.resourcesPath) {
  return helperCandidates(moduleDir, resourcesPath).find(candidate => fs.existsSync(candidate)) || null;
}

function powerShellFallback(parentPid) {
  const command = `
$ErrorActionPreference = 'Stop'
$parentPidToWatch = ${Number(parentPid) || 0}
$mutex = New-Object System.Threading.Mutex($false, 'ROBLOX_singletonMutex')
$owns = $false
try {
  try {
    $owns = $mutex.WaitOne(0)
  } catch [System.Threading.AbandonedMutexException] {
    $owns = $true
  }
  if (-not $owns) {
    Write-Output 'BUSY'
    exit 4
  }
  Write-Output 'READY'
  while ($true) {
    try { Get-Process -Id $parentPidToWatch -ErrorAction Stop | Out-Null }
    catch { break }
    Start-Sleep -Milliseconds 500
  }
} finally {
  if ($owns) { try { $mutex.ReleaseMutex() } catch {} }
  if ($mutex) { try { $mutex.Close() } catch {} }
}
`;

  return spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle', 'Hidden',
    '-ExecutionPolicy', 'Bypass',
    '-Command', command
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function start() {
  if (startPromise) return startPromise;
  if (ready && child && child.exitCode === null && !child.killed) {
    return Promise.resolve({ ok: true, active: true, mode: 'mutex-only' });
  }

  let resolveStart;
  const task = new Promise(resolve => { resolveStart = resolve; });
  startPromise = task;
  const attempt = { cancel: null };
  currentAttempt = attempt;
  ready = false;
  lastError = null;
  let settled = false;
  let output = '';
  let timer = null;
  let spawnedChild = null;
  const isCurrent = () => currentAttempt === attempt;
  const finish = result => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveStart(result);
  };
  const fail = (error, busy = false) => {
    if (!isCurrent()) return;
    lastError = error;
    ready = false;
    child = null;
    currentAttempt = null;
    finish({ ok: false, active: false, error, ...(busy ? { busy: true } : {}) });
    try { spawnedChild?.kill(); } catch {}
  };
  attempt.cancel = () => finish({ ok: false, active: false, error: 'The mutex component startup was cancelled.' });
  task.then(() => {
    // A stopped attempt may finish after another start has already begun.
    if (startPromise === task) startPromise = null;
  });

  try {
    const executable = helperPath();
    // Keep the established fallback and native handoff behavior unchanged.
    spawnedChild = executable
      ? spawn(executable, [String(process.pid)], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        })
      : powerShellFallback(process.pid);
    child = spawnedChild;
    timer = setTimeout(() => fail('The multi-instance mutex component did not become ready.'), 15000);

    spawnedChild.stdout.on('data', data => {
      if (!isCurrent() || settled) return;
      output = (output + data.toString()).slice(-8192);
      if (/^READY\r?$/m.test(output)) {
        ready = true;
        lastError = null;
        finish({ ok: true, active: true, mode: 'mutex-only' });
      } else if (/^BUSY\r?$/m.test(output)) {
        fail('The singleton lock could not be released from the existing Roblox process (or another launcher owns it). Existing games were left running.', true);
      }
    });
    spawnedChild.stderr.on('data', data => {
      if (isCurrent()) lastError = data.toString().trim().slice(-2048) || lastError;
    });
    spawnedChild.on('error', error => fail(error.message));
    spawnedChild.on('exit', code => {
      if (!isCurrent()) return;
      child = null;
      ready = false;
      currentAttempt = null;
      lastError = lastError || 'The mutex component exited with code ' + code + '.';
      finish({ ok: false, active: false, error: lastError });
    });
  } catch (error) {
    fail(error.message);
  }
  return task;
}

function stop() {
  const previousChild = child;
  const previousAttempt = currentAttempt;
  currentAttempt = null;
  child = null;
  ready = false;
  startPromise = null;
  previousAttempt?.cancel();
  try { previousChild?.kill(); } catch {}
  return { ok: true, active: false };
}

function status() {
  const active = ready && !!child && child.exitCode === null && !child.killed;
  return { ok: active, active, mode: 'mutex-only', error: lastError };
}

module.exports = { start, stop, status, helperPath, helperCandidates };
