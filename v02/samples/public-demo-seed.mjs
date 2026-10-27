import{randomBytes,randomUUID}from'node:crypto';
import{sampleTransaction,existingRows,assertExistingRows}from'./seed-transaction.mjs';
import{credentialService}from'../local-auth/credential-service.mjs';
import{PolicyRepository}from'../local-auth/policy-repository.mjs';
export const DEMO_MARKER='local-public-demo-v1:complete';
export async function seedPublicDemo(db,{localOnly=false,approvedHosted=false,workspace='fixture'}={}){
 if(!(localOnly||approvedHosted)||!db.waitReady||!db.exec)throw Error('Local PGlite only');
 await db.exec('SET search_path=thdmn_v02_trial,pg_catalog');
 const prior=(await db.query('SELECT response FROM operations WHERE workspace_id=$1 AND operation_id=$2',[workspace,DEMO_MARKER])).rows;
 if(prior.length)return{...prior[0].response,replayed:true};
 const enterprise=(await db.query("SELECT response FROM operations WHERE workspace_id=$1 AND operation_id='orion-portal-v1:complete'",[workspace])).rows[0]?.response;
 if(!enterprise)throw Error('Verified enterprise sample seed is required first');
 if((await db.query("SELECT 1 FROM local_auth_credentials WHERE username=ANY($1::text[])",[['local_demo_manager','local_demo_staff','local_demo_guest']])).rows.length)throw Error('Demo AccountID exists without completion marker');
 const before=await existingRows(db,workspace);
 return sampleTransaction(db,async pool=>{
 const origin='http://127.0.0.1:8773',auth=credentialService({pool,origin,workspaceId:workspace,allowLoopbackHttp:true}),repo=new PolicyRepository(pool),registry=[],contexts={};
 const identity=async principal=>(await db.query('SELECT a.external_subject FROM principals p JOIN accounts a ON a.id=p.account_id WHERE p.id=$1',[principal])).rows[0].external_subject;
 const execute=async(command,context)=>repo.execute(context,{workspaceId:workspace,operationId:'demo-seed:'+randomUUID(),expectedRevision:Number((await db.query('SELECT revision FROM workspace_revisions WHERE workspace_id=$1',[workspace])).rows[0].revision),command});
 async function register(role){const jar=new Map();let csrf;async function call(endpoint,data){const r=await auth.handle(new Request(origin+'/api/v02/auth/'+endpoint,{method:data?'POST':'GET',headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(data?{'Content-Type':'application/json','X-Thdmn-CSRF':csrf}:{})},...(data?{body:JSON.stringify(data)}:{})}),{address:'local-public-demo-seed-'+role});for(const c of r.headers.getSetCookie()){const[k,v]=c.split(';')[0].split('=');jar.set(k,v);}const result=await r.json();csrf=result.csrf||csrf;if(!r.ok)throw Error('Demo bootstrap rejected '+r.status);}
 await call('session');await call('register',{id:'local_demo_'+role,password:randomBytes(32).toString('base64url')});const context=await auth.context(new Request(origin+'/api/v02/self',{headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}})),page=(await repo.own(context,workspace)).page;contexts[role]=context;registry.push({role,loginId:'local_demo_'+role,principalId:context.subjectId,pageId:page.id});return async()=>call('logout',{});}
 const logoutManager=await register('manager'),manager=registry[0],logoutGuest=await register('guest');
 const staffId='local-public-demo-staff-page';await execute({type:'createAccountForm',id:staffId,parent:{kind:'account',id:manager.pageId},name:'SampleStaff',details:'公開共有Staff。個人情報を入力しないでください。',loginId:'local_demo_staff',password:randomBytes(32).toString('base64url'),policyChanges:[],policyRemovals:[],fieldEdit:{definitions:[],entries:[]}},contexts.manager);
 const staffPrincipal=(await db.query('SELECT principal_id FROM local_auth_credentials WHERE username=$1',['local_demo_staff'])).rows[0].principal_id;registry.push({role:'staff',loginId:'local_demo_staff',principalId:staffPrincipal,pageId:staffId});contexts.staff={...contexts.manager,subjectId:staffPrincipal,identitySubjectId:await identity(staffPrincipal),sessionTokenHash:null};
 for(const r of registry)await execute({type:'editAccount',accountId:r.pageId,name:r.role==='manager'?'SampleManager':r.role==='staff'?'SampleStaff':'Guest',details:'誰でも利用する公開共有デモAccount。入力内容は他の利用者にも見えます。',loginId:r.loginId,password:'',policyChanges:[],policyRemovals:[],fieldEdit:{definitions:[],entries:[]}},contexts[r.role]);
 // Only bootstrap into the EXISTING fictional sample; do not borrow any real owner's authority.
 const sampleOwner=(await db.query('SELECT principal_id FROM account_page_owners WHERE workspace_id=$1 AND page_id=$2',[workspace,enterprise.rootAccountId])).rows[0].principal_id,sampleContext={...contexts.manager,subjectId:sampleOwner,identitySubjectId:await identity(sampleOwner),sessionTokenHash:null,publicDemoAccessConfirmed:true};
 for(const [page,role,permission]of[[{kind:'account',id:enterprise.rootAccountId},'manager','view'],[{kind:'task',id:enterprise.taskIds['phase-design']},'manager','manage'],[{kind:'task',id:enterprise.taskIds['design-stream-0']},'staff','view']])await execute({type:'setPagePolicy',page,publicId:'local_demo_'+role,permission},sampleContext);
 const taskIds={};for(const[role,name]of[['manager','公開デモの進め方'],['staff','担当leaf：画面確認'],['guest','共有sandbox：自由に試す']]){const r=registry.find(r=>r.role===role),id='local-public-demo-task-'+role;taskIds[role]=id;await execute({type:'createTaskForm',id,parent:{kind:'account',id:r.pageId},patch:{name,details:'架空データのみ使用してください。共有のため他の利用者の変更も反映されます。'},policyChanges:[],policyRemovals:[],assigneeAdds:[r.loginId],fieldEdit:{definitions:[],entries:[]}},{...contexts[role],publicDemoAccessConfirmed:true});}
 await execute({type:'editTask',taskId:enterprise.taskIds['design-delivery-0-1'],patch:{},policyChanges:[],policyRemovals:[],assigneeAdds:['local_demo_staff']},sampleContext);
 await logoutManager();await logoutGuest();const preserved=await assertExistingRows(db,workspace,before),result={registry,taskIds,sampleRoot:enterprise.rootAccountId,preserved};
 await db.query('INSERT INTO operations(workspace_id,subject_id,operation_id,fingerprint,response) VALUES($1,$2,$3,$4,$5)',[workspace,manager.principalId,DEMO_MARKER,'local-public-demo-v1',result]);return result;
 });
}
