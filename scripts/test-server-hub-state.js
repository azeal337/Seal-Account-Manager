const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {createServerHub,nextOccurrence}=require('../src/serverHub');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seal-hub-state-')),file=path.join(dir,'hub.json'),now=10000000;
try {
 const valid={id:'saved-event',placeId:'123',label:'Boss',minutes:60,anchor:now};
 fs.writeFileSync(file,JSON.stringify({timers:[valid,{...valid,id:'zero',minutes:0},{...valid,id:'bad-time',anchor:'bad'},null,[]],history:[{accountId:'one',placeId:'123',id:'11111111-1111-1111-1111-111111111111',firstSeen:now,lastSeen:now},{}],observed:[{}]}));
 const hub=createServerHub(file,{now:()=>now});
 assert.equal(hub.timers().length,1,'ignore malformed persisted timers while retaining valid events');
 assert.equal(hub.history().length,1,'ignore malformed history');
 assert.equal(hub.history()[0].key,'one:123:11111111-1111-1111-1111-111111111111');
 assert.equal(nextOccurrence({minutes:0,anchor:now},now),null);
 const original=fs.readFileSync(file,'utf8'),rename=fs.renameSync;
 fs.renameSync=function(source,target){if(target===file)throw Error('fixture disk failure');return rename.apply(this,arguments);};
 try {
  assert.throws(()=>hub.saveTimer({placeId:'123',label:'New',minutes:5,anchor:now}),/fixture disk failure/);
  assert.equal(hub.timers().length,1,'failed save must not leave a ghost event');
  assert.throws(()=>hub.removeTimer(valid.id),/fixture disk failure/);
  assert.equal(hub.timers().length,1,'failed removal must retain the saved event');
 } finally {fs.renameSync=rename;}
 assert.equal(fs.readFileSync(file,'utf8'),original);
 assert(!fs.readdirSync(dir).some(name=>name.endsWith('.tmp')));
 hub.removeTimer(valid.id);assert.equal(createServerHub(file).timers().length,0);
 console.log('PASS: malformed saved state filtering; valid events/history retained; timer save/remove rollback; atomic write cleanup.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
