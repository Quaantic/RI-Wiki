const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('stale shared content never blocks opening; cancel, restore, save and publish preserve versions', async () => {
  const draft = await import('../js/edit/draft.js');
  const schema = await import('../js/content-schema.js');
  const original = Object.fromEntries(Object.entries(schema.FILES).map(([name, file]) => [name, JSON.parse(fs.readFileSync(path.join(__dirname, '..', file)))]));
  const published = structuredClone(original);
  published.wiki.categories[0].desc = 'Recovered published description';
  const shared = structuredClone(original);
  shared.wiki.categories[0].desc = 'Older shared description';
  shared._baseShas = Object.fromEntries(Object.keys(schema.FILES).map(name => [name, `old-${name}`]));
  const file = (value, sha) => ({ type: 'file', sha, content: Buffer.from(JSON.stringify(value)).toString('base64') });
  const repo = new Map(Object.entries(schema.FILES).map(([name, filename]) => [filename, file(published[name], name)]));
  repo.set(schema.DRAFT_FILE, file(shared, 'shared'));
  const previousFetch = global.fetch;
  let writes = 0;
  let failPublish = false;
  global.fetch = async (url, options = {}) => {
    const pathname = new URL(url).pathname;
    if (pathname.includes('/git/blobs/old-')) return Response.json(file(original[pathname.split('/git/blobs/old-')[1]], 'old'));
    const filename = pathname.split('/contents/')[1];
    if (options.method === 'PUT' || options.method === 'DELETE') {
      if (failPublish && filename === schema.FILES.game) {
        failPublish = false;
        return Response.json({ message: 'Temporary publishing failure' }, { status: 503 });
      }
      const body = JSON.parse(options.body);
      assert.equal(body.sha, repo.get(filename)?.sha);
      writes++;
      if (options.method === 'DELETE') { repo.delete(filename); return Response.json({}); }
      const result = { type: 'file', sha: `write-${writes}`, content: body.content };
      repo.set(filename, result);
      return Response.json({ content: result });
    }
    return Response.json(repo.get(filename) || {}, { status: repo.has(filename) ? 200 : 404 });
  };
  const read = filename => JSON.parse(schema.decodeBase64Content(repo.get(filename).content));
  try {
    // A clean rebase still needs a write: otherwise Save leaves stale baseline
    // metadata online and every subsequent editor replays the old delta.
    repo.set(schema.DRAFT_FILE, file({ ...original, _baseShas: shared._baseShas }, 'compatible'));
    await draft.initSession('token', 'clean-rebase-regression');
    assert.equal(draft.doc('wiki').categories[0].desc, published.wiki.categories[0].desc);
    await draft.saveDraft('token');
    assert.equal(writes, 1);
    assert.deepEqual(read(schema.DRAFT_FILE)._baseShas, { wiki: 'wiki', game: 'game', updates: 'updates' });
    assert.deepEqual(read(schema.DRAFT_FILE).wiki, published.wiki);
    await draft.initSession('token', 'clean-rebase-regression');
    await draft.saveDraft('token');
    assert.equal(writes, 1, 'a second Save must be a no-op after persisting the new base');
    repo.set(schema.DRAFT_FILE, file(shared, 'shared'));
    writes = 0;
    const info = await draft.initSession('token', 'content-conflict-regression');
    assert.equal(info.contentConflict, true);
    assert.equal(draft.doc('wiki').categories[0].desc, published.wiki.categories[0].desc);
    assert.equal(writes, 0);
    const before = draft.snapshotDocs();
    await assert.rejects(draft.saveDraft('token'), { name: 'SyncConflict' });
    await assert.rejects(draft.publishChanges('token'), { name: 'SyncConflict' });
    assert.equal(writes, 0);
    assert.deepEqual(draft.snapshotDocs(), before);
    const choose = () => true;
    choose.resolveConflict = conflict => {
      assert.equal(conflict.source, 'shared');
      assert.equal(conflict.local, 'Older shared description');
      assert.equal(conflict.remote, 'Recovered published description');
      return 'remote';
    };
    const background = assert.rejects(draft.syncRemote('token'), { name: 'SyncConflict' });
    await draft.saveDraft('token', choose);
    await background;
    assert.equal(read(schema.DRAFT_FILE).wiki.categories[0].desc, published.wiki.categories[0].desc);
    assert.deepEqual(read(schema.FILES.wiki), published.wiki);
    assert.equal((await draft.initSession('token', 'content-conflict-regression')).contentConflict, false);

    const restored = structuredClone(published);
    restored.wiki.categories[0].desc = 'Downloaded wiki';
    restored.game.uiCopy.heroTitle = 'Downloaded game settings';
    restored.updates.versions[0].entries[0].title = 'Downloaded release';
    const beforeRestore = writes;
    draft.restoreDraftSnapshot(restored);
    assert.equal(writes, beforeRestore);
    assert.deepEqual(draft.snapshotDocs(), restored);
    await draft.saveDraft('token');
    for (const name of Object.keys(schema.FILES)) assert.deepEqual(read(schema.DRAFT_FILE)[name], restored[name]);
    for (const [name, filename] of Object.entries(schema.FILES)) assert.deepEqual(read(filename), published[name]);
    await draft.initSession('token', 'content-conflict-regression');
    assert.deepEqual(draft.snapshotDocs(), restored);
    failPublish = true;
    await assert.rejects(draft.publishChanges('token'), /Temporary publishing failure/);
    assert.equal(repo.has(schema.DRAFT_FILE), true);
    assert.deepEqual(draft.snapshotDocs(), restored);
    await draft.publishChanges('token');
    for (const [name, filename] of Object.entries(schema.FILES)) assert.deepEqual(read(filename), restored[name]);
    assert.equal(repo.has(schema.DRAFT_FILE), false);
    assert.deepEqual((await draft.initSession('token', 'content-conflict-regression')).contentConflict, false);
  } finally { global.fetch = previousFetch; }
});

