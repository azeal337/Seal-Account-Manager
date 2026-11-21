const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FAMILY = [
  ['rbx-storage.db', false], ['rbx-storage.db-wal', false], ['rbx-storage.db-shm', false],
  ['rbx-storage.db-journal', false], ['rbx-storage.id', false], ['rbx-storage', true], ['rbx-storage-sc', true]
];
const inside = (candidate, root) => { const relative=path.relative(root,candidate);return !!relative && relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative); };
function createCacheRepair({ localAppData, getProcesses, closeRoblox, delay = ms => new Promise(resolve => setTimeout(resolve,ms)), io = fs.promises } = {}) {
  const base = path.resolve(localAppData || '');
  if (!path.isAbsolute(localAppData || '') || base === path.parse(base).root) throw Error('A specific local app-data directory is required.');
  let pending = null;
  async function exists(file) { try { return await io.lstat(file); } catch(error) { if(error.code==='ENOENT')return null;throw error; } }
  async function safeRoot(root) {
    if(!inside(root,base))throw Error('Cache path is outside local app data.');
    let parent=root;
    while(parent!==base){const entry=await exists(parent);if(entry?.isSymbolicLink())throw Error('Cache folder is redirected.');parent=path.dirname(parent);if(!inside(parent,base)&&parent!==base)throw Error('Invalid cache root.');}
    const stat=await exists(root);if(!stat)return false;
    if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Cache folder is redirected or is not a regular directory.');
    const actualBase=await io.realpath(base),actualRoot=await io.realpath(root);
    if(!inside(actualRoot,actualBase))throw Error('Cache folder redirects outside local app data.');
    return true;
  }
  async function plan(includeFleasion) {
    const targets=[];
    for(const folder of ['Roblox','RobloxPCGDK']){
      const root=path.join(base,folder);if(!await safeRoot(root))continue;
      for(const [name,directory] of FAMILY){const file=path.join(root,name),stat=await exists(file);if(!stat)continue;
        if(stat.isSymbolicLink()||stat.isDirectory()!==directory)throw Error('Unexpected cache entry type: '+file);
        targets.push({file,root,name,mode:stat.mode&0o777});
      }
    }
    if(includeFleasion){const root=path.join(base,'FleasionNT','cache');if(await safeRoot(root)){
      for(const entry of await io.readdir(root,{withFileTypes:true})){
        if(entry.name.toLowerCase()==='predownloaded'||entry.name.startsWith('.seal-cache-reset-'))continue;
        const file=path.join(root,entry.name);if(!inside(file,root))throw Error('Invalid generated-cache path.');
        const stat=await io.lstat(file);if(stat.isSymbolicLink())throw Error('Generated-cache entry is redirected: '+file);
        targets.push({file,root,name:entry.name,mode:stat.mode&0o777});
      }
    }}
    return targets;
  }
  async function state(){const processes=await getProcesses();if(!processes||processes.reliable!==true)throw Error('Could not verify whether Roblox is running. Try again before resetting its cache.');return processes;}
  async function removeOwned(file, root) {
    // Never follow links while removing a quarantined cache. Every recursive
    // step remains inside the exact directory created by this repair.
    if(!inside(file,root))throw Error('Refusing to remove a path outside this cache backup.');
    const stat=await exists(file);if(!stat)return;
    if(stat.isSymbolicLink())throw Error('A redirected cache entry was left in its backup.');
    if(stat.isDirectory()){
      for(const child of await io.readdir(file))await removeOwned(path.join(file,child),root);
      await io.rmdir(file);
    }else{await io.chmod(file,0o666).catch(()=>{});await io.unlink(file);}
  }
  async function run({closeRunning=false,includeFleasion=true}={}){
    const initial=await state();
    if(initial.pids.length && !closeRunning)return {ok:false,needsClose:true,count:initial.pids.length,message:'Close all Roblox clients to reset their join cache.'};
    if(initial.pids.length){await closeRoblox();for(let i=0;i<20;i++){if(!(await state()).pids.length)break;await delay(250);}}
    if((await state()).pids.length)throw Error('Roblox is still running. The cache was left unchanged.');
    const targets=await plan(includeFleasion),moved=[],backups=new Map();
    if(!targets.length)return {ok:true,resetCount:0,message:'The Roblox join cache is already empty. Try joining again.'};
    // Check once more after discovery, before any filesystem mutation.
    if((await state()).pids.length)throw Error('Roblox opened during the reset. Close it and try again; no cache files were changed.');
    try{
      for(const target of targets){
        if(!inside(target.file,target.root)||!await safeRoot(target.root))throw Error('The cache folder changed during repair.');
        let backup=backups.get(target.root);
        if(!backup){backup=path.join(target.root,'.seal-cache-reset-'+crypto.randomUUID());if(!inside(backup,target.root))throw Error('Invalid cache backup path.');await io.mkdir(backup);backups.set(target.root,backup);}
        const destination=path.join(backup,target.name);if(!inside(destination,backup))throw Error('Invalid cache backup destination.');
        const stat=await io.lstat(target.file);if(stat.isSymbolicLink())throw Error('A cache entry changed into a redirected file.');
        try { await io.rename(target.file,destination); }
        catch(error){if(error.code!=='EPERM')throw error;await io.chmod(target.file,0o666);try{await io.rename(target.file,destination);}catch(retry){await io.chmod(target.file,target.mode).catch(()=>{});throw retry;}}
        moved.push({...target,destination,backup});
      }
    }catch(error){
      const recovery=[];
      for(const target of moved.reverse()){
        try{if(await exists(target.file))throw Error('A new cache file is using the original name.');if(!await safeRoot(target.root)||!inside(target.file,target.root)||!inside(target.destination,target.backup))throw Error('Invalid restore path.');await io.rename(target.destination,target.file);await io.chmod(target.file,target.mode).catch(()=>{});}
        catch{recovery.push(target.backup);}
      }
      for(const backup of backups.values())await io.rmdir(backup).catch(()=>{});
      return {ok:false,needsClose:false,recoveryPaths:[...new Set(recovery)],message:recovery.length?'The cache reset stopped. Some old cache files were preserved in a recovery folder. Close other Roblox tools and retry.':'The cache reset could not complete; the original cache was restored. Close other Roblox tools and try again.',errorCode:error.code||'CACHE_RESET_FAILED'};
    }
    const retained=[];
    for(const [root,backup] of backups){
      try{const stat=await io.lstat(backup);if(!await safeRoot(root)||!inside(backup,root)||stat.isSymbolicLink()||!inside(await io.realpath(backup),await io.realpath(root)))throw Error('Invalid cleanup path.');for(const entry of await io.readdir(backup))await removeOwned(path.join(backup,entry),backup);await io.rmdir(backup);}
      catch{retained.push(backup);}
    }
    return {ok:true,resetCount:targets.length,retainedBackups:retained,message:retained.length?'Join cache reset. Some old cache files remain in a backup because they are locked. Try joining again.':'Join cache reset. Roblox will rebuild its cached assets when you launch again.'};
  }
  function reset(options){if(pending)return pending;pending=run(options).finally(()=>{pending=null;});return pending;}
  return {reset};
}
module.exports={createCacheRepair,FAMILY};
