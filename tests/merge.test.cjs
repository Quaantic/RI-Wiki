const { test } = require('node:test');
const assert = require('node:assert/strict');

test('concurrent FAQ and Miscellaneous additions both survive', async () => {
  const { mergeDocuments } = await import('../js/edit/merge.js');
  const base = { categories: [{ id: 'main', name: 'Main', subcategories: [] }] };
  const local = structuredClone(base), remote = structuredClone(base);
  local.categories.push({ id: 'faq', name: 'FAQ', subcategories: [] });
  remote.categories.push({ id: 'misc', name: 'Miscellaneous', subcategories: [] });
  assert.deepEqual(mergeDocuments(base, local, remote).categories.map((cat) => cat.id), ['main', 'misc', 'faq']);
});

test('independent edits merge despite remote reordering', async () => {
  const { mergeDocuments } = await import('../js/edit/merge.js');
  const base = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const result = mergeDocuments(base, [{ id: 'a', name: 'Changed A' }, base[1]], [{ id: 'b', name: 'Changed B' }, base[0]]);
  assert.deepEqual(result, [{ id: 'b', name: 'Changed B' }, { id: 'a', name: 'Changed A' }]);
});

test('same-field conflicts and delete/edit collisions preserve both inputs', async () => {
  const { mergeDocuments, SyncConflict } = await import('../js/edit/merge.js');
  const base = [{ id: 'faq', name: 'FAQ' }];
  const local = [{ id: 'faq', name: 'My FAQ' }];
  const remote = [{ id: 'faq', name: 'Their FAQ' }];
  assert.throws(() => mergeDocuments(base, local, remote), SyncConflict);
  assert.throws(() => mergeDocuments(base, local, []), SyncConflict);
  assert.equal(local[0].name, 'My FAQ');
  assert.equal(remote[0].name, 'Their FAQ');
});

test('a deletion is applied only when the other editor left that entry unchanged', async () => {
  const { mergeDocuments } = await import('../js/edit/merge.js');
  const base = [{ id: 'faq', name: 'FAQ' }, { id: 'misc', name: 'Miscellaneous' }];
  assert.throws(() => mergeDocuments(base, [base[0]], [base[0], { ...base[1], name: 'Edited' }]), /Both editors changed/);
  assert.deepEqual(mergeDocuments(base, [base[0]], [...base, { id: 'new', name: 'New' }]), [base[0], { id: 'new', name: 'New' }]);
});

test('collaborators can add separate updates to the same release',async()=>{
  const {mergeDocuments}=await import('../js/edit/merge.js');
  const {normalizeReleases}=await import('../js/releases.js');
  const base=normalizeReleases([{version:'1.01',entries:[{context:'Feature',title:'Existing',description:'Existing',href:''}]}]);
  const local=structuredClone(base),remote=structuredClone(base);
  local[0].entries.push({id:'local-update',context:'Feature',title:'Local',description:'L',href:''});
  remote[0].entries.push({id:'remote-update',context:'Bugs',title:'Remote',description:'R',href:''});
  assert.equal(mergeDocuments(base,local,remote)[0].entries.length,3);
});
