(function (root) {
  const gold = '#e8c783';
  const moon = '#c6c9ed';
  const flame = '#ecab92';
  const green = '#acd6b7';

  const major = [
    ['The Fool', '✧', gold], ['The Magician', '∞', gold],
    ['The High Priestess', '☾', moon], ['The Empress', '❀', green],
    ['The Emperor', '♔', flame], ['The Hierophant', '✚', gold],
    ['The Lovers', '♡', flame], ['The Chariot', '⊙', gold],
    ['Strength', '♢', flame], ['The Hermit', '✦', moon],
    ['Wheel of Fortune', '✺', gold], ['Justice', '⚖', green],
    ['The Hanged Man', '◇', moon], ['Death', '✕', moon],
    ['Temperance', '≈', green], ['The Devil', '♠', flame],
    ['The Tower', 'ϟ', flame], ['The Star', '★', moon],
    ['The Moon', '☽', moon], ['The Sun', '☼', gold],
    ['Judgement', '✶', flame], ['The World', '◎', green]
  ];
  const suits = [
    ['Wands', '✦', '#efb88c'], ['Cups', '♡', '#acdace'],
    ['Swords', '✕', '#b4caef'], ['Pentacles', '★', '#e5ca8a']
  ];
  const ranks = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
  const cards = new Map([
    ...major,
    ...suits.flatMap(([suit, symbol, color]) => ranks.map(rank => [rank + ' of ' + suit, symbol, color]))
  ].map(([name, symbol, color]) => [name, { name, symbol, color }]));

  function createTarotDeck(storage, random = Math.random) {
    const storageKey = 'sealSessionTarotDeckV1';
    let remaining = [];
    let drawn = new Map();
    try {
      const saved = JSON.parse(storage.getItem(storageKey) || '{}');
      if (Array.isArray(saved.remaining)) remaining = [...new Set(saved.remaining.filter(name => cards.has(name)))];
      if (Array.isArray(saved.drawn)) {
        drawn = new Map(saved.drawn.filter(entry => Array.isArray(entry) &&
          typeof entry[0] === 'string' && cards.has(entry[1])));
      }
    } catch {
      // A broken or unavailable cache starts a fresh deck.
    }

    function shuffledDeck() {
      const pile = [...cards.keys()];
      for (let last = pile.length - 1; last > 0; last--) {
        const pick = Math.floor(random() * (last + 1));
        [pile[last], pile[pick]] = [pile[pick], pile[last]];
      }
      return pile;
    }

    function cardsForSessions(keys) {
      const active = new Set(keys);
      const result = new Map();
      let changed = false;
      for (const key of active) {
        if (!drawn.has(key)) {
          if (!remaining.length) remaining = shuffledDeck();
          drawn.set(key, remaining.pop());
          changed = true;
        }
        result.set(key, cards.get(drawn.get(key)));
      }

      // Retain recent assignments across a restart or a transient process scan.
      const limit = active.size + 256;
      for (const key of drawn.keys()) {
        if (drawn.size <= limit) break;
        if (!active.has(key)) {
          drawn.delete(key);
          changed = true;
        }
      }
      if (changed) {
        try { storage.setItem(storageKey, JSON.stringify({ remaining, drawn: [...drawn] })); }
        catch { /* Keep playing from the in-memory deck. */ }
      }
      return result;
    }

    return { cardsForSessions };
  }

  const api = { createTarotDeck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SealTarotDeck = api;
})(typeof window !== 'undefined' ? window : globalThis);
