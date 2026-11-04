// Teste E2E: "Add pages" com TIPO de pagina — Stages/Barns/Ranks/Ascensions,
// calculadoras de bonus e upgrades ganham o container correto em game-data,
// o documento valida, e a pagina nova renderiza o conteudo certo.
const assert = require('node:assert/strict');
const { test } = require('node:test');

// ---- DOM falso minimo (o modulo do editor toca window/document no import) ----
const mkEl = () => ({
  style: {}, dataset: {}, innerHTML: '', value: '0', textContent: '', hidden: false,
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  addEventListener: () => {}, setAttribute: () => {}, getAttribute: () => null,
  appendChild: () => {}, insertAdjacentHTML: () => {}, remove: () => {},
  querySelector: () => mkEl(), querySelectorAll: () => [], contains: () => false,
  closest: () => mkEl(),
  focus: () => {}, blur: () => {},
});
globalThis.window = {
  addEventListener: () => {}, location: { hash: '' }, innerWidth: 1400,
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  scrollTo: () => {}, confirm: () => false, clearTimeout: () => {}, setTimeout: () => 0,
};
globalThis.location = globalThis.window.location;
globalThis.document = {
  querySelector: () => null, querySelectorAll: () => [], createElement: () => mkEl(),
  addEventListener: () => {},
  documentElement: { dataset: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } },
  body: { classList: { add: () => {} }, appendChild: () => {} },
};
globalThis.CustomEvent = class {};
globalThis.requestAnimationFrame = (f) => f();

// fetch lê os JSONs reais de content/ (para applyDraftToSite funcionar)
const fs = require('node:fs');
const path = require('node:path');
globalThis.fetch = async (url) => {
  const file = String(url).split('content').pop();
  const text = fs.readFileSync(path.join('content', file), 'utf8');
  return { ok: true, json: async () => JSON.parse(text) };
};

function baseDocs() {
  return {
    wiki: {
      categories: [
        { id: 'mining', name: 'Mining', desc: 'd', tagline: 't', icon: 'pickaxe', subcategories: [{ id: 'ores-main', name: 'Ores', desc: 'd', icon: 'gem', children: [] }] },
      ],
    },
    updates: { versions: [{ version: 'v1.0', date: '2026-01-01', entries: [{ context: 'Feature', title: 'T', href: '', description: 'd' }] }] },
    game: {
      upgrades: { sections: { base: { name: 'Base', upgrades: [{ n: 1, name: 'U', cap: null, price: '1*L', multi: '1' }] } }, routes: {} },
      progression: {
        stages: { 'main/stages': { stages: [{ num: 'I', requirements: ['1 Energy'], boosts: ['2x Energy'], unlocks: { area: 'A', places: ['P'], features: [] } }] } },
        barns: {}, ranks: {}, ascensions: {}, lifeRanks: {}, cores: {},
      },
      mining: { ores: {}, mastery: {}, layers: {}, prices: {} },
      runes: { families: {}, colors: {} },
      dungeon: { training: {}, dustUnlock: [1, 2, 3], gear: {} },
      calculators: { pages: {} },
      resources: { colors: {}, pageLinks: {}, uiCopy: {} },
    },
  };
}

test('page type: stages container is created, validates and renders', async () => {
  const draft = await import('../js/edit/draft.js');
  const { createGamePageContainer, buildAddValue } = await import('../js/edit/edit-mode.js');
  const { validateDocuments } = await import('../js/content-schema.js');
  const services = await import('../js/services.js');
  await services.loadEditableContent();

  const docs = baseDocs();
  draft.__testInjectDocs(docs);

  // fluxo do applyManageAdd: pagina no wiki + container do jogo por tipo
  draft.pushValue('wiki', 'categories.0.subcategories', { id: 'test-stages', name: 'Test Stages', desc: 'd', icon: 'sparkles', highlights: [], facts: [], vitals: [], children: [] });
  assert.equal(createGamePageContainer('mining/test-stages', 'Test Stages', 'stages'), 'created');
  const stagesPage = draft.doc('game').progression.stages['mining/test-stages'];
  assert.equal(stagesPage.stages.length, 1);
  assert.equal(stagesPage.stages[0].num, '1');

  // ja existia: nao sobrescreve
  assert.equal(createGamePageContainer('mining/test-stages', 'Test Stages', 'stages'), 'exists');
  assert.equal(draft.doc('game').progression.stages['mining/test-stages'].stages.length, 1);

  // tipo generico / categoria: nao cria nada
  assert.equal(createGamePageContainer('mining/other', 'Other', 'generic'), 'skipped');

  validateDocuments(draft.snapshotDocs());

  // site aplicado + pagina renderiza como Stages
  draft.applyDraftToSite();
  const views = await import('../js/views.js');
  const root = mkEl();
  await views.subcategoryView.render(root, ['mining', 'test-stages'], new URLSearchParams());
  assert.equal(String(root.innerHTML).includes('stage-card'), true);

  // botao "+ New stage": template cria o item 2 no array certo
  const add = buildAddValue('game', 'progression.stages.mining/test-stages.stages', 'stage');
  assert.equal(add.num, '2');
  assert.ok(Array.isArray(add.requirements) && add.requirements.length);
  const index = draft.pushValue('game', 'progression.stages.mining/test-stages.stages', add);
  assert.equal(index, 1);
  draft.applyDraftToSite();
  await views.subcategoryView.render(root, ['mining', 'test-stages'], new URLSearchParams());
  assert.equal(String(root.innerHTML).includes('Stage 2'), true);
});

test('page type: calculators (amount/level/gears/dust/groups) validate and render', async () => {
  const draft = await import('../js/edit/draft.js');
  const { createGamePageContainer } = await import('../js/edit/edit-mode.js');
  const { validateDocuments } = await import('../js/content-schema.js');

  draft.__testInjectDocs(baseDocs());
  const kinds = [
    ['calc-amount', 'calc-a'],
    ['calc-level', 'calc-l'],
    ['calc-gears', 'calc-g'],
    ['calc-dust', 'calc-d'],
    ['calc-groups', 'calc-gr'],
  ];
  for (const [type, id] of kinds) {
    draft.pushValue('wiki', 'categories.0.subcategories', { id, name: id, desc: 'd', icon: 'sparkles', highlights: [], facts: [], vitals: [], children: [] });
    assert.equal(createGamePageContainer(`mining/${id}`, id, type), 'created');
  }
  validateDocuments(draft.snapshotDocs());

  const pages = draft.doc('game').calculators.pages;
  assert.equal(pages['mining/calc-a'].kind, 'amount');
  assert.equal(pages['mining/calc-l'].kind, 'level');
  assert.equal(pages['mining/calc-g'].kind, 'gears');
  assert.equal(pages['mining/calc-d'].kind, 'bone-dust');
  assert.equal(pages['mining/calc-gr'].kind, 'amount-groups');

  draft.applyDraftToSite();
  const views = await import('../js/views.js');
  const root = mkEl();
  await views.subcategoryView.render(root, ['mining', 'calc-a'], new URLSearchParams());
  assert.equal(String(root.innerHTML).includes('reset-layer-page'), true);
});

test('page type: upgrades route + section validate and render', async () => {
  const draft = await import('../js/edit/draft.js');
  const { createGamePageContainer } = await import('../js/edit/edit-mode.js');
  const { validateDocuments } = await import('../js/content-schema.js');

  draft.__testInjectDocs(baseDocs());
  draft.pushValue('wiki', 'categories.0.subcategories', { id: 'test-upgrades', name: 'Test Upgrades', desc: 'd', icon: 'sparkles', highlights: [], facts: [], vitals: [], children: [] });
  assert.equal(createGamePageContainer('mining/test-upgrades', 'Test Upgrades', 'upgrades'), 'created');
  assert.equal(draft.doc('game').upgrades.routes['mining/test-upgrades'], 'mining-test-upgrades');
  validateDocuments(draft.snapshotDocs());

  draft.applyDraftToSite();
  const views = await import('../js/views.js');
  const root = mkEl();
  await views.subcategoryView.render(root, ['mining', 'test-upgrades'], new URLSearchParams());
  assert.equal(String(root.innerHTML).includes('New upgrade'), true);
});

test('Rare Saps can add groups and bonuses with unique IDs and visible controls', async () => {
  const draft = await import('../js/edit/draft.js');
  const { createGamePageContainer, buildAddValue } = await import('../js/edit/edit-mode.js');
  const { validateDocuments } = await import('../js/content-schema.js');
  draft.__testInjectDocs(baseDocs());
  draft.pushValue('wiki', 'categories.0.subcategories', { id: 'rare-saps', name: 'Rare Saps', desc: 'd', icon: 'sprout', children: [], facts: [], highlights: [], vitals: [] });
  createGamePageContainer('mining/rare-saps', 'Rare Saps', 'calc-groups');
  const groupsPath = 'calculators.pages.mining/rare-saps.groups';
  const sap = buildAddValue('game', groupsPath, 'bonus-group');
  draft.pushValue('game', groupsPath, sap);
  const next = buildAddValue('game', groupsPath, 'bonus-group');
  assert.notEqual(sap.id, next.id);
  const bonusesPath = `${groupsPath}.1.bonuses`;
  draft.pushValue('game', bonusesPath, buildAddValue('game', bonusesPath, 'bonus'));
  assert.equal(sap.bonuses.length, 2);
  assert.notEqual(sap.bonuses[0].id, sap.bonuses[1].id);
  validateDocuments(draft.snapshotDocs());
  draft.applyDraftToSite();
  const views = await import('../js/views.js');
  const root = mkEl();
  await views.subcategoryView.render(root, ['mining', 'rare-saps'], new URLSearchParams());
  assert.match(root.innerHTML, /Add group/);
  assert.match(root.innerHTML, /New bonus/);
});

test('existing pages accept evolutions, upgrades, bonuses and FAQ text together', async () => {
  const draft = await import('../js/edit/draft.js');
  const { addContentToPage, bonusFields } = await import('../js/edit/edit-mode.js');
  const { validateDocuments } = await import('../js/content-schema.js');
  draft.__testInjectDocs(baseDocs());
  const wikiPath = 'categories.0.subcategories.0';
  const key = 'mining/ores-main';
  for (const type of ['evolutions', 'upgrades', 'calc-amount', 'text']) addContentToPage(key, wikiPath, type);
  addContentToPage(key, wikiPath, 'evolutions');
  assert.equal(draft.getValue('game', `progression.stages.${key}.stages`).length, 2);
  const binding = { valuePath: `calculators.pages.${key}.bonuses.0` };
  assert.deepEqual(bonusFields(binding).map((field) => field.key), ['name', 'value', 'unit', 'cap', 'unlockAt']);
  draft.setValue('wiki', `${wikiPath}.sections.0.title`, 'How does evolution work?');
  draft.setValue('wiki', `${wikiPath}.sections.0.text`, 'First line\nSecond line');
  validateDocuments(draft.snapshotDocs());
  draft.applyDraftToSite();
  const views = await import('../js/views.js');
  const root = mkEl();
  await views.subcategoryView.render(root, ['mining', 'ores-main'], new URLSearchParams());
  for (const text of ['Evolution 1', 'Evolution 2', 'New upgrade', 'New bonus', 'How does evolution work?', 'First line\nSecond line', 'Add content']) assert.ok(root.innerHTML.includes(text), text);
  assert.ok(!root.innerHTML.includes('More details coming soon'));
  draft.setValue('game', `upgrades.routes.${key}`, 'base');
  addContentToPage(key, wikiPath, 'upgrades');
  assert.equal(draft.getValue('game', `upgrades.routes.${key}`), 'base');
  assert.equal(draft.getValue('game', 'upgrades.sections.base.upgrades.0.name'), 'U');
  assert.equal(draft.getValue('game', 'upgrades.sections.base.upgrades').length, 2);
});

test('every current wiki page renders and has an editor content entry point', async () => {
  const draft = await import('../js/edit/draft.js');
  const { validateDocuments } = await import('../js/content-schema.js');
  const views = await import('../js/views.js');
  const docs = { wiki: JSON.parse(fs.readFileSync('content/wiki-data.json')), game: JSON.parse(fs.readFileSync('content/game-data.json')), updates: JSON.parse(fs.readFileSync('content/update-log.json')) };
  validateDocuments(docs);
  draft.__testInjectDocs(docs); draft.applyDraftToSite();
  let count = 0;
  for (const category of docs.wiki.categories) {
    const walk = async (pages) => {
      for (const page of pages || []) {
        const root = mkEl();
        await views.subcategoryView.render(root, [category.id,page.id], new URLSearchParams());
        if (root.innerHTML) assert.match(root.innerHTML, /Add content/, `${category.id}/${page.id}`);
        count++;
        await walk(page.children);
      }
    };
    await walk(category.subcategories);
  }
  assert.ok(count > 100);
});

test('moving Eternal Shards preserves Eternal Tree data and editable bindings', async () => {
  const draft = await import('../js/edit/draft.js');
  const views = await import('../js/views.js');
  const { getFormulaPage } = await import('../js/data/formulas.js');
  const docs = { wiki: JSON.parse(fs.readFileSync('content/wiki-data.json')), game: JSON.parse(fs.readFileSync('content/game-data.json')), updates: JSON.parse(fs.readFileSync('content/update-log.json')) };
  draft.__testInjectDocs(docs); draft.applyDraftToSite();
  const original = structuredClone(getFormulaPage('main','eternal-tree'));
  draft.pushValue('wiki','categories',{id:'miscellaneous',name:'Miscellaneous',desc:'',tagline:'',subcategories:[]});
  const from = docs.wiki.categories[0].subcategories.findIndex((page)=>page.id==='eternal-shards');
  draft.moveValue('wiki','categories.0.subcategories',from,`categories.${docs.wiki.categories.length-1}.subcategories`,0);
  draft.applyDraftToSite();
  assert.deepEqual(getFormulaPage('miscellaneous','eternal-tree'), original);
  const root = mkEl();
  await views.subcategoryView.render(root,['miscellaneous','eternal-tree'],new URLSearchParams());
  assert.match(root.innerHTML,/game:upgrades.sections.eternal-tree.upgrades/);
  assert.ok(!root.innerHTML.includes('More details coming soon'));
});

test('new release versions are unique, and text/table rows are editable', async () => {
  const draft = await import('../js/edit/draft.js');
  const { buildAddValue, addContentToPage } = await import('../js/edit/edit-mode.js');
  draft.__testInjectDocs(baseDocs());
  const first = buildAddValue('updates','versions','version');
  draft.pushValue('updates','versions',first);
  const second = buildAddValue('updates','versions','version');
  assert.notEqual(first.version, second.version);
  draft.pushValue('updates','versions',second);
  draft.pushValue('updates','versions.1.entries',buildAddValue('updates','versions.1.entries','entry'));
  assert.equal(draft.doc('updates').versions[1].entries.length,1);
  const binding = addContentToPage('mining/ores-main','categories.0.subcategories.0','table');
  const path = binding.valuePath + '.rows';
  const row = buildAddValue('wiki',path,'table-row');
  assert.equal(row.cells.length,3);
  draft.pushValue('wiki',path,row);
  draft.setValue('wiki',path+'.0.cells.0','Machine 1');
  assert.equal(row.cells[0],'Machine 1');
});

test('an empty new release stays visible to editors and offers Add update', async () => {
  const draft = await import('../js/edit/draft.js');
  const {buildAddValue}=await import('../js/edit/edit-mode.js');
  const views=await import('../js/views.js');
  draft.__testInjectDocs(baseDocs());
  const release=buildAddValue('updates','versions','version');
  draft.pushValue('updates','versions',release);
  draft.applyDraftToSite();
  const previous=document.documentElement.classList.contains;
  document.documentElement.classList.contains=()=>true;
  try{
    const root=mkEl();
    await views.updatesView.render(root,[],new URLSearchParams());
    assert.ok(root.innerHTML.includes(`Release ${release.version}`));
    assert.ok(root.innerHTML.includes('data-edit-add="updates:versions.1.entries"'));
    assert.match(root.innerHTML,/Add update/);
  }finally{document.documentElement.classList.contains=previous;}
});

test('new list-item templates render in their existing game pages', async () => {
  const draft=await import('../js/edit/draft.js');
  const {buildAddValue}=await import('../js/edit/edit-mode.js');
  const views=await import('../js/views.js');
  const docs={wiki:JSON.parse(fs.readFileSync('content/wiki-data.json')),game:JSON.parse(fs.readFileSync('content/game-data.json')),updates:JSON.parse(fs.readFileSync('content/update-log.json'))};
  draft.__testInjectDocs(docs);
  for(const [route,list,template] of [
    ['mining/ores','mining.ores.mining/ores.ores','ore'],
    ['mining/mastery','mining.mastery.mining/mastery.ores','mastery-ore'],
    ['mining/layers','mining.layers.mining/layers.layers','layer'],
    ['runes/energetic','runes.families.runes/energetic.runes','rune'],
    ['dungeon/swords','dungeon.gear.dungeon/swords.gears','gear'],
  ]){
    draft.pushValue('game',list,buildAddValue('game',list,template));
    draft.applyDraftToSite();
    const root=mkEl();
    await views.subcategoryView.render(root,route.split('/'),new URLSearchParams());
    assert.match(root.innerHTML,/New (ore|mastery ore|layer|rune|gear)/,route);
  }
});

test('milestones render once as compact cards and Frost machines use a calculator',async()=>{
  const draft=await import('../js/edit/draft.js');
  const views=await import('../js/views.js');
  draft.__testInjectDocs({wiki:JSON.parse(fs.readFileSync('content/wiki-data.json')),game:JSON.parse(fs.readFileSync('content/game-data.json')),updates:JSON.parse(fs.readFileSync('content/update-log.json'))});
  draft.applyDraftToSite();
  const root=mkEl();
  await views.subcategoryView.render(root,['main','californium-milestones'],new URLSearchParams());
  assert.equal((root.innerHTML.match(/class="milestone-card"/g)||[]).length,16);
  assert.ok(!root.innerHTML.includes('class="stage-card'));
  assert.ok(!root.innerHTML.includes('Inside Californium Milestones'));
  assert.ok(!root.innerHTML.includes('<table'));
  await views.subcategoryView.render(root,['life','frost-generators'],new URLSearchParams());
  assert.equal((root.innerHTML.match(/class="generator-card"/g)||[]).length,3);
  assert.match(root.innerHTML,/data-generator-results/);
  assert.ok(!root.innerHTML.includes('<table'));
  await views.subcategoryView.render(root,['money-island','energies'],new URLSearchParams());
  assert.match(root.innerHTML,/bonus-groups-grid/);
  assert.ok(!root.innerHTML.includes('<table'));
});

