export type Blob=Record<string,unknown>;

const isPlainObject=(value:unknown):value is Blob=>typeof value==='object'&&value!==null&&!Array.isArray(value);

export function same(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(a===undefined||b===undefined)return false;
 return JSON.stringify(a)===JSON.stringify(b);
}

function entityKey(item:Blob):string|undefined{
 if(typeof item.id==='string')return item.id;
 if(typeof item.weekStart==='string')return item.weekStart;
 if(typeof item.date==='string'&&typeof item.subject==='string')return `${item.date}|${item.subject}`;
 return undefined;
}

function isEntityArray(value:unknown[]):value is Blob[]{
 return value.every(isPlainObject)&&value.every(item=>entityKey(item)!==undefined);
}

function mergeObjects(base:unknown,local:Blob,remote:Blob):Blob{
 const out:Blob={...remote};
 const baseObject=isPlainObject(base)?base:{};
 for(const key of new Set([...Object.keys(local),...Object.keys(remote)])){
  out[key]=mergeValue(baseObject[key],local[key],remote[key]);
 }
 return out;
}

function mergeValue(base:unknown,local:unknown,remote:unknown):unknown{
 if(same(local,remote))return local;
 if(local===undefined)return remote;
 if(remote===undefined)return local;
 if(same(local,base))return remote;
 if(same(remote,base))return local;
 if(Array.isArray(local)&&Array.isArray(remote)){
  if(isEntityArray(local)&&isEntityArray(remote))return mergeEntities(base,local,remote);
  return local;
 }
 if(isPlainObject(local)&&isPlainObject(remote))return mergeObjects(base,local,remote);
 return local;
}

/**
 * Union two record sets by identity, then three-way merge each record.
 * Deletions only apply when the other side has not changed that record since
 * `base`; if both sides touched it, the local side wins.
 */
function mergeEntities(base:unknown,local:Blob[],remote:Blob[]):Blob[]{
 const baseList=Array.isArray(base)&&isEntityArray(base)?base:[];
 const index=(list:Blob[])=>{const map=new Map<string,Blob>();list.forEach(item=>map.set(entityKey(item)!,item));return map};
 const baseMap=index(baseList),localMap=index(local),remoteMap=index(remote);
 const order=new Map<string,number>();
 [...baseList,...local,...remote].forEach(item=>{const key=entityKey(item)!;if(!order.has(key))order.set(key,order.size)});
 const kept=new Map<string,Blob>();
 for(const key of new Set([...localMap.keys(),...remoteMap.keys()])){
  const inLocal=localMap.get(key),inRemote=remoteMap.get(key),inBase=baseMap.get(key);
  if(inLocal&&inRemote){kept.set(key,mergeValue(inBase,inLocal,inRemote) as Blob);continue}
  if(inLocal&&!inRemote){if(!inBase||!same(inLocal,inBase))kept.set(key,inLocal);continue}
  if(!inLocal&&inRemote&&!inBase)kept.set(key,inRemote);
 }
 return [...kept.entries()].sort((a,b)=>(order.get(a[0])??0)-(order.get(b[0])??0)).map(([,item])=>item);
}

/**
 * Three-way merge. `base` is the last state both devices agreed on.
 * - one side unchanged → take the other
 * - both changed a record set → union by id, per-record three-way merge
 * - same field changed on both → keep the local edit (the device you are
 *   looking at); the losing version stays in the server's history, so it is
 *   recoverable rather than gone.
 */
export function mergeStates(base:Blob|null,local:Blob,remote:Blob):Blob{
 const out:Blob={...remote};
 const keys=new Set([...Object.keys(base??{}),...Object.keys(local),...Object.keys(remote)]);
 for(const key of keys){
  out[key]=mergeValue(base?base[key]:undefined,local[key],remote[key]);
 }
 return out;
}
