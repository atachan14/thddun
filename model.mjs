export const actors=[{id:'human',name:'サンプルUser',kind:'human'},{id:'ai',name:'AIアシスタント',kind:'ai'},{id:'team',name:'制作チーム',kind:'team'}];
export const seed=()=>({version:1,tasks:[
{id:'root',name:'制作',parent:null,state:'todo',deps:[],eligible:['human','ai','team'],assignee:'team'},
{id:'projectA',name:'プロジェクトA（サンプル）',parent:'root',state:'todo',deps:[],eligible:['human','ai'],assignee:'human'},
{id:'milestone',name:'成果物完成（例）',parent:'projectA',state:'todo',deps:[],eligible:['human','ai'],assignee:'ai'},
{id:'help',name:'HELP改善（例）',parent:'projectA',state:'waiting',deps:[],eligible:['human','ai'],assignee:'human'},
{id:'projectB',name:'プロジェクトB（サンプル）',parent:'root',state:'todo',deps:[],eligible:['human','ai'],assignee:'ai'},
{id:'a',name:'架空 A：素材準備',parent:'projectB',state:'todo',deps:[],eligible:['human','ai'],assignee:'human'},
{id:'b',name:'架空 B：仕様確認',parent:'projectA',state:'todo',deps:[],eligible:['human','ai'],assignee:'ai'},
{id:'c',name:'架空 C：組み立て',parent:'projectB',state:'todo',deps:['a','b'],eligible:['human','ai','team'],assignee:'team'}],users:{sample:{favorites:[]}}});
export function validate(d){if(d.version!==1||!Array.isArray(d.tasks)||!d.users?.sample||!Array.isArray(d.users.sample.favorites))throw Error('保存形式が不正です');const ids=new Set(d.tasks.map(t=>t.id));if(ids.size!==d.tasks.length||!ids.size)throw Error('IDが重複または空です');for(const t of d.tasks){if(typeof t.id!=='string'||!t.id||typeof t.name!=='string'||!t.name.trim()||!['todo','doing','hold','waiting','done'].includes(t.state)||!Array.isArray(t.deps)||!Array.isArray(t.eligible)||t.eligible.some(a=>!actors.some(x=>x.id===a))||!t.eligible.includes(t.assignee)||t.parent!==null&&!ids.has(t.parent)||t.deps.some(id=>!ids.has(id))||new Set(t.deps).size!==t.deps.length)throw Error('Taskの入力を確認してください');}for(const relation of ['parent','deps']){const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))throw Error(relation==='parent'?'親子が循環しています':'前提が循環しています');if(done.has(id))return;visiting.add(id);const t=d.tasks.find(x=>x.id===id);for(const next of relation==='parent'?(t.parent?[t.parent]:[]):t.deps)visit(next);visiting.delete(id);done.add(id);}for(const id of ids)visit(id);}return d;}
export const pending=(t,d)=>t.deps.filter(id=>d.tasks.find(x=>x.id===id)?.state!=='done');
export const ready=(t,d)=>['todo','doing'].includes(t.state)&&pending(t,d).length===0;
export class Repository{constructor(storage,key='taskboard.v1',makeSeed=seed){this.storage=storage;this.key=key;this.makeSeed=makeSeed;}load(){const raw=this.storage.getItem(this.key);return raw?validate(JSON.parse(raw)):validate(this.makeSeed());}save(d){validate(d);this.storage.setItem(this.key,JSON.stringify(d));} }
