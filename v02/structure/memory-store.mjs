import{createHash}from'node:crypto';
import{StructureError,validateStructure,resolveDependencyProposal,inspectDependencyProposal,effectiveDependencies,projectPage}from'./contract.mjs';
// Synthetic persistence only; no SQL adapter, production route or grant operation.
export class StructureMemoryStore{
 constructor(model){this.model=structuredClone(validateStructure(model));const resolved=effectiveDependencies(this.model);this.model.dependencyEdges=this.model.dependencyEdges.map((e,i)=>({...e,prerequisiteTaskId:resolved[i].prerequisiteTaskId,taskId:resolved[i].taskId}));this.revision=0;this.operations=new Map();this.audit=[];}
 snapshot(){return{...structuredClone(this.model),revision:this.revision};}
 execute(context,input,access){
  const type=input?.type||'addDependency',fields=type==='addDependency'?['edge']:type==='removeReference'?['referenceId']:type==='removeDependency'?['dependencyId']:[];
  if(!fields.length||!input||Object.keys(input).some(k=>!['operationId','expectedRevision','type',...fields].includes(k))||typeof input.operationId!=='string'||input.operationId.length<8||input.operationId.length>120||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new StructureError(400,'Invalid operation');
  const key=context.subjectId+'/'+input.operationId,fingerprint=createHash('sha256').update(JSON.stringify({type,...Object.fromEntries(fields.map(k=>[k,input[k]]))})).digest('hex'),prior=this.operations.get(key);
  if(prior&&prior.fingerprint!==fingerprint)throw new StructureError(409,'Operation ID reused');
  let evidence;
  if(type==='addDependency'){
   evidence=resolveDependencyProposal(this.model,context,input.edge,access);
   if(access.canShareDependency?.(context,evidence.prerequisiteTaskId,evidence.taskId)!==true)throw new StructureError(403,'Dependency cannot be shared');
  }else if(type==='removeReference'){
   const ref=this.model.references.find(x=>x.id===input.referenceId)||(prior?.type===type?prior.evidence:null);
   if(!ref)throw new StructureError(404,'Not found');
   const placement=projectPage(this.model,context,ref.container,access);
   if((!prior&&!placement.entries.some(x=>x.referenceId===ref.id))||access.canReadTask(context,ref.taskId)!==true||access.canReadPage(context,{kind:'task',id:ref.taskId})!==true)throw new StructureError(404,'Not found');
   if(access.canRemoveReference?.(context,ref.id)!==true)throw new StructureError(403,'Reference removal not permitted');evidence=ref;
  }else{
   const edge=this.model.dependencyEdges.find(x=>x.id===input.dependencyId)||(prior?.type===type?prior.evidence:null);
   if(!edge||access.canReadTask(context,edge.taskId)!==true||access.canReadTask(context,edge.prerequisiteTaskId)!==true||access.canReadPage(context,{kind:'task',id:edge.taskId})!==true||access.canReadPage(context,{kind:'task',id:edge.prerequisiteTaskId})!==true)throw new StructureError(404,'Not found');
   if(access.canEditTask?.(context,edge.taskId)!==true)throw new StructureError(403,'Target editor required');evidence=edge;
  }
  if(prior)return{...prior.response,replayed:true};
  if(input.expectedRevision!==this.revision)throw new StructureError(409,'Revision conflict');
  let next;
  if(type==='addDependency'){const inspection=inspectDependencyProposal(this.model,context,input.edge,access);next={...this.model,dependencyEdges:[...this.model.dependencyEdges,inspection.edge]};}
  else if(type==='removeReference')next={...this.model,references:this.model.references.filter(x=>x.id!==input.referenceId)};
  else next={...this.model,dependencyEdges:this.model.dependencyEdges.filter(x=>x.id!==input.dependencyId)};
  validateStructure(next);const response={revision:this.revision+1,operationId:input.operationId};this.model=next;this.revision++;this.operations.set(key,{type,fingerprint,evidence:structuredClone(evidence),response});this.audit.push({subjectId:context.subjectId,operationId:input.operationId,type});return response;
 }
}
