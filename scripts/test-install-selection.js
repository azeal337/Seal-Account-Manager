const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {selectPlayerFolder}=require('../src/playerInstallation');
const bootstrap=require('../src/bootstrapper');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-install-'));
 const older=path.join(root,'Versions','version-aaaa'),current=path.join(root,'Versions','version-bbbb');
 for(const folder of [older,current]){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'RobloxPlayerBeta.exe'),'fixture');}
 fs.utimesSync(path.join(older,'RobloxPlayerBeta.exe'),1000,1000);fs.utimesSync(path.join(current,'RobloxPlayerBeta.exe'),2000,2000);
 fs.utimesSync(older,3000,3000);
 assert.equal(selectPlayerFolder(root,'version-bbbb'),current,'registry beats folder modified time');
 assert.equal(selectPlayerFolder(root,'version-aaaa'),older,'registered channel beats executable date');
 assert.equal(selectPlayerFolder(root,'version-missing'),current,'fallback uses executable date');
 assert.equal(selectPlayerFolder(root,'../outside'),current,'registry cannot escape Versions');
 let installs=0,kills=0;
 const launcher={findRobloxVersionFolder:()=>older,isRobloxRunning:async()=>true,forceQuitRoblox:async()=>{kills++}};
 const dependencies={getLatestVersionInfo:async()=>({versionGuid:'version-bbbb'}),installOfficialPlayer:async()=>{installs++}};
 await assert.rejects(bootstrap.ensureReady({launcher,userDataPath:root,forceUpdate:true,dependencies}),/existing games were left running/);
 assert.equal(installs,0);assert.equal(kills,0);
 launcher.findRobloxVersionFolder=()=>null;
 await assert.rejects(bootstrap.ensureReady({launcher,userDataPath:root,dependencies}),/existing games were left running/);
 assert.equal(installs,0);assert.equal(kills,0);
 launcher.isRobloxRunning=async()=>false;
 dependencies.installOfficialPlayer=async()=>{installs++;launcher.findRobloxVersionFolder=()=>current};
 await bootstrap.ensureReady({launcher,userDataPath:root,dependencies});assert.equal(installs,1);
 console.log('PASS: registered channel selection, executable-time fallback, path validation, update/missing-install leave active games running, empty-session installation works.');
})().catch(error=>{console.error(error);process.exitCode=1});
