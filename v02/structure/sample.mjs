// Small synthetic contract example, not the live connection data or README dataset.
export function structureSample(){return{
 accounts:[{id:'demo-account',title:'合成Account'}],groups:[{id:'demo-group',title:'合成Group'}],
 tasks:[
  {id:'personal',title:'個人の実体Task',parent:{kind:'account',id:'demo-account'},prerequisiteIds:[]},
  {id:'project',title:'共同プロジェクト',parent:{kind:'group',id:'demo-group'},prerequisiteIds:[]},
  {id:'brief',title:'要件を確認',parent:{kind:'task',id:'project'},prerequisiteIds:[]},
  {id:'build',title:'実装する',parent:{kind:'task',id:'project'},prerequisiteIds:['brief']}
 ],references:[
  {id:'personal-shortcut',taskId:'build',container:{kind:'account',id:'demo-account'}},
  {id:'second-shortcut',taskId:'build',container:{kind:'account',id:'demo-account'}},
  {id:'group-shortcut',taskId:'personal',container:{kind:'group',id:'demo-group'}}
 ]};}
