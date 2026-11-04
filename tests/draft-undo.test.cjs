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
