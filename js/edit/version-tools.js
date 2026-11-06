// Pure helpers for version/publish preview. Never writes to storage.
const label = (value) => String(value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value)).replace(/\s+/g,' ').slice(0,170);
export function documentChanges(before, after, max = 35) {
  const out=[]
  const walk=(oldValue,newValue,path,depth)=>{
    if(out.length>=max)return;
    if(JSON.stringify(oldValue)===JSON.stringify(newValue))return;
    if(oldValue===null||newValue===null||typeof oldValue!=='object'||typeof newValue!=='object'||depth>8||!oldValue||!newValue){out.push({path,before:label(oldValue),after:label(newValue)});return;}
    if(Array.isArray(oldValue)||Array.isArray(newValue)){
      if(!Array.isArray(oldValue)||!Array.isArray(newValue)){out.push({path,before:label(oldValue),after:label(newValue)});return;}
      const identity=(row)=>row&&typeof row==='object'?(row.id??row.n??row.version??null):null;
      const keyed=[...oldValue,...newValue].every(row=>identity(row)!=null)&&new Set(oldValue.map(identity)).size===oldValue.length&&new Set(newValue.map(identity)).size===newValue.length;
      if(keyed){
        const left=new Map(oldValue.map(row=>[String(identity(row)),row])),right=new Map(newValue.map(row=>[String(identity(row)),row]));
        for(const key of new Set([...left.keys(),...right.keys()]))walk(left.get(key),right.get(key),`${path}.${key}`,depth+1);
      }else{
        if(oldValue.length!==newValue.length)out.push({path:`${path}.count`,before:String(oldValue.length),after:String(newValue.length)});
        for(let i=0;i<Math.max(oldValue.length,newValue.length)&&out.length<max;i++)walk(oldValue[i],newValue[i],`${path}[${i}]`,depth+1);
      }
      return;
    }
    for(const key of new Set([...Object.keys(oldValue),...Object.keys(newValue)]))walk(oldValue[key],newValue[key],path?`${path}.${key}`:key,depth+1);
  };
  for(const section of ['wiki','game','updates'])walk(before?.[section],after?.[section],section,0);
  return out;
}
export function pageFromDocs(docs, catId, subId='') {
  const cat=docs?.wiki?.categories?.find(cat=>cat.id===catId);
  if(!cat)return null;
  if(!subId)return cat;
  const visit=(items)=>{for(const item of items||[]){if(item.id===subId)return item;const found=visit(item.children);if(found)return found;}return null;};
  return visit(cat.subcategories);
}
