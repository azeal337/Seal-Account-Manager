const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-launch-sequence-'));
app.setPath('userData', path.join(temp, 'userdata'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
process.env.SEAL_TEST_ROBLOX_ROOT = path.join(temp, 'Roblox');
process.argv.push('--seal-launch-test');
const quit = app.quit.bind(app); app.quit = () => {};
const launcher = require('../src/launcher');
let externalHome = false;
let recoveredHome = null;
const home = { pid: 17, startedAt: Date.now(), window: true };
launcher.getRobloxPidSnapshot = async () => ({ pids: externalHome ? [home.pid] : [], reliable: true, confirmedMissingPids: [] });
launcher.listRobloxPids = async () => externalHome ? [home.pid] : [];
launcher.isRobloxRunning = async () => true;
require('../src/bootstrapper').ensureReady = async () => ({ ready: true });
const api = require('../src/robloxApi');
api.getPresenceMany = async () => ({}); api.getAvatarUrls = async () => ({});
require('../src/robloxProgress').profiles = async () => [];
require('../src/activityWatcher').findLogForLaunch = () => '';
require('../src/sessionRecovery').createRecovery = () => ({
  scan: async () => externalHome ? [home] : [], recover: () => recoveredHome ? [recoveredHome] : [], save: () => {}
});
const holder = require('../src/mutexHolder');
let held = false, failMutex = false, starts = 0;
holder.status = () => ({ active: held });
holder.start = async () => { starts++; await new Promise(r=>setTimeout(r,20)); if(failMutex) return {ok:false,busy:true,error:'fixture busy'}; held=true; return {ok:true,active:true}; };
const events = [];
let authInProgress = 0, launches = 0;
api.getAuthTicket = async () => {
  assert.equal(authInProgress,0,'account launch preparation must stay serialized');
  authInProgress++; events.push('auth');
  await new Promise(r=>setTimeout(r,40)); return 'fixture-ticket';
};
launcher.applyPerformanceSettings = () => { assert.equal(events.at(-1),'auth'); events.push('settings'); };
launcher.setVolume = () => {};
api.getUserIdFromUsername = async () => { assert.equal(events.at(-1),'settings');events.push('target');return 123; };
launcher.launchAccount = async (ticket, target, multi, options) => {
  assert.equal(events.at(-1),'target');
  if (!options.multiInstanceReady) await launcher.ensureMultiInstance(true);
  assert(held,'mutex must be owned before spawn');
  assert.equal(ticket,'fixture-ticket');assert.deepEqual(target,{followUserId:123});
  await new Promise(r=>setTimeout(r,40));
  events.push('spawn');authInProgress--;launches++;return {pids:[],beforePids:[]};
};
const accounts=[];
app.whenReady().then(()=>{const store=require('../src/accountStore');for(let i=0;i<6;i++)accounts.push(store.addAccount({username:'Fixture'+i,userId:900+i,cookie:'dummy'}));});
const deadline=setTimeout(()=>app.exit(1),20000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 try{
  const ids=accounts.map(a=>a.id);
  externalHome = true;
  const protectedPlay = await window.webContents.executeJavaScript(`window.api.launch(${JSON.stringify(ids[0])},{followUsername:'Target'}).then(()=>'',e=>e.message)`);
  assert.match(protectedPlay,/kept the existing Roblox window open/);
  const protectedBatch = await window.webContents.executeJavaScript('window.api.prepareLaunchMultiple()');
  assert.equal(protectedBatch.ready, false);
  assert.equal(protectedBatch.requiresClose, false);
  assert.equal(protectedBatch.preservedExisting, true);
  const toastCount = await window.webContents.executeJavaScript(`(() => {
    const warning = ${JSON.stringify(protectedBatch.message)};
    showToast(warning, 'error', 8000);
    showToast(warning, 'error', 8000);
    return [...document.querySelectorAll('#toastRegion .toast-error')].filter(toast => toast.textContent === warning).length;
  })()`);
  assert.equal(toastCount, 1, 'repeated blocked launches should not stack identical warnings');
  assert.equal(launches, 0);
  assert.equal(starts, 0);
  assert.deepEqual(events, []);
  assert.equal((await launcher.getRobloxPidSnapshot()).pids[0],home.pid);
  externalHome = false;
  await window.webContents.executeJavaScript(`Promise.all([window.api.launch(${JSON.stringify(ids[0])},{followUsername:'Target'}),window.api.launch(${JSON.stringify(ids[0])},{followUsername:'Target'}),window.api.launch(${JSON.stringify(ids[1])},{followUsername:'Target'})])`);
  assert.equal(launches,2);assert.equal(starts,2);
  const result=await window.webContents.executeJavaScript(`window.api.launchMultiple(${JSON.stringify(ids.slice(2,4))},{followUsername:'Target'})`);
  assert(result.every(r=>r.ok));assert.equal(launches,4);assert.equal(starts,3,'batch should prepare persistent holder once');
  assert.deepEqual(events,Array.from({length:4},()=>['auth','settings','target','spawn']).flat());
  await window.webContents.executeJavaScript(`window.api.launch(${JSON.stringify(ids[0])},{followUsername:'Target'})`);
  assert.equal(launches,5,'finished attempt with no live PID must be immediately retryable');
  failMutex=true;held=false;
  const error=await window.webContents.executeJavaScript(`window.api.launchMultiple(${JSON.stringify(ids.slice(4))},{followUsername:'Target'}).then(()=>'',e=>e.message)`);
  assert.match(error,/could not release/i);assert.equal(launches,5);assert.equal(events.length,20,'busy batch must stop before auth');
  externalHome = true;
  failMutex = false;
  recoveredHome = {
    accountId: ids[5], pid: home.pid, processStartedAt: home.startedAt, startedAt: home.startedAt,
    targetLabel: 'Roblox home', startedBySeal: true
  };
  const sealHome = await window.webContents.executeJavaScript('window.api.prepareLaunchMultiple()');
  assert.equal(sealHome.ready, true, 'a Home session launched by SAM still permits launching another account');
  console.log('PASS: card Play and Launch Selected protect external Home before auth/holder/spawn. SAM-launched Home still permits more accounts. Duplicate clicks and simultaneous account requests preserve existing launch ordering. Simulated Roblox only.');
  clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));
require('../main');
