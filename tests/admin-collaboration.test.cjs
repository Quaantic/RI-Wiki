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

test('sync keeps concurrent categories, detects conflicts, and recovers local work after reload', async () => {
  const draft = await import('../js/edit/draft.js');
  const schema = await import('../js/content-schema.js');
  const published = Object.fromEntries(Object.entries(schema.FILES).map(([name, file]) => [name, JSON.parse(fs.readFileSync(path.join(__dirname, '..', file)))]));
  let remote = structuredClone(published), sha = 'draft-1', writes = 0;
  const storage = new Map();
  const originalFetch = global.fetch, originalStorage = global.sessionStorage;
  global.sessionStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const file = (content, revision) => ({ type: 'file', sha: revision, content: Buffer.from(JSON.stringify(content)).toString('base64') });
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/commits?')) return new Response(JSON.stringify([{ sha: 'baseline' }]));
    const target = new URL(url).pathname.split('/contents/')[1];
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      if (target === schema.DRAFT_FILE) {
        assert.equal(body.sha, sha);
        remote = JSON.parse(Buffer.from(body.content, 'base64').toString());
        writes += 1; sha = `saved-${writes}`;
        return new Response(JSON.stringify({ content: file(remote, sha) }));
      }
      return new Response(JSON.stringify({ content: { sha: 'history' } }));
    }
    if (target === schema.DRAFT_FILE) return new Response(JSON.stringify(file(remote, sha)));
    const name = Object.keys(schema.FILES).find((name) => schema.FILES[name] === target);
    return new Response(JSON.stringify(name ? file(published[name], name) : {}), { status: name ? 200 : 404 });
  };
  const category = (id) => ({ id, name: id, desc: '', tagline: '', subcategories: [] });
  try {
    await draft.initSession('test', 'editor');
    draft.pushValue('wiki', 'categories', category('faq'));
    draft.persistLocalRecovery();
    remote.wiki.categories.push(category('miscellaneous')); sha = 'draft-2';
    const restored = await draft.initSession('test', 'editor');
    assert.equal(restored.recovered, true);
    assert.ok(draft.doc('wiki').categories.some((item) => item.id === 'faq'));
    assert.ok(draft.doc('wiki').categories.some((item) => item.id === 'miscellaneous'));
    await draft.saveDraft('test');
    assert.ok(remote.wiki.categories.some((item) => item.id === 'faq'));
    assert.ok(remote.wiki.categories.some((item) => item.id === 'miscellaneous'));
    draft.setValue('wiki', 'categories.0.desc', 'Local text');
    remote.wiki.categories[0].name = 'Remote name'; sha = 'draft-3';
    assert.equal(await draft.syncRemote('test'), true);
    assert.equal(draft.doc('wiki').categories[0].desc, 'Local text');
    assert.equal(draft.doc('wiki').categories[0].name, 'Remote name');
    remote.wiki.categories[0].desc = 'Conflicting text'; sha = 'draft-4';
    const before = draft.snapshotDocs(), beforeWrites = writes;
    await assert.rejects(draft.saveDraft('test'), /Both editors changed/);
    assert.deepEqual(draft.snapshotDocs(), before);
    assert.equal(writes, beforeWrites);
    // Recovery is additive: an older backup can restore FAQ without replacing
    // the current categories or sending anything to the published site.
    const backup = structuredClone(published);
    backup.wiki.categories.push(category('lost-faq'));
    const mockFetch = global.fetch;
    global.fetch = async (url, options) => String(url).includes('/backups/')
      ? new Response(JSON.stringify(file({ documents: backup }, 'backup')))
      : mockFetch(url, options);
    assert.equal(await draft.recoverMissingPages('test', 'backup-test.json'), 1);
    assert.ok(draft.doc('wiki').categories.some((item) => item.id === 'lost-faq'));
    assert.equal(draft.doc('wiki').categories[0].desc, 'Local text');
  } finally { global.fetch = originalFetch; global.sessionStorage = originalStorage; }
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

test('shared save preserves GitHub attribution, deduplicates history and merges newer revisions', async () => {
  const draft = await import('../js/edit/draft.js');
  const schema = await import('../js/content-schema.js');
  const repo = new Map(Object.values(schema.FILES).map((file) => [file, {
    type: 'file', sha: file, content: Buffer.from(fs.readFileSync(path.join(__dirname, '..', file))).toString('base64'),
  }]));
  const originalFetch = global.fetch;
  let serial = 0;
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/commits?')) return new Response(JSON.stringify([{ sha: 'baseline' }]));
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
    await draft.saveDraft('token');
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

test('Save and Publish resolve a shared draft order conflict with the published wiki', async () => {
  const draft = await import('../js/edit/draft.js');
  const schema = await import('../js/content-schema.js');
  const original = Object.fromEntries(Object.entries(schema.FILES).map(([name, file]) => [
    name, JSON.parse(fs.readFileSync(path.join(__dirname, '..', file))),
  ]));
  const entry = (id) => ({ id, context: 'Feature', title: id, description: id, href: '' });
  const release = (entries) => ({ versions: [{ version: '1.02', date: '2026-11-05', entries }] });
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(entry);
  const published = release([a, c, { ...b, description: 'Published edit' }, d]);
  const shared = release([b, { ...a, title: 'Shared edit' }, c]);
  const file = (doc, sha) => ({ type: 'file', sha, content: schema.encodeBase64Content(JSON.stringify(doc)) });
  const sharedFile = file({
    ...original, updates: shared, _baseShas: { wiki: 'wiki', game: 'game', updates: 'old-updates' },
  }, 'shared');
  const repo = new Map(Object.entries(schema.FILES).map(([name, filename]) => [filename,
    file(name === 'updates' ? published : original[name], name),
  ]));
  const originalFetch = global.fetch;
  let writes = 0;
  global.fetch = async (url, options = {}) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/git/blobs/old-updates')) {
      return Response.json(file(release([a, b, c]), 'old-updates'));
    }
    const filename = pathname.split('/contents/')[1];
    if (options.method === 'PUT' || options.method === 'DELETE') {
      const body = JSON.parse(options.body);
      assert.equal(body.sha, repo.get(filename)?.sha);
      writes += 1;
      if (options.method === 'DELETE') {
        repo.delete(filename);
        return Response.json({});
      }
      const result = { type: 'file', sha: `write-${writes}`, content: body.content };
      repo.set(filename, result);
      return Response.json({ content: result });
    }
    return Response.json(repo.get(filename) || {}, { status: repo.has(filename) ? 200 : 404 });
  };
  const confirm = (version, source) => {
    assert.equal(version, '1.02');
    assert.equal(source, 'shared');
    return true;
  };
  const expected = release([{ ...b, description: 'Published edit' }, { ...a, title: 'Shared edit' }, c, d]);
  const read = (filename) => JSON.parse(schema.decodeBase64Content(repo.get(filename).content));
  try {
    repo.set(schema.DRAFT_FILE, sharedFile);
    const info = await draft.initSession('token', 'order-conflict');
    assert.equal(info.orderConflict, true);
    assert.deepEqual(draft.doc('updates'), expected);
    await assert.rejects(draft.saveDraft('token', () => false), { release: '1.02' });
    await assert.rejects(draft.publishChanges('token', () => false), { release: '1.02' });
    assert.equal(writes, 0);
    const backgroundCheck = assert.rejects(draft.syncRemote('token'), { release: '1.02' });
    await draft.saveDraft('token', confirm);
    await backgroundCheck;
    assert.deepEqual(read(schema.DRAFT_FILE).updates, expected);
    assert.equal(read(schema.DRAFT_FILE)._baseShas.updates, 'updates');
    assert.deepEqual(read(schema.FILES.updates), published);

    repo.set(schema.DRAFT_FILE, sharedFile);
    await draft.initSession('token', 'order-conflict');
    draft.setValue('updates', 'versions.0.entries.2.description', 'Unsaved browser edit');
    await draft.publishChanges('token', confirm);
    assert.deepEqual(read(schema.FILES.updates), release([
      ...expected.versions[0].entries.slice(0, 2), { ...c, description: 'Unsaved browser edit' }, d,
    ]));
    assert.equal(repo.has(schema.DRAFT_FILE), false);
  } finally {
    global.fetch = originalFetch;
  }
});
