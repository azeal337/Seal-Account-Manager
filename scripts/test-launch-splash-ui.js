const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');const {app}=require('electron');
const temporary=fs.mkdtempSync(path.join(process.env.SEAL_TEST_TMP_ROOT||os.tmpdir(),'seal-splash-ui-'));app.setPath('userData',temporary);
const splash=require('../src/launchSplash')({icon:()=>undefined});
const deadline=setTimeout(()=>app.exit(1),15000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 try{
  await new Promise(r=>setTimeout(r,150));
  const read=code=>window.webContents.executeJavaScript(code);
  assert.equal(await read(`document.querySelectorAll('style').length`),0,'CSS source must not be embedded in visible document text');
  assert.equal(await read(`getComputedStyle(document.body).fontSize`),'18px');
  assert.equal(await read(`document.querySelector('.logo img').naturalWidth>0`),true);
  await read(`document.head.hidden=false;document.head.style.display='block'`);
  assert.equal(await read(`getComputedStyle(document.head).display`),'none','metadata remains hidden');
  splash.update('Signing in…');await new Promise(r=>setTimeout(r,80));assert.equal(await read(`document.getElementById('status').textContent`),'Signing in…');
  assert.equal(await read(`document.body.innerText.includes('box-sizing')`),false);
  splash.finish(true);await new Promise(r=>setTimeout(r,80));assert.equal(await read(`document.getElementById('progress').classList.contains('complete')`),true);
  window.showInactive();await new Promise(r=>setTimeout(r,150));fs.writeFileSync(path.join(temporary, 'launch-splash-13321.png'),(await window.webContents.capturePage()).toPNG());
  console.log('PASS: actual launch splash renders external CSS/logo/status/marquee/completion; metadata hidden and CSS source absent.');clearTimeout(deadline);app.quit();
 }catch(error){console.error(error);app.exit(1);}
}));
app.whenReady().then(()=>splash.start('Fixture'));
// The parent runner removes userData after Electron and its GPU cache exit.
