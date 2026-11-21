function createSealBadgeCard(badge, accountId = '', ownedOnly = false) {
    const card = document.createElement('article');
    card.className = 'badge-card';
    const image = document.createElement('img');
    if (/^https:\/\/[^/]*rbxcdn\.com\//.test(badge.iconUrl)) image.src = badge.iconUrl;
    image.alt = ''; image.loading = 'lazy';
    image.onerror = () => image.remove();
    const title = document.createElement('strong');
    title.textContent = badge.name;
    const description = document.createElement('p');
    description.textContent = badge.description;
    const earned = badge.accounts.filter(a => a.status === 'earned').length;
    const indicator = document.createElement('b');
    indicator.className = 'badge-progress';
    indicator.textContent = ownedOnly && !accountId ? `✓ ${earned} saved account${earned===1?'':'s'} earned` : accountId ? (earned ? '✓ Earned' : badge.accounts[0]?.status === 'not-returned' ? '✕ Not earned or hidden' : '? Unavailable') : `${earned ? '✓' : badge.accounts.some(a => a.status === 'unknown') ? '?' : '✕'} ${earned}/${badge.accounts.length} accounts earned`;
    const recipients = document.createElement(accountId ? 'div' : 'details');
    if (!accountId) { const heading = document.createElement('summary'); heading.textContent = 'Accounts and award dates'; recipients.append(heading); }
    for (const account of badge.accounts) {
      const row = document.createElement('p');
      if (account.status === 'earned' && account.awardedDate) {
        const date = document.createElement('time');
        date.dateTime = account.awardedDate; date.textContent = new Date(account.awardedDate).toLocaleString();
        row.append(`${account.username}: ✓ `, date);
      } else {
        const date = account.awardDateState === 'pending' ? 'Checking award date…' : 'Award date unavailable from Roblox';
        row.textContent = `${account.username}: ${account.status === 'earned' ? `✓ ${date}` : account.status === 'unknown' ? '? Could not check — refresh to retry' : '✕ Not earned or hidden'}`;
      }
      recipients.append(row);
    }
    card.append(image, title, indicator, description);
    if (!badge.enabled) { const disabled = document.createElement('small'); disabled.textContent = 'Currently disabled by the game'; card.append(disabled); }
    card.append(recipients);
    return card;
  }

const sealBadgeViews = new Map();
function createSealBadges(game, accountId = '') {
  const key = `${game.universeId || game.placeId}:${accountId}`;
  if (sealBadgeViews.has(key)) return sealBadgeViews.get(key);
  const root = document.createElement('details');
  root.className = 'badge-section';
  const summary = document.createElement('summary');
  summary.textContent = 'Badges';
  const note = document.createElement('p');
  note.textContent = 'Lifetime badge progress • ✓ Earned • ✕ Not earned or hidden • ? Unavailable. Dates use your local time.';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const list = document.createElement('div');
  list.className = 'badge-gallery';
  const more = document.createElement('button');
  more.className = 'btn btn-quiet';
  more.textContent = 'Load badges';
  const refresh = document.createElement('button');
  refresh.className = 'btn btn-quiet';
  refresh.textContent = 'Refresh badges';
  let cursor = '', loaded = false, busy = false;
  const seen = new Set();
  async function load(reset = false) {
    if (busy) return;
    busy = true; more.disabled = refresh.disabled = true;
    status.textContent = 'Checking badges and account awards…';
    try {
      const result = await window.api.getBadges({ universeId: game.universeId, placeId: game.placeId, accountId, cursor: reset ? '' : cursor, fresh: reset });
      if (reset) { list.replaceChildren(); seen.clear(); }
      for (const badge of result.badges) if (!seen.has(badge.id)) { seen.add(badge.id); list.append(createSealBadgeCard(badge, accountId)); }
      cursor = result.nextCursor;
      loaded = true;
      more.hidden = !cursor;
      more.textContent = 'Load more badges';
      status.textContent = `${seen.size} badges loaded${cursor ? ' — more available' : ''}. Checked ${new Date(result.checkedAt).toLocaleTimeString()}.`;
      if (!seen.size) status.textContent = 'This game has no badges available from Roblox.';
    } catch (error) { status.textContent = `Could not load badges: ${error.message}`; more.hidden = false; more.textContent = 'Retry'; }
    finally { busy = false; more.disabled = refresh.disabled = false; }
  }
  root.addEventListener('toggle', () => { if (root.open && !loaded) load(); });
  more.onclick = () => load();
  refresh.onclick = () => load(true);
  root.append(summary, note, status, list, more, refresh);
  // Keep expanded badge results through Time's automatic playtime refresh.
  while (sealBadgeViews.size >= 150) sealBadgeViews.delete(sealBadgeViews.keys().next().value);
  sealBadgeViews.set(key, root);
  return root;
}

const sealArtwork = new Map();
function decorateSealSession(item, session) {
  const universeId = session.universeId || session.presence?.universeId;
  if (!universeId || session.presence?.inGame === false) return;
  let lookup = sealArtwork.get(String(universeId));
  if (!lookup || Date.now() - lookup.at > 300000) {
    lookup = { at: Date.now(), promise: window.api.getGameArtwork(universeId).catch(() => '') };
    sealArtwork.set(String(universeId), lookup);
  }
  lookup.promise.then(url => {
    if (!/^https:\/\/[^/]*rbxcdn\.com\//.test(url) || !item.isConnected) return;
    item.style.backgroundImage = `linear-gradient(90deg, rgba(5,8,12,.90), rgba(5,8,12,.72)), url(${JSON.stringify(url)})`;
    item.classList.add('session-game-art');
  });
}

function createSealEarnedBadges(game, accountId = '') {
  const key = `earned:${game.badgeGameKey || game.universeId || game.placeId}:${accountId}`;
  if (sealBadgeViews.has(key)) { const previous=sealBadgeViews.get(key); previous.refreshEarned?.(game); return previous; }
  const root=document.createElement('details'); root.className='badge-section earned-badge-section';
  const summary=document.createElement('summary'),note=document.createElement('p'),status=document.createElement('p'),list=document.createElement('div'),more=document.createElement('button');
  note.textContent='Lifetime earned badges and award dates, shown in your local time. Dates load in the background and stay saved.';
  status.setAttribute('role','status');list.className='badge-gallery';more.className='btn btn-quiet';more.textContent='Load earned badges';
  let cursor='',loaded=false,busy=false,revision=game.earnedRevision,reload=false,currentGame=game;const seen=new Set();
  const title=()=>{summary.textContent=`Earned badges${currentGame.earnedBadgeCount?` (${currentGame.earnedBadgeCount})`:''}`;};title();
  async function load(reset=false){
    if(busy){reload=reload||reset;return;}busy=true;more.disabled=true;status.textContent='Loading earned badges…';
    try{
      const result=await window.api.getEarnedBadges({badgeGameKey:currentGame.badgeGameKey,badgeGameKeys:currentGame.badgeGameKeys,universeId:currentGame.universeId,placeId:currentGame.placeId,accountId,cursor:reset?'':cursor});
      if(reset){list.replaceChildren();seen.clear();}
      const iconsToLoad=[];
      for(const badge of result.badges)if(!seen.has(badge.id)){
        seen.add(badge.id);const card=createSealBadgeCard(badge,accountId,true);list.append(card);
        iconsToLoad.push({id:badge.id,card});
      }
      // Cached names/ownership render first. Slow thumbnail requests never
      // hold up opening the earned-badge gallery.
      if(iconsToLoad.length)window.api.getBadgeIcons?.(iconsToLoad.map(item=>item.id)).then(icons=>{
        for(const item of iconsToLoad){const url=icons[item.id];if(!/^https:\/\/[^/]*rbxcdn\.com\//.test(url))continue;let img=item.card.querySelector('img');if(!img){img=document.createElement('img');img.alt='';img.loading='lazy';img.onerror=()=>img.remove();item.card.prepend(img);}if(img.src!==url)img.src=url;}
      }).catch(()=>{});
      cursor=result.nextCursor;loaded=true;more.hidden=!cursor;more.textContent='Load more earned badges';status.textContent=`${seen.size} of ${result.total} earned badges shown.`;
    }catch(error){status.textContent=`Could not load earned badges: ${error.message}`;more.hidden=false;more.textContent='Retry';}
    finally{busy=false;more.disabled=false;if(reload){reload=false;load(true);}}
  }
  root.refreshEarned=next=>{currentGame=next;title();if(next.earnedRevision!==revision){revision=next.earnedRevision;loaded=false;if(root.open)load(true);}};
  root.addEventListener('toggle',()=>{if(root.open&&!loaded)load();});more.onclick=()=>load();
  root.append(summary,note,status,list,more);while(sealBadgeViews.size>=150)sealBadgeViews.delete(sealBadgeViews.keys().next().value);sealBadgeViews.set(key,root);return root;
}
