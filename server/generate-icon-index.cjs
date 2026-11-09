// Generated fallback for plain static previews. Source of truth: actual files.
// Run automatically during deployment, no manually curated icon list.
const fs=require('node:fs');
const path=require('node:path');
const {iconFiles}=require('./icon-files.cjs');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'content','custom-icon-index.json');
const files=iconFiles(root);
if(!files) throw new Error('Missing images/icons/custom');
fs.writeFileSync(output,JSON.stringify(files,null,2)+'\n');
console.log(`Icon discovery fallback: ${files.length} files`);
