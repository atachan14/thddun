import{timed}from'./timing.mjs';
// Shared browser/CLI transport. Authorization stays in the injected fetch binding.
export function taskClient({fetchImpl=fetch,workspaceId='demo'}){
 let snapshot,pending,generation=0,writing=false;
 async function checked(response){if(!response.ok)throw Object.assign(Error('API request failed'),{status:response.status});return response.json();}
 return{
  clear(){generation++;snapshot=null;pending=null;},get snapshot(){return snapshot;},get pending(){return pending;},
  async load(){const turn=generation;const next=await timed('snapshot',async()=>checked(await fetchImpl('/api/v02/snapshot?workspace='+encodeURIComponent(workspaceId),{cache:'no-store'})));if(turn!==generation)throw Error('Session changed');snapshot=next;return snapshot;},
  async setMyState(taskId,state){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'setMyState',taskId,state}};return this.retry();},
  async patchContent(taskId,patch){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'patchTask',taskId,patch}};return this.retry();},
  async createChild({id,parentId,name,details,parentTier}){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'createTask',id,parentId,name,details,deps:[],relationTiers:{parent:parentTier,deps:{}}}};return this.retry();},
  async retry(){if(!pending)throw Error('No pending operation');if(writing)throw Error('Update in progress');writing=true;const turn=generation;try{const response=await fetchImpl('/api/v02/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});if(turn!==generation)throw Error('Session changed');if(response.status<500&&!response.ok){pending=null;throw Object.assign(Error('Update rejected'),{status:response.status});}const result=await checked(response);if(turn!==generation)throw Error('Session changed');pending=null;await this.load();return result;}finally{writing=false;}}
 };
}
