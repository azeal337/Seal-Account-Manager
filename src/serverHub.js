const fs=require('fs'),https=require('https'),crypto=require('crypto');
const {writeTextAtomic}=require('./atomicFile');
const numeric=value=>/^\d{1,20}$/.test(String(value||''))?String(value):'';
const job=value=>/^[a-f0-9]{8}-[a-f0-9-]{27,40}$/i.test(String(value||''))?String(value):'';
function placeId(value){const text=String(value||'').trim();if(numeric(text))return text;try{const u=new URL(text);if(!/(^|\.)roblox\.com$/i.test(u.hostname))throw Error();return numeric(u.searchParams.get('placeId'))||numeric(u.pathname.match(/^\/games\/(\d+)/)?.[1]);}catch{}return '';}
function requestJson(url) {
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{headers:{'User-Agent':'SealAccountManager'},timeout:12000},res=>{
   let body='';res.setEncoding('utf8');
   res.on('data',chunk=>{body+=chunk;if(body.length>2*1024*1024)req.destroy(Error('Server response was too large.'));});
   res.on('end',()=>{
    if(res.statusCode===429)return reject(Error('Roblox is limiting server requests. Wait a moment and refresh.'));
    if(res.statusCode!==200)return reject(Error('Roblox server request failed ('+res.statusCode+').'));
    try{resolve(JSON.parse(body));}catch{reject(Error('Roblox returned an unreadable server list.'));}
   });
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('Roblox server request timed out.')));req.on('error',reject);
 });
}
const timestamp=value=>Number.isSafeInteger(value)&&value>=0;
const validTimer=timer=>timer&&typeof timer==='object'&&!Array.isArray(timer)&&typeof timer.id==='string'&&timer.id.length>0&&timer.id.length<=120&&numeric(timer.placeId)&&typeof timer.label==='string'&&timer.label.trim()&&Number.isInteger(timer.minutes)&&timer.minutes>=1&&timer.minutes<=10080&&timestamp(timer.anchor);
function nextOccurrence(timer,now=Date.now()){if(!timer||!Number.isInteger(timer.minutes)||timer.minutes<1||timer.minutes>10080||!timestamp(timer.anchor)||!timestamp(now))return null;const step=timer.minutes*60000;const next=timer.anchor>now?timer.anchor:timer.anchor+(Math.floor((now-timer.anchor)/step)+1)*step;return Number.isSafeInteger(next)?next:null;}
function readState(file){
 const state={observed:[],history:[],timers:[]};
 let raw;try{raw=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return state;}
 if(!raw||typeof raw!=='object')return state;
 const rows=key=>Array.isArray(raw[key])?raw[key]:[];
 state.observed=rows('observed').filter(x=>x&&numeric(x.placeId)&&job(x.id)&&timestamp(x.firstSeen)&&timestamp(x.lastSeen)&&x.lastSeen>=x.firstSeen).slice(0,5000).map(x=>({placeId:numeric(x.placeId),id:job(x.id),firstSeen:x.firstSeen,lastSeen:x.lastSeen}));
 state.history=rows('history').filter(x=>x&&typeof x.accountId==='string'&&x.accountId.length>0&&x.accountId.length<=120&&numeric(x.placeId)&&job(x.id)&&timestamp(x.firstSeen)&&timestamp(x.lastSeen)&&x.lastSeen>=x.firstSeen).slice(0,300).map(x=>({key:[x.accountId,numeric(x.placeId),job(x.id)].join(':'),accountId:x.accountId,userId:numeric(x.userId),placeId:numeric(x.placeId),id:job(x.id),firstSeen:x.firstSeen,lastSeen:x.lastSeen,username:String(x.username||'Account').slice(0,80),name:String(x.name||`Place ${x.placeId}`).slice(0,160)}));
 const seen=new Set();state.timers=rows('timers').filter(validTimer).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;}).slice(0,50).map(x=>({id:x.id,placeId:numeric(x.placeId),label:x.label.trim().slice(0,80),minutes:x.minutes,anchor:x.anchor}));
 return state;
}
function createServerHub(file,{fetchJson=requestJson,now=Date.now}={}){
 let data=readState(file);
 let cache=new Map(),pending=new Map(),lastHistorySave=0;
 function save(state=data){writeTextAtomic(file,JSON.stringify(state));}
 function observe(rows,pid){const at=now();for(const row of rows){let entry=data.observed.find(x=>x.placeId===pid&&x.id===row.id);if(!entry){entry={placeId:pid,id:row.id,firstSeen:at};data.observed.push(entry);}entry.lastSeen=at;row.firstSeen=entry.firstSeen;}
 data.observed=data.observed.filter(x=>at-x.lastSeen<30*86400000).sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,5000);save();}
 async function list(input={}){
  const pid=placeId(input.placeId);if(!pid)throw Error('Enter a Roblox game link or numeric place ID.');
  const order=input.order==='low'?'Asc':'Desc',full=input.includeFull===true;
  const cursor=String(input.cursor||'');if(cursor.length>2000)throw Error('Invalid server page.');
  const key=JSON.stringify([pid,order,full,cursor]);const cached=cache.get(key);if(cached&&now()-cached.at<10000)return cached.result;
  if(pending.has(key))return pending.get(key);if(pending.size>=3)throw Error('A server request is already in progress. Try again shortly.');
  const task=(async()=>{const json=await fetchJson(`https://games.roblox.com/v1/games/${pid}/servers/Public?sortOrder=${order}&limit=100&excludeFullGames=${!full}${cursor?'&cursor='+encodeURIComponent(cursor):''}`);
   if(!Array.isArray(json.data))throw Error('Roblox returned an unreadable server list.');
   const rows=json.data.filter(x=>x&&job(x.id)&&Number.isInteger(x.playing)&&Number.isInteger(x.maxPlayers)&&x.playing>=0&&x.maxPlayers>0).map(x=>({id:x.id,placeId:pid,playing:x.playing,maxPlayers:x.maxPlayers,full:x.playing>=x.maxPlayers})).filter(x=>full||!x.full);
   observe(rows,pid);const result={placeId:pid,rows,cursor:typeof json.nextPageCursor==='string'?json.nextPageCursor:null,at:now()};cache.set(key,{at:now(),result});if(cache.size>40)cache.delete(cache.keys().next().value);return result;
  })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
 }
 function record(sessions){let changed=false,observed=false;const at=now();for(const session of sessions){const a=session.activity; if(!a?.confirmed||a.disconnected)continue;const pid=numeric(a.placeId),id=job(a.jobId);if(!pid||!id||!session.accountId)continue;
 observed=true;const key=[session.accountId,pid,id].join(':');let entry=data.history.find(x=>x.key===key);if(!entry){entry={key,accountId:String(session.accountId),userId:numeric(session.userId),placeId:pid,id,firstSeen:at,lastSeen:at};data.history.push(entry);changed=true;}
 entry.username=String(session.username||'Account').slice(0,80);entry.name=String(session.targetLabel||`Place ${pid}`).slice(0,160);entry.lastSeen=at;
 }data.history.sort((a,b)=>b.lastSeen-a.lastSeen);data.history=data.history.slice(0,300);if(changed||(observed&&at-lastHistorySave>15000)){save();lastHistorySave=at;}}
 function history(accountId=''){return data.history.filter(x=>!accountId||x.accountId===accountId);}
 function saveTimer(input){const pid=placeId(input.placeId),minutes=Number(input.minutes),anchor=Number(input.anchor),label=String(input.label||'').trim().slice(0,80);if(!pid||!label||!Number.isInteger(minutes)||minutes<1||minutes>10080||!timestamp(anchor)||anchor>now()+366*86400000)throw Error('Enter a game, event name, repeat interval (1–10080 minutes), and valid event time.');if(data.timers.length>=50)throw Error('Remove a timer before adding more (50 maximum).');const timer={id:crypto.randomUUID(),placeId:pid,label,minutes,anchor};const next={...data,timers:[...data.timers,timer]};save(next);data=next;return {...timer};}
 function removeTimer(id){const next={...data,timers:data.timers.filter(t=>t.id!==id)};save(next);data=next;}
 return {list,record,history,timers:()=>data.timers.map(t=>({...t,nextAt:nextOccurrence(t,now())})),saveTimer,removeTimer};
}
module.exports={createServerHub,placeId,nextOccurrence};
