// Teste: histórico de undo + moveValue do rascunho inline.
const assert = require('node:assert/strict');
const { test } = require('node:test');

const doc = () => ({
  wiki: {
    categories: [
      { id: 'a', name: 'A', subcategories: [{ id: 'a1', name: 'A1', children: [] }] },
      { id: 'b', name: 'B', subcategories: [{ id: 'b1', name: 'B1', children: [] }] },
    ],
  },
});

test('undo restores set/remove/push/move in reverse order', async () => {
  const draft = await import('../js/edit/draft.js');
  draft.__testInjectDocs(doc());

  // setValue -> undo
  draft.setValue('wiki', 'categories.0.subcategories.0.name', 'Changed');
  assert.equal(draft.canUndo(), true);
  assert.equal(draft.undoLast().message, 'field restored');
  assert.equal(draft.doc('wiki').categories[0].subcategories[0].name, 'A1');

  // setValue em campo NOVO -> undo remove a chave
  draft.setValue('wiki', 'categories.1.tagline', 'new');
  assert.equal(draft.doc('wiki').categories[1].tagline, 'new');
  draft.undoLast();
  assert.equal(draft.doc('wiki').categories[1].tagline, undefined);

  // pushValue -> undo (voltou a N itens)
  const pushed = draft.pushValue('wiki', 'categories.0.subcategories', { id: 'a2', name: 'A2' });
  assert.equal(pushed, 1);
  assert.equal(draft.doc('wiki').categories[0].subcategories.length, 2);
  draft.undoLast();
  assert.equal(draft.doc('wiki').categories[0].subcategories.length, 1);

  // removeValue -> undo volta no MESMO índice
  draft.removeValue('wiki', 'categories.1.subcategories.0');
  assert.equal(draft.doc('wiki').categories[1].subcategories.length, 0);
  draft.undoLast();
  assert.equal(draft.doc('wiki').categories[1].subcategories[0].id, 'b1');

  // moveValue entre categorias -> undo reposiciona
  draft.moveValue('wiki', 'categories.0.subcategories', 0, 'categories.1.subcategories', 1);
  assert.equal(draft.doc('wiki').categories[1].subcategories[1].id, 'a1');
  assert.equal(draft.doc('wiki').categories[0].subcategories.length, 0);
  draft.undoLast();
  assert.equal(draft.doc('wiki').categories[0].subcategories[0].id, 'a1');
  assert.equal(draft.doc('wiki').categories[1].subcategories.map((s) => s.id).join(','), 'b1');

  // mesmo-array reorder ("a" vai DEPOIS de "b": toIndex = posicao nova) -> undo volta
  draft.moveValue('wiki', 'categories', 0, 'categories', 2);
  assert.equal(draft.doc('wiki').categories[0].id, 'b');
  assert.equal(draft.doc('wiki').categories[1].id, 'a');
  draft.undoLast();
  assert.equal(draft.doc('wiki').categories[0].id, 'a');
  assert.equal(draft.doc('wiki').categories[1].id, 'b');
});

test('LIFO across interleaved operations', async () => {
  const draft = await import('../js/edit/draft.js');
  draft.__testInjectDocs(doc());
  draft.pushValue('wiki', 'categories.0.subcategories', { id: 'x', name: 'X' });
  draft.setValue('wiki', 'categories.0.subcategories.1.name', 'XX');
  draft.removeValue('wiki', 'categories.1.subcategories.0');
  assert.equal(draft.doc('wiki').categories[1].subcategories.length, 0);
  draft.undoLast(); // remove desfeito -> b1 voltou
  assert.equal(draft.doc('wiki').categories[1].subcategories[0].id, 'b1');
  draft.undoLast(); // volta o rename
  assert.equal(draft.doc('wiki').categories[0].subcategories[1].name, 'X');
  draft.undoLast(); // sai o item novo
  assert.equal(draft.doc('wiki').categories[0].subcategories.length, 1);
  assert.equal(draft.canUndo(), false);
});

// Reproduz o fluxo do drag "drop no meio do cabeçalho de categoria":
// converter a categoria em página (setValue) + mover para dentro (moveValue).
// O undo LIFO precisa restaurar a categoria com o formato original.
test('category nested as page: conversion + move undo restores original shape', async () => {
  const draft = await import('../js/edit/draft.js');
  const docs = doc();
  docs.wiki.categories[1].tagline = 'Beta tag';
  docs.wiki.categories[1].overview = { highlights: ['h1'], facts: [{ label: 'l', value: 'v' }] };
  docs.wiki.categories[1].vitals = [{ label: 'k', value: 'v' }];
  draft.__testInjectDocs(docs);

  const si = 1;
  const ti = 0;
  const cat = draft.doc('wiki').categories[si];
  const converted = {
    id: cat.id,
    name: cat.name,
    icon: cat.icon || 'sparkles',
    desc: cat.desc || cat.tagline || '',
    tagline: cat.tagline || '',
    children: Array.isArray(cat.subcategories) ? cat.subcategories : [],
    highlights: Array.isArray(cat.overview?.highlights) ? cat.overview.highlights : [],
    facts: Array.isArray(cat.overview?.facts) ? cat.overview.facts : [],
    vitals: Array.isArray(cat.vitals) ? cat.vitals : [],
  };
  draft.setValue('wiki', `categories.${si}`, converted);
  draft.moveValue('wiki', 'categories', si, `categories.${ti}.subcategories`, 1);

  const nested = draft.doc('wiki').categories[0].subcategories[1];
  assert.equal(draft.doc('wiki').categories.length, 1);
  assert.equal(nested.id, 'b');
  assert.equal(nested.children[0].id, 'b1');
  assert.equal(nested.highlights[0], 'h1');
  assert.equal(nested.vitals[0].label, 'k');
  assert.equal(nested.subcategories, undefined);

  draft.undoLast(); // desfaz o move: a página volta para o topo
  assert.equal(draft.doc('wiki').categories[1].id, 'b');
  draft.undoLast(); // desfaz a conversão: formato original de categoria volta
  const restored = draft.doc('wiki').categories[1];
  assert.equal(restored.subcategories[0].id, 'b1');
  assert.equal(restored.tagline, 'Beta tag');
  assert.equal(restored.overview.facts[0].label, 'l');
  assert.equal(restored.children, undefined);
});

// O drag "soltar no meio de outra pagina" aninha em children (criada na hora
// pelo ensure) e o undo LIFO desfaz move + criacao da lista vazia.
test('page nested into another page: children list auto-created, undo clean', async () => {
  const draft = await import('../js/edit/draft.js');
  const docs = doc();
  delete docs.wiki.categories[1].subcategories[0].children; // b1 SEM children
  draft.__testInjectDocs(docs);

  // ensure: children nao existe -> setValue cria
  if (!Array.isArray(draft.doc('wiki').categories[1].subcategories[0].children)) {
    draft.setValue('wiki', 'categories.1.subcategories.0.children', []);
  }
  draft.moveValue('wiki', 'categories.0.subcategories', 0, 'categories.1.subcategories.0.children', 0);

  assert.equal(draft.doc('wiki').categories[0].subcategories.length, 0);
  const nested = draft.doc('wiki').categories[1].subcategories[0].children[0];
  assert.equal(nested.id, 'a1');

  draft.undoLast(); // desfaz o move: a1 volta para o topo
  assert.equal(draft.doc('wiki').categories[0].subcategories[0].id, 'a1');
  draft.undoLast(); // desfaz a criacao de children: chave some
  assert.equal(draft.doc('wiki').categories[1].subcategories[0].children, undefined);
});

// O gerenciador de cores remove entradas com setValue(undefined): a chave sai
// do JSON publicado e o undo devolve o valor anterior.
test('resource color entry: key deletion via setValue(undefined) is undoable', async () => {
  const draft = await import('../js/edit/draft.js');
  const docs = { game: { resources: { colors: { 'Bone Dust': '#aabbcc' }, pageLinks: { 'Bone Dust': '#/dungeon/bone-dust' } } } };
  draft.__testInjectDocs(docs);

  draft.setValue('game', 'resources.colors.Bone Dust', undefined);
  draft.setValue('game', 'resources.pageLinks.Bone Dust', undefined);
  assert.equal(JSON.stringify(draft.doc('game')).includes('Bone Dust'), false);

  draft.undoLast(); // link volta
  assert.equal(draft.doc('game').resources.pageLinks['Bone Dust'], '#/dungeon/bone-dust');
  draft.undoLast(); // cor volta
  assert.equal(draft.doc('game').resources.colors['Bone Dust'], '#aabbcc');
});
