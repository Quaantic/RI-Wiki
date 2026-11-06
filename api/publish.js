const {authorize,github,PREFIX,fail}=require('../server/editor-auth.cjs');
const FILES={wiki:'content/wiki-data.json',updates:'content/update-log.json',game:'content/game-data.json'};
const DRAFT='content/drafts/inline-draft.json';
const live=require('../server/live-store.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  const {token,user}=await authorize(req,true);
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const {validateDocuments}=await import('../js/content-schema.js');
  const latest=await live.row();
  if(!latest.documents)throw Object.assign(Error('Shared editor has not been initialized.'),{status:409});
  if(!Number.isSafeInteger(body.revision)||Number(latest.revision)!==body.revision)throw Object.assign(Error('Another contributor saved changes. Sync before publishing.'),{status:409});
  const docs=latest.documents;
  try{validateDocuments(docs);}catch{throw Object.assign(Error('Invalid wiki content.'),{status:400});}
  const head=await github(token,`${PREFIX}/git/ref/heads/main`);
  const commit=await github(token,`${PREFIX}/git/commits/${head.object.sha}`);
  const tree=await github(token,`${PREFIX}/git/trees/${commit.tree.sha}?recursive=1`);
  if(tree.truncated) throw Error('Repository tree is too large.');
  const entries=new Map(tree.tree.map(item=>[item.path,item]));
  if(Object.entries(FILES).some(([name,path])=>entries.get(path)?.sha!==body.shas?.[name])) throw Object.assign(Error('The shared version changed. Your draft is preserved; retry Publish.'),{status:409});
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
  // Keep the old GitHub draft as a read-only emergency recovery copy. Do not delete it automatically.
  if(!updates.length) {await live.published(body.revision);return res.status(200).json({shas:body.shas,changed:false,deployStatus:'unchanged'});}
  const nextTree=await github(token,`${PREFIX}/git/trees`,'POST',{base_tree:commit.tree.sha,tree:updates});
  const nextCommit=await github(token,`${PREFIX}/git/commits`,'POST',{message:'Publish RI Wiki content',tree:nextTree.sha,parents:[head.object.sha]});
  // Non-fast-forward rejection is the compare-and-swap guard against races.
  await github(token,`${PREFIX}/git/refs/heads/main`,'PATCH',{sha:nextCommit.sha,force:false});
  const shas=Object.fromEntries(Object.entries(FILES).map(([name,path])=>[name,nextTree.tree.find(item=>item.path===path)?.sha || entries.get(path).sha]));
  let ackWarning=false;
  try {await live.published(body.revision);} catch(e){ackWarning=true;console.warn('[ri-publish] Published to GitHub, status ack failed',e);}
  return res.status(200).json({shas,changed:!!changed.length,commit:nextCommit.sha,ackWarning,deployStatus:'pending'});
 }catch(error){fail(res,error);}
};
