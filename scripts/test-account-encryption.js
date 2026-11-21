const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');

// Exercise the real store/atomic writes against isolated files. This mock only
// controls encryption availability/failures; it never accesses a saved login.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-account-encryption-'));
const storeFile = path.resolve(__dirname, '../src/accountStore.js');
let available = true, failEncryption = false;
const key = crypto.randomBytes(32);
const safeStorage = {
  isEncryptionAvailable: () => available,
  encryptString(value) {
    if (failEncryption) throw Error('fixture encryption failure');
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), data]);
  },
  decryptString(value) {
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, value.subarray(0, 12));
    cipher.setAuthTag(value.subarray(12, 28));
    return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('utf8');
  }
};
const moduleFixture = { exports: {} };
vm.runInNewContext(fs.readFileSync(storeFile, 'utf8'), {
  module: moduleFixture, Buffer, TextDecoder,
  require(name) {
    if (name === 'electron') return { app: { getPath: () => root }, safeStorage };
    if (name === './atomicFile') return require('../src/atomicFile');
    return require(name);
  }
}, { filename: storeFile });
const store = moduleFixture.exports;
const file = path.join(root, 'accounts.json');
const backup = path.join(root, 'accounts.backup.json');
const secret = 'fixture-cookie-that-is-never-a-real-login';
const read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
const legacy = encrypted => ({ id: 'legacy', userId: 123, username: 'Fixture', cookieEnc: Buffer.from(secret).toString('base64'), encrypted, volume: 4, pinned: true });
function seed(record) {
  fs.writeFileSync(file, JSON.stringify([record]));
  if (fs.existsSync(backup)) fs.unlinkSync(backup);
}
function assertProtected(record) {
  assert.equal(record.encrypted, true);
  assert.equal(safeStorage.decryptString(Buffer.from(record.cookieEnc, 'base64')), secret);
  assert.notEqual(record.cookieEnc, Buffer.from(secret).toString('base64'));
}
try {
  available = false;
  assert.throws(() => store.addAccount({ userId: 123, username: 'Fixture', cookie: secret }), /Windows login encryption/);
  assert(!fs.existsSync(file), 'unavailable encryption must never create an account store');
  available = true;
  const account = store.addAccount({ userId: 123, username: 'Fixture', cookie: secret });
  assertProtected(read()[0]);
  assert.equal(store.getCookie(account.id), secret);
  assert(!('cookieEnc' in store.listAccounts()[0]), 'renderer must not receive credentials');
  available = false;
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => store.getCookie(account.id), /Windows login encryption/);
  assert.throws(() => store.setCookie(account.id, secret), /Windows login encryption/);
  assert.throws(() => store.addAccount({ userId: 123, username: 'Fixture', cookie: secret }), /Windows login encryption/);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'unavailable encryption must preserve saved data');

  for (const markedEncrypted of [false, true]) {
    seed(legacy(markedEncrypted));
    assert.throws(() => store.getCookie('legacy'), /Windows login encryption/);
    available = true;
    assert.equal(store.getCookie('legacy'), secret);
    assertProtected(read()[0]);
    assertProtected(JSON.parse(fs.readFileSync(backup, 'utf8'))[0]);
    assert.equal(read()[0].volume, 4);
    assert.equal(read()[0].pinned, true);
    available = false;
  }

  available = true;
  seed(legacy(false));
  failEncryption = true;
  assert.throws(() => store.getCookie('legacy'), /fixture encryption failure/);
  assert.equal(read()[0].encrypted, false, 'failed encryption must not rewrite a legacy login');
  assert.throws(() => store.addAccount({ userId: 123, username: 'Fixture', cookie: secret }), /fixture encryption failure/);
  failEncryption = false;

  const originalRename = fs.renameSync;
  fs.renameSync = function (from, to) {
    if (to === file) throw Error('fixture disk failure');
    return originalRename.apply(this, arguments);
  };
  try { assert.throws(() => store.getCookie('legacy'), /fixture disk failure/); }
  finally { fs.renameSync = originalRename; }
  assert.equal(read()[0].encrypted, false);
  assertProtected(JSON.parse(fs.readFileSync(backup, 'utf8'))[0]);
  assert(!fs.readdirSync(root).some(name => name.endsWith('.tmp')));

  seed({ ...legacy(true), cookieEnc: Buffer.from([0xff, 0xfe, ...Buffer.from(secret)]).toString('base64') });
  assert.throws(() => store.getCookie('legacy'), /cannot be decrypted/, 'binary encrypted data must not become a lossy plaintext login');
  seed(legacy(false));
  store.setCookie('legacy', secret);
  assertProtected(read()[0]);
  assertProtected(JSON.parse(fs.readFileSync(backup, 'utf8'))[0]);
  seed(legacy(false));
  store.addAccount({ userId: 123, username: 'Fixture', cookie: secret });
  assertProtected(read()[0]);
  assertProtected(JSON.parse(fs.readFileSync(backup, 'utf8'))[0]);
  console.log('PASS: encrypted saves, unavailable/failing encryption, legacy migration, protected backups, disk failures, binary rejection and renderer redaction.');
} finally {
  const resolved = path.resolve(root);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert(path.basename(resolved).startsWith('seal-account-encryption-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
