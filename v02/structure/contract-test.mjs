import assert from 'node:assert/strict';
import{validateStructure,projectPage,roots}from'./contract.mjs';
import{createStructureApi}from'./api.mjs';
import{structureSample}from'./sample.mjs';
const original=structureSample(),before=structuredClone(original),context={subjectId:'synthetic-reader'};
const access={canReadPage:()=>true,canReadTask:()=>true};validateStructure(original);
const own=projectPage(original,context,{kind:'account',id:'demo-account'},access);
assert.equal(own.entries.filter(x=>x.kind==='task').length,1);assert.equal(own.entries.filter(x=>x.kind==='reference').length,2);
assert.equal(new Set(own.entries.map(x=>x.entryId)).size,3);assert.equal(own.prerequisites.length,0);
assert.deepEqual(own.entries.filter(x=>x.kind==='reference').map(x=>x.target),[{kind:'task',id:'build'},{kind:'task',id:'build'}]);
const project=projectPage(original,context,{kind:'task',id:'project'},access);assert.deepEqual(project.prerequisites,[{taskId:'build',prerequisiteId:'brief'}]);
const actual=projectPage(original,context,{kind:'task',id:'build'},access);assert.deepEqual(actual.breadcrumbs.map(x=>x.kind+':'+x.id),['group:demo-group','task:project','task:build']);
assert.deepEqual(original,before); // References never reparent/copy/mutate their target.
const renamed=structuredClone(original);renamed.tasks.find(x=>x.id==='build').title='一つの実体の新しい名前';assert(projectPage(renamed,context,{kind:'account',id:'demo-account'},access).entries.filter(x=>x.kind==='reference').every(x=>x.title==='一つの実体の新しい名前'));
const hidden={canReadPage:(_,p)=>p.kind!=='group',canReadTask:(_,id)=>id!=='build'};
const filtered=projectPage(original,context,{kind:'account',id:'demo-account'},hidden);assert(!JSON.stringify(filtered).includes('build'));assert.equal(roots(original,context,hidden).length,1);
const boundary=projectPage(original,context,{kind:'task',id:'brief'},hidden);assert.equal(boundary.breadcrumbBoundary,true);assert(!JSON.stringify(boundary.breadcrumbs).includes('demo-group'));
const cases=[
 m=>{m.tasks[0].prerequisiteIds=['build'];}, // A reference on the same page does not make its target a sibling.
 m=>{m.tasks[2].prerequisiteIds=['project'];}, // Parent/child is not a sibling edge.
 m=>{m.tasks[2].prerequisiteIds=['build'];}, // Dependency cycle.
 m=>{m.tasks[1].parent={kind:'task',id:'build'};}, // Actual parent cycle.
 m=>{m.tasks[0].parent={kind:'task',id:'missing'};},
 m=>{m.tasks[0].parent=null;},
 m=>{m.accounts[0].parent={kind:'group',id:'demo-group'};},
 m=>{m.references[0].taskId='second-shortcut';}, // References cannot target references.
 m=>{m.references[1].id=m.references[0].id;},
 m=>{m.tasks[3].prerequisiteIds=['brief','brief'];}
];for(const change of cases){const m=structuredClone(original);change(m);assert.throws(()=>validateStructure(m));}
const typed=structureSample();typed.accounts[0].id='demo-group';typed.tasks[0].parent.id='demo-group';for(const r of typed.references)if(r.container.kind==='account')r.container.id='demo-group';validateStructure(typed);typed.tasks[0].prerequisiteIds=['project'];assert.throws(()=>validateStructure(typed)); // Same ID, different page kind is not the same parent.
let loads=0;const api=createStructureApi({authenticate:async r=>r.headers.get('authorization')==='Bearer synthetic-only'?context:null,loadModel:async()=>{loads++;return original;},...hidden});
const request=(path,method='GET',auth=true)=>api(new Request('https://structure.invalid/api/v02/structure/'+path,{method,headers:auth?{authorization:'Bearer synthetic-only'}:{}}));
assert.equal((await request('roots','GET',false)).status,401);assert.equal(loads,0);
assert.equal((await request('roots','POST')).status,405);assert.equal(loads,0);
assert.equal((await request('roots?actor=other')).status,400);assert.equal(loads,0);
assert.equal((await createStructureApi()(new Request('https://structure.invalid/'))).status,503);
const privatePage=await request('pages/task/build'),missingPage=await request('pages/task/unknown');assert.equal(privatePage.status,404);assert.equal(missingPage.status,404);assert.equal(await privatePage.text(),await missingPage.text());
assert.equal((await request('pages/group/demo-group')).status,404);
const response=await request('pages/account/demo-account');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert(!JSON.stringify(await response.json()).includes('build'));
console.log('PASS isolated typed Account/Group roots, unique real Task, multiple references without reparent/copy, actual siblings only, both cycles, private target/container/ancestor filtering, read-only fail-closed API. Synthetic only; no production binding or policy adoption.');
