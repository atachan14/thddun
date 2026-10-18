export class FileClient{
 constructor(actor,onSnapshot){this.actor=actor;this.onSnapshot=onSnapshot;this.revision=null;this.data=null;this.queue=Promise.resolve();}
 async request(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json','X-Thdmn-Client':'local'},body:JSON.stringify(body)}:{}),value=await r.json();if(!r.ok){const e=Error(value.error||'保存先が見つかりません');e.status=r.status;throw e;}return value;}
 accept(value){this.revision=value.revision;this.data=value.data;this.onSnapshot?.(value);return value;}
 async load(){return this.accept(await this.request('/api/ledger'));}
 preview(data,sourceKey){return this.request('/api/migration/preview',{data,sourceKey,actorId:this.actor()});}
 async migrate(data,sourceKey){return this.accept(await this.request('/api/migration',{data,sourceKey,actorId:this.actor(),operationId:crypto.randomUUID()}));}
 command(command,expectedRevision){const actorId=this.actor(),operationId=crypto.randomUUID();const work=async()=>{
  const body={actorId,operationId,expectedRevision:expectedRevision??this.revision,command};
  try{return this.accept(await this.request('/api/commands',body));}catch(e){if(e.status)throw e;const latest=await this.request('/api/ledger');if(latest.data.audit.some(a=>a.operationId===operationId))return this.accept(latest);return this.accept(await this.request('/api/commands',body));}
 };const result=this.queue.then(work,work);this.queue=result.catch(()=>{});return result;}
}
