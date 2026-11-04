const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const find=(nodes,id)=>{for(const node of nodes||[]){if(node.id===id)return node;const found=find(node.children,id);if(found)return found;}};
async function main(){
  const {installImportedNotes}=await import('../js/content-migrations.js');
  const {IMPORTED_NOTES}=await import('../js/data/imported-notes.js');
  const {validateDocuments}=await import('../js/content-schema.js');
  const names=['wiki','game','updates'];
  const files=['wiki-data','game-data','update-log'];
  const docs=Object.fromEntries(await Promise.all(names.map(async(name,i)=>{
    const response=await fetch(`https://regrowthinc.vercel.app/content/${files[i]}.json`,{cache:'no-store'});
    if(!response.ok)throw new Error(`Live ${name}: HTTP ${response.status}`);
    return [name,await response.json()];
  })));
  const summary=()=>IMPORTED_NOTES.pages.map(({route})=>{
    const [cat,id]=route.split('/');const page=find(docs.wiki.categories.find(c=>c.id===cat)?.subcategories,id);
    return {route,sections:page?.sections?.length||0,children:(page?.children||[]).map(p=>p.id),bonusGroups:docs.game.calculators.pages[route]?.groups?.length||0,milestones:docs.game.progression.stages[route]?.stages?.length||0};
  });
  const before=summary();
  const updatesBefore=JSON.stringify(docs.updates);
  installImportedNotes(docs.wiki,docs.game);
  if(JSON.stringify(docs.updates)!==updatesBefore)throw new Error('Update log changed');
  validateDocuments(docs);
  const after=summary();
  for(const page of after)if(!page.sections)throw new Error(`Still empty: ${page.route}`);
  for(const route of ['life/frost-conversion','money-island/energies'])if(after.find(p=>p.route===route).children.length)throw new Error(`Child tabs still present: ${route}`);
  const audit={checkedAt:new Date().toISOString(),source:'https://regrowthinc.vercel.app',note:'Read-only audit: before is live; after is the repaired in-memory result. This does not deploy.',before,after,updateLogUntouched:true};
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(root,'artifacts/content-import-audit.json'),JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify(audit,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
