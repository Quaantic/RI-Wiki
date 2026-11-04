const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=JSON.parse(fs.readFileSync('content/game-data.json'));
const wiki=JSON.parse(fs.readFileSync('content/wiki-data.json'));

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

test('all supplied content has editable tables and consolidated routes',()=>{
  const find=(nodes,id)=>{for(const n of nodes||[]){if(n.id===id)return n;const child=find(n.children,id);if(child)return child;}};
  for(const [cat,id] of [['life','frost-generators'],['life','golden-points'],['life','frost-conversion'],['money-island','energies'],['main','californium-milestones'],['main','astatine-power'],['life','golden-research-milestones']]){
    const page=find(wiki.categories.find((c)=>c.id===cat).subcategories,id);
    assert.ok(page.sections.some((s)=>s.columns?.length && s.rows?.length),id);
    assert.equal(new Set(page.sections.map((s)=>s.id)).size,page.sections.length);
  }
  assert.equal(find(wiki.categories.find((c)=>c.id==='life').subcategories,'frost-conversion').children.length,0);
  assert.equal(find(wiki.categories.find((c)=>c.id==='money-island').subcategories,'energies').children.length,0);
  assert.equal(wiki.redirects['life/packed-frost'],'#/life/frost-conversion');
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
