const {execFileSync}=require('node:child_process');
function shouldSkip(files){
 return files.length>0 && files.every(path=>path==='content/drafts/inline-draft.json' || path==='content/edit-history.json' || /^content\/backups\/backup-[^/]+\.json$/.test(path) || /^images\/credits\/[^/]+\.(png|jpg|jpeg|webp|gif)$/.test(path));
}
if(require.main===module){
 try{
  const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  const skip=shouldSkip(files);
  console.log(skip?'Only shared editor data changed; skipping deployment.':'Site or published content changed; build normally.');
  process.exit(skip?0:1);
 }catch{process.exit(1);}
}
module.exports={shouldSkip};
