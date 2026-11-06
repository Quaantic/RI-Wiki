const {PREFIX,authorize,github,fail} = require('../server/editor-auth.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try {
  const {token,user,canPublish}=await authorize(req);
  const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const url=new URL(input.url);
  if(url.origin!=='https://api.github.com' || url.username || url.password || url.hash) throw Object.assign(Error('Permission denied.'),{status:403});
  const path=url.pathname, method=input.method || 'GET';
  if(method==='GET' && path==='/user') return res.status(200).json({...user,canPublish});
  if(method==='GET' && path===`${PREFIX}/collaborators/${encodeURIComponent(user.login)}/permission`) return res.status(200).json({permission:'write'});
  const content=path.startsWith(`${PREFIX}/contents/`) ? decodeURIComponent(path.slice(`${PREFIX}/contents/`.length)) : null;
  if(content && (content.includes('..') || content.includes('\\') || content.startsWith('/'))) throw Object.assign(Error('Permission denied.'),{status:403});
  if(method==='GET') {
   const allowed=content && /^(content\/|images\/credits\/)/.test(content)
     || new RegExp(`^${PREFIX}/git/blobs/[a-fA-F0-9]{40}$`).test(path)
     || path===`${PREFIX}/commits`;
   if(!allowed || [...url.searchParams.keys()].some(key=>!['ref','path','sha','per_page'].includes(key))) throw Object.assign(Error('Permission denied.'),{status:403});
   return res.status(200).json(await github(token,path+url.search));
  }
  const body=typeof input.body==='string'?JSON.parse(input.body):input.body;
  const allowed=content==='content/drafts/inline-draft.json' || content==='content/edit-history.json'
   || /^content\/backups\/(?:backup-[a-zA-Z0-9_.-]+|(?:save|publish)\.[a-zA-Z0-9_-]+\.(?:\d{8}T\d{6}\d{3}Z|\d{4}-\d{2}-\d{2}-\d{2}:\d{2}(?:-\d+)?))\.json$/.test(content||'')
   || method==='PUT' && /^images\/credits\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|gif)$/.test(content||'') && !body?.sha;
  if(!allowed || !['PUT','DELETE'].includes(method) || body?.branch!=='main') throw Object.assign(Error('Permission denied. Publishing requires the protected Publish endpoint.'),{status:403});
  if(method==='PUT' && content==='content/drafts/inline-draft.json') {
    // All contributors share ONE cooldown. Protect the write on the server,
    // not only in the editor UI where a second browser could skip the check.
    let decoded;
    try {
      decoded=JSON.parse(Buffer.from(body?.content || '', 'base64').toString('utf8'));
      const {validateDocuments}=await import('../js/content-schema.js');
      validateDocuments(decoded);
    } catch {
      throw Object.assign(Error('Invalid shared draft data. Save cancelled to protect the wiki.'),{status:400});
    }
    const recent=await github(token,`${PREFIX}/commits?path=${encodeURIComponent(content)}&per_page=15`);
    const saves=recent.filter(item=>/^(RI Wiki: save editor data|Save inline draft)$/i.test(item?.commit?.message?.split('\n')[0]?.trim()||''));
    const last=Math.max(0,...saves.map(item=>Date.parse(item?.commit?.committer?.date||item?.commit?.author?.date||'')).filter(Number.isFinite));
    const remaining=60_000-(Date.now()-last);
    if(remaining>0) {
      res.setHeader('Retry-After',String(Math.ceil(remaining/1000)));
      throw Object.assign(Error(`Save for Everyone is on a global 1-minute cooldown. Try again in ${Math.ceil(remaining/1000)} seconds. No edits were overwritten.`),{status:429});
    }
  }
  const safe={branch:'main',message:'RI Wiki: save editor data',...(body.sha?{sha:body.sha}:{}),...(method==='PUT'?{content:body.content}:{})};
  return res.status(200).json(await github(token,path,method,safe));
 } catch(error){fail(res,error);}
};
