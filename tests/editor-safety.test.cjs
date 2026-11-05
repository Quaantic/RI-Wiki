const {test}=require('node:test');
const assert=require('node:assert/strict');

function storage(){
  const items=new Map();
  return {getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};
}
test('recovery survives a fresh session and tolerates unavailable or corrupt storage',async()=>{
  const recovery=await import('../js/edit/recovery.js');
  global.localStorage=storage();global.sessionStorage=storage();
  assert.equal(recovery.writeRecovery('draft',{text:'Unsaved'}),true);
  global.sessionStorage=storage();
  const fresh=await import('../js/edit/recovery.js?fresh-session');
  assert.equal(fresh.readRecovery('draft').text,'Unsaved');
  recovery.clearRecovery('draft');
  localStorage.setItem('draft','{bad json');
  sessionStorage.setItem('draft',JSON.stringify({text:'Fallback',savedAt:1}));
  assert.equal(recovery.readRecovery('draft').text,'Fallback');
  localStorage.setItem('draft',JSON.stringify({text:'Newer',savedAt:2}));
  assert.equal(recovery.readRecovery('draft').text,'Newer');
  recovery.clearRecovery('draft');assert.equal(recovery.readRecovery('draft'),null);
  global.localStorage={setItem(){throw Error('Quota');},getItem(){throw Error('Blocked');}};
  assert.equal(recovery.writeRecovery('draft',{text:'Session fallback'}),true);
  assert.equal(recovery.readRecovery('draft').text,'Session fallback');
  global.sessionStorage=global.localStorage;
  assert.equal(recovery.writeRecovery('draft',{text:'Cannot save'}),false);
  assert.equal(recovery.readRecovery('draft').text,'Cannot save');
  assert.equal(recovery.isRecoveryStored('draft'),false);
  recovery.clearRecovery('draft');
});
test('closing and editing a different form preserves both; applying removes only that form',async()=>{
  const {readRecovery,storeFormRecovery,removeFormRecovery}=await import('../js/edit/recovery.js');
  global.localStorage=storage();global.sessionStorage=storage();
  const a={hash:'#/life/frost-generators',binding:{docName:'game',valuePath:'machines.0'},targetId:'generator-a',fields:[{value:'First unfinished edit'}]};
  const b={hash:'#/updates',binding:{docName:'updates',valuePath:'versions.0'},fields:[{value:'Second unfinished edit'}]};
  storeFormRecovery('forms',a);storeFormRecovery('forms',b);
  assert.equal(readRecovery('forms').pending[0].fields[0].value,'First unfinished edit');
  storeFormRecovery('forms',{...a,binding:{...a.binding,valuePath:'machines.1'},fields:[{value:'Moved generator'}]});
  assert.equal(readRecovery('forms').pending.length,1);
  removeFormRecovery('forms',{...a,binding:{...a.binding,valuePath:'machines.1'}});
  assert.equal(readRecovery('forms').fields[0].value,'Second unfinished edit');
  removeFormRecovery('forms',b);assert.equal(readRecovery('forms'),null);
});
test('release filters honor feature thresholds, major precedence and UI/bug-only hotfixes',async()=>{
  const {releaseKind,formatReleaseVersion}=await import('../js/releases.js');
  assert.equal(formatReleaseVersion('v1.02'),'v1.02');
  assert.equal(formatReleaseVersion('1.02'),'v1.02');
  const kind=(...contexts)=>releaseKind({entries:contexts.map(context=>({context}))});
  assert.equal(kind('Feature','Feature','Feature','Changes'),'major');
  assert.equal(kind('Feature','Changes','Changes','Bugs'),'minor');
  assert.equal(kind('Changes','Changes','Changes'),'minor');
  assert.equal(kind('UI','Bugs'),'hotfix');
  assert.equal(kind('Bugs'),'hotfix');
  assert.equal(kind('Feature','Bugs'),'other');
  assert.equal(kind('Feature','Changes'),'other');
  assert.equal(kind(),'other');
});
test('custom generator formulas drive output and costs while default seeding preserves edits',async()=>{
  const {calculateGenerator,seedGeneratorFormulas,GENERATOR_FORMULAS}=await import('../js/data/generators.js');
  const machine={id:'machine',startIncome:2,startTime:5,maxLevel:99,maxSpeed:99,maxTier:20,scale:1,tierPrice:50,levelPrice:5,speedPrice:10,incomeFormula:'formula: baseIncome * (L + 1)',cycleFormula:'formula: baseTime / (S + 1)',levelCostFormula:'formula: levelPrice * (L + 1)'};
  const game={calculators:{pages:{frost:{kind:'generators',machines:[machine]}}}};
  seedGeneratorFormulas(game);seedGeneratorFormulas(game);
  assert.equal(machine.incomeFormula,'formula: baseIncome * (L + 1)');
  assert.equal(machine.tierCostFormula,GENERATOR_FORMULAS.tierCostFormula);
  const result=calculateGenerator(machine,{level:10,speed:4,tier:1});
  assert.equal(result.income,22);assert.equal(result.seconds,1);assert.equal(result.perSecond,22);assert.equal(result.levelCost,55);
  assert.throws(()=>calculateGenerator({...machine,incomeFormula:'formula: unknown + 1'}),/Unknown formula variable/);
});
