const removedTitle = value => /^\[\s*content\s+(?:deleted|removed)\s*\]$/i.test(String(value || '').trim());

function gameTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title || removedTitle(title) || /^(?:(?:Place|Experience) \d+|\[\s*title unavailable\s*\]|Game details unavailable|Details unknown|Loading game details…)$/i.test(title)) return '';
  return title.slice(0, 160);
}

module.exports = { gameTitle, removedTitle };
