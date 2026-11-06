const {test}=require('node:test');
const assert=require('node:assert/strict');
const {changeIndex}=require('../server/change-index.cjs');

test('NEW badges only on published changed pages and preserve prior read stamps',()=>{
 const a={wiki:{categories:[{id:'life',name:'Life',subcategories:[{id:'tree',name:'Tree',desc:'before',children:[]}]}]},game:{upgrades:{routes:{'life/tree':'tree'},sections:{tree:{name:'Tree',upgrades:[]}}}},updates:{versions:[]}};
 const b=structuredClone(a);b.wiki.categories[0].subcategories[0].desc='after';
 const old='2026-11-01T00:00:00.000Z',at='2026-11-06T18:00:00.000Z';
 const updated=changeIndex(a,b,{routes:{'#/life':old}},at);
 assert.equal(updated.routes['#/life/tree'],at);
 assert.equal(updated.routes['#/life'],old);
 assert.equal(Object.keys(updated.routes).length,2);
});

test('upgrade calculator sums level prices and tracks effects without executing user code',async()=>{
 const {calculateUpgrade}=await import('../js/calculator.js');
 const u={name:'Test',cap:10,price:'10*(L+1)',multi:'1+L*0.1'};
 const result=calculateUpgrade(u,1,3);
 assert.equal(result.total,50);
 assert.equal(result.effect,1.3);
 assert.equal(result.next,40);
 assert.equal(result.from,1);
 assert.equal(result.to,3);
 const invalid=calculateUpgrade({...u,price:'document.cookie'},0,2);
 assert.equal(invalid.total,null);
 assert.equal(invalid.missing,true);
});

test('version comparison shows added fields without mutating source docs',async()=>{
 const {documentChanges}=await import('../js/edit/version-tools.js');
 const before={wiki:{categories:[{id:'a',name:'Old'}]},game:{},updates:{}};
 const after=structuredClone(before);after.wiki.categories[0].name='New';
 const result=documentChanges(before,after);
 assert.ok(result.some(entry=>entry.path.includes('a.name')&&entry.before==='Old'&&entry.after==='New'));
 assert.equal(before.wiki.categories[0].name,'Old');
});
