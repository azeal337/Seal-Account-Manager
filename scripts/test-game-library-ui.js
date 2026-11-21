const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {app,session,net,clipboard}=require('electron');const temp=fs.mkdtempSync(path.join(process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),'seal-game-library-ui-'));
app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>[];
require('../src/robloxApi').getAvatarUrls=async()=>({});require('../src/robloxProgress').profiles=async()=>[];require('../src/robloxProgress').badgeIcons=async()=>({});
const games=[{universeId:'1',placeId:'10',name:'Old game',createdAt:'2010-01-01T00:00:00Z'},{universeId:'2',placeId:'20',name:'New game',createdAt:'2024-01-01T00:00:00Z'},{universeId:'3',placeId:'30',name:'Middle game',createdAt:'2018-01-01T00:00:00Z'},{universeId:'4',placeId:'40',name:'Unknown age',createdAt:''}];
const copied = [];
const captureCopy = value => copied.push(value);
clipboard.writeText = captureCopy;
assert.equal(clipboard.writeText, captureCopy, 'clipboard test must use a fixture');
app.whenReady().then(()=>{
 session.defaultSession.protocol.handle('https',request=>request.url.startsWith('https://tr.rbxcdn.com/')?new Response('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>',{headers:{'Content-Type':'image/svg+xml'}}):net.fetch(request,{bypassCustomProtocolHandlers:true}));
 const saved=[];for(const [userId,username] of [[123,'Alpha'],[456,'Beta']])saved.push(require('../src/accountStore').addAccount({username,userId,cookie:'fixture-only'}));
 const played=['2020-01-01T12:00:00Z','2025-01-01T12:00:00Z','2023-01-01T12:00:00Z'];
 fs.writeFileSync(path.join(app.getPath('userData'),'playtime.json'),JSON.stringify({version:1,accounts:{'user:123':{accountId:saved[0].id,userId:'123',username:'Alpha',segments:played.map((date,index)=>({start:Date.parse(date),end:Date.parse(date)+1000,experienceKey:'universe:'+(index+1)}))}},experiences:Object.fromEntries(games.map(game=>['universe:'+game.universeId,{...game,key:'universe:'+game.universeId}]))}));
 const badge=(id,place)=>({id:String(id),name:'Badge '+id,placeId:String(place),gameName:'Place '+place,scan:'saved'});
 const badges=list=>Object.fromEntries(list.map(([id,place])=>[String(id),badge(id,place)]));
 fs.writeFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),JSON.stringify({version:1,users:{123:{complete:true,checkedAt:Date.now(),scan:'saved',badges:badges([[101,10],[102,10],[201,20],[202,20],[203,20],[204,20],[205,20]])},456:{complete:true,checkedAt:Date.now(),scan:'saved',badges:badges([[101,10],[201,20],[301,30],[401,40]])}}}));
 const gameStates = { 1: 'private', 2: 'archived', 3: 'removed' };
 fs.writeFileSync(path.join(app.getPath('userData'),'experience-metadata.json'),JSON.stringify({version:1,places:Object.fromEntries(games.map(game=>[game.placeId,{universeId:game.universeId,checkedAt:Date.now()}])),universes:Object.fromEntries(games.map(game=>[game.universeId,{...game,gameAvailability:gameStates[game.universeId],iconUrl:'https://tr.rbxcdn.com/fixture.png',ageChecked:true,checkedAt:Date.now()}]))}));
});
const deadline=setTimeout(()=>{console.error('Game library UI timeout');app.exit(1);},25000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 window.webContents.setBackgroundThrottling(false);const read=code=>window.webContents.executeJavaScript(code),wait=async code=>{for(let i=0;i<200;i++){if(await read(code))return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+code);};
 const names=()=>read(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-copy strong')).map(item=>item.textContent)`);
 const choose=async(id,value)=>{await read(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change'))`);};
 const action=(name,type)=>read(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-card')).find(card=>card.querySelector('strong')?.textContent===${JSON.stringify(name)}).querySelector('[data-action=${JSON.stringify(type)}]').click()`);
 try{
  await read(`document.getElementById('timeRangePreset').value='day';openTime();document.getElementById('timeExperiencesTabBtn').click()`);await wait(`!playtimeLoading && document.querySelectorAll('#timeExperiencesList .time-rank-card').length===4`);assert.equal(await read(`document.getElementById('timeExperiencesTabBtn').textContent`),'Games');assert.deepEqual(await names(),['New game','Old game','Middle game','Unknown age']);assert.match(await read(`document.querySelector('#timeExperiencesList .time-rank-copy small').textContent`),/5 owned badges/);assert.match(await read(`document.querySelector('#timeExperiencesList .time-game-age').textContent`),/First played.*2025/);assert.equal(await read(`playtimeStats.totalMs`),0,'first-play dates survive the selected range at 0s');
  const badgeLabels = await read(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-copy small'), label => label.textContent)`);
  for (const [index, label] of ['Archived', 'Private', 'Unavailable'].entries()) assert(badgeLabels[index].endsWith(' · ' + label));
  assert.doesNotMatch(badgeLabels[3], /Archived|Private|Unavailable/);
  await action('Old game', 'copy-id');
  await wait(`document.body.textContent.includes('Place ID copied.')`);
  assert.deepEqual(copied, ['10']);
  assert.equal(await read(`document.querySelector('[data-game-key="universe:1"] .time-rank-summary').getAttribute('aria-expanded')`), 'false');
  await read(`createTimeRankCard({key:'universe:9007199254740997',universeId:'9007199254740997',name:'Universe only',accounts:[],totalMs:0},0,'experience').querySelector('[data-action="copy-id"]').click()`);
  await wait(`document.body.textContent.includes('Universe ID copied.')`);
  assert.deepEqual(copied, ['10', '9007199254740997']);
  const before=await read(`JSON.stringify(playtimeStats)`);await action('Old game','favorites');assert.equal(await read(`document.querySelector('#timeExperiencesList [data-game-key="universe:1"] .time-rank-summary').getAttribute('aria-expanded')`),'false','favoriting does not expand/collapse the game');await choose('timeGameFilter','favorites');assert.deepEqual(await names(),['Old game']);
  await choose('timeGameFilter','all');await action('Middle game','pins');assert.equal((await names())[0],'Middle game');assert.equal(await read(`document.querySelector('#timeExperiencesList [data-game-key="universe:3"] [data-action="pins"]').getAttribute('aria-pressed')`),'true');await choose('timeGameFilter','pinned');assert.deepEqual(await names(),['Middle game']);
  await choose('timeGameFilter','all');await action('Middle game','pins');await choose('timeGameSort','oldest');assert.deepEqual(await names(),['Old game','Middle game','New game','Unknown age']);await choose('timeGameSort','newest');assert.deepEqual(await names(),['New game','Middle game','Old game','Unknown age']);await choose('timeGameSort','badges-asc');assert.deepEqual(await names(),['Middle game','Unknown age','Old game','New game']);assert.equal(await read(`JSON.stringify(playtimeStats)`),before,'view preferences do not change time or badge data');
  await action('Middle game','pins');await choose('timeGameSort','oldest');await choose('timeGameFilter','favorites');
  await new Promise(resolve=>{window.webContents.once('did-finish-load',resolve);window.webContents.reload();});await read(`document.getElementById('timeRangePreset').value='day';openTime();document.getElementById('timeExperiencesTabBtn').click()`);await wait(`!playtimeLoading && document.querySelectorAll('#timeExperiencesList .time-rank-card').length===1`);assert.equal(await read(`document.getElementById('timeGameSort').value`),'oldest');assert.equal(await read(`document.getElementById('timeGameFilter').value`),'favorites');assert.deepEqual(await names(),['Old game']);await choose('timeGameFilter','all');assert.equal((await names())[0],'Middle game');assert.equal(await read(`document.querySelector('#timeExperiencesList [data-game-key="universe:1"] [data-action="favorites"]').getAttribute('aria-pressed')`),'true');
  await read(`document.getElementById('timeGameSearch').value='new';document.getElementById('timeGameSearch').dispatchEvent(new Event('input'))`);assert.deepEqual(await names(),['New game']);await read(`document.getElementById('timeGameSearch').value='';document.getElementById('timeGameSearch').dispatchEvent(new Event('input'))`);await choose('timeGameSort','badges-desc');
  window.showInactive();await new Promise(r=>setTimeout(r,1500));await read(`document.getElementById('startupScreen').style.setProperty('display','none','important')`);await new Promise(r=>setTimeout(r,250));fs.writeFileSync(path.join(temp, 'game-library-13326.png'),(await window.webContents.capturePage()).toPNG());
  console.log('PASS: real Games UI/IPC names/icons/first-play dates from saved sessions even at 0s in range; unique owned badge order; independent favorites/pins and filters; no accidental expansion; oldest/newest unknown-last; preferences survive renderer restart; search retains pin behavior; time and ownership unchanged.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));require('../main');
