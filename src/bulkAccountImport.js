'use strict';

function parseCredentials(text) {
  if (text && typeof text === 'object') {
    if (typeof text.usernames !== 'string' || typeof text.passwords !== 'string' || text.usernames.length + text.passwords.length > 1000000) throw new Error('Paste up to 200 accounts into the two columns.');
    const usernames = text.usernames.replace(/^\uFEFF/, '').split(/\r?\n/);
    const passwords = text.passwords.split(/\r?\n/);
    // Ignore trailing empty lines only; never collapse interior blank rows and
    // accidentally pair a password with the next account.
    while (usernames.length && usernames.at(-1) === '') usernames.pop();
    while (passwords.length && passwords.at(-1) === '') passwords.pop();
    if (usernames.length !== passwords.length) throw new Error(`The columns must have the same number of rows (${usernames.length} usernames, ${passwords.length} passwords). Nothing was imported.`);
    if (!usernames.length || usernames.length > 200) throw new Error('Paste between 1 and 200 accounts.');
    const seen = new Set();
    return usernames.map((raw, index) => {
      const username = raw.trim();
      const password = passwords[index];
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || !password.length) throw new Error(`Check row ${index + 1}: a valid username and password are both required. Nothing was imported.`);
      if (seen.has(username.toLowerCase())) throw new Error(`Duplicate username on row ${index + 1}. Keep one entry per account.`);
      seen.add(username.toLowerCase());
      return { username, password };
    });
  }
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('Paste up to 200 username:password lines.');
  const entries = [];
  const seen = new Set();
  const errors = [];
  for (const [index, raw] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const separator = raw.indexOf(':');
    const username = raw.slice(0, separator).trim();
    const password = raw.slice(separator + 1);
    if (separator < 1 || !/^[A-Za-z0-9_]{3,20}$/.test(username) || !password.length) {
      errors.push(index + 1);
      continue;
    }
    if (seen.has(username.toLowerCase())) throw new Error(`Duplicate username on line ${index + 1}. Keep one entry per account.`);
    seen.add(username.toLowerCase());
    entries.push({ username, password });
  }
  if (errors.length) throw new Error(`Expected username:password on line${errors.length > 1 ? 's' : ''} ${errors.slice(0, 10).join(', ')}. Nothing was imported.`);
  if (!entries.length || entries.length > 200) throw new Error('Paste between 1 and 200 username:password lines.');
  return entries;
}

async function runBulkImport(entries, { login, controller, report }) {
  const results = [];
  const total = entries.length;
  try {
    for (let index = 0; index < total && !controller.stopped; index++) {
      const entry = entries[index];
      report({ total, current: index + 1, username: entry.username, results: [...results], done: false });
      try {
        const account = await login(entry, controller);
        results.push({ username: account.username, status: 'saved' });
      } catch (error) {
        // Never forward authentication errors or submitted credentials to UI/logs.
        results.push({ username: entry.username, status: controller.stopped ? 'stopped' : error.code === 'BULK_SKIP' ? 'skipped' : 'failed' });
      } finally {
        entry.password = '';
        controller.cancelCurrent = null;
      }
    }
    const summary = { total, results, done: true, stopped: !!controller.stopped };
    report(summary);
    return summary;
  } finally {
    for (const entry of entries) entry.password = '';
  }
}

// Serialized into the isolated Roblox window; do not interpolate credentials
// into executable source except as JSON arguments. Only fill the official origin.
function fillLoginForm(username, password) {
  if (location.origin !== 'https://www.roblox.com' || !/^\/login\/?$/.test(location.pathname)) return false;
  const user = document.querySelector('#login-username');
  const pass = document.querySelector('#login-password');
  const button = document.querySelector('#login-button');
  if (!user || !pass || !button) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  for (const [input, value] of [[user, username], [pass, password]]) {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // React may update the button in the next event loop turn.
  setTimeout(() => { if (!button.disabled) button.click(); }, 100);
  return true;
}

module.exports = { parseCredentials, runBulkImport, fillLoginForm };
