(() => {
  const root = document.getElementById('flagLibrary');
  const search = document.getElementById('flagLibrarySearch');
  const category = document.getElementById('flagLibraryCategory');
  const list = document.getElementById('flagLibraryList');
  const preview = document.getElementById('flagLibraryPreview');
  const status = document.getElementById('flagLibraryStatus');
  const review = document.getElementById('flagLibraryReview');
  let selected = {};
  let undo = null;
  function updatePreview() {
    try {
      const flags = SealFlagCatalog.compile(selected);
      preview.textContent = JSON.stringify(flags, null, 2);
      status.textContent = `${Object.keys(flags).length} flags selected. Changes take effect when you launch with the saved preset.`;
      review.disabled = !Object.keys(flags).length;
    } catch (error) { status.textContent = error.message; review.disabled = true; preview.textContent = ''; }
    document.getElementById('flagLibraryUndo').disabled = !undo;
  }
  function renderLibrary() {
    const query = search.value.trim().toLowerCase();
    list.replaceChildren();
    const matches = SealFlagCatalog.entries.filter(entry =>
      (category.value === 'all' || category.value === entry.category || (category.value === 'selected' && Object.hasOwn(selected, entry.name))) &&
      `${entry.name} ${entry.title} ${entry.description}`.toLowerCase().includes(query));
    for (const entry of matches) {
      const card = document.createElement('article');
      card.className = 'flag-library-card';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Object.hasOwn(selected, entry.name);
      checkbox.disabled = !!entry.managed;
      const title = document.createElement('strong');
      title.textContent = entry.title;
      label.append(checkbox, title);
      const badge = document.createElement('small');
      badge.textContent = entry.managed ? 'Account control' : entry.experimental ? 'Allowlisted · experimental' : `Allowlisted · ${entry.category}`;
      const name = document.createElement('code');
      name.textContent = entry.name;
      const description = document.createElement('p');
      description.textContent = entry.description;
      const value = document.createElement('select');
      value.setAttribute('aria-label', `${entry.title} value`);
      value.disabled = !!entry.managed;
      for (const choice of entry.choices) value.add(new Option(choice, choice));
      value.value = selected[entry.name] ?? entry.choices[0];
      const change = () => {
        undo = { ...selected };
        if (checkbox.checked) {
          if (entry.exclusive && value.value === 'True') {
            for (const other of SealFlagCatalog.entries.filter(e => e.exclusive === entry.exclusive)) delete selected[other.name];
          }
          selected[entry.name] = value.value;
        } else delete selected[entry.name];
        // Refresh only when an exclusive choice changes other cards.
        if (entry.exclusive || category.value === 'selected') renderLibrary();
        else updatePreview();
      };
      checkbox.onchange = change;
      value.onchange = () => { checkbox.checked = true; change(); };
      card.append(label, badge, name, description, value);
      list.append(card);
    }
    if (!matches.length) { const empty = document.createElement('p'); empty.textContent = 'No matching flags. Try a different search or category.'; list.append(empty); }
    updatePreview();
  }
  for (const name of [...new Set(SealFlagCatalog.entries.map(e => e.category))]) category.add(new Option(name, name));
  for (const [name, flags] of Object.entries(SealFlagCatalog.starters)) {
    const button = document.createElement('button');
    button.className = 'btn btn-quiet';
    button.textContent = name;
    button.onclick = () => { undo = { ...selected }; selected = { ...flags }; renderLibrary(); };
    document.getElementById('flagLibraryStarters').append(button);
  }
  search.oninput = renderLibrary;
  category.onchange = renderLibrary;
  document.getElementById('flagLibraryClear').onclick = () => { undo = { ...selected }; selected = {}; renderLibrary(); };
  document.getElementById('flagLibraryUndo').onclick = () => { if (undo) { selected = undo; undo = null; renderLibrary(); } };
  review.onclick = async () => {
    try {
      const flags = SealFlagCatalog.compile(selected);
      if (!Object.keys(flags).length) return;
      openPerformancePresetEditor();
      await analyzePerformancePresetJson(JSON.stringify(flags), 'Library preset');
      setPresetEditorMode('guided');
      root.open = false;
    } catch (error) { status.textContent = error.message; }
  };
  renderLibrary();
})();
