const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');const {app}=require('electron');
const temporary=fs.mkdtempSync(path.join(process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),'seal-background-ui-'));
app.setPath('userData',path.join(temporary,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temporary,'Roblox');process.argv.push('--seal-launch-test','--seal-background-test','--background');
const quit=app.quit.bind(app);let allowQuit=false,loginWrites=0;app.quit=()=>{if(allowQuit)quit();};app.setLoginItemSettings=()=>{loginWrites++;throw Error('A test must never change Windows startup');};
const background=require('../src/backgroundMode'),factory=background.createBackgroundMode;let mode; background.createBackgroundMode=options=>(mode=factory(options));
const time=require('../src/playtimeStore'),OriginalStore=time.PlaytimeStore;let tracker;time.PlaytimeStore=class extends OriginalStore{constructor(options){super(options);tracker=this;}};
let account;const started=Date.now()-1000,processes=[{pid:1234,startedAt:started,window:true}];
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>({pids:processes.map(row=>row.pid),reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>processes.map(row=>row.pid);
require('../src/sessionRecovery').createRecovery=()=>({scan:async()=>processes,recover:()=>account?[{accountId:account.id,userId:123,pid:1234,processStartedAt:started,startedAt:started,logFile:'fixture.log'}]:[],save:()=>{}});
require('../src/activityWatcher').parseActivity=()=>({confirmed:true,placeId:'99',universeId:'88',userId:123});require('../src/activityWatcher').findLogForLaunch=()=>'';
const networkStalled=process.argv.includes('--network-stalled'),presenceMismatch=process.argv.includes('--presence-mismatch');let presenceCalls=0;
const external=process.argv.includes('--external-unlinked');
require('../src/robloxApi').getAvatarUrls=async()=>({});require('../src/robloxApi').getPresenceMany=async()=>{presenceCalls++;return networkStalled?new Promise(()=>{}):{123:{inGame:true,placeId:presenceMismatch?999:99,universeId:presenceMismatch?888:88,lastLocation:presenceMismatch?'Wrong old game':'Fixture game'}};};require('../src/robloxProgress').profiles=async()=>[];
let externalAccount;
app.whenReady().then(()=>{
 const store=require('../src/accountStore');
 account=store.addAccount({username:'Tracked',userId:123,cookie:'fixture-only'});
 if(external)externalAccount=store.addAccount({username:'External Home',userId:456,cookie:'fixture-external-only'});
});
const deadline=setTimeout(()=>{console.error('Background UI test timeout');app.exit(1);},22000);
let main,shown=0,checked=false;
app.on('browser-window-created',(_event,window)=>{main=window;window.on('show',()=>shown++);window.webContents.once('did-finish-load',async()=>{
 const read=code=>window.webContents.executeJavaScript(code),wait=async code=>{for(let i=0;i<160;i++){if(await read(code))return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+code);};
 try{
  assert(!window.isVisible());assert.equal(shown,0,'background startup never shows a window');assert(mode.status().trayReady,'actual native tray exists');assert.equal(loginWrites,0);
  for(let i=0;i<100&&!tracker.live.size;i++)await new Promise(r=>setTimeout(r,20));assert.equal(tracker.live.size,1,'existing account session recovered without opening UI');
  window.webContents.debugger.attach('1.3');await window.webContents.debugger.sendCommand('Page.setWebLifecycleState',{state:'frozen'});
  if(external)processes.push({pid:2345,startedAt:Date.now(),window:true},{pid:3456,startedAt:Date.now(),window:false});
  await new Promise(r=>setTimeout(r,5500));assert(!window.isVisible());const hidden=tracker.getStats({from:0});assert(hidden.totalMs>=4500,'main-process monitor tracks while renderer is frozen');assert(hidden.experiences[0].totalMs>=4500);
  assert.equal(hidden.experiences[0].universeId,'88');assert.equal(hidden.experiences[0].placeId,'99','confirmed current log takes priority over mismatched online presence');
  if(presenceMismatch)console.log('PASS: a confirmed local join keeps the correct game IDs despite mismatched cached online presence.');
  if(networkStalled){assert(presenceCalls>0);console.log('PASS: hidden/frozen renderer keeps accumulating Roblox AND game time while the online presence promise never resolves.');}
  if(external){
   await new Promise(r=>setTimeout(r,5000));
   const unlinked=tracker.getStats().accounts.find(row=>row.unassigned);
   assert(unlinked?.totalMs>=4500&&unlinked.totalMs<7000,'external Home is timed while SAM stays hidden, without counting a starter process');
   assert.equal(unlinked.experiences.length,0);
  }
  await window.webContents.debugger.sendCommand('Page.setWebLifecycleState',{state:'active'});window.webContents.debugger.detach();
  if(external){
   const sessions=await read('window.api.listSessions({fast:true})');
   const unlinked=sessions.find(row=>row.unassigned);
   assert.deepEqual(unlinked.pids,[2345]);
   await read(`window.api.linkSessionAccount(${JSON.stringify(unlinked.accountId)},${JSON.stringify(externalAccount.id)})`);
   const accounts=tracker.getStats().accounts;
   assert(!accounts.some(row=>row.unassigned));
   assert(accounts.some(row=>row.userId==='456'&&row.totalMs>=4500),'the same recorded interval follows the linked account');
   assert(!window.isVisible());
   console.log('PASS: a new direct Roblox Home launch is tracked with the hidden renderer frozen, is linkable on the dashboard and moves existing time to its account.');
  }
  app.emit('second-instance',{},['Seal.exe','--background']);assert(!window.isVisible(),'startup invocation cannot open an existing hidden manager');app.emit('second-instance',{},['Seal.exe']);for(let i=0;i<100&&!window.isVisible();i++)await new Promise(r=>setTimeout(r,10));assert(window.isVisible(),'manual reopen brings hidden manager back');
  await read(`openLauncher();document.getElementById('keepRunningInput').checked=false;document.getElementById('keepRunningInput').dispatchEvent(new Event('change'))`);await wait(`!document.getElementById('keepRunningInput').disabled`);assert.equal(mode.status().keepRunning,false);
  await read(`document.getElementById('keepRunningInput').checked=true;document.getElementById('keepRunningInput').dispatchEvent(new Event('change'))`);await wait(`!document.getElementById('keepRunningInput').disabled`);assert.equal(mode.status().keepRunning,true);
  await read(`document.getElementById('startupScreen').style.setProperty('display','none','important');document.getElementById('keepRunningInput').scrollIntoView({block:'center'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);await new Promise(r=>setTimeout(r,500));fs.writeFileSync(path.join(temporary, 'background-13327.png'),(await window.webContents.capturePage()).toPNG());
  await read(`document.getElementById('closeAppBtn').click()`);for(let i=0;i<100&&window.isVisible();i++)await new Promise(r=>setTimeout(r,10));assert(!window.isVisible());assert(!window.isDestroyed(),'Close hides rather than destroys');assert.equal(loginWrites,0);mode.show();assert(window.isVisible());
  const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'background-settings.json'),'utf8'));assert(saved.keepRunning);checked=true;allowQuit=true;read(`window.api.quitApp()`).catch(()=>{});
 }catch(error){console.error(error);app.exit(1);}
});});
app.on('will-quit',()=>{
 try{assert(checked);assert(mode.isQuitting());assert(main.isDestroyed());assert(fs.existsSync(path.join(app.getPath('userData'),'playtime.json')));assert.equal(loginWrites,0);clearTimeout(deadline);console.log('PASS: real native tray and hidden startup (no show event); recovers existing session and accumulates game time with renderer frozen; hidden second-instance stays hidden, manual reopen restores; Close hides, settings persist, explicit Quit destroys window and flushes time. No real Windows startup changes.');}
 catch(error){console.error(error);process.exitCode=1;}
});require('../main');
