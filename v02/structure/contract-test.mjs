import assert from 'node:assert/strict';
import{validateStructure,projectPage,roots,inspectDependencyProposal}from'./contract.mjs';
import{createStructureApi}from'./api.mjs';import{structureSample}from'./sample.mjs';
const original=structureSample(),before=structuredClone(original),context={subjectId:'synthetic-reader'},account={kind:'account',id:'demo-account'},projectPageId={kind:'task',id:'project'};
const access={canReadPage:()=>true,canReadTask:()=>true,canEditTask:()=>true,canShareDependency:()=>true};validateStructure(original);
const own=projectPage(original,context,account,access);
assert.equal(own.entries.filter(x=>x.kind==='task').length,1);assert.equal(own.entries.filter(x=>x.kind==='reference').length,3);assert.equal(new Set(own.entries.map(x=>x.entryId)).size,4);
assert.deepEqual(own.prerequisites,[{id:'cross-parent-work',fromEntryId:'reference:personal-shortcut',toEntryId:'task:personal'}]); // Different actual parents, sibling placements.
assert.deepEqual(own.entries.filter(x=>x.kind==='reference'&&x.taskId==='build').map(x=>x.target),[{kind:'task',id:'build'},{kind:'task',id:'build'}]);
assert.deepEqual(projectPage(original,context,projectPageId,access).prerequisites,[{id:'project-work',fromEntryId:'task:brief',toEntryId:'task:build'}]);
assert.deepEqual(projectPage(original,context,{kind:'task',id:'build'},access).breadcrumbs.map(x=>x.kind+':'+x.id),['group:demo-group','task:project','task:build']);
assert.deepEqual(original,before);
const renamed=structuredClone(original);renamed.tasks.find(x=>x.id==='build').title='一つの実体の新しい名前';assert(projectPage(renamed,context,account,access).entries.filter(x=>x.kind==='reference'&&x.taskId==='build').every(x=>x.title==='一つの実体の新しい名前'));
const referencePair=structureSample();referencePair.dependencyEdges=[];referencePair.dependencyEdges.push({id:'two-references',container:account,fromEntryId:'reference:brief-shortcut',toEntryId:'reference:second-shortcut'});validateStructure(referencePair);assert.equal(projectPage(referencePair,context,account,access).prerequisites.length,1);
assert.throws(()=>inspectDependencyProposal(original,context,{id:'parallel-placement',container:account,fromEntryId:'reference:second-shortcut',toEntryId:'task:personal'},access),e=>e.status===409);
const hidden={canReadPage:(_,p)=>p.kind!=='group',canReadTask:(_,id)=>id!=='build'};
const filtered=projectPage(original,context,account,hidden);assert(!JSON.stringify(filtered).includes('build'));assert(!JSON.stringify(filtered).includes('cross-parent-work'));assert.equal(roots(original,context,hidden).length,1);
const altered=structureSample();altered.tasks.find(t=>t.id==='build').title='非公開の別名';altered.dependencyEdges=altered.dependencyEdges.filter(x=>x.id!=='cross-parent-work');validateStructure(altered);assert.deepEqual(projectPage(altered,context,account,hidden),filtered); // Hidden edge existence/title does not change visible projection.
assert.equal(projectPage(original,context,{kind:'task',id:'brief'},hidden).breadcrumbBoundary,true);
for(const fromEntryId of ['reference:personal-shortcut','reference:nonexistent'])assert.throws(()=>inspectDependencyProposal(original,context,{id:'not-readable',container:account,fromEntryId,toEntryId:'task:personal'},hidden),e=>e.status===404&&e.message==='Not found');
assert.equal(roots(original,context,{canReadPage:async()=>true}).length,0);
const cases=[
 m=>{m.dependencyEdges[0].grantEditor=true;},
 m=>{m.dependencyEdges.push({id:'same-entity-self',container:account,fromEntryId:'reference:personal-shortcut',toEntryId:'reference:second-shortcut'});},
 m=>{m.references.push({id:'build-in-project',taskId:'build',container:projectPageId});m.dependencyEdges.push({id:'real-ref-self',container:projectPageId,fromEntryId:'task:build',toEntryId:'reference:build-in-project'});},
 m=>{m.dependencyEdges[1].fromEntryId='task:build';}, // Must place a reference first; direct cross-page endpoint is invalid.
 m=>{m.references.push({id:'personal-in-project',taskId:'personal',container:projectPageId});m.dependencyEdges.push({id:'cross-reference-cycle',container:projectPageId,fromEntryId:'reference:personal-in-project',toEntryId:'task:build'});},
 m=>{m.references.push({id:'project-in-project',taskId:'project',container:projectPageId});m.dependencyEdges.push({id:'parent-completion-cycle',container:projectPageId,fromEntryId:'reference:project-in-project',toEntryId:'task:brief'});},
 m=>{m.dependencyEdges.push({...m.dependencyEdges[0],id:'duplicate-pair'});},
 m=>{m.dependencyEdges.push({...m.dependencyEdges[0]});},
 m=>{m.tasks[1].parent={kind:'task',id:'build'};},
 m=>{m.tasks[0].parent={kind:'task',id:'missing'};},
 m=>{m.tasks[0].parent=null;},
 m=>{m.tasks[0].prerequisiteIds=[];}, // No second entity-only source of truth.
 m=>{m.accounts[0].parent={kind:'group',id:'demo-group'};},
 m=>{m.references[0].taskId='second-shortcut';},m=>{m.references[1].id=m.references[0].id;}
];for(const change of cases){const m=structureSample();change(m);assert.throws(()=>validateStructure(m));}
const typed=structureSample();typed.accounts[0].id='demo-group';typed.tasks[0].parent.id='demo-group';for(const r of typed.references)if(r.container.kind==='account')r.container.id='demo-group';for(const e of typed.dependencyEdges)if(e.container.kind==='account')e.container.id='demo-group';validateStructure(typed);typed.dependencyEdges[1].container.kind='group';assert.throws(()=>validateStructure(typed));
let loads=0;const api=createStructureApi({authenticate:async r=>r.headers.get('authorization')==='Bearer synthetic-only'?context:null,loadModel:async()=>{loads++;return original;},...hidden});
const request=(path,method='GET',auth=true)=>api(new Request('https://structure.invalid/api/v02/structure/'+path,{method,headers:auth?{authorization:'Bearer synthetic-only'}:{}}));
assert.equal((await request('roots','GET',false)).status,401);assert.equal(loads,0);assert.equal((await request('roots','POST')).status,405);assert.equal(loads,0);assert.equal((await request('roots?actor=other')).status,400);assert.equal(loads,0);assert.equal((await createStructureApi()(new Request('https://structure.invalid/'))).status,503);
const privatePage=await request('pages/task/build'),missingPage=await request('pages/task/unknown');assert.equal(privatePage.status,404);assert.equal(missingPage.status,404);assert.equal(await privatePage.text(),await missingPage.text());assert.equal((await request('pages/group/demo-group')).status,404);
const response=await request('pages/account/demo-account');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert(!JSON.stringify(await response.json()).includes('build'));
console.log('PASS sibling placements including cross-parent references and reference-to-reference edges; entity self-dependency, cross-reference/parent-completion cycles rejected; hidden edge/title projection equivalence; shared entity duplicate rejection. Synthetic API only.');
