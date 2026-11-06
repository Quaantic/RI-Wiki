const {authorize,github,PREFIX,fail}=require('../server/editor-auth.cjs');
const FILES={wiki:'content/wiki-data.json',updates:'content/update-log.json',game:'content/game-data.json'};
const DRAFT='content/drafts/inline-draft.json';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  const {token,user}=await authorize(req,true);
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const {validateDocuments}=await import('../js/content-schema.js');
  const docs={wiki:body.docs?.wiki,game:body.docs?.game,updates:body.docs?.updates};
  try{validateDocuments(docs);}catch{throw Object.assign(Error('Invalid wiki content.'),{status:400});}
  const head=await github(token,`${PREFIX}/git/ref/heads/main`);
  const commit=await github(token,`${PREFIX}/git/commits/${head.object.sha}`);
  const tree=await github(token,`${PREFIX}/git/trees/${commit.tree.sha}?recursive=1`);
  if(tree.truncated) throw Error('Repository tree is too large.');
  const entries=new Map(tree.tree.map(item=>[item.path,item]));
  if(Object.entries(FILES).some(([name,path])=>entries.get(path)?.sha!==body.shas?.[name]) || (entries.get(DRAFT)?.sha||null)!==(body.draftSha||null)) throw Object.assign(Error('The shared version changed. Your draft is preserved; retry Publish.'),{status:409});
  const before=Object.fromEntries(await Promise.all(Object.entries(FILES).map(async([name,path])=>{
   const blob=await github(token,`${PREFIX}/git/blobs/${entries.get(path).sha}`);
   return [name,JSON.parse(Buffer.from(blob.content,'base64').toString())];
  })));
  const changed=Object.keys(FILES).filter(name=>JSON.stringify(docs[name])!==JSON.stringify(before[name]));
  const updates=changed.map(name=>({path:FILES[name],mode:'100644',type:'blob',content:JSON.stringify(docs[name],null,2)+'\n'}));
  if(changed.length) {
   const actor=String(user.login || 'unknown').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60);
   const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
   const part=(type)=>parts.find(p=>p.type===type)?.value||'00';
   const stamp=`${part('year')}-${part('month')}-${part('day')}-${part('hour')}:${part('minute')}`;
   let name=`publish.${actor}.${stamp}.json`;
   for(let n=2;entries.has(`content/backups/${name}`);n++) name=`publish.${actor}.${stamp}-${n}.json`;
   updates.push({path:`content/backups/${name}`,mode:'100644',type:'blob',content:JSON.stringify({format:1,createdAt:new Date().toISOString(),documents:before},null,2)+'\n'});
  }
  if(entries.has(DRAFT)) updates.push({path:DRAFT,mode:'100644',type:'blob',sha:null});
  if(!updates.length) return res.status(200).json({shas:body.shas,changed:false});
  const nextTree=await github(token,`${PREFIX}/git/trees`,'POST',{base_tree:commit.tree.sha,tree:updates});
  const nextCommit=await github(token,`${PREFIX}/git/commits`,'POST',{message:'Publish RI Wiki content',tree:nextTree.sha,parents:[head.object.sha]});
  // Non-fast-forward rejection is the compare-and-swap guard against races.
  await github(token,`${PREFIX}/git/refs/heads/main`,'PATCH',{sha:nextCommit.sha,force:false});
  const shas=Object.fromEntries(Object.entries(FILES).map(([name,path])=>[name,nextTree.tree.find(item=>item.path===path)?.sha || entries.get(path).sha]));
  return res.status(200).json({shas,changed:!!changed.length,commit:nextCommit.sha});
 }catch(error){fail(res,error);}
};
