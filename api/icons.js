// Live discovery on every request (scoped to public, local icon assets).
// Vercel includes files via vercel.json functions.includeFiles.
const path=require('node:path');
const {iconFiles}=require('../server/icon-files.cjs');
module.exports=(req,res)=>{
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({message:'Method not allowed'});
  const roots=[process.cwd(),path.resolve(__dirname,'..'),__dirname];
  for(const root of roots){
    const icons=iconFiles(root);
    if(icons)return res.status(200).json(icons);
  }
  return res.status(404).json({message:'Custom icons directory unavailable'});
};
