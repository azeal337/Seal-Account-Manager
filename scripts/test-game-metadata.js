const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {createExperienceMetadata}=require('../src/experienceMetadata');
const {createBadgeInventory}=require('../src/badgeInventory');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-metadata-test-'));
(async()=>{try{
 let clock=1000000,resolves=0,fetches=0,limited=false;
 const file=path.join(root,'metadata.json'),options={now:()=>clock,delay:async()=>{},resolvePlace:async place=>{resolves++;if(limited)throw Object.assign(Error('Limited'),{status:429});return {universeId:place==='33'?'88':'77'};},fetchDetails:async ids=>{fetches++;return Object.fromEntries(ids.map(id=>[id,{name:id==='77'?'Real game':'Other game',placeId:id==='77'?'11':'33',iconUrl:'https://tr.rbxcdn.com/fixture.png'}]));}};
 const metadata=createExperienceMetadata(file,options),refs=[{placeId:'11'},{placeId:'22'}];
 metadata.enqueue(refs);metadata.enqueue(refs);assert.equal(metadata.status().busy,true);assert.match(metadata.lookup({placeId:'11',name:'Place 11'}).name,/Loading/);await metadata.whenIdle();
 assert.equal(resolves,2);assert.equal(fetches,1);assert.equal(metadata.lookup({placeId:'22'}).name,'Real game');assert.equal(metadata.lookup({placeId:'22'}).placeId,'11');assert.equal(metadata.lookup({placeId:'22'}).iconUrl,'https://tr.rbxcdn.com/fixture.png');
 const restored=createExperienceMetadata(file,options);restored.enqueue(refs);await restored.whenIdle();assert.equal(resolves,2);assert.equal(fetches,1,'restart uses persisted public metadata');restored.enqueue(refs,{fresh:true});await restored.whenIdle();assert.equal(fetches,2,'explicit refresh refetches details');
 const accounts=[{id:'a',userId:1,username:'Alpha'},{id:'b',userId:2,username:'Beta'}];
 const inventory=createBadgeInventory(path.join(root,'badges.json'),{delay:async()=>{},fetchPage:async account=>({data:(account.id==='a'?[[101,11],[102,22]]:[[102,22]]).map(([id,place])=>({id,name:'Badge '+id,awarder:{type:1,id:place}})),nextPageCursor:null})});
 inventory.start(accounts,()=>({}));await inventory.whenIdle();
 const row=(place,total)=>({key:'place:'+place,placeId:String(place),name:'Place '+place,totalMs:total});
 const owner={key:'user:1',accountId:'a',userId:1,username:'Alpha'};
 const stats={totalMs:5000,accounts:[{...owner,totalMs:5000,experiences:[row(11,1000),row(22,2000)]}],experiences:[{...row(11,1000),accounts:[{...owner,totalMs:1000}]},{...row(22,2000),accounts:[{...owner,totalMs:2000}]}]};
 const original=structuredClone(stats),merged=inventory.merge(stats,accounts,metadata.lookup);assert.deepEqual(stats,original);assert.equal(merged.totalMs,5000);assert.equal(merged.experiences.length,1);assert.equal(merged.experiences[0].totalMs,3000);assert.equal(merged.accounts[0].experiences.length,1);assert.equal(merged.accounts[0].experiences[0].totalMs,3000);assert.equal(merged.experiences[0].earnedBadgeCount,2);assert.equal(merged.experiences[0].accounts.find(a=>a.userId===2).totalMs,0);
 assert.deepEqual(new Set(merged.experiences[0].badgeGameKeys),new Set(['place:11','place:22']));assert.equal(inventory.ownedBadges({badgeGameKeys:merged.experiences[0].badgeGameKeys,accountId:'a'},accounts).total,2);
 limited=true;metadata.enqueue([{placeId:'33'}]);await metadata.whenIdle();assert.equal(metadata.status().pending,1);const before=resolves;metadata.enqueue([{placeId:'33'}]);await metadata.whenIdle();assert.equal(resolves,before,'429 backs off');clock+=60001;limited=false;metadata.enqueue([]);await metadata.whenIdle();assert.equal(metadata.lookup({placeId:'33'}).name,'Other game');
 const broken=createExperienceMetadata(path.join(root,'broken.json'),{...options,resolvePlace:async()=>{throw Error('Offline');}});broken.enqueue([{placeId:'99'}]);await broken.whenIdle();assert.equal(broken.lookup({placeId:'99',name:'Place 99'}).name,'Place 99');assert.equal(broken.lookup({placeId:'99'}).gameAvailability,'');
 const availabilityFile = path.join(root, 'availability.json');
 fs.writeFileSync(availabilityFile, JSON.stringify({ version: 1, universes: { 801: { name: 'Historical title', placeId: '701', checkedAt: clock - 1 } } }));
 let restoredGame = false, alternativeCalls = 0;
 const availabilityOptions = {
   ...options,
   fetchDetails: async () => ({
     801: restoredGame ? { name: 'Restored title' } : { name: '[ Content Deleted ]' },
     802: { name: 'Private title' }, 803: { name: 'Public title' }
   }),
   fetchAvailability: async () => ({ 801: '', 802: 'private', 803: '' }),
   fetchAlternate: async () => { alternativeCalls++; return { name: 'Recovered title', placeId: '704', availability: 'unavailable' }; }
 };
 const unavailable = createExperienceMetadata(availabilityFile, availabilityOptions);
 const histories = [801, 802, 803, 804].map(universeId => ({ universeId }));
 unavailable.enqueue(histories, { fresh: true });
 await unavailable.whenIdle();
 assert.equal(unavailable.lookup(histories[0]).name, 'Historical title');
 assert.equal(unavailable.lookup(histories[0]).gameAvailability, 'removed');
 assert.equal(unavailable.lookup(histories[1]).gameAvailability, 'private');
 assert.equal(unavailable.lookup(histories[2]).gameAvailability, '');
 assert.equal(unavailable.lookup(histories[3]).name, 'Recovered title');
 assert.equal(unavailable.lookup(histories[3]).gameAvailability, 'unavailable');
 assert.equal(alternativeCalls, 1, 'falls back only for the missing game');
 const reopened = createExperienceMetadata(availabilityFile, availabilityOptions);
 assert.equal(reopened.lookup(histories[0]).name, 'Historical title');
 assert.equal(reopened.lookup(histories[1]).gameAvailability, 'private');
 assert.equal(reopened.lookup(histories[3]).name, 'Recovered title');
 restoredGame = true;
 reopened.enqueue([histories[0]], { retry: true });
 await reopened.whenIdle();
 assert.equal(reopened.lookup(histories[0]).gameAvailability, '');
 assert.equal(reopened.lookup(histories[0]).name, 'Restored title');
 console.log('PASS: cached badge place IDs hydrate to real names/icons; public metadata persists; refresh and 429 retry; subplaces merge without changing time or ownership; gallery unions subplace badges; offline fallback.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
