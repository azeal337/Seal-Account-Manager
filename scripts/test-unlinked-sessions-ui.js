const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {app}=require('electron');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seal-unlinked-ui-'));
app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});
process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher'),recovery=require('../src/sessionRecovery'),watcher=require('../src/activityWatcher');
let processes=[{pid:100,startedAt:Date.now()-60000,window:true},{pid:101,startedAt:Date.now()-60000,window:false},{pid:102,startedAt:Date.now()-30000,window:true}],kills=[];
launcher.getRobloxPidSnapshot=async()=>({pids:processes.map(p=>p.pid),reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>processes.map(p=>p.pid);launcher.killRobloxPid=async pid=>{kills.push(pid);processes=processes.filter(p=>p.pid!==pid);return true;};
watcher.findLogForLaunch=()=>'';recovery.createRecovery=()=>({scan:async()=>processes,recover:()=>[],save:()=>{}});
const api=require('../src/robloxApi');api.getPresenceMany=async()=>({});api.getAvatarUrls=async()=>({});api.getAuthTicket=async()=>{throw Error('No sign-in or launch expected');};require('../src/robloxProgress').profiles=async()=>[];
let account;app.whenReady().then(()=>{account=require('../src/accountStore').addAccount({username:'HomeUser',userId:123,cookie:'dummy'});});
const deadline=setTimeout(()=>{console.error('Unlinked UI test timeout');app.exit(1);},20000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 const evaluate=code=>window.webContents.executeJavaScript(code);const wait=async code=>{for(let i=0;i<100;i++){if(await evaluate(code))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+code);};
 try{
  const sessions=await evaluate('window.api.listSessions({fast:true})');assert.equal(sessions.length,2);assert(sessions.every(s=>s.unassigned));assert(!sessions.some(s=>s.pids.includes(101)));
  await evaluate('refresh();');await evaluate('refreshSessions({fast:true})');await wait(`document.querySelectorAll('.session-unlinked').length===2`);
  await evaluate(`document.getElementById('startupScreen').style.setProperty('display','none','important');const choice=document.querySelector('.session-link-account');choice.value=${JSON.stringify(account.id)};choice.dispatchEvent(new Event('change'));renderSessions()`);
  assert.equal(await evaluate(`document.querySelector('.session-link-account').value`),account.id,'polling retains the chosen account');
  window.showInactive();await new Promise(r=>setTimeout(r,1800));await evaluate(`document.getElementById('startupScreen').style.setProperty('display','none','important')`);await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(temp, 'unlinked-sessions-13321.png'),(await window.webContents.capturePage()).toPNG());
  await evaluate(`document.querySelector('.session-link').click()`);
  await wait(`document.querySelectorAll('.session-unlinked').length===1 && document.getElementById('sessionsList').textContent.includes('HomeUser')`);
  const linked=await evaluate('window.api.listSessions({fast:true})');assert.deepEqual(linked.find(s=>s.accountId===account.id).pids,[100]);
  const other=linked.find(s=>s.unassigned);
  const duplicate=await evaluate(`window.api.linkSessionAccount(${JSON.stringify(other.accountId)},${JSON.stringify(account.id)}).then(()=>'',e=>e.message)`);assert.match(duplicate,/already has a linked/);
  processes.find(p=>p.pid===102).startedAt+=5000;
  const stale=await evaluate(`window.api.forceQuitRoblox([${JSON.stringify(other.accountId)}]).then(()=>'',e=>e.message)`);assert.match(stale,/has closed/);assert.equal(kills.length,0,'a reused PID must not be closed');
  const current=(await evaluate('window.api.listSessions({fast:true})')).find(s=>s.unassigned);
  await evaluate(`window.api.forceQuitRoblox([${JSON.stringify(current.accountId)}])`);assert.deepEqual(kills,[102]);
  await evaluate(`window.api.forceQuitRoblox([${JSON.stringify(account.id)}])`);assert.deepEqual(kills,[102,100]);
  console.log('PASS: visible home windows appear without guessing accounts; background helpers excluded; real UI linking; duplicate link blocked; PID reuse rejected; targeted close for linked/unlinked clients.');
  clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));
app.on('will-quit',()=>{try{if(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(temp,{recursive:true,force:true});}catch{}});require('../main');
