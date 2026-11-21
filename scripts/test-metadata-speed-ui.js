const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {app,session,net}=require('electron');const temp=fs.mkdtempSync(path.join(process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),'seal-speed-ui-'));
app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const gate=()=>{let release;return {promise:new Promise(r=>{release=r;}),release:()=>release()};},sessions=gate(),games=gate(),icons=gate();
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>{await sessions.promise;return {pids:[],reliable:true,confirmedMissingPids:[]};};launcher.listRobloxPids=async()=>[];
require('../src/robloxApi').getAvatarUrls=async()=>({});require('../src/robloxApi').getExperienceDetails=async()=>{throw Error('Time must not wait for old network enrichment');};
const progress=require('../src/robloxProgress');progress.profiles=async()=>[];
progress.resolvePlace=async place=>{if(Number(place)>6)await games.promise;return {universeId:String(Number(place)+1000)};};
progress.experienceDetails=async ids=>Object.fromEntries(ids.map(id=>[id,{name:'Fast game '+id,placeId:String(Number(id)-1000),iconUrl:'https://tr.rbxcdn.com/fixture.png'}]));
progress.experienceAvailability=async ids=>Object.fromEntries(ids.map(id=>[id,id==='1001'?'private':'']));
let iconRequests=0;progress.badgeIcons=async ids=>{iconRequests++;await icons.promise;return Object.fromEntries(ids.map(id=>[id,'https://tr.rbxcdn.com/badge.png']));};
app.whenReady().then(()=>{
 session.defaultSession.protocol.handle('https',request=>request.url.startsWith('https://tr.rbxcdn.com/')?new Response('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>',{headers:{'Content-Type':'image/svg+xml'}}):net.fetch(request,{bypassCustomProtocolHandlers:true}));
 require('../src/accountStore').addAccount({username:'Alpha',userId:123,cookie:'fixture-only'});
 const badges=Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+100),{id:String(i+100),placeId:String(i+1),gameName:'Place '+(i+1),name:'Cached badge '+(i+100),scan:'saved'}]));
 fs.writeFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),JSON.stringify({version:1,users:{123:{complete:true,checkedAt:Date.now(),scan:'saved',badges}}}));
});
const deadline=setTimeout(()=>{console.error('Metadata speed UI timeout');app.exit(1);},20000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 window.webContents.setBackgroundThrottling(false);
 const read=code=>window.webContents.executeJavaScript(code),wait=async(code,ms=3000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await read(code))return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out: '+code);};
 try{
  const start=performance.now();const snapshot=await read(`window.api.getPlaytimeStats({})`);const timeMs=Math.round(performance.now()-start);assert(timeMs<500,'Time IPC must return cached data despite a blocked session scan');assert.equal(snapshot.experiences.length,12);
  await read(`openTime();setTimeTab('experiences')`);await wait(`!playtimeLoading`);await read(`document.getElementById('timeRefreshBtn').click()`);
  await wait(`document.getElementById('timeExperiencesList').textContent.includes('Fast game 1001')`,1500);assert.equal(await read(`playtimeStats.gameMetadata.busy`),true,'known names appear before another batch finishes');
  await wait(`document.querySelector('[data-game-key="universe:1001"] .time-rank-copy small')?.textContent.includes('Private')`);
  assert.doesNotMatch(await read(`document.querySelector('[data-game-key="universe:1002"] .time-rank-copy small').textContent`),/Public|Private|Unavailable/);
  const iconUrl=await read(`document.querySelector('#timeExperiencesList .time-rank-summary img').src`);assert(!iconUrl.includes('sealAvatar'),'game icons must keep stable browser cache URLs');await read(`avatarRevision=Date.now()+123;renderTimeStats()`);assert.equal(await read(`document.querySelector('#timeExperiencesList .time-rank-summary img').src`),iconUrl);
  await read(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-summary')).find(item=>item.textContent.includes('Fast game 1001')).click();document.querySelector('.earned-badge-section').open=true`);
  await wait(`document.querySelector('.earned-badge-section').textContent.includes('Cached badge 100')`,500);await wait(`document.querySelector('.earned-badge-section .badge-card')!==null`,500);assert.equal(iconRequests,1);assert.equal(await read(`document.querySelector('.earned-badge-section .badge-card img').hasAttribute('src')`),false,'badge names are visible while icons are blocked');
  icons.release();await wait(`document.querySelector('.earned-badge-section .badge-card img')?.naturalWidth>0`);
  games.release();sessions.release();await wait(`!playtimeStats.gameMetadata.busy`);assert.equal(await read(`playtimeStats.experiences.length`),12);
  console.log('PASS: cached Time IPC '+timeMs+'ms with session scan blocked; ready names render during slow metadata batch; earned badge text renders before blocked icon request; icons fill afterward; all 0s games retained.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){sessions.release();games.release();icons.release();console.error(error);app.exit(1);}
}));require('../main');
