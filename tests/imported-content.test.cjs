const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=JSON.parse(fs.readFileSync('content/game-data.json'));
const wiki=JSON.parse(fs.readFileSync('content/wiki-data.json'));

test('old deployed JSON receives all seven pages once, without changing later editor changes',async()=>{
  const {installImportedNotes}=await import('../js/content-migrations.js');
  const {IMPORTED_NOTES}=await import('../js/data/imported-notes.js');
  const legacyWiki=structuredClone(wiki),legacyGame=structuredClone(game);
  const find=(nodes,id)=>{for(const n of nodes||[]){if(n.id===id)return n;const c=find(n.children,id);if(c)return c;}};
  delete legacyWiki.contentMigrations;delete legacyGame.contentMigrations;
  for(const {route} of IMPORTED_NOTES.pages){
    const [cat,id]=route.split('/');const page=find(legacyWiki.categories.find(c=>c.id===cat).subcategories,id);
    delete page.sections;
    delete legacyGame.calculators.pages[route];delete legacyGame.progression.stages[route];
    for(const [old,target] of Object.entries(IMPORTED_NOTES.redirects))if(target===`#/${route}`)(page.children||=[]).push({id:old.split('/')[1],name:'Legacy child',desc:'Legacy description'});
  }
  assert.equal(installImportedNotes(legacyWiki,legacyGame),true);
  for(const {route} of IMPORTED_NOTES.pages) assert.ok(legacyGame.calculators.pages[route] || legacyGame.progression.stages[route],route);
  assert.equal(find(legacyWiki.categories.find(c=>c.id==='life').subcategories,'frost-conversion').children.length,0);
  assert.equal(find(legacyWiki.categories.find(c=>c.id==='money-island').subcategories,'energies').children.length,0);
  const page=find(legacyWiki.categories.find(c=>c.id==='life').subcategories,'frost-generators');
  page.sections.push({id:'my-section',title:'My later edit',text:'Keep this'});
  delete legacyGame.calculators.pages['life/golden-points'];
  assert.equal(installImportedNotes(legacyWiki,legacyGame),false);
  assert.equal(page.sections[0].title,'My later edit');
  assert.equal(legacyGame.calculators.pages['life/golden-points'],undefined);
});

test('imported groups calculate Ruby caps and the Frost3 dependency correctly',async()=>{
  const {setResetLayerPages,RESET_LAYER_PAGES}=await import('../js/data/reset-layers.js');
  setResetLayerPages(game.calculators.pages);
  const energies=RESET_LAYER_PAGES['money-island/energies'];
  assert.equal(energies.groups.length,4);
  const silver=energies.groups[0].bonuses[0];
  assert.equal(silver.value(1e100,{ruby:1e100,tu80:0}),100);
  assert.equal(silver.value(1e100,{ruby:1e100,tu80:1}),250);
  const fixed=energies.groups[2].bonuses.find((bonus)=>bonus.id==='runes');
  assert.equal(fixed.value(1e100,{ruby:1e100,tu80:20}),2.5);
  const frost=RESET_LAYER_PAGES['life/frost-conversion'];
  const dependency=frost.groups[2].bonuses[0];
  assert.equal(dependency.value(1e100,{frost3:0}),1);
  assert.equal(dependency.value(0,{frost3:1e8}),Math.min(250,Math.pow(1e8+1,.115)));
  assert.equal(game.progression.stages['life/golden-research-milestones'].stages.length,7);
  assert.equal(game.progression.stages['main/californium-milestones'].stages.length,16);
  assert.equal(game.progression.stages['main/astatine-power'].stages.length,8);
});

test('reference dumps are removed and the dedicated components remain consolidated',()=>{
  const find=(nodes,id)=>{for(const n of nodes||[]){if(n.id===id)return n;const child=find(n.children,id);if(child)return child;}};
  for(const [cat,id] of [['life','frost-generators'],['life','golden-points'],['life','frost-conversion'],['money-island','energies'],['main','californium-milestones'],['main','astatine-power'],['life','golden-research-milestones']]){
    const page=find(wiki.categories.find((c)=>c.id===cat).subcategories,id);
    assert.ok(!page.sections.some((s)=>s.id.startsWith('notes-')),id);
    assert.ok(game.calculators.pages[`${cat}/${id}`] || game.progression.stages[`${cat}/${id}`],id);
    assert.equal(new Set(page.sections.map((s)=>s.id)).size,page.sections.length);
  }
  assert.equal(find(wiki.categories.find((c)=>c.id==='life').subcategories,'frost-conversion').children.length,0);
  assert.equal(find(wiki.categories.find((c)=>c.id==='money-island').subcategories,'energies').children.length,0);
  assert.equal(wiki.redirects['life/packed-frost'],'#/life/frost-conversion');
});

test('Frost generators calculate cycles, income, costs and upgrade limits',async()=>{
  const {calculateGenerator}=await import('../js/data/generators.js');
  const machines=game.calculators.pages['life/frost-generators'].machines;
  assert.equal(machines.length,3);
  assert.equal(calculateGenerator(machines[0]).perSecond,.2);
  assert.equal(calculateGenerator(machines[1]).perSecond,10);
  assert.equal(calculateGenerator(machines[2]).income,25000);
  const result=calculateGenerator(machines[0],{level:10,speed:5,tier:2,tierMultiplier:3});
  assert.equal(result.income,1*(1+10*.4)*1.1**10*3);
  assert.equal(result.seconds,5/1.1**5);
  assert.equal(result.tierCost,550);
  const maxed=calculateGenerator(machines[0],{level:500,speed:500,tier:500});
  assert.equal(maxed.levelCost,null);assert.equal(maxed.speedCost,null);assert.equal(maxed.tierCost,null);
});

test('upgrading a previously saved note-dump revision removes only imported sections',async()=>{
  const {refineImportedContent}=await import('../js/content-presentation.js');
  const oldWiki=structuredClone(wiki),oldGame=structuredClone(game);
  oldWiki.contentMigrations=['game-notes-2026-11-v1'];oldGame.contentMigrations=['game-notes-2026-11-v1'];
  const find=(nodes,id)=>{for(const node of nodes||[]){if(node.id===id)return node;const match=find(node.children,id);if(match)return match;}};
  const page=find(oldWiki.categories.find(c=>c.id==='main').subcategories,'californium-milestones');
  page.sections=[{id:'notes-californium-1',title:'Duplicated reference table',text:'Remove this'},{id:'custom-note',title:'Editor content',text:'Keep this'}];
  refineImportedContent(oldWiki,oldGame);
  assert.deepEqual(page.sections.map(section=>section.id),['custom-note']);
  assert.equal(oldGame.progression.stages['main/californium-milestones'].stages.length,16);
  assert.equal(refineImportedContent(oldWiki,oldGame),false);
});

test('duplicate release repair keeps every distinct update and does not mutate its input',async()=>{
  const {normalizeReleases}=await import('../js/releases.js');
  const releases=[{version:'v1',entries:[{title:'A'}]},{version:' v1 ',entries:[{title:'B'}]}];
  const repaired=normalizeReleases(releases);
  assert.equal(repaired.length,1);
  assert.deepEqual(repaired[0].entries.map((entry)=>entry.title),['A','B']);
  assert.equal(releases[0].entries.length,1);
});

test('a collaborator draft keeps new published wiki content while retaining update-log edits',async()=>{
  const {readSharedDraft}=await import('../js/edit/shared-draft.js');
  const {FILES}=await import('../js/content-schema.js');
  const published={wiki:structuredClone(wiki),game:structuredClone(game),updates:JSON.parse(fs.readFileSync('content/update-log.json'))};
  const older=structuredClone(published);
  older.wiki.categories[0].desc='Previous published description';
  const working=structuredClone(older);
  working.updates.versions.push({version:'test-collaborator',date:'2026-11-04',entries:[{context:'Feature',title:'Collaborator update',description:'Keep this',href:''}]});
  const encode=(value)=>Buffer.from(JSON.stringify(value)).toString('base64');
  const originalFetch=global.fetch;
  const baseShas=Object.fromEntries(Object.keys(FILES).map((name)=>[name,`old-${name}`]));
  const newShas=Object.fromEntries(Object.keys(FILES).map((name)=>[name,`new-${name}`]));
  global.fetch=async(url)=>{
    if(String(url).includes('/commits?'))return new Response(JSON.stringify([{sha:'legacy-save'}]));
    const name=Object.keys(FILES).find((name)=>String(url).includes(`old-${name}`)||String(url).includes(FILES[name]));
    return new Response(JSON.stringify({content:encode(older[name])}));
  };
  try{
    for(const payload of [working,{...working,_baseShas:baseShas}]){
      const merged=await readSharedDraft({content:encode(payload)},published,newShas,'test-token');
      assert.equal(merged.wiki.categories[0].desc,published.wiki.categories[0].desc);
      assert.equal(merged.updates.versions.at(-1).entries[0].title,'Collaborator update');
      assert.ok(merged.game.calculators.pages['money-island/energies']);
    }
  }finally{global.fetch=originalFetch;}
});
