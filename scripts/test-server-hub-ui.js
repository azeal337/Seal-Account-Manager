const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {app}=require('electron');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seal-server-ui-'));app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>[];launcher.applyPerformanceSettings=()=>{};launcher.setVolume=()=>{};launcher.ensureMultiInstance=async()=>true;
require('../src/bootstrapper').ensureReady=async()=>({ready:true});
const api=require('../src/robloxApi');api.getPresenceMany=async()=>({});api.getAvatarUrls=async()=>({});api.getAuthTicket=async()=> 'fixture-ticket';require('../src/robloxProgress').profiles=async()=>[];require('../src/activityWatcher').findLogForLaunch=()=>'';require('../src/sessionRecovery').createRecovery=()=>({scan:async()=>[],recover:()=>[],save:()=>{}});
const id='11111111-1111-1111-1111-111111111111',other='22222222-2222-2222-2222-222222222222';let launched=null;
launcher.launchAccount=async(ticket,target)=>{assert.equal(ticket,'fixture-ticket');launched=target;return {pids:[],beforePids:[]};};
const moduleHub=require('../src/serverHub');const hub=moduleHub.createServerHub(path.join(temp,'hub.json'),{fetchJson:async url=>{const u=new URL(url),more=u.searchParams.has('cursor');return {data:more?[{id:other,playing:1,maxPlayers:10}]:[{id,playing:9,maxPlayers:10}],nextPageCursor:more?null:'page2'};}});moduleHub.createServerHub=()=>hub;
app.whenReady().then(()=>{const account=require('../src/accountStore').addAccount({username:'HistoryTest',userId:123,cookie:'dummy'});hub.record([{accountId:account.id,userId:123,username:account.username,targetLabel:'Test game',activity:{placeId:123,jobId:id,confirmed:true}}]);});
const deadline=setTimeout(()=>{console.error('Server UI timed out');app.exit(1)},25000);
app.on('browser-window-created',(_event,win)=>win.webContents.once('did-finish-load',async()=>{
 const run=code=>win.webContents.executeJavaScript(code);const until=async code=>{for(let i=0;i<100;i++){if(await run(code))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+code);};
 try{
  await run("document.getElementById('openServerLibraryBtn').click();document.getElementById('serverBrowsePlace').value='123';document.getElementById('serverBrowse').click()");
  await until("document.querySelectorAll('#publicServerRows .hub-row').length===1");assert(await run("document.getElementById('publicServerRows').textContent.includes('9 / 10')"));
  await run("document.getElementById('serverLoadMore').click()");await until("document.querySelectorAll('#publicServerRows .hub-row').length===2");
  await run("document.querySelector('#publicServerRows button').click()");assert.equal(await run('buildTarget().gameInstanceId'),id);
  await run("document.getElementById('openServerLibraryBtn').click();document.querySelector('[data-server-tab=history]').click()");await until("document.querySelectorAll('#serverHistoryRows .hub-row').length===1");
  await run("document.querySelector('#serverHistoryRows button').click()");await until("document.getElementById('serverHubStatus').textContent.includes('Rejoin requested')");assert.deepEqual(launched,{placeId:'123',gameInstanceId:id});
  await run("document.querySelector('[data-server-tab=timers]').click()");await until("document.getElementById('serverTimerRows').textContent.includes('No event')");
  await run("document.getElementById('serverTimerPlace').value='123';document.getElementById('serverTimerName').value='Hourly boss';document.getElementById('serverTimerForm').requestSubmit()");await until("document.getElementById('serverTimerRows').textContent.includes('Hourly boss')");assert.equal(hub.timers().length,1);
  assert(await run("document.getElementById('serverTimerRows').textContent.includes('Next in')"));
  await run("document.querySelector('#serverTimerRows .hub-row button:last-child').click()");await until("document.getElementById('serverTimerRows').textContent.includes('No event')");assert.equal(hub.timers().length,0);
  await run("document.getElementById('timeRangePreset').value='threeMonths'");const range=await run('selectedTimeRange()');assert.equal(range.to-range.from,90*86400000);
  await run("document.getElementById('timeRangePreset').value='twoMonths'");const range60=await run('selectedTimeRange()');assert.equal(range60.to-range60.from,60*86400000);
  await run("document.querySelector('[data-server-tab=public]').click();document.getElementById('startupScreen').style.setProperty('display','none','important')");win.showInactive();await new Promise(r=>setTimeout(r,400));
  fs.writeFileSync(path.join(temp, 'server-hub-preview.png'),(await win.webContents.capturePage()).toPNG());
  console.log('PASS: public server pagination/exact target, history rejoin through real IPC with mocked Roblox, timers create/countdown/remove, 60/90-day ranges.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(e){console.error(e);app.exit(1)}
}));require('../main');
