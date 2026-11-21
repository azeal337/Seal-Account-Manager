const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { observeNewRobloxPids } = require('../src/launcher');

async function main() {
  const samples = [
    [10],
    [10, 20],
    [10, 21],
    [10, 21],
    [10, 21]
  ];
  let calls = 0;
  const started = Date.now();
  const pids = await observeNewRobloxPids(new Set([10]), {
    pollMs: 100,
    maxWaitMs: 1500,
    settleMs: 300,
    stableMs: 200,
    listPids: async () => samples[Math.min(calls++, samples.length - 1)]
  });

  assert.deepStrictEqual(pids, [21], 'the settled Roblox client should replace the temporary PID');
  assert(Date.now() - started < 1200, 'PID handoff should not add a multi-second blind delay');

  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  const mainProcess = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert(!/delay\(4500\)/.test(renderer), 'renderer still contains the old 4.5 second launch delay');
  assert(!/setTimeout\(resolve, 4500\)/.test(mainProcess), 'main process still contains the old 4.5 second launch delay');

  console.log('launch pacing checks passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
