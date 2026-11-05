// Local-only recovery. No tokens are written here and no network requests run.
const memoryCopies=new Map(),durableCopies=new Map();
export function readRecovery(key) {
  const copies=memoryCopies.has(key)?[memoryCopies.get(key)]:[];
  for(const name of ['localStorage','sessionStorage'])try{const value=JSON.parse(globalThis[name].getItem(key)||'null');if(value&&typeof value==='object'&&!Array.isArray(value))copies.push(value);}catch{}
  return copies.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0]||null;
}
export function writeRecovery(key,value) {
  let saved=false;
  const previous=Number(readRecovery(key)?.savedAt)||0;
  const raw=JSON.stringify({...value,savedAt:Math.max(Date.now(),previous+1)});
  memoryCopies.set(key,JSON.parse(raw));
  for(const name of ['localStorage','sessionStorage'])try{globalThis[name].setItem(key,raw);saved=true;}catch{}
  durableCopies.set(key,saved);
  return saved;
}
export function clearRecovery(key) {
  memoryCopies.delete(key);durableCopies.delete(key);
  for(const name of ['localStorage','sessionStorage'])try{globalThis[name].removeItem(key);}catch{}
}
export function isRecoveryStored(key){return durableCopies.get(key)!==false;}

const formId=form=>JSON.stringify([form.hash,form.binding?.docName,form.targetId||form.binding?.valuePath,Boolean(form.binding?.manage)]);
export function storeFormRecovery(key,form){
  const saved=readRecovery(key);
  const forms=saved?[...(saved.pending||[]),saved]:[];
  const pending=forms.filter(item=>formId(item)!==formId(form)).map(({pending,...item})=>item);
  return writeRecovery(key,{...form,pending});
}
export function removeFormRecovery(key,form){
  const saved=readRecovery(key);
  const forms=saved?[...(saved.pending||[]),saved]:[];
  const remaining=forms.filter(item=>formId(item)!==formId(form)).map(({pending,...item})=>item);
  if(!remaining.length){clearRecovery(key);return;}
  const latest=remaining.pop();
  writeRecovery(key,{...latest,pending:remaining});
}
