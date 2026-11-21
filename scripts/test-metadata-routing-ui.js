const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {app,session,net}=require('electron');
const temp=fs.mkdtempSync(path.join(process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),'seal-metadata-routing-ui-'));
app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});
process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher');let closes=0;
launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>[];launcher.forceQuitRoblox=async()=>{closes++;throw Error('Repair must not close Roblox');};
require('../src/robloxApi').getAvatarUrls=async()=>({});require('../src/robloxApi').getExperienceDetails=async()=>({});
const progress=require('../src/robloxProgress');let scanned=0,lookups=0;
progress.profiles=async()=>[];progress.badgeIcons=async()=>({});progress.ownedBadgePage=async()=>{scanned++;throw Error('Existing badges must not need a rescan');};
progress.resolvePlace=async place=>{lookups++;assert(['10118559731','10118559732'].includes(place));await new Promise(r=>setTimeout(r,40));return {universeId:3717264063};};
progress.experienceDetails=async ids=>{assert.deepEqual(ids,['3717264063']);return {'3717264063':{name:"nico's nextbots",placeId:'10118559731',iconUrl:'https://tr.rbxcdn.com/fixture.png'}};};
progress.experienceAvailability=async()=>({'3717264063':''});
const {createJoinRouting,repairPlan}=require('../src/joinRouting');const original='127.0.0.1 localhost\r\n127.0.0.1 gamejoin.roblox.com # Fleasion proxy entry\r\n';let hosts=original,cancel=true,elevations=0;
require('../src/joinRoutingWindows').createWindowsJoinRouting=()=>createJoinRouting({readText:async()=>hosts,probe:async()=>false,runRepair:async()=>{elevations++;if(cancel)return 1223;hosts=repairPlan(hosts).text;return 0;}});
app.whenReady().then(()=>{
 session.defaultSession.protocol.handle('https',request=>request.url.startsWith('https://tr.rbxcdn.com/fixture.png')?new Response('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>',{headers:{'Content-Type':'image/svg+xml'}}):net.fetch(request,{bypassCustomProtocolHandlers:true}));
 const store=require('../src/accountStore');store.addAccount({username:'Alpha',userId:123,cookie:'fixture-cookie'});store.addAccount({username:'Beta',userId:456,cookie:'fixture-cookie'});
 const badge=(id,place)=>({id:String(id),placeId:String(place),name:'Badge '+id,gameName:'Place '+place,scan:'existing'});
 fs.writeFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),JSON.stringify({version:1,users:{123:{complete:true,checkedAt:Date.now(),scan:'existing',badges:{5001:badge(5001,10118559731),5002:badge(5002,10118559732)}},456:{complete:true,checkedAt:Date.now(),scan:'existing',badges:{5002:badge(5002,10118559732)}}}}));
});
const deadline=setTimeout(()=>{console.error('Metadata/routing UI timeout');app.exit(1);},30000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 const read=code=>window.webContents.executeJavaScript(code),wait=async code=>{for(let i=0;i<250;i++){if(await read(code))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+code);};
 try{
  await read(`openTime();setTimeTab('experiences')`);await wait(`!playtimeLoading`);await read(`document.getElementById('timeRefreshBtn').click()`);
  await wait(`!playtimeLoading && document.querySelectorAll('#timeExperiencesList .time-rank-card').length===1 && document.getElementById('timeExperiencesList').textContent.includes("nico's nextbots")`);
  await wait(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-summary img')).some(image=>image.complete&&image.naturalWidth>0)`);
  assert.equal(scanned,0);assert.equal(lookups,2);assert.equal(await read(`document.querySelector('#timeExperiencesList .time-rank-duration').textContent`),'0s');
  const stats=await read(`window.api.getPlaytimeStats({from:0})`);assert.equal(stats.totalMs,0);assert.equal(stats.experiences[0].accounts.length,2);assert.equal(stats.experiences[0].earnedBadgeCount,2);
  await read(`document.querySelector('#timeExperiencesList .time-rank-summary').click();document.querySelector('.earned-badge-section').open=true`);await wait(`document.querySelector('.earned-badge-section').textContent.includes('Badge 5002')`);assert.equal(await read(`document.querySelector('.earned-badge-section').querySelectorAll('.badge-card').length`),2);
  assert.match(await read(`document.querySelector('#timeExperiencesList .time-rank-details').textContent`),/Alpha[\s\S]*0s[\s\S]*Beta[\s\S]*0s/);
  await read(`closeTime();openLauncher()`);await wait(`document.getElementById('joinConnectionStatus').textContent.includes('gamejoin.roblox.com')`);assert.equal(elevations,0);
  await read(`document.getElementById('repairJoinConnectionBtn').click()`);await wait(`!document.getElementById('repairJoinConnectionBtn').disabled && document.getElementById('joinConnectionStatus').textContent.includes('cancelled')`);assert.equal(hosts,original);assert.equal(elevations,1);
  cancel=false;await read(`document.getElementById('repairJoinConnectionBtn').click()`);await wait(`!document.getElementById('repairJoinConnectionBtn').disabled && document.getElementById('joinConnectionStatus').textContent.includes('reopen Roblox')`);assert.equal(elevations,2);assert.equal(hosts,'127.0.0.1 localhost\r\n');assert.equal(closes,0);
  window.showInactive();await new Promise(r=>setTimeout(r,1700));await read(`document.getElementById('startupScreen').style.setProperty('display','none','important');document.getElementById('repairJoinConnectionBtn').scrollIntoView({block:'center'})`);await new Promise(r=>setTimeout(r,200));fs.writeFileSync(path.join(temp, 'join-routing-13324.png'),(await window.webContents.capturePage()).toPNG());
  await read(`closeLauncher();openTime();setTimeTab('experiences');document.querySelectorAll('.toast').forEach(toast=>toast.remove())`);await wait(`!playtimeLoading`);await new Promise(r=>setTimeout(r,400));fs.writeFileSync(path.join(temp, 'metadata-13324.png'),(await window.webContents.capturePage()).toPNG());
  console.log('PASS: real UI/IPC hydrates existing badge place IDs to one named game with loaded icon; both 0s owners and both earned subplace badges survive; no badge rescan; routing diagnosis never elevates; cancelled and successful repair work; no Roblox process closure or live hosts changes.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));require('../main');
