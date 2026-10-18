import assert from 'node:assert/strict';
import{seed,validate,ready,Repository}from './model.mjs';
const d=seed(),c=d.tasks.find(t=>t.id==='c'),a=d.tasks.find(t=>t.id==='a'),b=d.tasks.find(t=>t.id==='b');
assert.equal(ready(c,d),false);a.state='done';assert.equal(ready(c,d),false);b.state='done';assert.equal(ready(c,d),true);a.state='todo';assert.equal(ready(c,d),false);
a.deps=['c'];assert.throws(()=>validate(d),/循環/);a.deps=[];d.tasks[0].parent='c';assert.throws(()=>validate(d),/循環/);d.tasks[0].parent=null;
let raw;const repo=new Repository({getItem:()=>raw,setItem:(k,v)=>raw=v});repo.save(d);assert.deepEqual(repo.load(),d);const before=JSON.stringify(d);const draft=structuredClone(d);draft.tasks[0].name='取消';assert.equal(JSON.stringify(repo.load()),before);for(let i=0;i<20;i++){a.state=i%2?'todo':'done';repo.save(d);assert.equal(repo.load().tasks.find(t=>t.id==='a').state,a.state);}console.log('PASS: multiple prerequisites, reopen, both cycle types, persistence, cancel isolation, repeated saves');
