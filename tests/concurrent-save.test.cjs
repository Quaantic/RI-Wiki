const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('a racing save rebases only local changes and retries history without overwriting a collaborator',async()=>{
  const schema=await import('../js/content-schema.js');
  const editorA=await import('../js/edit/draft.js?concurrent-a');
  const editorB=await import('../js/edit/draft.js?concurrent-b');
  const repo=new Map(Object.values(schema.FILES).map(path=>[path,{type:'file',sha:path,content:Buffer.from(fs.readFileSync(path)).toString('base64')}]));
  const decode=file=>JSON.parse(Buffer.from(file.content,'base64').toString());
  const file=(value,sha)=>({type:'file',sha,content:Buffer.from(JSON.stringify(value)).toString('base64')});
  const originalFetch=global.fetch;
  let revision=0,draftWrites=0,collision=true,historyCollision=true;
  let websiteAfterFriendSave;
  global.fetch=async(url,options={})=>{
    const target=new URL(url).pathname.split('/contents/')[1];
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);
      if(target===schema.DRAFT_FILE&&options.headers.Authorization==='Bearer editor-a'&&collision){
        collision=false;
        await editorB.saveDraft('editor-b');
        websiteAfterFriendSave=decode(repo.get(target));
      }
      if(target==='content/edit-history.json'&&options.headers.Authorization==='Bearer editor-a'&&historyCollision){
        historyCollision=false;
        const older=decode(repo.get(target));
        older.entries.push({id:'extra-collaborator',actor:'editor-c',text:'Another update',at:Date.now(),pending:true});
        repo.set(target,file(older,`revision-${++revision}`));
      }
      if(body.sha!==repo.get(target)?.sha)return new Response(JSON.stringify({message:'Revision changed'}),{status:409});
      const next={type:'file',sha:`revision-${++revision}`,content:body.content};
      repo.set(target,next);if(target===schema.DRAFT_FILE)draftWrites++;
      return new Response(JSON.stringify({content:next}));
    }
    return new Response(JSON.stringify(repo.get(target)||{}),{status:repo.has(target)?200:404});
  };
  try{
    await editorA.initSession('editor-a','test-race-a');
    await editorB.initSession('editor-b','test-race-b');
    editorA.applyDraftToSite();
    assert.equal(editorA.draftDirty(),false,'rendering must not silently change game data');
    editorA.setValue('updates','versions.0.entries.0.description','My release note');
    const life=editorB.doc('wiki').categories.findIndex(cat=>cat.id==='life');
    const tree=editorB.doc('wiki').categories[life].subcategories.findIndex(page=>page.id==='tree');
    editorB.pushValue('wiki',`categories.${life}.subcategories.${tree}.children`,{id:'tree-tier',name:'Tree Tier',desc:'Tree tiers',icon:'arrow-up',children:[]});
    editorB.setValue('game','progression.stages.life/tree-tier',{title:'Tiers',stages:[{num:'1',title:'Tier 1',requirements:['25K XP'],boosts:['More Logs'],unlocks:{area:'',places:[],features:[]}}]});
    await Promise.all([editorA.saveDraft('editor-a'),editorA.saveDraft('editor-a')]);
    const saved=decode(repo.get(schema.DRAFT_FILE));
    assert.deepEqual(saved.wiki,websiteAfterFriendSave.wiki);
    assert.deepEqual(saved.game,websiteAfterFriendSave.game);
    assert.equal(saved.updates.versions[0].entries[0].description,'My release note');
    assert.equal(saved.game.progression.stages['life/tree-tier'].stages[0].requirements[0],'25K XP');
    const history=decode(repo.get('content/edit-history.json')).entries;
    assert.deepEqual(new Set(history.map(entry=>entry.actor)),new Set(['test-race-a','test-race-b','editor-c']));
    assert.equal(new Set(history.map(entry=>entry.id)).size,history.length);
    assert.equal(draftWrites,2);
    await editorA.saveDraft('editor-a');
    assert.equal(draftWrites,2,'Save without local changes must not write a shared revision');
    assert.equal(await editorB.syncRemote('editor-b'),true);
    assert.equal(editorB.doc('updates').versions[0].entries[0].description,'My release note');
    assert.deepEqual(editorB.doc('wiki'),saved.wiki);
  }finally{global.fetch=originalFetch;}
});
