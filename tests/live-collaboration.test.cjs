const test=require('node:test');
const assert=require('node:assert/strict');
const {row,save,configured}=require('../server/live-store.cjs');

test('CAS saves one concurrent revision and rejects the stale one without replacing data',async()=>{
  const beforeEnv={...process.env};
  process.env.SUPABASE_URL='https://fake.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='server-side-test-key';
  const saved={revision:3,documents:{wiki:{title:'old'},game:{},updates:{}},updated_by:'before',published_revision:0};
  const original=global.fetch;
  global.fetch=async(url,options)=>{
    let payload;
    if(url.includes('ri_wiki_live?select='))payload=[JSON.parse(JSON.stringify(saved))];
    else if(url.includes('rpc/ri_wiki_save')){
      const input=JSON.parse(options.body);
      if(input.expected_revision!==saved.revision)payload=[{saved:false,current_revision:saved.revision}];
      else {saved.revision++;saved.documents=input.next_documents;saved.updated_by=input.editor_name;payload=[{saved:true,current_revision:saved.revision}];}
    } else throw Error('Unexpected database endpoint '+url);
    return {ok:true,status:200,text:async()=>JSON.stringify(payload)};
  };
  try{
    assert.equal(configured(),true);
    assert.equal((await row()).revision,3);
    const first=await save(3,{wiki:{title:'first'},game:{},updates:{}},'Quaantic','test');
    const second=await save(3,{wiki:{title:'stale'},game:{},updates:{}},'zzinss','test');
    assert.deepEqual(first,{saved:true,revision:4});
    assert.deepEqual(second,{saved:false,revision:4});
    assert.equal(saved.documents.wiki.title,'first');
    assert.equal(saved.revision,4);
  }finally{global.fetch=original;process.env.SUPABASE_URL=beforeEnv.SUPABASE_URL;process.env.SUPABASE_SERVICE_ROLE_KEY=beforeEnv.SUPABASE_SERVICE_ROLE_KEY;}
});

test('three-way merge combines distinct pages and rejects simultaneous edits of the same value',async()=>{
  const {mergeDocuments}=await import('../js/edit/merge.js');
  const base={wiki:{runes:{text:'old'},life:{text:'old'}}};
  const a=structuredClone(base);a.wiki.runes.text='rune update';
  const b=structuredClone(base);b.wiki.life.text='life update';
  assert.deepEqual(mergeDocuments(base,a,b),{wiki:{runes:{text:'rune update'},life:{text:'life update'}}});
  b.wiki.runes.text='conflicting rune edit';
  assert.throws(()=>mergeDocuments(base,a,b),/Both editors changed/);
});
