// Launch a detached localhost-only process; no service, startup registration, or OS changes.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const url='http://127.0.0.1:18742',dir=path.join(__dirname,'runtime');
fs.mkdirSync(dir,{recursive:true});
async function probe(){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});return r.status===200&&(await r.text()).includes('<title>thdmn');}catch{return false;}}
(async()=>{
 if(await probe()){console.log('thdmn already running: '+url);return;}
 const out=fs.openSync(path.join(dir,'server.stdout.log'),'a'),err=fs.openSync(path.join(dir,'server.stderr.log'),'a');
 const child=spawn(process.execPath,[path.join(__dirname,'server.cjs')],{cwd:__dirname,detached:true,windowsHide:true,stdio:['ignore',out,err]});
 child.on('error',e=>{console.error('thdmn could not start: '+e.message);process.exitCode=1;});
 child.unref();fs.closeSync(out);fs.closeSync(err);
 const record={pid:child.pid,startedAt:new Date().toISOString(),url,script:path.join(__dirname,'server.cjs')};
 fs.writeFileSync(path.join(dir,'process.json'),JSON.stringify(record,null,2));fs.appendFileSync(path.join(dir,'launch-history.jsonl'),JSON.stringify(record)+'\n');
 for(let i=0;i<30;i++){if(await probe()){console.log('thdmn started independently: '+url+' (PID '+child.pid+')');return;}await new Promise(r=>setTimeout(r,150));}
 console.error('thdmn did not respond; see runtime/server.stderr.log');process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
