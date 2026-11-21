const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');const {app}=require('electron');
const temporary=path.join(process.env.SEAL_TEST_TMP_ROOT,'badge-dates-ui');fs.mkdirSync(temporary,{recursive:true});app.setPath('userData',path.join(temporary,'userdata'));fs.mkdirSync(app.getPath('userData'),{recursive:true});
process.env.SEAL_TEST_ROBLOX_ROOT=path.join(temporary,'Roblox');process.argv.push('--seal-launch-test','--seal-badge-dates-test');
const quit=app.quit.bind(app);app.quit=()=>{};
const launcher=require('../src/launcher');launcher.listRobloxPids=async()=>[];launcher.getRobloxPidSnapshot=async()=>({pids:[],reliable:true,confirmedMissingPids:[]});
require('../src/robloxApi').getAvatarUrls=async()=>({});
const progress=require('../src/robloxProgress');progress.profiles=async()=>[];progress.badgeIcons=async()=>({});
let release,fetches=0;const gate=new Promise(resolve=>release=resolve),accounts=[];
const early='2018-01-02T03:04:05.000Z',later='2020-06-07T08:09:10.000Z';
progress.awardedDates=async(account,auth,ids)=>{assert.equal(auth.cookie,'fixture-only');fetches++;await gate;return Object.fromEntries(ids.map(id=>[id,account.userId===123?later:early]));};
app.whenReady().then(()=>{
  const store=require('../src/accountStore');for(const [userId,username] of [[123,'Alpha'],[456,'Beta']])accounts.push(store.addAccount({userId,username,cookie:'fixture-only'}));
  const games=[{key:'universe:1',universeId:'1',placeId:'10',name:'Recent SAM game'},{key:'universe:2',universeId:'2',placeId:'20',name:'Older badge game'}];
  const stamp=Date.parse('2025-01-01T00:00:00Z');
  fs.writeFileSync(path.join(app.getPath('userData'),'playtime.json'),JSON.stringify({version:1,accounts:{'user:123':{accountId:accounts[0].id,userId:'123',username:'Alpha',segments:[{start:stamp,end:stamp+1000,experienceKey:'universe:1'}]}},experiences:Object.fromEntries(games.map(game=>[game.key,game]))}));
  const badges=Object.fromEntries([101,102].map(id=>[id,{id:String(id),placeId:'20',name:'Award '+id,gameName:'Older badge game',created:'2007-01-01T00:00:00Z',scan:'saved'}]));
  fs.writeFileSync(path.join(app.getPath('userData'),'badge-inventory.json'),JSON.stringify({version:1,users:Object.fromEntries(accounts.map(a=>[a.userId,{complete:true,checkedAt:Date.now(),scan:'saved',badges}]))}));
  fs.writeFileSync(path.join(app.getPath('userData'),'experience-metadata.json'),JSON.stringify({version:1,places:Object.fromEntries(games.map(game=>[game.placeId,{universeId:game.universeId,checkedAt:Date.now()}])),universes:Object.fromEntries(games.map(game=>[game.universeId,{...game,checkedAt:Date.now()}]))}));
});
const deadline=setTimeout(()=>{console.error('Badge dates UI timeout');app.exit(1);},20000);
app.on('browser-window-created',(_event,window)=>window.webContents.once('did-finish-load',async()=>{
  const read=code=>window.webContents.executeJavaScript(code),wait=async code=>{for(let i=0;i<200;i++){if(await read(code))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Timed out: '+code);};
  const names=()=>read(`Array.from(document.querySelectorAll('#timeExperiencesList .time-rank-copy strong')).map(node=>node.textContent)`);
  try{
    await read(`openTime();setTimeTab('experiences');document.getElementById('timeGameSort').value='oldest';document.getElementById('timeGameSort').dispatchEvent(new Event('change'))`);
    await wait(`!playtimeLoading && document.querySelectorAll('#timeExperiencesList .time-rank-card').length===2`);
    assert.deepEqual(await names(),['Recent SAM game','Older badge game']);assert(fetches>0,'automatic backfill starts for an old ownership-only cache');
    assert.match(await read(`document.getElementById('timeBadgeDatesStatus').textContent`),/0\/4.*queued/);
    await read(`document.querySelector('[data-game-key="universe:2"] .time-rank-summary').click();document.querySelector('.earned-badge-section').open=true`);
    await wait(`document.querySelector('.earned-badge-section .badge-card')!==null`);
    assert.match(await read(`document.querySelector('.earned-badge-section .badge-card').textContent`),/Checking award date/);
    release();await wait(`playtimeStats.badgeDates?.known===4 && !playtimeLoading`);
    assert.deepEqual(await names(),['Older badge game','Recent SAM game']);
    const game=await read(`playtimeStats.experiences.find(game=>game.universeId==='2')`);
    assert.equal(game.firstPlayedAt,early);assert.equal(game.firstPlayedSource,'badge');assert.equal(game.totalMs,0);assert.equal(await read(`playtimeStats.totalMs`),1000);
    assert.match(await read(`document.querySelector('[data-game-key="universe:2"] .time-game-age').textContent`),/badge estimate.*2018/);
    await wait(`document.querySelector('.earned-badge-section time')?.dateTime===${JSON.stringify(later)}`);
    const owned=await read(`window.api.getEarnedBadges({badgeGameKey:'place:20',accountId:${JSON.stringify(accounts[1].id)}})`);
    assert.equal(owned.badges[0].accounts[0].awardedDate,early,'owner B has its own exact UTC time');
    await read(`document.getElementById('timeGameSort').value='newest';document.getElementById('timeGameSort').dispatchEvent(new Event('change'))`);assert.deepEqual(await names(),['Recent SAM game','Older badge game']);
    await read(`document.getElementById('timeRangePreset').value='day';document.getElementById('timeRangePreset').dispatchEvent(new Event('change'))`);await wait(`!playtimeLoading`);assert.equal(await read('playtimeStats.totalMs'),0);assert.equal((await read(`playtimeStats.experiences.find(game=>game.universeId==='2')`)).firstPlayedAt,early);
    const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'badge-award-dates.json'),'utf8'));assert.equal(saved.users['456']['101'].awardedDate,early);assert(!JSON.stringify(saved).includes('fixture-only'));
    const before=fetches;await new Promise(resolve=>{window.webContents.once('did-finish-load',resolve);window.webContents.reload();});await read(`openTime();setTimeTab('experiences')`);await wait(`!playtimeLoading`);assert.equal(fetches,before,'renderer restart uses saved dates immediately');
    console.log('PASS: real IPC/UI automatically migrates old badge cache; names/ownership render before dates; exact owner date/time updates an open gallery; oldest/newest reorder by older badge evidence; estimate is explicit; time totals/range unchanged; date cache has no credentials and survives renderer reload.');
    clearTimeout(deadline);app.quit=quit;quit();
  }catch(error){console.error(error);app.exit(1);}
}));require('../main');
