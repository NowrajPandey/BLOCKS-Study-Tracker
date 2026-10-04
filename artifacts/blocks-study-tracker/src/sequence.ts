export function sameName(a:string,b:string):boolean{return a.trim().toLowerCase()===b.trim().toLowerCase()}

export function moveName(names:string[],name:string,toIndex:number):string[]{
 const from=names.findIndex(n=>sameName(n,name));
 if(from<0||!Number.isInteger(toIndex))return names;
 const to=Math.max(0,Math.min(names.length-1,toIndex));
 if(to===from)return names;
 const next=[...names];
 const [item]=next.splice(from,1);
 next.splice(to,0,item);
 return next;
}
