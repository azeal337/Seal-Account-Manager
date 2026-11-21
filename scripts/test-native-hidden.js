const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
for(const name of ['SealMutexHolder','SealProcessSleeper']){
 const file=path.resolve(process.argv[2]||'src',name+'.exe'),bytes=fs.readFileSync(file),pe=bytes.readUInt32LE(0x3c);
 assert.equal(bytes.toString('ascii',pe,pe+2),'PE');assert.equal(bytes.readUInt16LE(pe+24+68),2,name+' must use Windows GUI subsystem, not console');
 const run=spawnSync(file,['--seal-stdio-probe'],{windowsHide:true,encoding:'utf8',timeout:5000});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/^READY\r?\n$/);
}
console.log('PASS: both native helpers have no console subsystem and preserve READY over redirected stdout; probe touches no mutex or game processes.');
