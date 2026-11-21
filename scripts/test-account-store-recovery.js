const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {app}=require('electron');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seal-store-recovery-'));app.setPath('userData',temp);
const store=require('../src/accountStore'),file=path.join(temp,'accounts.json'),backup=path.join(temp,'accounts.backup.json');
app.whenReady().then(()=>{try{
 const account=store.addAccount({username:'Fixture',userId:123,cookie:'dummy-fixture'});store.setLaunchSettings(account.id,{volume:3});
 const knownBackup=fs.readFileSync(backup,'utf8');fs.writeFileSync(file,'{bad-json');
 assert.equal(store.listAccounts().length,1,'a corrupt primary must recover the account list from backup');
 assert.equal(store.listAccounts()[0].id,account.id);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),JSON.parse(knownBackup));
 assert(fs.readdirSync(temp).some(name=>name.startsWith('accounts.corrupt-')&&fs.readFileSync(path.join(temp,name),'utf8')==='{bad-json'),'preserve the damaged original');
 fs.unlinkSync(file);assert.equal(store.listAccounts()[0].id,account.id,'recover a missing primary from backup');
 const primary=fs.readFileSync(file,'utf8'),rename=fs.renameSync;fs.renameSync=function(source,target){if(target===file)throw Error('fixture disk failure');return rename.apply(this,arguments);};
 try{assert.throws(()=>store.setLaunchSettings(account.id,{volume:9}),/fixture disk failure/);}finally{fs.renameSync=rename;}
 assert.equal(fs.readFileSync(file,'utf8'),primary,'failed publish must leave the primary untouched');
 assert(!fs.readdirSync(temp).some(name=>name.endsWith('.tmp')),'failed writes must clean up temporary files');
 fs.renameSync=function(source,target){if(target===backup)throw Error('fixture backup failure');return rename.apply(this,arguments);};
 try{assert.throws(()=>store.setLaunchSettings(account.id,{volume:8}),/fixture backup failure/);}finally{fs.renameSync=rename;}
 assert.equal(fs.readFileSync(file,'utf8'),primary,'failed backup must not publish a new primary');
 fs.unlinkSync(backup);fs.writeFileSync(file,'null');
 assert.throws(()=>store.listAccounts(),/could not be read|cannot read/i,'invalid root must not silently become an empty store');
 assert.throws(()=>store.addAccount({username:'New',userId:456,cookie:'dummy'}),/could not be read|cannot read/i);
 assert.equal(fs.readFileSync(file,'utf8'),'null','failed load must not erase the damaged store');
 console.log('PASS: account recovery, atomic failure preservation, temporary cleanup, invalid-store protection.');app.quit();
 }catch(e){console.error(e);app.exit(1);}});
app.on('will-quit',()=>{fs.rmSync(temp,{recursive:true,force:true});});
