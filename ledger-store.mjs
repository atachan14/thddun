import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';
import{validateLedger,recompute,migrationPreview,previewTierMigration,applyCommand,effectivePolicy,DomainError}from'./domain.mjs';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
export class LedgerStore{
 constructor(dir,{failpoint}={}){this.dir=dir;this.file=path.join(dir,'ledger.json');this.failpoint=failpoint;}
 read(){if(!fs.existsSync(this.file))return null;const e=JSON.parse(fs.readFileSync(this.file,'utf8'));if(e.schema!==1||!Number.isInteger(e.revision)||e.revision<1||!e.operations)throw Error('Invalid ledger envelope');validateLedger(e.data);if(JSON.stringify(recompute(structuredClone(e.data)).tasks)!==JSON.stringify(e.data.tasks))throw Error('Invalid completion aggregate');return e;}
 preview(data,actorId){return migrationPreview(data,actorId);}
 previewTiers(actorId,options){const current=this.read();if(!current)throw new DomainError('移行が必要です',404);return previewTierMigration(current.data,actorId,options);}
 execute({actorId,operationId,expectedRevision,command,migration,sourceKey,replacement}){
  if(typeof operationId!=='string'||operationId.length<8||operationId.length>120)throw new DomainError('operationIdが必要です');fs.mkdirSync(this.dir,{recursive:true});let lock,temp;
  try{try{lock=fs.openSync(this.file+'.lock','wx');}catch(e){if(e.code==='EEXIST')throw new DomainError('他の保存処理中です',423);throw e;}
   const original=fs.existsSync(this.file)?fs.readFileSync(this.file,'utf8'):null,current=this.read(),fingerprint=hash(JSON.stringify({actorId,command,migration,sourceKey,replacement}));
   if(current?.operations[operationId]){if(current.operations[operationId]!==fingerprint)throw new DomainError('operationIdを別の操作へ再利用できません',409);return{...current,replayed:true};}
   if((current?.revision??null)!==expectedRevision)throw new DomainError('他の更新があります。最新内容を確認してください',409);
   const at=new Date().toISOString();let data;
   if(replacement){if(!current||current.data.tasks.some(t=>!effectivePolicy(current.data,t.id).editors.includes(actorId)))throw new DomainError('現在の全Taskの修正権限が必要です',403);data=recompute(validateLedger(structuredClone(replacement)));data.audit.push({type:'localDataReplacement',actorId,operationId,at,previousRevision:current.revision,previousHash:hash(original),sourceKey});}
   else if(migration){if(current)throw new DomainError('台帳は既に存在します',409);data=this.preview(migration,actorId).data;data.migration={...(data.migration||{}),sourceKey,sourceHash:hash(JSON.stringify(migration)),at};data.audit.push({operationId,actorId,type:'migration',at});}
   else{if(!current)throw new DomainError('移行が必要です',404);data=applyCommand(current.data,command,actorId,at,operationId);}
   const next={schema:1,revision:(current?.revision??0)+1,data,operations:{...(current?.operations||{}),[operationId]:fingerprint}},output=JSON.stringify(next,null,2)+'\n';validateLedger(data);
   const backups=path.join(this.dir,'backups');fs.mkdirSync(backups,{recursive:true});if(original){const name=path.join(backups,`revision-${current.revision}-${hash(original).slice(0,16)}.json`);if(!fs.existsSync(name))this.syncWrite(name,original);}
   temp=this.file+'.'+crypto.randomUUID()+'.tmp';this.syncWrite(temp,output);this.failpoint?.('beforeRename');if((fs.existsSync(this.file)?fs.readFileSync(this.file,'utf8'):null)!==original)throw new DomainError('ファイルが別経路で更新されました',409);fs.renameSync(temp,this.file);temp=null;
   if(fs.readFileSync(this.file,'utf8')!==output)throw Error('保存結果を確認できません');return this.read();
  }finally{if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(this.file+'.lock');}}
 }
 syncWrite(file,text){const fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
}
