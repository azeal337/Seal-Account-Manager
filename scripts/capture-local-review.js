// Offscreen documentation preview using private fixture data. No real logins,
// processes, Windows startup registrations, or outbound requests are used.
const fs=require('fs'),path=require('path'),Module=require('module');
const {app,session}=require('electron');
if(!process.env.SEAL_TEST_TMP_ROOT||!process.env.SEAL_REVIEW_OUTPUT)throw Error('Run with the isolated test wrapper and a review output directory.');
const temporary=path.join(process.env.SEAL_TEST_TMP_ROOT,'review-fixtures');fs.mkdirSync(temporary,{recursive:true});app.setPath('userData',path.join(temporary,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});
process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temporary,'Roblox');process.argv.push('--seal-launch-test');
const output=path.resolve(process.env.SEAL_REVIEW_OUTPUT);fs.mkdirSync(output,{recursive:true});
const quit=app.quit.bind(app);app.quit=()=>{};const accounts=[];
global.fetch=async()=>{throw Error('Network access is disabled for the local review preview.');};
app.setLoginItemSettings=()=>{throw Error('Review preview cannot change startup.');};app.setAsDefaultProtocolClient=()=>{throw Error('Review preview cannot register Play links.');};
const launcher=require('../src/launcher');launcher.listRobloxPids=async()=>[90001];launcher.getRobloxPidSnapshot=async()=>({pids:[90001],reliable:true,confirmedMissingPids:[]});launcher.applyPerformanceSettings=()=>{};launcher.setVolume=()=>{};launcher.launchAccount=async()=>{throw Error('Preview only');};launcher.forceQuitRoblox=async()=>{throw Error('Preview only');};
require('../src/sessionRecovery').createRecovery=()=>({scan:async()=>[{pid:90001,startedAt:Date.now()-720000,window:true}],recover:()=>accounts.length?[{accountId:accounts[0].id,userId:123,pid:90001,startedAt:Date.now()-720000,processStartedAt:Date.now()-720000,logFile:'fixture.log'}]:[],save:()=>{}});
require('../src/activityWatcher').parseActivity=()=>({confirmed:true,placeId:'20001',universeId:'10001',userId:123});
const api=require('../src/robloxApi');api.getAvatarUrls=async()=>({});api.getPresenceMany=async()=>({123:{inGame:true,placeId:20001,universeId:10001,lastLocation:'Moonlit Caverns'}});
const progress=require('../src/robloxProgress');progress.profiles=async()=>[];progress.badgeIcons=async ids=>Object.fromEntries(ids.map(id=>[id,'https://tr.rbxcdn.com/review-glass.svg']));progress.artwork=async()=>'';progress.badges=async()=>({badges:[],nextCursor:null,checkedAt:new Date().toISOString()});
require('../src/bootstrapper').status=()=>({enabled:true,protocols:{roblox:true,'roblox-player':true},installation:{installed:true,versionGuid:'version-demo'},lastEvent:{phase:'ready',message:'Roblox is ready.'}});
const inventoryModule=require('../src/badgeInventory'),makeInventory=inventoryModule.createBadgeInventory;
inventoryModule.createBadgeInventory=(file,options)=>{
 const inventory=makeInventory(file,{...options,fetchPage:async()=>({data:[],nextPageCursor:null})});
 inventory.start(accounts,()=>({cookie:'review-fixture-only'}));
 options.awardDates.enqueue(accounts,inventory.awardReferences(accounts),{replace:true});
 return inventory;
};
require('../src/backgroundMode').createBackgroundMode=()=>({initialize:async()=>({trayReady:true}),attach:()=>{},status:()=>({keepRunning:true,startAtLogin:true,startupAvailable:true,startupRegistered:true,trayReady:true,hidden:true}),isQuitting:()=>false,hasTray:()=>false,setTrackedCount:()=>{},beginQuit:()=>{},destroy:()=>{},quit:()=>{},show:()=>{}});
const games=[{key:'universe:10001',universeId:'10001',placeId:'20001',name:'Moonlit Caverns',iconUrl:'https://tr.rbxcdn.com/review-moon.svg'},{key:'universe:10002',universeId:'10002',placeId:'20002',name:'Skyline Circuit',iconUrl:'https://tr.rbxcdn.com/review-sky.svg'},{key:'universe:10003',universeId:'10003',placeId:'20003',name:'Glass Harbor',iconUrl:'https://tr.rbxcdn.com/review-glass.svg'}];
app.whenReady().then(()=>{
 session.defaultSession.protocol.handle('https',request=>{
  if(!request.url.startsWith('https://tr.rbxcdn.com/review-'))return new Response('Blocked in local preview',{status:403});
  const color=request.url.includes('moon')?'#5363b6':request.url.includes('sky')?'#188b95':'#ad5f82';
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" rx="30" fill="${color}"/><circle cx="75" cy="64" r="31" fill="#d4eceb"/><path d="M24 137 Q75 68 126 137" fill="#101f38"/></svg>`,{headers:{'Content-Type':'image/svg+xml'}});
 });
 const store=require('../src/accountStore');
 accounts.push(store.addAccount({username:'DemoMain',userId:123,cookie:'review-fixture-only',fpsCap:144,graphicsQuality:7,volume:3,fastFlagPreset:'off',avatarUrl:'https://tr.rbxcdn.com/review-moon.svg'}));
 accounts.push(store.addAccount({username:'DemoAlt',userId:456,cookie:'review-fixture-only',fpsCap:60,graphicsQuality:2,volume:0,fastFlagPreset:'max',avatarUrl:'https://tr.rbxcdn.com/review-sky.svg'}));
 accounts.push(store.addAccount({username:'DemoBuilder',userId:789,cookie:'review-fixture-only',fpsCap:120,graphicsQuality:5,volume:2,fastFlagPreset:'balanced',avatarUrl:'https://tr.rbxcdn.com/review-glass.svg'}));
 const start=Date.parse('2026-10-30T12:00:00Z');
 fs.writeFileSync(path.join(app.getPath('userData'),'playtime.json'),JSON.stringify({version:1,accounts:{'user:123':{accountId:accounts[0].id,userId:'123',username:'DemoMain',segments:[{start,end:start+7200000,experienceKey:'universe:10001'},{start:start+8000000,end:start+11600000,experienceKey:'universe:10002'}]},'user:456':{accountId:accounts[1].id,userId:'456',username:'DemoAlt',segments:[{start,end:start+1800000,experienceKey:'universe:10001'}]}},experiences:Object.fromEntries(games.map(g=>[g.key,g]))}));
 const badge=(id,game)=>({id:String(id),placeId:game.placeId,name:['First steps','Cavern explorer','Night runner','Harbor arrival'][id%4],gameName:game.name,description:'Fictional badge for this local preview.',scan:'demo'});
 const owned={};for(const account of accounts.slice(0,2))owned[account.userId]={complete:true,checkedAt:Date.now(),scan:'demo',badges:Object.fromEntries([30001,30002,30003].map((id,index)=>[id,badge(id,games[index])]))};
 fs.writeFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),JSON.stringify({version:1,users:owned}));
 fs.writeFileSync(path.join(app.getPath('userData'),'badge-award-dates.json'),JSON.stringify({version:1,users:Object.fromEntries(accounts.slice(0,2).map(a=>[a.userId,Object.fromEntries([30001,30002,30003].map((id,index)=>[id,{awardedDate:`202${index+2}-06-12T14:25:00.000Z`,checkedAt:Date.now()}]))]))}));
 fs.writeFileSync(path.join(app.getPath('userData'),'experience-metadata.json'),JSON.stringify({version:1,places:Object.fromEntries(games.map(g=>[g.placeId,{universeId:g.universeId,checkedAt:Date.now()}])),universes:Object.fromEntries(games.map(g=>[g.universeId,{...g,checkedAt:Date.now()}]))}));
});
const deadline=setTimeout(()=>{console.error('Review capture timed out');app.exit(1);},30000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
 const read=code=>window.webContents.executeJavaScript(code);
 const wait=async code=>{for(let i=0;i<120;i++){if(await read(code))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Preview did not become ready: '+code);};
 async function capture(name){
  await read('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const image=await window.webContents.capturePage();if(image.isEmpty())throw Error('Empty preview image');fs.writeFileSync(path.join(output,name+'.png'),image.toPNG());
 }
 try{
  window.webContents.setBackgroundThrottling(false);window.webContents.startPainting();
  await read(`document.getElementById('startupScreen').style.setProperty('display','none','important');document.documentElement.style.setProperty('scroll-behavior','auto');`);
  await wait(`document.querySelectorAll('.account-card').length===3`);await capture('dashboard');
  await read(`openTime();setTimeTab('experiences')`);await wait(`!playtimeLoading && document.querySelectorAll('#timeExperiencesList .time-rank-card').length===3`);await capture('games');
  await read(`document.querySelector('#timeExperiencesList .time-rank-summary').click();document.querySelector('.earned-badge-section').open=true`);await wait(`document.querySelector('.earned-badge-section .badge-card time')!==null && document.querySelector('.earned-badge-section img')?.naturalWidth>0`);
  await read(`document.querySelector('.earned-badge-section .badge-card').scrollIntoView({block:'center',behavior:'instant'})`);await capture('badges');
  await read(`closeTime();openLauncher()`);await wait(`document.getElementById('backgroundStatus').textContent.includes('enabled')`);await capture('launcher');
  await read(`document.querySelector('.background-settings-card').scrollIntoView({block:'start',behavior:'instant'})`);await capture('background');
  console.log('Created five offscreen local-review screenshots using fictional accounts and simulated sessions. No app windows shown or live data accessed.');clearTimeout(deadline);app.quit=quit;quit();
 }catch(error){console.error(error);app.exit(1);}
}));
const filename=path.resolve(__dirname,'../main.js'),original=fs.readFileSync(filename,'utf8');
if(!original.includes('contextIsolation: true,'))throw Error('Offscreen capture hook not found.');
const localMain=new Module(filename,module);localMain.filename=filename;localMain.paths=Module._nodeModulePaths(path.dirname(filename));
localMain._compile(original.replace('height: 760,','height: 900,').replace('contextIsolation: true,','offscreen: true, backgroundThrottling: false, contextIsolation: true,'),filename);
