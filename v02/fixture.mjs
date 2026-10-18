// Entirely fictional, isolated in-memory fixture. Never imports a v0.1 ledger.
export function jointFixture(){
 const users=[{id:'buyer',name:'架空発注担当アオ'},{id:'dev',name:'架空開発担当レン'},{id:'maker',name:'架空制作担当ミオ'},{id:'private-dev',name:'非公開試験担当ナギ'}];
 const groups=[{id:'buyer-co',name:'架空発注社オリオン'},{id:'dev-co',name:'架空開発社ノヴァ'},{id:'maker-co',name:'架空制作社ルーメン'},{id:'joint',name:'架空合同展示プロジェクト'}];
 const memberships=[['buyer','buyer-co'],['buyer','joint'],['dev','dev-co'],['dev','joint'],['maker','maker-co'],['maker','joint'],['private-dev','dev-co'],['private-dev','joint']].map(([userId,groupId])=>({userId,groupId}));
 const task=(id,title,owner,readGroups,assignees,deps=[],parentId=null)=>({id,title,ownerGroupId:owner,readGroups,parentId,assignees,prerequisiteIds:deps,workStates:Object.fromEntries(assignees.map(id=>[id,'todo'])),editors:{dev:'1'},policyEntries:{dev:'1',buyer:'10'}});
 const tasks=[task('brief','共同要件を確認','joint',['joint'],['buyer','dev']),task('build','共同システムを構築','dev-co',['joint'],['dev'],['brief']),task('art','展示素材を制作','maker-co',['joint'],['maker'],['brief']),task('release','合同レビュー','joint',['joint'],['buyer','dev','maker'],['build','art']),task('buyer-secret','発注社の非公開予算検討','buyer-co',['buyer-co'],['buyer']),task('dev-secret','開発社の非公開要員計画','dev-co',['dev-co'],['private-dev'],['build']),task('maker-secret','制作社の非公開見積','maker-co',['maker-co'],['maker'])];
 tasks[0].workStates.buyer='done';tasks[0].workStates.dev='doing';tasks[2].workStates.maker='hold';
 return{users,groups,memberships,tasks,references:[{id:'ref-build',containerKind:'group',containerId:'joint',taskId:'build'},{id:'ref-repeat',containerKind:'task',containerId:'release',taskId:'build'},{id:'ref-private',containerKind:'group',containerId:'joint',taskId:'dev-secret'}],placements:[{id:'place-build',referenceId:'ref-build',x:360,y:40}],docs:[{taskId:'brief',repositoryId:'fictional-repository',path:'docs/brief.md'}]};
}
