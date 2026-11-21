const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {createBadgeIconCache}=require('../src/badgeIconCache');const root=fs.mkdtempSync(path.join(os.tmpdir(),'seal-badge-icons-'));
(async()=>{try{
 let requests=0,clock=1000000;const file=path.join(root,'icons.json');const fetchIcons=async ids=>{requests++;return Object.fromEntries(ids.map(id=>[id,'https://tr.rbxcdn.com/'+id+'.png']));};
 const cache=createBadgeIconCache(file,{fetchIcons,now:()=>clock});assert.deepEqual(cache.cached(['1']),{});const [a,b]=await Promise.all([cache.get(['1','2']),cache.get(['2','3'])]);assert.equal(requests,1,'overlapping owner requests coalesce into one thumbnail batch');assert.equal(a['1'],'https://tr.rbxcdn.com/1.png');assert.equal(b['3'],'https://tr.rbxcdn.com/3.png');
 const restored=createBadgeIconCache(file,{fetchIcons,now:()=>clock});await restored.get(['1','2','3']);assert.equal(requests,1,'disk cache removes repeat lookups');clock+=86400001;await restored.get(['1']);assert.equal(requests,2);
 const failed=createBadgeIconCache(path.join(root,'failed.json'),{fetchIcons:async()=>{throw Error('Offline');},now:()=>clock});assert.deepEqual(await failed.get(['4']),{});assert.deepEqual(await failed.get(['4']),{});assert(!fs.readFileSync(file,'utf8').includes('cookie'));
 console.log('PASS: badge icon batches coalesce across owners; individual icon disk cache survives restart; expired icons refresh; failed thumbnails never block names or loop requests.');
}finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
