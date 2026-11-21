const assert=require('node:assert/strict');
const api=require('../src/robloxApi');
let calls=0;
global.fetch=(_url,options)=>{calls++;return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});};
// Keep Node alive while testing an unref'd AbortSignal timer.
const watchdog=setTimeout(()=>{throw Error('Presence request did not time out');},2000);
(async()=>{
 try{
  await assert.rejects(api.getPresenceMany('fixture-only',[123],{timeoutMs:20}),error=>error.name==='TimeoutError');
  assert.equal(calls,1,'expired CSRF deadline must stop before a second request');
  const controller=new AbortController();const work=api.getPresenceMany('fixture-only',[123],{signal:controller.signal});controller.abort();
  await assert.rejects(work,error=>error.name==='AbortError');
  assert.equal(calls,2);console.log('PASS: presence lookup has a shared bounded deadline including CSRF; caller abort stops the request without continuing authentication.');
 }finally{clearTimeout(watchdog);}
})().catch(error=>{console.error(error);process.exitCode=1;});
