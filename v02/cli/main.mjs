import fs from 'node:fs/promises';
import { transport, prepareBatch, applyBatch } from './batch-client.mjs';
import { readiness } from './readiness.mjs';
const usage='Usage: check --url ORIGIN --backend api-v02 [--workspace ID] | prepare|run INPUT --journal PLAN --url ORIGIN --backend api-v02 | apply PLAN. Authorization: existing THDMN_CALLER_TOKEN only; no login or credential discovery.';
try {
 const args=process.argv.slice(2),verb=args.shift();
 if(!['check','run','prepare','apply'].includes(verb))throw Error(usage);
 const file=verb==='check'?null:args.shift(),flags={};
 if(verb!=='check'&&(!file||file.startsWith('--')))throw Error(usage);
 for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--journal','--url','--backend','--actor','--workspace'].includes(key)||!value||value.startsWith('--')||Object.hasOwn(flags,key))throw Error(usage);flags[key]=value;}
 if(verb==='apply'&&args.length||verb==='check'&&flags['--journal'])throw Error(usage);
 const connectionFor=target=>transport({...target,token:process.env.THDMN_CALLER_TOKEN});
 let plan,connection;
 if(verb==='apply'){plan=JSON.parse(await fs.readFile(file,'utf8'));connection=connectionFor(plan);}
 else{
  connection=connectionFor({baseUrl:flags['--url'],backend:flags['--backend'],actorId:flags['--actor'],workspaceId:flags['--workspace']||'demo'});
  if(verb==='check'){if(flags['--backend']!=='api-v02')throw Error('check requires api-v02');console.log(JSON.stringify(readiness(await connection.read()),null,2));process.exit(0);}
  const journal=flags['--journal'];if(!journal)throw Error('--journal required (stores operations, never tokens)');
  const operations=JSON.parse(await fs.readFile(file,'utf8'));
  // Reserve before preparing; never overwrite an existing operation journal.
  const handle=await fs.open(journal,'wx');try{plan=await prepareBatch(operations,connection);await handle.writeFile(JSON.stringify(plan,null,2)+'\n');}finally{await handle.close();}
  if(verb==='prepare'){console.log(JSON.stringify({prepared:plan.items.length,journal}));process.exit(0);}
 }
 const results=await applyBatch(plan,connection);console.log(JSON.stringify({applied:results.length,results},null,2));
}catch(error){console.error(JSON.stringify({error:error.message,status:error.status,failedIndex:error.failedIndex,completed:error.completed}));process.exitCode=1;}
