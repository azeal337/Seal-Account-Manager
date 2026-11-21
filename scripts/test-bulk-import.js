const assert = require('node:assert/strict');
const vm = require('node:vm');
const { parseCredentials, runBulkImport, fillLoginForm } = require('../src/bulkAccountImport');

(async () => {
  assert.deepEqual(parseCredentials({usernames:'Alpha\nBeta\n', passwords:'one:two\n spaced \n'}), [{username:'Alpha',password:'one:two'},{username:'Beta',password:' spaced '}]);
  assert.throws(()=>parseCredentials({usernames:'Alpha\nBeta',passwords:'one'}), /same number/);
  assert.throws(()=>parseCredentials({usernames:'Alpha\n\nBeta',passwords:'one\ntwo\nthree'}), /row 2/);
  assert.throws(()=>parseCredentials({usernames:'Alpha\nalpha',passwords:'one\ntwo'}), /Duplicate/);

  assert.deepEqual(parseCredentials('\uFEFFAlpha:one:two\r\n\r\nBeta: spaced '), [
    { username: 'Alpha', password: 'one:two' }, { username: 'Beta', password: ' spaced ' }
  ]);
  assert.throws(() => parseCredentials('Alpha:secret\ninvalid'), /line 2/);
  assert.throws(() => parseCredentials('Alpha:one\nalpha:two'), /Duplicate/);
  assert.throws(() => parseCredentials('Alpha:'), /line 1/);
  assert.throws(() => parseCredentials(Array.from({ length: 201 }, (_, i) => `User${i}:pass`).join('\n')), /200/);
  const entries = parseCredentials('Alpha:p\nBeta:q\nGamma:r\nDelta:s');
  const controller = {};
  const progress = [];
  const summary = await runBulkImport(entries, {
    controller, report: p => progress.push(JSON.stringify(p)),
    login: async entry => {
      if (entry.username === 'Beta') throw Object.assign(new Error('secret'), { code: 'BULK_SKIP' });
      if (entry.username === 'Gamma') { controller.stopped = true; throw new Error('secret'); }
      return { username: entry.username };
    }
  });
  assert.deepEqual(summary.results.map(r => r.status), ['saved', 'skipped', 'stopped']);
  assert(entries.every(e => e.password === ''));
  assert(!progress.join('').includes('secret'));
  let clicks = 0;
  class Input { set value(v) { this.stored = v; } dispatchEvent() {} }
  const user = new Input(), pass = new Input();
  const context = { location: { origin: 'https://evil.example', pathname: '/login' }, document: { querySelector: selector => ({ '#login-username': user, '#login-password': pass, '#login-button': { click: () => clicks++ } })[selector] }, HTMLInputElement: Input, Event: class {}, setTimeout: fn => fn() };
  const invoke = () => vm.runInNewContext(`(${fillLoginForm.toString()})('Alpha', 'a:b')`, context);
  assert.equal(invoke(), false);
  assert.equal(clicks, 0);
  context.location.origin = 'https://www.roblox.com';
  assert.equal(invoke(), true);
  assert.equal(pass.stored, 'a:b');
  assert.equal(clicks, 1);
  console.log('Bulk import: parsing, password preservation, duplicates, skip/stop, secret clearing and origin restriction passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
