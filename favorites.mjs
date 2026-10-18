export function migrateFavorites(data){
 const next=structuredClone(data);let changed=false;
 for(const user of Object.values(next.users)){
  if(!user||!Array.isArray(user.favorites))continue;const original=user.favorites,seen=new Set(),refs=[];
  for(const entry of original){const id=typeof entry==='string'?entry:entry?.taskId||entry?.selection||entry?.root;if(typeof id==='string'&&id&&!seen.has(id)){seen.add(id);refs.push({taskId:id});}}
  if(JSON.stringify(original)!==JSON.stringify(refs)){user.favoriteArchive=[...(Array.isArray(user.favoriteArchive)?user.favoriteArchive:[]),{favorites:structuredClone(original)}];user.favorites=refs;changed=true;}
 }
 return{data:changed?next:data,changed};
}
export function currentUser(data,requested){return Object.hasOwn(data.users,requested)&&Array.isArray(data.users[requested]?.favorites)?requested:'sample';}
