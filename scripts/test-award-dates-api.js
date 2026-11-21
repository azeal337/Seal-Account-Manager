const assert=require('node:assert/strict');let calls=[],rotation='';
global.fetch=async(url,options)=>{
  calls.push({url,options});assert(url.startsWith('https://badges.roblox.com/v1/users/'));
  if(url.includes('/123/')){
    if(calls.length===1){assert.equal(options.headers.Cookie,'.ROBLOSECURITY=old-fixture');return new Response('{}',{status:401,headers:{'set-cookie':'.ROBLOSECURITY=new-fixture; Path=/;'}});}
    assert.equal(options.headers.Cookie,'.ROBLOSECURITY=new-fixture');return Response.json({data:[{badgeId:10,awardedDate:'2020-01-02T03:04:05Z'},{badgeId:999,awardedDate:'2010-01-01T00:00:00Z'}]});
  }
  return new Response('{}',{status:403});
};
(async()=>{
  const api=require('../src/robloxProgress');const controller=new AbortController();
  const result=await api.awardedDates({userId:123},{cookie:'old-fixture',onRotation:value=>rotation=value},['10','11'],controller.signal);
  assert.deepEqual(result,{'10':'2020-01-02T03:04:05Z'});assert.equal(rotation,'new-fixture');assert(calls[0].url.endsWith('badgeIds=10,11'));assert(!calls[0].options.signal.aborted);
  await assert.rejects(api.awardedDates({userId:456},{cookie:'other'},['10']),error=>error.status===403);
  await assert.rejects(api.awardedDates({userId:123},{cookie:'old'},Array(11).fill('10')),/up to 10/);
  console.log('PASS: award-date API isolates user/cookie, rotates authentication, preserves UTC time, filters unexpected IDs, validates batch size and reports privacy/status errors.');
})().catch(error=>{console.error(error);process.exitCode=1;});
