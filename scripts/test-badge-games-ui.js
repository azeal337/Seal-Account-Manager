const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');const {app}=require('electron');
const parent=process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),temp=fs.mkdtempSync(path.join(parent,'seal-badge-ui-'));app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>[];
require('../src/robloxApi').getAvatarUrls=async()=>({});require('../src/robloxApi').getExperienceDetails=async()=>({});
const progress=require('../src/robloxProgress');progress.profiles=async()=>[];progress.badgeIcons=async()=>({});
progress.awardedDates = async () => { throw Error('Unexpected ownership verification in fixture'); };
let denied=false;progress.ownedBadgePage=async(account,auth,cursor)=>{assert.equal(auth.cookie,'fixture-only');if(denied&&account.userId===123)throw Object.assign(Error('Private'),{status:401});const badge=id=>({id,name:'Badge '+id,description:'Jailbreak award',awarder:{type:1,id:606849621,name:'Jailbreak'}});return account.userId===123?(cursor?{data:[badge(5002)],nextPageCursor:null}:{data:[badge(5001)],nextPageCursor:'next'}):{data:[badge(5001)],nextPageCursor:null};};
const accounts=[];app.whenReady().then(()=>{const store=require('../src/accountStore');for(const [userId,username] of [[123,'Alpha'],[456,'Beta']])accounts.push(store.addAccount({userId,username,cookie:'fixture-only'}));});
const deadline=setTimeout(()=>{console.error('Badge discovery UI timeout');app.exit(1);},30000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 const read=code=>window.webContents.executeJavaScript(code);const wait=async code=>{for(let i=0;i<250;i++){if(await read(code))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+code);};
 try{
  await read(`openTime();setTimeTab('experiences')`);await wait(`!playtimeLoading`);await read(`document.getElementById('timeSyncBadgesBtn').click()`);
  await wait(`!document.getElementById('timeSyncBadgesBtn').disabled && document.getElementById('timeExperiencesList').textContent.includes('Jailbreak')`);
  const stats=await read(`window.api.getPlaytimeStats({from:0})`);assert.equal(stats.totalMs,0);assert.equal(stats.experiences[0].totalMs,0);assert.equal(stats.experiences[0].accounts.length,2);assert(stats.experiences[0].accounts.every(a=>a.totalMs===0));
  await read(`document.querySelector('#timeExperiencesList .time-rank-summary').click()`);
  assert.equal(await read(`document.querySelector('#timeExperiencesList .time-rank-duration').textContent`),'0s');
  assert.match(await read(`document.querySelector('#timeExperiencesList .time-rank-details').textContent`),/Alpha[\s\S]*0s[\s\S]*Beta[\s\S]*0s/);
  await read(`document.querySelector('.earned-badge-section').open=true`);await wait(`document.querySelector('.earned-badge-section').textContent.includes('Badge 5002')`);
  assert.equal(await read(`document.querySelector('.earned-badge-section').querySelectorAll('.badge-card').length`),2);
  const owned=await read(`window.api.getEarnedBadges({badgeGameKey:'place:606849621',accountId:${JSON.stringify(accounts[0].id)}})`);assert.equal(owned.total,2);assert(owned.badges.every(b=>b.accounts.every(a=>a.accountId===accounts[0].id&&a.status==='earned')));
  await read(`document.getElementById('timeRangePreset').value='month';document.getElementById('timeRangePreset').dispatchEvent(new Event('change'))`);await wait(`!playtimeLoading`);assert.match(await read(`document.getElementById('timeExperiencesList').textContent`),/Jailbreak/);
  window.showInactive();await new Promise(r=>setTimeout(r,1800));await read(`document.getElementById('startupScreen').style.setProperty('display','none','important')`);await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(temp, 'badge-games-13322.png'),(await window.webContents.capturePage()).toPNG());
  denied=true;await read(`document.getElementById('timeSyncBadgesBtn').click()`);await wait(`!document.getElementById('timeSyncBadgesBtn').disabled && document.getElementById('timeBadgeStatus').textContent.includes('could not sync')`);assert.match(await read(`document.getElementById('timeExperiencesList').textContent`),/Jailbreak/);
  await read(`(async()=>{const status=(await window.api.getPlaytimeStats()).badgeSync;renderBadgeSyncStatus({...status,busy:true,sequence:status.sequence-1});})()`);
  assert.equal(await read(`document.getElementById('timeSyncBadgesBtn').disabled`), false, 'late status cannot re-disable sync');
  assert(!fs.readFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),'utf8').includes('fixture-only'));
  await read(`playtimeStats.experiences.push(...Array.from({length:80},(_,i)=>({key:'fixture:'+i,name:'Other game '+i,placeId:String(i+10000),totalMs:0,accounts:[]})));renderTimeStats()`);assert.equal(await read(`document.querySelectorAll('#timeExperiencesList .time-rank-card').length`),50);
  await read(`document.getElementById('timeMoreGames').click()`);assert.equal(await read(`document.querySelectorAll('#timeExperiencesList .time-rank-card').length`),81);
  await read(`document.getElementById('timeGameSearch').value='jailbreak';document.getElementById('timeGameSearch').dispatchEvent(new Event('input'))`);assert.equal(await read(`document.querySelectorAll('#timeExperiencesList .time-rank-card').length`),1);
  console.log('PASS: real Time UI/IPC sync discovers Jailbreak without any playtime; game and both owners show 0s; correct earned badges under owner; lifetime badges survive time filter and failed login refresh; no credentials in cache.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));
require('../main');
