import fs from'node:fs';import crypto from'node:crypto';
const args=process.argv.slice(2),verb=args.shift(),flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];},base=flag('url','http://127.0.0.1:18742'),actorId=flag('actor','sample');
try{const url=new URL(base);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw Error('localhostのURLを指定してください');let endpoint='/api/ledger',body;
 if(verb==='preview'||verb==='init'){const file=args[0];if(!file||file.startsWith('--'))throw Error('JSONファイルが必要です');endpoint=verb==='preview'?'/api/migration/preview':'/api/migration';body={data:JSON.parse(fs.readFileSync(file,'utf8')),actorId,sourceKey:'CLI import',operationId:flag('operation',crypto.randomUUID())};}
 else if(verb==='apply'){if(!flag('revision'))throw Error('--revisionが必要です');endpoint='/api/commands';body={actorId,expectedRevision:Number(flag('revision')),operationId:flag('operation',crypto.randomUUID()),command:JSON.parse(fs.readFileSync(args[0],'utf8'))};}
 else if(verb!=='show')throw Error('Usage: node cli.mjs show | preview file.json | init file.json | apply command.json --revision N [--actor dot] [--operation ID] [--url http://127.0.0.1:PORT]');
 const response=await fetch(base+endpoint,body?{method:'POST',headers:{'Content-Type':'application/json','Origin':base,'X-Thdmn-Client':'local'},body:JSON.stringify(body)}:{}),result=await response.json();console.log(JSON.stringify(result,null,2));if(!response.ok)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
