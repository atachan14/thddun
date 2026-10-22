import{timed}from'./timing.mjs';
// Shared browser/CLI transport. Authorization stays in the injected fetch binding.
export function taskClient({fetchImpl=fetch,workspaceId='demo'}){
 let snapshot,pending,acknowledged,generation=0,writing=false;
 async function checked(response){if(!response.ok)throw Object.assign(Error('API request failed'),{status:response.status});return response.json();}
 return{
  clear(){generation++;snapshot=null;pending=null;acknowledged=undefined;},get snapshot(){return snapshot;},get pending(){return pending;},
  async load(){const turn=generation;const next=await timed('snapshot',async()=>checked(await fetchImpl('/api/v02/snapshot?workspace='+encodeURIComponent(workspaceId),{cache:'no-store'})));if(turn!==generation)throw Error('Session changed');snapshot=next;return snapshot;},
  async setMyState(taskId,state){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'setMyState',taskId,state}};return this.retry();},
  async patchContent(taskId,patch){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'patchTask',taskId,patch}};return this.retry();},
  async createChild({id,parentId,parent,name,details,parentTier,legacy=false}){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:snapshot.stageOne&&!legacy?{type:'createPageTask',id,parent:parent||{kind:'task',id:parentId},name,details}:{type:'createTask',id,parentId,name,details,deps:[],relationTiers:{parent:parentTier,deps:{}}}};return this.retry();},
  async addParticipant(taskId,principalId){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command:{type:'addParticipant',taskId,principalId}};return this.retry();},
  async policyCommand(command){if(pending)throw Error('Unconfirmed operation');if(!snapshot)throw Error('Load first');pending={workspaceId,operationId:crypto.randomUUID(),expectedRevision:snapshot.revision,command};return this.retry();},
  async retry(){if(!pending)throw Error('No pending operation');if(writing)throw Error('Update in progress');writing=true;const turn=generation;try{if(acknowledged===undefined){const response=await fetchImpl('/api/v02/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});if(turn!==generation)throw Error('Session changed');if(response.status<500&&!response.ok){pending=null;acknowledged=undefined;throw Object.assign(Error('Update rejected'),{status:response.status});}acknowledged=await checked(response);if(turn!==generation)throw Error('Session changed');}await this.load();const result=acknowledged;pending=null;acknowledged=undefined;return result;}finally{writing=false;}}
 };
}
