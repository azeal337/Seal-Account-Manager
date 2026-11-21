const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {parseActivity}=require('../src/activityWatcher'),{matchSessions}=require('../src/sessionRecovery');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-current-activity-'));
const stamp='2026-11-01T15:31:45.000Z';
const join=(place=99)=>`${stamp} [FLog::Network] ! Joining game '11111111-2222-3333-4444-555555555555' place ${place} at 192.0.2.1\n${stamp} [FLog::Telemetry] universeid:88 userid:123\n`;
const accepted=`${stamp} [DFLog::NetworkClient] Connection accepted from 192.0.2.1|53640\n`;
const server=`${stamp} [FLog::Network] serverId: 192.0.2.1|53640\n`;
const replicator=`${stamp} [FLog::Network] Replicator created: 000001234567ABCD\n`;
try{
 const file=path.join(root,'Player.log');fs.writeFileSync(file,join()+accepted+server+replicator);
 const activity=parseActivity(file);assert(activity.confirmed);assert.equal(activity.userId,'123');assert.equal(activity.placeId,'99');
 assert.equal(matchSessions([{pid:11,startedAt:10000,window:true}],[],[{path:file,createdAt:12000,activity}],[{id:'a',userId:123}]).length,1,'current handshake permits recovery only with explicit saved user identity');
 fs.appendFileSync(file,'Unrelated diagnostic line\n'.repeat(50000));assert(parseActivity(file).confirmed,'growing log retains confirmed state when handshake leaves tail');
 fs.appendFileSync(file,'\n'+join(100)+replicator);assert(!parseActivity(file).confirmed,'new join cannot inherit the previous handshake');
 fs.appendFileSync(file,accepted+server);assert(parseActivity(file).confirmed);assert.equal(parseActivity(file).placeId,'100');
 fs.appendFileSync(file,`${stamp} [FLog::Network] Time to disconnect replication data:\n`);assert(parseActivity(file).disconnected);
 const legacy=path.join(root,'legacy.log');fs.writeFileSync(legacy,join()+`${stamp} [FLog::Network] Replicator created: old serverId: 192.0.2.1|53640\n`);assert(parseActivity(legacy).confirmed);
 const noPeer=path.join(root,'incomplete.log');fs.writeFileSync(noPeer,join()+replicator);assert(!parseActivity(noPeer).confirmed,'replicator construction alone cannot claim a game');
 const home=path.join(root,'home.log');fs.writeFileSync(home,`${stamp},1.0,0a,0 [FLog::SingleSurfaceApp] userDidLogin\n`);
 assert.deepEqual(parseActivity(home),{desktopSignedInAt:Date.parse(stamp)},'desktop Home login can exist without a game log');
 fs.appendFileSync(home,`${stamp},2.0,0a,0 [FLog::SingleSurfaceApp] userDidLogout\n`);
 assert.equal(parseActivity(home),null,'desktop logout invalidates the Home login timestamp');
 fs.writeFileSync(file,join(101)+replicator);assert(!parseActivity(file).confirmed,'truncated/replaced log cannot retain confirmed state');
 console.log('PASS: real current Roblox split handshake, legacy format, explicit-user recovery, incomplete/new joins, disconnects, growing >1MB logs and truncation without stale identity/confirmation.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}
