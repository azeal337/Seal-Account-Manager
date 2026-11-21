const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const {markedEntries,repairPlan,decodeHosts,createJoinRouting}=require('../src/joinRouting');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-routing-test-'));
(async()=>{try{
 const hosts='# original\r\n127.0.0.1 localhost\r\n127.0.0.1 gamejoin.roblox.com # Fleasion proxy entry\r\n::1 api.roblox.com # Fleasion proxy entry\r\n127.0.0.1 other.example gamejoin.ROBLOX.com. # Fleasion mixed\r\n127.0.0.1 untouched.roblox.com # unrelated\r\n127.0.0.1 fleasion.example # Fleasion unrelated\r\n';
 assert.equal(markedEntries(hosts).length,3);const plan=repairPlan(hosts);assert(plan.changed);assert(plan.text.includes('127.0.0.1 localhost\r\n'));assert(plan.text.includes('untouched.roblox.com # unrelated\r\n'));assert(plan.text.includes('fleasion.example # Fleasion unrelated\r\n'));assert(plan.text.includes('127.0.0.1\tother.example # Fleasion mixed\r\n'));assert(!plan.text.includes('gamejoin.'));assert.deepEqual(new Set(plan.removedDomains),new Set(['gamejoin.roblox.com','api.roblox.com']));
 assert(repairPlan(hosts,new Set(['::1'])).text.includes('gamejoin.roblox.com # Fleasion proxy entry'),'active IPv4 route survives');
 assert.equal(decodeHosts(Buffer.concat([Buffer.from([255,254]),Buffer.from(hosts,'utf16le')])),hosts);assert.equal(decodeHosts(Buffer.from('\ufeff'+hosts)),hosts);
 let text=hosts,calls=0,cancel=true;
 const routing=createJoinRouting({readText:async()=>text,probe:async address=>address==='::1',runRepair:async()=>{calls++;await new Promise(r=>setTimeout(r,10));if(cancel)return 1223;text=repairPlan(text,new Set(['127.0.0.1'])).text;return 0;}});
 const status=await routing.inspect();assert.deepEqual(status.staleDomains,['gamejoin.roblox.com']);assert.deepEqual(status.activeDomains,['api.roblox.com']);assert.equal(calls,0,'inspection never elevates');
 const pending=routing.repair();assert.equal(pending,routing.repair());assert.equal((await pending).cancelled,true);assert.equal(text,hosts);assert.equal(calls,1);
 cancel=false;const repaired=await routing.repair();assert(repaired.ok);assert(text.includes('::1 api.roblox.com # Fleasion proxy entry'));assert.match(repaired.message,/reopen Roblox/);assert.equal((await routing.inspect()).staleDomains.length,0);
 const fixture=path.join(root,'hosts-fixture.txt');fs.writeFileSync(fixture,hosts);const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('src/repairJoinHosts.ps1'),'-Preview','-PreviewFile',fixture],{encoding:'utf8',windowsHide:true});const actual=JSON.parse(output);assert.equal(actual.Text,plan.text);assert.deepEqual(new Set(actual.RemovedDomains),new Set(plan.removedDomains));assert.equal(fs.readFileSync(fixture,'utf8'),hosts,'PowerShell preview is read-only');
 console.log(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('scripts/test-join-routing-probe.ps1'),'-Source',path.resolve('src/repairJoinHosts.ps1')],{encoding:'utf8',windowsHide:true}).trim());
 console.log('PASS: targeted inactive Fleasion hosts routing; unrelated lines and active proxies preserved; UTF/BOM decoding; no elevation during diagnosis; repair/cancel/dedup; PowerShell read-only planner matches. No live Windows files changed.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
