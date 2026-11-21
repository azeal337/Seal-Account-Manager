const assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), os = require('os');
const { createBadgeAwardDates, awardDate } = require('../src/badgeAwardDates');
const { createBadgeInventory } = require('../src/badgeInventory');
const { createGameLibrary } = require('../src/gameLibrary');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-award-dates-'));
const accounts = [{id:'a',userId:123,username:'Alpha'},{id:'b',userId:456,username:'Beta'}];
const stamp = Date.UTC(2026,9,30), first = '2018-01-02T03:04:05.000Z', second = '2020-06-07T08:09:10.000Z';
const options = {now:()=>stamp, delay:async()=>{},authFor:()=>({cookie:'secret-fixture'})};
const empty = {totalMs:0,accounts:[],experiences:[],firstPlayedGames:[]};
(async()=>{try{
  const calls = []; let live=0, maximum=0, release;
  const gate = new Promise(resolve=>release=resolve), file=path.join(root,'dates.json');
  const dates=createBadgeAwardDates(file,{...options,fetchDates:async(account,auth,ids)=>{
    assert.equal(auth.cookie,'secret-fixture');assert(ids.length<=10);calls.push([account.userId,ids]);maximum=Math.max(maximum,++live);await gate;live--;
    return Object.fromEntries(ids.map(id=>[id,account.userId===123?second:first]));
  }});
  const refs=[...Array.from({length:25},(_,i)=>({userId:123,badgeId:String(i+1)})),{userId:456,badgeId:'1'}];
  assert(dates.enqueue(accounts,refs).busy);await new Promise(resolve=>setImmediate(resolve));assert.equal(live,2);assert.deepEqual(calls.map(row=>row[0]),[123,456],'dates are fair across accounts');
  dates.enqueue(accounts,[{userId:123,badgeId:'99'}],{priority:true});release();await dates.whenIdle();
  assert.equal(maximum,2);assert.equal(calls[2][1][0],'99','visible gallery goes ahead of bulk backfill');
  assert.equal(dates.lookup(123,'1'),second);assert.equal(dates.lookup(456,'1'),first,'same badge has independent owner timestamps');
  assert.equal(dates.status().known,27);assert.equal(dates.status().pending,0);
  assert(!fs.readFileSync(file,'utf8').includes('secret-fixture'));
  const restored=createBadgeAwardDates(file,{...options,fetchDates:async()=>{throw Error('Known dates must survive restart without another request');}});
  restored.enqueue(accounts,refs,{retry:true});await restored.whenIdle();assert.equal(restored.lookup(456,'1'),first);

  const inventory=createBadgeInventory(path.join(root,'inventory.json'),{awardDates:restored,delay:async()=>{},fetchPage:async()=>({data:[{id:1,name:'Owned',created:'2007-01-01T00:00:00Z',awarder:{id:10,type:1,name:'Old game'}}]})});
  inventory.start(accounts,()=>({}));await inventory.whenIdle();
  const stats={...empty,firstPlayedGames:[{key:'place:11',placeId:'11',firstPlayedAt:'2025-01-01T00:00:00Z'}]};
  const resolve=game=>['10','11'].includes(game.placeId)?{...game,key:'universe:9',universeId:'9',placeId:'10'}:game;
  const merged=inventory.merge(stats,accounts,resolve);assert.equal(merged.totalMs,0);assert.equal(merged.experiences[0].totalMs,0);
  assert.equal(merged.experiences[0].firstPlayedAt,first);assert.equal(merged.experiences[0].firstPlayedSource,'badge');assert.equal(merged.experiences[0].firstRecordedAt,'2025-01-01T00:00:00.000Z');
  assert.equal(inventory.ownedBadges({badgeGameKey:'place:10',accountId:'a'},accounts).badges[0].accounts[0].awardedDate,second);
  const earlierRecord={...stats,firstPlayedGames:[{key:'place:11',placeId:'11',firstPlayedAt:'2016-01-01T00:00:00Z'}]};
  assert.equal(inventory.merge(earlierRecord,accounts,resolve).experiences[0].firstPlayedSource,'sam','older SAM evidence wins over a newer badge');
  const library=createGameLibrary({getItem:()=>null,setItem:()=>{}});library.setView({sort:'oldest'});
  const rows=[{...merged.experiences[0],name:'Badge-only'},{key:'place:55',name:'Recorded',firstPlayedAt:'2021-01-01T00:00:00Z'},{key:'place:56',name:'Unknown'}];
  assert.deepEqual(library.games(rows).map(row=>row.name),['Badge-only','Recorded','Unknown']);library.setView({sort:'newest'});assert.deepEqual(library.games(rows).map(row=>row.name),['Recorded','Badge-only','Unknown']);
  assert.equal(stats.experiences.length,0,'date merge never mutates recorded history');

  let blockedCalls=0;
  const limited=createBadgeAwardDates(path.join(root,'limited.json'),{...options,fetchDates:async()=>{blockedCalls++;throw Object.assign(Error('Limited'),{status:429});}});
  limited.enqueue(accounts,[{userId:123,badgeId:'1'}]);await limited.whenIdle();assert.equal(blockedCalls,1);assert.equal(limited.status().retryAt,stamp+60000);assert.equal(limited.status().pending,1);limited.stop();
  const missing=createBadgeAwardDates(path.join(root,'missing.json'),{...options,fetchDates:async()=>({'1':'bad','2':'2099-01-01T00:00:00Z'})});
  missing.enqueue(accounts,[{userId:123,badgeId:'1'},{userId:123,badgeId:'2'}]);await missing.whenIdle();assert.equal(missing.status().unavailable,2);assert.equal(missing.lookup(123,'1'),null);assert.equal(awardDate('2000-01-01T00:00:00Z',stamp),null);
  missing.rememberBadges([{id:'1',accounts:[{userId:123,status:'earned',awardedDate:first}]}]);assert.equal(missing.lookup(123,'1'),first,'all-badge view can fill the same persistent date cache');
  const deletedFile = path.join(root, 'deleted.json'), deletedRef = [{ userId: 123, badgeId: '19' }];
  let releaseStaleDate, dateCalls = 0;
  const staleDate = new Promise(resolve => { releaseStaleDate = resolve; });
  const deleted = createBadgeAwardDates(deletedFile, { ...options, fetchDates: async () => {
    if (++dateCalls === 1) { await staleDate; return { 19: first }; }
    return { 19: second };
  } });
  deleted.enqueue(accounts, deletedRef);
  await new Promise(resolve => setImmediate(resolve));
  deleted.forget(123, ['19']);
  deleted.enqueue(accounts, deletedRef);
  releaseStaleDate();
  await deleted.whenIdle();
  assert.equal(dateCalls, 2, 'a re-earned badge requests its own date after an in-flight obsolete response');
  assert.equal(deleted.lookup(123, '19'), second);
  deleted.forget(123, ['19']);
  assert.equal(createBadgeAwardDates(deletedFile, options).lookup(123, '19'), null, 'deleting a badge clears its saved date');
  deleted.stop();
  for(const store of [dates,restored,missing])store.stop();
  console.log('PASS: two bounded/fair date workers, visible-page priority, <=10 per request; per-owner dates survive restart; no credentials; 429 cooldown; invalid/future dates; real award times drive first-play estimates across subplaces without changing 0s/history; earlier SAM records win; oldest/newest unknown-last.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
