import{publicSample,DATASET,DEMO_ACTOR}from'./sample.mjs';import{validateStructure,calculateCompletion}from'../structure/contract.mjs';
export const COPY_KEY='thdmn.public-demo.copy.v1';
const text=(x,max)=>typeof x==='string'&&x.length<=max;
function validated(model){const original=publicSample();if(!model||Object.keys(model).some(k=>!['accounts','groups','tasks','references','dependencyEdges'].includes(k))||JSON.stringify(model.accounts)!=='[]'||JSON.stringify(model.groups)!==JSON.stringify(original.groups)||JSON.stringify(model.references)!=='[]'||JSON.stringify(model.dependencyEdges)!==JSON.stringify(original.dependencyEdges)||!Array.isArray(model.tasks)||model.tasks.length>30)throw Error('Invalid demo copy');
 for(const t of model.tasks){if(Object.keys(t).some(k=>!['id','title','details','parent','assignees','workStates'].includes(k))||!t.id.startsWith('public-demo-')||!text(t.title,160)||!t.title.trim()||!text(t.details,10000)||JSON.stringify(t.assignees)!==JSON.stringify([DEMO_ACTOR])||Object.keys(t.workStates).length!==1)throw Error('Invalid demo Task');}
 if(original.tasks.some(t=>!model.tasks.some(x=>x.id===t.id&&JSON.stringify(x.parent)===JSON.stringify(t.parent))))throw Error('Missing original demo Task');validateStructure(model);return structuredClone(model);}
export class DemoCopy{
 constructor({storage,id=()=>crypto.randomUUID()}={}){this.storage=storage;this.id=id;this.editable=false;this.copy=null;try{const raw=storage?.getItem(COPY_KEY);if(raw&&raw.length<=350000){const stored=JSON.parse(raw);if(stored.dataset===DATASET)this.copy=validated(stored.model);}}catch{/* Invalid/unavailable local storage never triggers a network fallback. */}}
 snapshot(){const model=this.editable?this.copy:publicSample();return{editable:this.editable,hasCopy:!!this.copy,model:structuredClone(model),completion:calculateCompletion(model)};}
 begin(){this.copy??=publicSample();this.editable=true;this.persist();return this.snapshot();}
 persist(){try{this.storage?.setItem(COPY_KEY,JSON.stringify({dataset:DATASET,model:this.copy}));}catch{/* Copy remains usable in memory. */}}
 update(work){if(!this.editable)throw Error('先に「コピーで体験する」を選んでください');const next=structuredClone(this.copy);work(next);this.copy=validated(next);this.persist();return this.snapshot();}
 edit(id,patch){if(!patch||Object.keys(patch).some(k=>!['title','details'].includes(k)))throw Error('変更できない項目です');return this.update(m=>{const t=m.tasks.find(t=>t.id===id);if(!t)throw Error('Taskが見つかりません');Object.assign(t,patch);});}
 state(id,state){if(!['todo','doing','hold','done'].includes(state))throw Error('状態を確認してください');return this.update(m=>{const t=m.tasks.find(t=>t.id===id);if(!t)throw Error('Taskが見つかりません');t.workStates[DEMO_ACTOR]=state;});}
 add(parentId,title){return this.update(m=>{if(m.tasks.length>=30)throw Error('体験コピーは30件までです');if(!m.tasks.some(t=>t.id===parentId))throw Error('親Taskが見つかりません');m.tasks.push({id:'public-demo-'+this.id(),title,details:'体験コピーで追加したTaskです。',parent:{kind:'task',id:parentId},assignees:[DEMO_ACTOR],workStates:{[DEMO_ACTOR]:'todo'}});});}
 reset(){this.copy=null;this.editable=false;try{this.storage?.removeItem(COPY_KEY);}catch{}return this.snapshot();}
}
