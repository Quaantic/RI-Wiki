const {test} = require('node:test');
const assert = require('node:assert/strict');
test('Quaantic priority applies only to conflicting values and survives other editors saving', async () => {
 const {authorsForChanges, priorityResolver} = await import('../js/edit/authorship.js');
 const {mergeDocuments} = await import('../js/edit/merge.js');
 const base = {title:'Original',description:'Original'};
 const owner = {...base,title:'Owner'};
 const friend = {...base,title:'Friend',description:'Friend description'};
 const oa=authorsForChanges(base,owner,{},'Quaantic');
 const fa=authorsForChanges(base,friend,{},'contributor');
 const expected={title:'Owner',description:'Friend description'};
 assert.deepEqual(mergeDocuments(base,owner,friend,'content',priorityResolver(null,oa,fa)),expected);
 assert.deepEqual(mergeDocuments(base,friend,owner,'content',priorityResolver(null,fa,oa)),expected);
 const retained=authorsForChanges(owner,expected,oa,'contributor');
 assert.equal(retained['content.title'].actor,'Quaantic');
 assert.deepEqual(mergeDocuments(owner,owner,expected,'content',priorityResolver(null,oa,retained)),expected,'an unchanged tab cannot overwrite newer content');
 const tab={...base,title:'Unsaved owner tab'};
 assert.equal(mergeDocuments(base,tab,owner,'content',priorityResolver(null,authorsForChanges(base,tab,{},'quaantic'),oa)).title,'Owner');
});
