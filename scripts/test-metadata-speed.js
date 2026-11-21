const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-metadata-speed-'));
let calls=[],active=0,maximum=0,rotated='';
global.fetch=async(url,options)=>{
 calls.push({url,cookie:options.headers?.Cookie});active++;maximum=Math.max(maximum,active);
 try{
  await new Promise(r=>setTimeout(r,8));
  const u=new URL(url);
  if(u.pathname.includes('multiget-place-details')){
   assert.equal(options.headers.Cookie,'.ROBLOSECURITY=fixture-only');assert(!('timeoutMs' in options));
   return Response.json(u.searchParams.get('placeIds').split(',').map(id=>({placeId:Number(id),universeId:Number(id)+1000})),{headers:{'set-cookie':'.ROBLOSECURITY=fixture-rotated; Path=/;'}});
  }
  if(u.pathname.endsWith('/universe'))return Response.json({universeId:Number(u.pathname.split('/').at(-2))+1000});
  if(u.pathname.endsWith('/multiget-playability-status'))return Response.json([
    {universeId:701,playabilityStatus:'UniverseRootPlaceIsPrivate',isPlayable:false},
    {universeId:702,playabilityStatus:'GuestProhibited',isPlayable:false}
  ]);
  if(u.hostname==='games.roblox.com'){
   const ids=u.searchParams.get('universeIds').split(',');assert(ids.length<=50);
   return Response.json({data:ids.map(id=>id==='701'?{id:0,rootPlaceId:0,name:'[TITLE UNAVAILABLE]'}:{id:Number(id),rootPlaceId:Number(id)-1000,name:'Game '+id})});
  }
  if(u.hostname==='develop.roblox.com')return Response.json({name:'Recovered from universe',rootPlaceId:601,privacyType:'Private'});
  if(u.hostname==='thumbnails.roblox.com')return Response.json({data:u.searchParams.get('universeIds').split(',').map(id=>({targetId:Number(id),imageUrl:'https://tr.rbxcdn.com/'+id+'.png'}))});
  throw Error('Unexpected request');
 }finally{active--;}
};
const api=require('../src/robloxProgress'),{createExperienceMetadata}=require('../src/experienceMetadata');
const legacyFile=path.resolve(__dirname,'../src/legacy-metadata-benchmark.js'),legacyModule=new Module(legacyFile,module);legacyModule.filename=legacyFile;
legacyModule._compile(fs.readFileSync(path.join(__dirname,'fixtures/experienceMetadata-1.33.24.txt'),'utf8'),legacyFile);
(async()=>{try{
 const refs=Array.from({length:100},(_,i)=>({placeId:String(i+1)}));
 const common={resolvePlace:api.resolvePlace,fetchDetails:api.experienceDetails};
 const old=legacyModule.exports.createExperienceMetadata(path.join(root,'old.json'),common);
 let start=performance.now();old.enqueue(refs);await old.whenIdle();const before={ms:Math.round(performance.now()-start),requests:calls.length};
 calls=[];const file=path.join(root,'new.json'),fast=createExperienceMetadata(file,{...common,resolvePlaces:ids=>api.placeDetails(ids,{cookie:'fixture-only',onRotation:value=>{rotated=value;}})});
 start=performance.now();fast.enqueue(refs);await fast.whenIdle();const after={ms:Math.round(performance.now()-start),requests:calls.length};
 assert.equal(before.requests,120);assert.equal(after.requests,6);assert(after.ms<before.ms/3,'bulk loader should beat old loader substantially under equal simulated latency');assert(maximum<=3,'existing HTTP concurrency limit retained');assert.equal(rotated,'fixture-rotated');assert(calls.filter(c=>c.cookie).every(c=>c.url.includes('multiget-place-details')));assert(!fs.readFileSync(file,'utf8').includes('fixture-only'));assert.equal(fast.lookup({placeId:'100'}).name,'Game 1100');
 const restored=createExperienceMetadata(file,{resolvePlace:()=>{throw Error('Must use disk cache');},fetchDetails:()=>{throw Error('Must use disk cache');}});const total=calls.length;restored.enqueue(refs);await restored.whenIdle();assert.equal(calls.length,total);assert.equal(restored.lookup({placeId:'100'}).iconUrl,'https://tr.rbxcdn.com/1100.png');
 const publicDetails=await api.experienceDetails(Array.from({length:51},(_,i)=>String(701+i)));
 assert.equal(Object.keys(publicDetails).length,51,'Roblox placeholders must not shift IDs or drop valid icons');
 assert.equal(publicDetails['701'].publicDetails,false);
 assert.equal(publicDetails['701'].name,undefined);
 assert.equal(publicDetails['751'].name,'Game 751');
 assert.deepEqual(await api.experienceAvailability(['701','702']),{'701':'private','702':''});
 assert.equal((await api.alternateExperienceDetails('701','601')).availability,'private');
 let fallbackCalls=0,bulkCalls=0;const fallback=createExperienceMetadata(path.join(root,'fallback.json'),{resolvePlaces:async()=>{bulkCalls++;throw Object.assign(Error('Expired login'),{status:401});},resolvePlace:async id=>{fallbackCalls++;return {universeId:String(Number(id)+2000)};},fetchDetails:async ids=>Object.fromEntries(ids.map(id=>[id,{name:'Public '+id,iconUrl:'https://tr.rbxcdn.com/public.png'}])),delay:async()=>{}});fallback.enqueue(refs.slice(0,60));await fallback.whenIdle();assert.equal(fallbackCalls,60);assert(bulkCalls<=2,'at most the two initial jobs try an unavailable bulk API');assert.equal(fallback.status().pending,0);
 let release;const blocked=new Promise(r=>{release=r;});const streamed=createExperienceMetadata(path.join(root,'streamed.json'),{resolvePlace:async value=>{if(Number(value)>6)await blocked;return {universeId:String(Number(value)+3000)};},fetchDetails:async ids=>Object.fromEntries(ids.map(id=>[id,{name:'Ready '+id,iconUrl:'https://tr.rbxcdn.com/ready.png'}]))});streamed.enqueue(refs.slice(0,12));for(let i=0;i<100&&!streamed.lookup({placeId:'1'}).metadataResolved;i++)await new Promise(r=>setTimeout(r,5));assert.equal(streamed.lookup({placeId:'1'}).name,'Ready 3001');assert.equal(streamed.status().busy,true,'ready names render while another batch is blocked');release();await streamed.whenIdle();
 let clock=1000000,limited=true,limitedCalls=0;const paused=createExperienceMetadata(path.join(root,'limited.json'),{now:()=>clock,resolvePlaces:async ids=>{limitedCalls++;if(limited)throw Object.assign(Error('Limited'),{status:429});return Object.fromEntries(ids.map(id=>[id,{universeId:String(Number(id)+4000)}]));},resolvePlace:async()=>{throw Error('A 429 must pause, not fan out public lookups');},fetchDetails:async ids=>Object.fromEntries(ids.map(id=>[id,{name:'Retried '+id,iconUrl:'https://tr.rbxcdn.com/retried.png'}]))});paused.enqueue(refs);await paused.whenIdle();assert.equal(paused.status().pending,100);const limitedBefore=limitedCalls;paused.enqueue(refs);await paused.whenIdle();assert.equal(limitedCalls,limitedBefore);clock+=60001;limited=false;paused.enqueue([]);await paused.whenIdle();assert.equal(paused.status().pending,0);assert.equal(paused.lookup({placeId:'100'}).name,'Retried 4100');
 console.log('PASS: 100-game benchmark (simulated equal network latency): '+JSON.stringify({before,after,requestReduction:before.requests/after.requests,maxConcurrentHTTP:maximum})+'; cached restart uses zero requests; invalid login falls back; ready batches publish before slow batches; shared 429 pauses both jobs and resumes every game.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
