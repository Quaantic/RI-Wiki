// Publish-time page-change index. Pure and bounded: no write occurs except in
// the existing manual Publish GitHub commit.
function pages(wiki) {
 const routes=new Map();
 for(const cat of wiki?.categories||[]){
  const {subcategories,...data}=cat;
  routes.set(`#/${cat.id}`,data);
  const visit=items=>{for(const item of items||[]){
   const {children,...fields}=item;
   routes.set(`#/${cat.id}/${item.id}`,fields);
   visit(item.children);
  }};
  visit(subcategories);
 }
 return routes;
}
function changeIndex(before,after,previous={},at=new Date().toISOString()) {
 const old=pages(before.wiki),now=pages(after.wiki);
 const changed=new Set();
 for(const [route,fields] of now)if(JSON.stringify(fields)!==JSON.stringify(old.get(route)))changed.add(route);
 const b=before.game||{},a=after.game||{};
 const allRoutes=new Map([...Object.entries(b.upgrades?.routes||{}),...Object.entries(a.upgrades?.routes||{})]);
 for(const [route,section] of allRoutes){
  const oldValue=b.upgrades?.sections?.[b.upgrades?.routes?.[route]],newValue=a.upgrades?.sections?.[a.upgrades?.routes?.[route]];
  if(JSON.stringify(oldValue)!==JSON.stringify(newValue))changed.add(`#/${route}`);
 }
 const calcPages=new Set([...Object.keys(b.calculators?.pages||{}),...Object.keys(a.calculators?.pages||{})]);
 for(const route of calcPages)if(JSON.stringify(b.calculators?.pages?.[route])!==JSON.stringify(a.calculators?.pages?.[route]))changed.add(`#/${route}`);
 // Mark category when other game data changed. Existing published routes are preserved.
 for(const [key,category] of [['mining','mining'],['runes','runes'],['dungeon','dungeon'],['progression','main']]){
  if(JSON.stringify(b[key])!==JSON.stringify(a[key]))changed.add(`#/${category}`);
 }
 if(JSON.stringify(before.updates)!==JSON.stringify(after.updates))changed.add('#/updates');
 const result={};
 for(const [route,stamp] of Object.entries(previous?.routes||{}))if(typeof stamp==='string'&&/^#\/[\w-]+(?:\/[\w-]+)?$/.test(route))result[route]=stamp;
 for(const route of changed)if(now.has(route)||route==='#/updates')result[route]=at;
 // Bound retained history if route count ever grows significantly.
 const sorted=Object.entries(result).sort((a,b)=>b[1].localeCompare(a[1])).slice(0,800);
 return {format:1,publishedAt:at,routes:Object.fromEntries(sorted)};
}
module.exports={changeIndex};
