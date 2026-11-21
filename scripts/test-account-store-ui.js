const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {app}=require('electron');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seal-store-ui-'));
app.setPath('userData',path.join(temp,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});
process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temp,'Roblox');process.argv.push('--seal-launch-test');
const quit=app.quit.bind(app);app.quit=()=>{};
const file=path.join(app.getPath('userData'),'accounts.json');fs.writeFileSync(file,'null');
const launcher=require('../src/launcher');launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});launcher.listRobloxPids=async()=>[];
const deadline=setTimeout(()=>{console.error('Account error UI test timed out');app.exit(1);},20000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 try {
  const evaluate=code=>window.webContents.executeJavaScript(code);
  await evaluate(`window.unhandledFailures=[];window.addEventListener('unhandledrejection',event=>window.unhandledFailures.push(String(event.reason)));`);
  for(let i=0;i<100;i++){if(await evaluate(`document.getElementById('toastRegion').textContent.includes('Could not load saved accounts')`))break;await new Promise(r=>setTimeout(r,50));}
  assert.match(await evaluate(`document.getElementById('toastRegion').textContent`),/files have been preserved/);
  assert.equal(await evaluate(`refresh()`),false);assert.deepEqual(await evaluate(`window.unhandledFailures`),[]);
  assert.equal(fs.readFileSync(file,'utf8'),'null');
  fs.writeFileSync(file,'[]');await evaluate(`refresh()`);assert.deepEqual(await evaluate(`window.api.listAccounts()`),[]);
  console.log('PASS: unreadable account store produces a visible error, preserves data, avoids unhandled refresh rejection, and can reload after repair.');
  clearTimeout(deadline);app.quit=quit;quit();
 } catch(error){console.error(error);app.exit(1);}
}));
app.on('will-quit',()=>{try{fs.rmSync(temp,{recursive:true,force:true});}catch{}});
require('../main');
