const {authorize,fail}=require('../server/editor-auth.cjs');
const db=require('../server/live-store.cjs');

const error=(message,status=400)=>Object.assign(new Error(message),{status});
const isSafeRevision=v=>Number.isSafeInteger(v)&&v>=0;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 try{
  const {user,canPublish}=await authorize(req);
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const action=String(body.action||'');
  if(action==='peek'){
   const row=await db.row('revision,updated_at,updated_by,published_revision');
   // No large body travels back to the browser just to check a version.
   return res.status(200).json({ready:Number(row.revision)>0,revision:Number(row.revision),publishedRevision:Number(row.published_revision),updatedBy:row.updated_by});
  }
  if(action==='read'){
   const row=await db.row();
   return res.status(200).json({ready:row.documents!==null,revision:Number(row.revision),documents:row.documents,updatedBy:row.updated_by,publishedRevision:Number(row.published_revision)});
  }
  if(action==='save'){
   if(!isSafeRevision(body.revision))throw error('Invalid revision.');
   if(body.revision===0&&!canPublish)throw error('Only Quaantic or zzinss can initialize the shared editor.',403);
   if(body.revision===0&&!body.initialize)throw error('First, restore your latest downloaded wiki draft and choose Share restored draft.',409);
   // Allow large docs while limiting accidental/malicious requests.
   if(JSON.stringify(body.documents||{}).length>4_000_000)throw error('Shared draft exceeds the 4 MB safety limit.',413);
   const {validateDocuments}=await import('../js/content-schema.js');
   try{validateDocuments(body.documents);}catch{throw error('Invalid wiki documents. Nothing was saved.');}
   const value=await db.save(body.revision,body.documents,user.login,String(body.summary||'Editor changes').slice(0,300));
   if(!value.saved)return res.status(409).json({message:'A collaborator saved a newer revision. Sync and merge your changes.',revision:value.revision});
   return res.status(200).json({saved:true,revision:value.revision});
  }
  if(action==='history')return res.status(200).json({entries:await db.activities()});
  if(action==='versions')return res.status(200).json({versions:await db.versions()});
  if(action==='version'){
   const id=Number(body.id);
   if(!Number.isSafeInteger(id)||id<=0)throw error('Invalid version ID.');
   const result=await db.version(id);
   if(!result)return res.status(404).json({message:'Version not found.'});
   return res.status(200).json({documents:result.documents});
  }
  if(action==='snapshot'){
   const row=await db.row();
   if(!row.documents)throw error('Shared draft has not been initialized.',409);
   const id=await db.snapshot(Number(row.revision),row.documents,user.login,body.versionAction==='publish'?'publish':'save');
   return res.status(200).json({id});
  }
  throw error('Invalid collaboration action.');
 }catch(e){if(e.storage){return res.status(e.status||503).json({message:e.message});}fail(res,e);}
};
