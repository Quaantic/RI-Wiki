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
   || /^content\/backups\/(?:invalid-inline-draft-[a-zA-Z0-9TZ_-]+|backup-[a-zA-Z0-9_.-]+|(?:save|publish)\.[a-zA-Z0-9_-]+\.(?:\d{8}T\d{6}\d{3}Z|\d{4}-\d{2}-\d{2}-\d{2}:\d{2}(?:-\d+)?))\.json$/.test(content||'')
   || method==='PUT' && /^images\/credits\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|gif)$/.test(content||'') && !body?.sha;
  if(!allowed || !['PUT','DELETE'].includes(method) || body?.branch!=='main') throw Object.assign(Error('Permission denied. Publishing requires the protected Publish endpoint.'),{status:403});
  if(method==='PUT' && content==='content/drafts/inline-draft.json') {
    // All editors use the same GitHub SHA compare-and-swap. The browser
    // performs a three-way merge. No global cooldown: autosave must accept
    // independent edits from different collaborators promptly.
    try {
      const decoded=JSON.parse(Buffer.from(body?.content || '', 'base64').toString('utf8'));
      const {validateDocuments}=await import('../js/content-schema.js');
      validateDocuments(decoded);
    } catch {
      throw Object.assign(Error('Invalid shared draft data. Nothing was written; your local edits are preserved.'),{status:400});
    }
    if (typeof body?.sha !== 'string' || !/^[a-f0-9]{40}$/i.test(body.sha)) {
      // For a new file the client may omit sha; make sure no draft exists
      // before accepting an initial write.
      const existing=await github(token,`${PREFIX}/contents/content/drafts/inline-draft.json?ref=main`).catch(e=>{if(e.status===404)return null;throw e;});
      if(existing) throw Object.assign(Error('Shared draft exists; Sync before saving. No data was overwritten.'),{status:409});
    }
  }
  const safe={branch:'main',message:'RI Wiki: save editor data',...(body.sha?{sha:body.sha}:{}),...(method==='PUT'?{content:body.content}:{})};
  return res.status(200).json(await github(token,path,method,safe));
 } catch(error){fail(res,error);}
};
