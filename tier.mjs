function error(message,status=400){const e=Error(message);e.status=status;throw e;}
export function canonicalTier(value){
 if(typeof value!=='string'||value.length>51||!/^(-?)(0|[1-9]\d{0,29})(?:\.(\d{1,18}))?$/.test(value))error('Tierは整数30桁・小数18桁以内の有限小数文字列です（指数・丸めなし）');
 const negative=value.startsWith('-'),unsigned=negative?value.slice(1):value,[integer,fraction='']=unsigned.split('.'),tail=fraction.replace(/0+$/,'');return(integer==='0'&&!tail?'':negative?'-':'')+integer+(tail?'.'+tail:'');
}
export function compareTier(a,b){const scaled=value=>{const s=canonicalTier(value),negative=s.startsWith('-'),parts=(negative?s.slice(1):s).split('.');return BigInt(parts[0]+(parts[1]||'').padEnd(18,'0'))*(negative?-1n:1n);};const x=scaled(a),y=scaled(b);return x<y?-1:x>y?1:0;}
export function below(actor,target){return actor!==null&&actor!==undefined&&compareTier(actor,target)<0;}
export function checkItemChange(actor,before,after){if(actor===undefined||actor===null)error('修正権限がありません',403);if(before!==undefined&&!below(actor,before)||after!==undefined&&!below(actor,after))error('操作前の修正Tierより厳密に下位のItemだけ変更できます',403);}
export function validateTiers(d,fields){
 if(!d.tierProtection)return;if(d.tierProtection.version!==1)error('Tier形式が不正です');if(d.forcedGrants.length)error('強制由来とTierの混合解決は未確定です');
 const users=new Set(d.principals.map(p=>p.id));
 for(const t of d.tasks){if(!Array.isArray(t.participants)||new Set(t.participants.map(p=>p.userId)).size!==t.participants.length)error('参加者Itemが不正です');for(const p of t.participants)if(!users.has(p.userId)||canonicalTier(p.tier)!==p.tier)error('参加者Tierが不正です');
  if(t.policy.mode==='custom')for(const field of fields){const map=t.policy.tiers?.[field];if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).length!==t.policy.values[field].length||t.policy.values[field].some(id=>!Object.hasOwn(map,id)||canonicalTier(map[id])!==map[id]))error('各Policy ItemのTierが必要です');}
 }
}
export function guardTierChanges(before,after,fields,effective,actorId){
 if(!before.tierProtection)return;
 for(const old of before.tasks){const next=after.tasks.find(t=>t.id===old.id);if(!next)error('Task削除は未実装です');const a=effective(before,old.id),b=effective(after,old.id),actorTier=a.itemTiers.editors[actorId];
  for(const field of fields){const oldMap=a.itemTiers[field],newMap=b.itemTiers[field];for(const id of new Set([...Object.keys(oldMap),...Object.keys(newMap)]))if(oldMap[id]!==newMap[id])checkItemChange(actorTier,oldMap[id],newMap[id]);}
  const oldMap=Object.fromEntries(old.participants.map(p=>[p.userId,p.tier])),newMap=Object.fromEntries(next.participants.map(p=>[p.userId,p.tier]));for(const id of new Set([...Object.keys(oldMap),...Object.keys(newMap)]))if(oldMap[id]!==newMap[id])checkItemChange(actorTier,oldMap[id],newMap[id]);
 }
}
export function buildTierPlan(current,actorId,fields,effective,{actorTier='1',defaultTier='10'}={}){
 actorTier=canonicalTier(actorTier);defaultTier=canonicalTier(defaultTier);if(current.tierProtection)error('Tier移行済みです',409);
 const blocked=[];if(current.forcedGrants.length)blocked.push('旧強制設定の由来解決は未確定のため、この台帳にはTierを適用しません');
 if(current.tasks.some(t=>!effective(current,t.id).editors.includes(actorId)))blocked.push('全Taskの既存修正権限が必要です');
 const data=structuredClone(current);let count=0;for(const t of data.tasks){t.participants=data.principals.map(p=>({userId:p.id,tier:defaultTier}));if(t.policy.mode==='custom'){t.policy.tiers=Object.fromEntries(fields.map(field=>[field,Object.fromEntries(t.policy.values[field].map(id=>{count++;return[id,field==='editors'&&id===actorId?actorTier:defaultTier];}))]));}}
 data.tierProtection={version:1,actorTier,defaultTier};data.tierMigrationOriginal=structuredClone(current);
 return{data,actorTier,defaultTier,taskCount:data.tasks.length,itemCount:count,forcedSourceCount:current.forcedGrants.length,blocked,notes:['通常継承を維持。Task内容Tier・閲覧秘匿・複数由来のTier解決は未実装。','参加者Tierは追加時の初期値だけで、各Policyの既存Tierへ伝播しません。']};
}
