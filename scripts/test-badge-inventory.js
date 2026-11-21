const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {createBadgeInventory,normalizeBadge}=require('../src/badgeInventory');
const {cleanup}=require('./run-electron-test');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-badge-inventory-'));
const accounts=[{id:'a',userId:123,username:'Alpha'},{id:'b',userId:456,username:'Beta'},{id:'c',userId:789,username:'Empty'}];
const empty=()=>({from:0,to:100,totalMs:0,accountCount:0,experienceCount:0,accounts:[],experiences:[]});
const badge=(id,placeId=99,name='Jailbreak')=>({id,name:'Badge '+id,description:'Fixture',awarder:{type:1,id:placeId,name}});
const auth=()=>({cookie:'do-not-save-cookie'}),delay=async()=>{};
(async()=>{try{
 const calls=[],file=path.join(root,'inventory.json');
 const inventory=createBadgeInventory(file,{delay,now:()=>1000000,fetchPage:async(account,credentials,cursor)=>{assert.equal(credentials.cookie,'do-not-save-cookie');calls.push([account.id,cursor]);if(account.id==='a')return cursor?{data:[badge(2)],nextPageCursor:null}:{data:[badge(1)],nextPageCursor:'page2'};return {data:account.id==='b'?[badge(1)]:[],nextPageCursor:null};}});
 assert.equal(normalizeBadge({id:1}),null);assert.equal(normalizeBadge({id:1,awardingUniverse:{id:88,rootPlaceId:99,name:'Jailbreak'}}).universeId,'88');
 assert.equal(inventory.start(accounts,auth).busy,true);inventory.start(accounts,auth);await inventory.whenIdle();assert.equal(calls.length,4,'overlapping starts share a job');
 assert.deepEqual(calls.map(c=>c[0]),['a','b','c','a'],'accounts receive fair page progress');
 const stats=inventory.merge(empty(),accounts);assert.equal(stats.totalMs,0);assert.equal(stats.accounts.length,2);assert.equal(stats.experiences.length,1);assert.equal(stats.experiences[0].name,'Jailbreak');assert.equal(stats.experiences[0].totalMs,0);assert(stats.experiences[0].accounts.every(a=>a.totalMs===0));assert.equal(stats.experiences[0].earnedBadgeCount,2);
 const earned=inventory.ownedBadges({badgeGameKey:'place:99',accountId:'a'},accounts);assert.equal(earned.total,2);assert(earned.badges.every(b=>b.accounts.length===1&&b.accounts[0].status==='earned'&&b.accounts[0].accountId==='a'));
 const recorded={...empty(),totalMs:2500,accounts:[{key:'user:123',accountId:'old',userId:123,username:'Old',totalMs:2500,experiences:[{key:'universe:88',universeId:'88',placeId:'99',name:'Jailbreak',totalMs:2000}]}],experiences:[{key:'universe:88',universeId:'88',placeId:'99',name:'Jailbreak',totalMs:2000,accounts:[{key:'user:123',accountId:'old',userId:123,username:'Old',totalMs:2000}]}]};
 const original=structuredClone(recorded),merged=inventory.merge(recorded,accounts);assert.deepEqual(recorded,original,'merging must not mutate recorded time');assert.equal(merged.totalMs,2500);assert.equal(merged.experiences.length,1);assert.equal(merged.experiences[0].totalMs,2000);assert.equal(merged.accounts.find(a=>a.userId===123).accountId,'a');assert.equal(merged.experiences[0].accounts.find(a=>a.accountId==='b').totalMs,0);
 assert(!fs.readFileSync(file,'utf8').includes('do-not-save-cookie'));
 const restored=createBadgeInventory(file,{delay,now:()=>1000001,fetchPage:async()=>{throw Error('complete cached inventory must not refetch');}});restored.start(accounts,auth);await restored.whenIdle();assert.equal(restored.merge(empty(),accounts).experiences.length,1);assert.equal(restored.merge(empty(),[]).experiences.length,0,'removed saved accounts must not reappear');
 let page=0;const partialFile=path.join(root,'partial.json');const partial=createBadgeInventory(partialFile,{delay,now:()=>1000000,fetchPage:async()=>{if(page++===0)return {data:[badge(3)],nextPageCursor:'resume'};throw Object.assign(Error('Private'),{status:403});}});partial.start([accounts[0]],auth);await partial.whenIdle();assert.equal(partial.merge(empty(),accounts).experiences.length,1);assert.equal(partial.status().failed.length,1);
 const resumed=createBadgeInventory(partialFile,{delay,now:()=>1000001,fetchPage:async(a,c,cursor)=>{assert.equal(cursor,'resume');return {data:[badge(4)],nextPageCursor:null};}});resumed.start([accounts[0]],auth);await resumed.whenIdle();assert.equal(resumed.ownedBadges({badgeGameKey:'place:99'},accounts).total,2);
 const corrupt=createBadgeInventory(partialFile,{delay,now:()=>2000000,fetchPage:async()=>({data:'invalid'})});corrupt.start([accounts[0]],auth,{fresh:true});await corrupt.whenIdle();assert.equal(corrupt.ownedBadges({badgeGameKey:'place:99'},accounts).total,2,'failed refresh retains cached ownership');
 const remove=createBadgeInventory(partialFile,{delay,now:()=>3000000,fetchPage:async()=>({data:[],nextPageCursor:null})});remove.start([accounts[0]],auth,{fresh:true});await remove.whenIdle();assert.equal(remove.merge(empty(),accounts).experiences.length,0,'only a complete authoritative scan removes old badge ownership');
 const many=createBadgeInventory(path.join(root,'many.json'),{delay,fetchPage:async()=>({data:Array.from({length:75},(_,i)=>badge(i+10)),nextPageCursor:null})});many.start([accounts[0]],auth);await many.whenIdle();const first=many.ownedBadges({badgeGameKey:'place:99'},accounts);assert.equal(first.badges.length,50);assert.equal(many.ownedBadges({badgeGameKey:'place:99',cursor:first.nextCursor},accounts).badges.length,25);

 const legacyFile = path.join(root, 'legacy.json'), singleAccount = [accounts[0]];
 const existing = Array.from({ length: 1000 }, (_, index) => badge(1000 - index));
 fs.writeFileSync(legacyFile, JSON.stringify({ version: 1, users: { 123: {
   complete: true, checkedAt: 1000000, scan: 'legacy', badges: Object.fromEntries(existing.map(row => [row.id, { ...row, scan: 'legacy' }]))
 } } }));
 let clock = 2000000, remote = [badge(1001), ...existing.filter(row => ![11, 12].includes(row.id))];
 const requestLog = [], forgotten = [];
 let verifyError = true;
 const options = {
   delay, now: () => clock,
   fetchPage: async (account, credentials, cursor) => {
     requestLog.push(cursor);
     const offset = Number(cursor);
     return { data: remote.slice(offset, offset + 100), nextPageCursor: offset + 100 < remote.length ? String(offset + 100) : null };
   },
   verifyDates: async (account, credentials, ids) => {
     assert.deepEqual(ids, ['11', '12']);
     if (verifyError) throw Object.assign(Error('Limited'), { status: 429, retryAfterMs: 90000 });
     return { 12: '2020-01-01T00:00:00Z' }; // Badge 12 was skipped by paging but is still owned.
   },
   awardDates: { forget: (userId, ids) => forgotten.push(...ids) }
 };
 const cached = createBadgeInventory(legacyFile, options);
 assert.equal(cached.awardReferences(singleAccount).length, 1000, 'legacy ownership is immediately available');
 cached.start(singleAccount, auth, { fresh: true });
 await cached.whenIdle();
 assert.deepEqual(requestLog, [''], 'refresh stops at the cached head');
 assert.equal(cached.awardReferences(singleAccount).length, 1001, 'initial delta preserves older rows');
 cached.start(singleAccount, auth, { audit: true });
 await cached.whenIdle();
 assert.deepEqual(requestLog.slice(1), ['', '100', '200', '300', '400', '500', '600', '700'], 'audit uses a bounded page budget');
 assert.equal(cached.status().checking, true);
 const restarted = createBadgeInventory(legacyFile, options);
 requestLog.length = 0;
 restarted.start(singleAccount, auth, { audit: true });
 await restarted.whenIdle();
 assert.deepEqual(requestLog, ['800', '900'], 'restart resumes the background cursor');
 assert.equal(restarted.awardReferences(singleAccount).length, 1001, 'rate-limited verification retains every badge');
 restarted.start(singleAccount, auth, { fresh: true });
 assert.deepEqual(requestLog, ['800', '900'], 'manual sync respects a Roblox cooldown');
 verifyError = false;
 clock += 90_001;
 restarted.start(singleAccount, auth, { audit: true });
 await restarted.whenIdle();
 assert.deepEqual(requestLog, ['800', '900'], 'retry resumes comparison without reading the inventory again');
 assert.deepEqual(forgotten, ['11'], 'only the verified deletion invalidates its award date');
 assert.equal(restarted.awardReferences(singleAccount).length, 1000);
 const reloaded = createBadgeInventory(legacyFile, options);
 assert.equal(reloaded.awardReferences(singleAccount).length, 1000, 'verified removals survive restart');
 reloaded.start(singleAccount, auth, { audit: true });
 await reloaded.whenIdle();
 assert.deepEqual(requestLog, ['800', '900'], 'a recent completed audit does no work');

 let deepFailure = false;
 remote = [...Array.from({ length: 110 }, (_, i) => badge(1111 - i)), ...remote];
 const paged = createBadgeInventory(legacyFile, { ...options, fetchPage: async (...args) => {
   if (deepFailure && args[2]) throw Error('Temporary failure');
   return options.fetchPage(...args);
 } });
 deepFailure = true;
 paged.start(singleAccount, auth, { fresh: true });
 await paged.whenIdle();
 assert.equal(paged.awardReferences(singleAccount).length, 1000, 'incomplete delta cannot move the cached overlap');
 deepFailure = false;
 paged.start(singleAccount, auth, { fresh: true });
 await paged.whenIdle();
 assert.equal(paged.awardReferences(singleAccount).length, 1110, 'new badges spanning pages are all saved after retry');
 let warned=false;assert.equal(cleanup(path.join(os.tmpdir(),'seal-electron-test-locked-fixture'),()=>{throw Object.assign(Error('Locked cache'),{code:'EPERM'});},()=>{warned=true;}),false);assert(warned,'locked test cache is nonfatal');assert.throws(()=>cleanup(path.join(os.tmpdir(),'unrelated-folder')),/unrelated/);
 console.log('PASS: badge discovery, persistence and migration, one-page refresh, multi-page delta recovery, resumable audit batches, 429 protection, verified removals, zero-time games and gallery paging.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
