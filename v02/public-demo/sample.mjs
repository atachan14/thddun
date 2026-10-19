// Intentionally public fiction. Never imports trial fixtures, accounts, API or DB data.
export const DATASET='public-cafe-v1';export const DEMO_ACTOR='public-demo-person';
export function publicSample(){const root={kind:'group',id:'public-demo-cafe'},parent={kind:'task',id:'public-demo-project'};return{
 accounts:[],groups:[{id:root.id,title:'星あかりカフェの開店準備'}],
 tasks:[
  {id:'public-demo-project',title:'小さなカフェを開こう',details:'デザイン、メニュー、開店チェックをまとめる架空のプロジェクトです。',parent:root,assignees:[DEMO_ACTOR],workStates:{[DEMO_ACTOR]:'done'}},
  {id:'public-demo-logo',title:'看板のデザインを決める',details:'星をモチーフにした看板に決まりました。',parent,assignees:[DEMO_ACTOR],workStates:{[DEMO_ACTOR]:'done'}},
  {id:'public-demo-menu',title:'メニューを試作する',details:'このTaskを完了にすると、次の開店チェックとプロジェクトの表示が変わります。',parent,assignees:[DEMO_ACTOR],workStates:{[DEMO_ACTOR]:'todo'}},
  {id:'public-demo-open',title:'開店チェックを終える',details:'メニューの準備ができてから完了するTaskです。前提の完了に合わせて表示が変わります。',parent,assignees:[DEMO_ACTOR],workStates:{[DEMO_ACTOR]:'done'}}
 ],references:[],dependencyEdges:[{id:'public-demo-edge-1',prerequisiteTaskId:'public-demo-logo',taskId:'public-demo-menu'},{id:'public-demo-edge-2',prerequisiteTaskId:'public-demo-menu',taskId:'public-demo-open'}]};}
