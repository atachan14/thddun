import{createHash}from'node:crypto';
import{StructureError,validateStructure,resolveDependencyProposal,inspectDependencyProposal}from'./contract.mjs';
// Synthetic persistence only; no SQL adapter, production route or grant operation.
export class StructureMemoryStore{
 constructor(model){this.model=structuredClone(validateStructure(model));this.revision=0;this.operations=new Map();this.audit=[];}
 snapshot(){return{...structuredClone(this.model),revision:this.revision};}
 execute(context,input,access){
  if(!input||Object.keys(input).some(k=>!['operationId','expectedRevision','edge'].includes(k))||typeof input.operationId!=='string'||input.operationId.length<8||input.operationId.length>120||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new StructureError(400,'Invalid operation');
  // Current B edit authority is checked even for replay. Source edit authority is not required.
  const resolved=resolveDependencyProposal(this.model,context,input.edge,access),key=context.subjectId+'/'+input.operationId,fingerprint=createHash('sha256').update(JSON.stringify(input.edge)).digest('hex'),prior=this.operations.get(key);
  if(access.canShareDependency?.(context,resolved.prerequisiteTaskId,resolved.taskId)!==true)throw new StructureError(403,'Dependency cannot be shared');
  if(prior){if(prior.fingerprint!==fingerprint)throw new StructureError(409,'Operation ID reused');return{...prior.response,replayed:true};}
  if(input.expectedRevision!==this.revision)throw new StructureError(409,'Revision conflict');
  const inspection=inspectDependencyProposal(this.model,context,input.edge,access),next={...this.model,dependencyEdges:[...this.model.dependencyEdges,inspection.edge]};
  validateStructure(next);const response={revision:this.revision+1,operationId:input.operationId};this.model=next;this.revision++;this.operations.set(key,{fingerprint,response});this.audit.push({subjectId:context.subjectId,operationId:input.operationId,type:'addDependency',prerequisiteTaskId:resolved.prerequisiteTaskId,taskId:resolved.taskId});return response;
 }
}
