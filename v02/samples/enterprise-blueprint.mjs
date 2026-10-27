import { validatePolicyGraph } from '../local-auth/downward-policy.mjs';

export const SAMPLE_VERSION = 'orion-portal-v1';
export const SAMPLE_ROOT_ID = 'sample_orion';
const A = id => ({ kind: 'account', id });
const T = id => ({ kind: 'task', id });
const date = days => new Date(Date.UTC(2026, 9, 25 + days)).toISOString().slice(0, 10);

export function enterpriseBlueprint() {
  const departments = [
    ['pmo','企画・PMO','目的と対象','要件と計画',['現行業務ヒアリング','利用者ペルソナ','要件カタログ','移行ロードマップ']],
    ['design','デザイン','情報設計','画面設計',['サイトマップ','検索導線','デザインシステム','主要画面プロトタイプ']],
    ['backend','バックエンド','基盤API','業務API',['認証境界の設計','権限API','申請ワークフローAPI','監査ログAPI']],
    ['frontend','フロントエンド','共通UI','業務画面',['共通ナビゲーション','アクセシビリティ基盤','申請画面','検索画面']],
    ['security','セキュリティ','脅威分析','統制確認',['脅威モデリング','データ分類','認可境界レビュー','監査証跡レビュー']],
    ['qa','品質保証','結合検証','受入検証',['部門間シナリオ','権限マトリクス検証','利用者受入テスト','負荷試験']],
    ['training','教育・展開','教材作成','利用定着',['操作ガイド','管理者ハンドブック','部門向け研修','問い合わせFAQ']],
    ['ops','運用・リリース','運用設計','本番切替',['監視と通知','復旧手順演習','段階リリース','リリース後点検']],
  ];
  const accounts = [{ key:'root',loginId:SAMPLE_ROOT_ID,name:'【架空サンプル】オリオン社',parent:null,details:'全社ポータル刷新の演習用データです。実在する企業・人物・資格情報は使用していません。' }];
  for (const [key,name] of departments) accounts.push({key,loginId:'sample_'+key,name:'【架空部門】'+name,parent:A('root'),details:'Group機能ではなく、部門をAccountで表した架空の運用例です。'});
  for (const [key,name,parent] of [['yuki','架空・悠木','design'],['aoi','架空・葵','design'],['ren','架空・蓮','backend'],['sora','架空・空','qa']]) accounts.push({key,loginId:'sample_'+key,name,parent:A(parent),details:'演習用の架空担当者です。個人の実データは含みません。'});
  const tasks = [{key:'project',name:'全社ポータル刷新プロジェクト',parent:A('root'),details:'企画からリリースまでを部門横断で進める架空プロジェクト。前提は受入成果物へ接続し、親子関係と区別しています。',assignees:['pmo'],states:{pmo:'doing'},priority:'P0',due:date(56)}];
  const acceptance = [];
  for (let phase=0;phase<departments.length;phase++) {
    const [key,name,streamA,streamB,deliverables]=departments[phase],phaseKey='phase-'+key;
    const baseState=phase===0?'done':phase<3?'doing':phase===4?'hold':'todo';
    tasks.push({key:phaseKey,name:name+'フェーズ',parent:T('project'),details:'部門横断の前提を確認し、成果物を二つのワークストリームで進めます。',assignees:[key],states:{[key]:baseState},priority:phase===4?'P0':'P1',due:date(phase*6+8)});
    const phaseAcceptance=[];
    for (let stream=0;stream<2;stream++) {
      const streamKey=key+'-stream-'+stream;
      tasks.push({key:streamKey,name:stream?[streamB][0]:streamA,parent:T(phaseKey),details:'二つの成果物と受入チェックをまとめる作業単位です。',assignees:[key],states:{[key]:baseState},priority:'P1',due:date(phase*6+5+stream)});
      for (let item=0;item<2;item++) {
        const taskKey=key+'-delivery-'+stream+'-'+item,person=key==='design'?'yuki':key==='backend'?'ren':key==='frontend'?'aoi':key==='qa'?'sora':key;
        const actors=item===0?[key,person].filter((x,i,a)=>a.indexOf(x)===i):[person];
        const state=phase===0?'done':phase<3?(item===0?'done':'doing'):phase===4&&item===1?'hold':'todo';
        tasks.push({key:taskKey,name:deliverables[stream*2+item],parent:T(streamKey),details:'【架空成果物】受入条件を確認し、担当者全員の完了でTaskを完了とします。',assignees:actors,states:Object.fromEntries(actors.map(a=>[a,state])),priority:item===0?'P1':'P2',due:date(phase*6+3+stream+item),missingDue:key==='qa'&&stream===1&&item===1,missingCompany:key==='training'&&stream===1&&item===1});
      }
      const accept=key+'-accept-'+stream;phaseAcceptance.push(accept);
      tasks.push({key:accept,name:'受入チェック：'+(stream?streamB:streamA),parent:T(key+'-delivery-'+stream+'-1'),details:'【架空チェック】根拠資料と確認結果をそろえる受入作業です。',assignees:phase===7&&stream===1?[]:[key],states:phase===7&&stream===1?{}:{[key]:baseState},priority:'P1',due:date(phase*6+7+stream)});
    }
    acceptance.push(phaseAcceptance);
  }
  for (const [i,name] of ['要件合意','デザイン承認','実装完了判定','受入判定','全社リリース判定'].entries()) tasks.push({key:'milestone-'+i,name,parent:T('project'),details:'【架空マイルストーン】関連部門の受入結果を前提として確認します。',assignees:['pmo',i<2?'design':i<4?'qa':'ops'],states:{pmo:i===0?'done':'todo',[i<2?'design':i<4?'qa':'ops']:i===0?'done':'todo'},priority:'P0',due:date([8,15,29,43,57][i])});
  tasks.push({key:'private-review',name:'【限定演習】脆弱性レビュー',parent:A('security'),details:'架空の機密演習です。共有プロジェクト外に置き、参照や子Accountの外部権限からアクセスが広がらないことを示します。',assignees:['security'],states:{security:'doing'},priority:'P0',due:date(22),private:true});
  tasks.push({key:'private-remediation',name:'【限定演習】是正確認',parent:A('security'),details:'実在する脆弱性やシステム情報は含みません。',assignees:['security','sora'],states:{security:'todo',sora:'todo'},priority:'P0',due:date(26),private:true});
  const dependencies=[];
  for (let phase=0;phase<departments.length;phase++) {
    const key=departments[phase][0];
    for(let stream=0;stream<2;stream++) {
      dependencies.push({taskId:key+'-delivery-'+stream+'-1',prerequisiteTaskId:key+'-delivery-'+stream+'-0'});
      dependencies.push({taskId:key+'-accept-'+stream,prerequisiteTaskId:key+'-delivery-'+stream+'-0'});
    }
    if(phase>0)for(const source of acceptance[phase-1])dependencies.push({taskId:'phase-'+key,prerequisiteTaskId:source});
  }
  for(const[i,phase]of[0,1,3,5,7].entries())for(const source of acceptance[phase])dependencies.push({taskId:'milestone-'+i,prerequisiteTaskId:source});
  dependencies.push({taskId:'private-remediation',prerequisiteTaskId:'private-review'});
  const grants=[{page:T('project'),actor:'pmo',permission:'manage'}];
  for(const[key]of departments) { if(key!=='pmo')grants.push({page:T('project'),actor:key,permission:'view'});grants.push({page:T('phase-'+key),actor:key,permission:key==='design'?'add':key==='training'?'view':'manage'}); }
  for(const actor of ['yuki','aoi','ren','sora'])grants.push({page:T('project'),actor,permission:'view'});
  grants.push({page:T('private-review'),actor:'aoi',permission:'manage'});
  const references=[{key:'qa-backend',taskId:'backend-delivery-1-1',container:T('phase-qa')},{key:'frontend-design',taskId:'design-accept-1',container:T('phase-frontend')},{key:'ops-qa',taskId:'qa-accept-1',container:T('phase-ops')},{key:'project-private',taskId:'private-review',container:T('project')},{key:'design-private',taskId:'private-review',container:A('design')}];
  const nodes=[...accounts.map(a=>({kind:'account',id:a.key,parent:a.parent})),...tasks.map(t=>({kind:'task',id:t.key,parent:t.parent,assignees:t.assignees}))];
  validatePolicyGraph(nodes,dependencies);
  if(accounts.length!==13||tasks.length!==80)throw Error('Enterprise sample size changed');
  for(const r of references)if(!tasks.some(t=>t.key===r.taskId)||!nodes.some(n=>n.kind===r.container.kind&&n.id===r.container.id))throw Error('Orphan reference');
  return{version:SAMPLE_VERSION,accounts,tasks,dependencies,grants,references};
}
