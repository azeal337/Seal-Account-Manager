const fs = require('fs');
const { writeTextAtomic } = require('./atomicFile');

function createExternalLaunchSettings(file) {
  let state = { profile: 'last', lastAccountId: '' };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    state = {
      profile: typeof raw.profile === 'string' ? raw.profile : 'last',
      lastAccountId: typeof raw.lastAccountId === 'string' ? raw.lastAccountId : ''
    };
  } catch {}
  function save(next) {
    writeTextAtomic(file, JSON.stringify(next));
    state = next;
    return { ...state };
  }
  return {
    status: () => ({ ...state }),
    select(id, accounts) {
      if (id !== 'last' && !accounts.some(account => account.id === id)) throw Error('Choose a saved account profile.');
      return save({ ...state, profile: id });
    },
    remember: id => save({ ...state, lastAccountId: String(id) }),
    account(accounts) {
      const id = state.profile === 'last' ? state.lastAccountId : state.profile;
      const account = accounts.find(account => account.id === id);
      if (state.profile !== 'last' && !account) throw Error('The Roblox Play settings account was removed. Choose another profile in Launcher.');
      return account || null;
    }
  };
}
module.exports = { createExternalLaunchSettings };
