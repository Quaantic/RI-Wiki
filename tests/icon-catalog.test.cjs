const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('icon search finds game concepts in English and Portuguese and exposes every result',async()=>{
  const {searchIcons}=await import('../js/icon-catalog.js');
  for(const term of ['fire','fogo','sword','espada','cristal','poção','dragão','minério','runa']) assert.ok(searchIcons(term,'game').length,term);
  assert.equal(searchIcons('fire')[0].id,'game-icons:fire');
  assert.ok(!searchIcons('espada').some(icon=>icon.name==='armadillo'));
  assert.ok(searchIcons('fire','lucide').some(icon=>icon.id==='flame'));
  assert.ok(searchIcons('fire sword','game').every(icon=>/fire|flame|burn/.test(icon.name)&&/sword|blade|weapon|dagger/.test(icon.name)));
  assert.equal(searchIcons('zzzz-nonexistent-zzzz').length,0);
  assert.equal(searchIcons('','game').length,4133);
  assert.ok(searchIcons('').length>4133);
});

test('every Game Icon has a local SVG symbol; existing Lucide rendering is unchanged',async()=>{
  const {GAME_ICON_NAMES}=await import('../js/lib/game-icon-names.js');
  const {gameIconReference}=await import('../js/icon-catalog.js');
  const {icon}=await import('../js/ui.js');
  const cache=new Map();
  for(const name of GAME_ICON_NAMES){
    const [file,id]=gameIconReference(`game-icons:${name}`).split('#');
    if(!cache.has(file))cache.set(file,fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
    assert.ok(cache.get(file).includes(`<symbol id="${id}"`),name);
  }
  assert.equal(gameIconReference('game-icons:../bad'),null);
  assert.equal(gameIconReference('flame'),null);
  assert.match(icon('game-icons:fire'),/viewBox="0 0 512 512"/);
  assert.match(icon('game-icons:fire'),/<use href="images\/icons\/game-icons\/0.svg#fire"/);
  assert.match(icon('flame'),/viewBox="0 0 24 24"/);
  assert.equal(icon('fire'),icon('flame'));
});
