const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('unchanged fields create neither history nor dirty state', async () => {
  const draft = await import('../js/edit/draft.js');
  draft.__testInjectDocs({ wiki: { categories: [{ name: 'Eternal Shards', facts: [] }] } });
  assert.equal(draft.draftDirty(), false);
  assert.equal(draft.setValue('wiki', 'categories.0.name', 'Eternal Shards'), false);
  assert.equal(draft.setValue('wiki', 'categories.0.facts', []), false);
  assert.deepEqual(draft.__testChangeLog(), []);
  assert.equal(draft.canUndo(), false);
});

test('nesting an earlier category resolves shifted destination and supports undo', async () => {
  const draft = await import('../js/edit/draft.js');
  const docs = { wiki: { categories: [{ id: 'a', children: [] }, { id: 'b', subcategories: [] }] } };
  draft.__testInjectDocs(structuredClone(docs));
  draft.moveValue('wiki', 'categories', 0, 'categories.1.subcategories', 0);
  assert.equal(draft.doc('wiki').categories[0].subcategories[0].id, 'a');
  draft.undoLast();
  assert.deepEqual(draft.doc('wiki'), docs.wiki);
  draft.moveValue('wiki', 'categories', 1, 'categories', 0);
  draft.undoLast();
  assert.deepEqual(draft.doc('wiki'), docs.wiki);
});

test('shared save preserves GitHub attribution, deduplicates history and refuses stale writes', async () => {
  const draft = await import('../js/edit/draft.js');
  const schema = await import('../js/content-schema.js');
  const repo = new Map(Object.values(schema.FILES).map((file) => [file, {
    type: 'file', sha: file, content: Buffer.from(fs.readFileSync(path.join(__dirname, '..', file))).toString('base64'),
  }]));
  const originalFetch = global.fetch;
  let serial = 0;
  global.fetch = async (url, options = {}) => {
    const file = new URL(url).pathname.split('/contents/')[1];
    if (options.method === 'DELETE') {
      repo.delete(file);
      return new Response('{}');
    }
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      const next = { type: 'file', sha: String(++serial), content: body.content };
      repo.set(file, next);
      return new Response(JSON.stringify({ content: next }));
    }
    return new Response(JSON.stringify(repo.get(file) || {}), { status: repo.has(file) ? 200 : 404 });
  };
  try {
    await draft.initSession('token', 'collaborator');
    assert.equal(await draft.remoteChanged('token'), false);
    draft.setValue('wiki', 'categories.0.name', 'Edited category');
    await draft.saveDraft('token');
    await draft.saveDraft('token');
    const entries = await draft.listEditHistory('token');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].actor, 'collaborator');
    assert.equal(entries[0].pending, true);
    await draft.initSession('token', 'owner');
    assert.equal(draft.doc('wiki').categories[0].name, 'Edited category');
    repo.get(schema.DRAFT_FILE).sha = 'another-editor-save';
    assert.equal(await draft.remoteChanged('token'), true);
    await assert.rejects(draft.saveDraft('token'), /Another editor/);
    await draft.initSession('token', 'owner');
    await draft.publishChanges('token');
    assert.equal(repo.has(schema.DRAFT_FILE), false);
    const publicWiki = JSON.parse(Buffer.from(repo.get(schema.FILES.wiki).content, 'base64').toString());
    assert.equal(publicWiki.categories[0].name, 'Edited category');
    const published = await draft.listEditHistory('token');
    assert.equal(published.length, 1);
    assert.equal(published[0].actor, 'collaborator');
    assert.equal(published[0].pending, false);
  } finally {
    global.fetch = originalFetch;
  }
});
