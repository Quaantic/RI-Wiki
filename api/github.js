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
  const safe={branch:'main',message:'RI Wiki: save editor data',...(body.sha?{sha:body.sha}:{}),...(method==='PUT'?{content:body.content}:{})};
  return res.status(200).json(await github(token,path,method,safe));
 } catch(error){fail(res,error);}
};
