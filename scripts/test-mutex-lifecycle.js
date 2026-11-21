const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{EventEmitter}=require('events');
function fixture(){const children=[],timers=new Map();let next=1;const mod={exports:{}};const source=fs.readFileSync(path.join(__dirname,'../src/mutexHolder.js'),'utf8');
 vm.runInNewContext(source,{module:mod,exports:mod.exports,__dirname:path.join(__dirname,'../src'),process:{pid:123,resourcesPath:null},setTimeout:fn=>{const id=next++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),require:name=>name==='fs'?{existsSync:()=>true}:name==='child_process'?{spawn:()=>{const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.exitCode=null;child.killed=false;child.kill=()=>{child.killed=true;};children.push(child);return child;}}:require(name)});
 return {holder:mod.exports,children,timers};}
(async()=>{
 const {holder,children}=fixture();const first=holder.start();assert.equal(holder.start(),first);assert.equal(holder.status().active,false,'spawned does not mean READY');
 holder.stop();const second=holder.start();assert.equal((await first).ok,false,'stopped startup must not report success');assert.equal(holder.start(),second,'late cleanup must not clear a newer pending start');
 children[0].stdout.emit('data',Buffer.from('READY\n'));children[0].emit('exit',0);assert.equal(holder.status().active,false,'late old READY/exit must not affect new helper');
 children[1].stdout.emit('data',Buffer.from('REA'));children[1].stdout.emit('data',Buffer.from('DY\r\n'));assert.equal((await second).ok,true);assert.equal(holder.status().active,true);
 assert.equal((await holder.start()).ok,true);assert.equal(children.length,2,'reuse the ready helper');
 children[0].stderr.emit('data',Buffer.from('stale failure'));assert.equal(holder.status().error,null);
 children[1].emit('exit',1);assert.equal(holder.status().active,false,'helper exit must clear READY');
 holder.stop();assert.equal(holder.status().active,false);
 const timeout=fixture();const start=timeout.holder.start();for(const fn of [...timeout.timers.values()])fn();assert.equal((await start).ok,false);assert.equal(timeout.children[0].killed,true);
 const failed=fixture();const promise=failed.holder.start();failed.children[0].emit('error',Error('fixture spawn failed'));assert.equal((await promise).ok,false);assert.equal(failed.holder.status().active,false);
 const busy=fixture();const blocked=busy.holder.start();busy.children[0].stdout.emit('data',Buffer.from('BUSY\n'));assert.equal((await blocked).busy,true);assert.equal(busy.children[0].killed,true);assert.equal(busy.holder.status().active,false);
 const retry=busy.holder.start();busy.children[1].stdout.emit('data',Buffer.from('READY\n'));assert.equal((await retry).ok,true);busy.holder.stop();
 console.log('PASS: shared READY gate, cancellation, stale events, partial output, reuse/exit, timeout, helper errors, BUSY and retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
