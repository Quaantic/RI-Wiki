// Folder is the source of truth; no manually maintained icon catalog.
const fs=require('node:fs');
const path=require('node:path');
const EXT=/\.(?:svg|png|webp)$/i;
function iconFiles(root=path.resolve(__dirname,'..')){
  const dir=path.join(root,'images','icons','custom');
  if(!fs.existsSync(dir))return null;
  const out=[];
  function walk(folder){
    for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
      const absolute=path.join(folder,entry.name);
      if(entry.isDirectory() && !entry.isSymbolicLink())walk(absolute);
      else if(entry.isFile() && EXT.test(entry.name))
        out.push(path.relative(root,absolute).split(path.sep).join('/'));
    }
  }
  walk(dir);
  return out.sort();
}
module.exports={iconFiles};
