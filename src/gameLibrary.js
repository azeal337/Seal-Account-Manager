(function(root) {
  const sorts = new Set(['badges-desc', 'badges-asc', 'playtime', 'oldest', 'newest', 'name']);
  const filters = new Set(['all', 'favorites', 'pinned']);
  const validKey = key => /^(place|universe):[1-9]\d{0,18}$/.test(key);
  function aliases(game) {
    return [...new Set([game.key, game.universeId && 'universe:'+game.universeId, game.placeId && 'place:'+game.placeId, game.sourcePlaceId && 'place:'+game.sourcePlaceId, ...(Array.isArray(game.badgeGameKeys) ? game.badgeGameKeys : [])].filter(key => typeof key === 'string' && validKey(key)))];
  }
  function createGameLibrary(storage, key = 'sealTrackedGamesV1') {
    let state = { favorites: [], pins: [], sort: 'badges-desc', filter: 'all' };
    try {
      const raw = JSON.parse(storage.getItem(key) || '{}');
      const clean = value => Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string' && validKey(item)))].slice(0,10000) : [];
      state = { favorites: clean(raw.favorites), pins: clean(raw.pins), sort: sorts.has(raw.sort) ? raw.sort : state.sort, filter: filters.has(raw.filter) ? raw.filter : 'all' };
    } catch {}
    let selected = { favorites: new Set(state.favorites), pins: new Set(state.pins) };
    function commit(next) { storage.setItem(key, JSON.stringify({ version: 1, ...next })); state = next; selected = { favorites: new Set(state.favorites), pins: new Set(state.pins) }; }
    function has(game, type) { return aliases(game).some(alias => selected[type].has(alias)); }
    function toggle(game, type) {
      if (!['favorites','pins'].includes(type)) throw Error('Choose favorites or pins.');
      const keys = aliases(game);
      if (!keys.length) throw Error('This game’s ID is not available yet.');
      const enabled = !has(game, type), values = new Set(state[type]);
      keys.forEach(alias => enabled ? values.add(alias) : values.delete(alias));
      commit({ ...state, [type]: [...values] }); return enabled;
    }
    function setView({sort = state.sort, filter = state.filter} = {}) {
      commit({ ...state, sort: sorts.has(sort) ? sort : state.sort, filter: filters.has(filter) ? filter : state.filter });
    }
    function games(rows, query = '') {
      const needle = String(query).trim().toLowerCase();
      const count = game => Math.max(0, Number(game.earnedBadgeCount) || 0);
      const date = game => { const value=Date.parse(game.firstPlayedAt || '');return Number.isFinite(value) ? value : null; };
      return rows.filter(game => (!needle || String(game.name).toLowerCase().includes(needle)) && (state.filter === 'all' || has(game, state.filter === 'pinned' ? 'pins' : 'favorites'))).sort((a,b) => {
        const pin = Number(has(b,'pins')) - Number(has(a,'pins'));
        if (pin) return pin;
        let order = 0;
        if (state.sort === 'badges-desc') order = count(b) - count(a);
        if (state.sort === 'badges-asc') order = count(a) - count(b);
        if (state.sort === 'playtime') order = (Number(b.totalMs)||0) - (Number(a.totalMs)||0);
        if (state.sort === 'oldest' || state.sort === 'newest') {
          const left=date(a),right=date(b);
          if (left === null || right === null) order = left === right ? 0 : left === null ? 1 : -1;
          else order = state.sort === 'oldest' ? left-right : right-left;
        }
        return order || String(a.name || '').localeCompare(String(b.name || '')) || String(a.key || '').localeCompare(String(b.key || ''));
      });
    }
    return { toggle, has, setView, games, getState: () => structuredClone(state) };
  }
  const api = { createGameLibrary, aliases };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SealGameLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
