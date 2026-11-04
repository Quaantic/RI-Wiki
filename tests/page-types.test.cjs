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
  assert.match(root.innerHTML, /Add sap group/);
  assert.match(root.innerHTML, /New bonus/);
});

