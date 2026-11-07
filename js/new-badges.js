import { CATEGORIES, getSubcategory } from './data/wiki-data.js';
// Per-visitor read receipts for newly published page changes. Nothing is sent
// to the backend; the user can clear localStorage to see badges again.
const STORAGE='ri-seen-content-revisions-v1';
const safeRoute=(href)=>{
 try{const hash=href.startsWith('#')?href:new URL(href,location.href).hash;
  const match=hash.match(/^(#\/[\w-]+(?:\/[\w-]+)?)(?:\?.*)?$/);
  return match ? match[1] : null;
 }catch{return null;}
};
let latest={};let seen={};let ancestorsOfChanges={};
try{seen=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{seen={};}
function remember(route){
 if(!route||!latest[route]||seen[route]===latest[route])return;
 seen[route]=latest[route];
 try{localStorage.setItem(STORAGE,JSON.stringify(seen));}catch{}
 decorate();
}
// The sidebar also answers "which pages in this category were updated?".
// It lists only unread, published changes and refreshes after each visit.
function syncRecentlyUpdated(){
 for(const group of document.querySelectorAll('#sidebar-nav .nav-group[data-cat]')){
  const categoryId=group.dataset.cat;
  const prefix=`#/${categoryId}/`;
  const unread=Object.entries(latest)
   .filter(([route,stamp])=>route.startsWith(prefix)&&seen[route]!==stamp)
   .sort((a,b)=>String(b[1]).localeCompare(String(a[1])));
  const existing=group.querySelector(':scope > .ri-recent-updates');
  if(!unread.length){existing?.remove();continue;}
  const stamp=unread.map(([r,t])=>`${r}@${t}`).join('|');
  if(existing?.dataset.stamp===stamp)continue;
  const summary=document.createElement('div');
  summary.className='ri-recent-updates';
  summary.dataset.stamp=stamp;
  summary.setAttribute('aria-label','Recently updated pages in this category');
  const title=document.createElement('span');
  title.className='ri-recent-updates__title';title.textContent='Recently updated';
  summary.appendChild(title);
  unread.slice(0,4).forEach(([route])=>{
   const subId=route.slice(prefix.length);
   const page=getSubcategory(categoryId,subId);
   if(!page)return;
   const link=document.createElement('a');
   link.className='ri-recent-updates__link';link.href=route;
   const label=document.createElement('span');
   label.textContent=[...(page.parentChain||[]).map(p=>p.name),page.name].join(' › ');
   link.appendChild(label);summary.appendChild(link);
  });
  if(unread.length>4){
   const extra=document.createElement('span');extra.className='ri-recent-updates__more';
   extra.textContent=`+${unread.length-4} more updated pages`;summary.appendChild(extra);
  }
  if(existing)existing.replaceWith(summary);
  else group.querySelector(':scope > .nav-sub')?.before(summary);
 }
}
function decorate(){
 syncRecentlyUpdated();
 for(const link of document.querySelectorAll('a[href^="#/"]')){
  if(link.closest('.ri-edit-bar,.ri-edit-popover,[data-ri-nav-tools],.ri-review-dialog'))continue;
  const route=safeRoute(link.getAttribute('href')||'');
  const selfUnread=route&&latest[route]&&latest[route]!==seen[route];
  // Parent categories/sections stay NEW until every changed child was visited.
  const descendants=route&&ancestorsOfChanges[route]||[];
  const unread=selfUnread||descendants.some(child=>latest[child]&&seen[child]!==latest[child]);
  const badge=link.querySelector(':scope > .ri-new-tag');
  if(unread){
    if(!badge){const tag=document.createElement('span');tag.className='ri-new-tag';tag.textContent='NEW';tag.setAttribute('aria-label','Updated since your last visit');link.appendChild(tag);}
  }else badge?.remove();
 }
}
export async function initNewBadges(){
 try{
  const res=await fetch('content/change-index.json',{cache:'no-store'});
  if(!res.ok)return;
  const payload=await res.json();
  if(payload.format!==1||!payload.routes||typeof payload.routes!=='object')return;
  latest=Object.fromEntries(Object.entries(payload.routes).filter(([route,stamp])=>safeRoute(route)&&typeof stamp==='string'));
  // Resolve nested wiki hierarchy; routes are flattened as #/category/page.
  const ancestors = {};
  for(const category of CATEGORIES){
    const traverse=(pages, parents=[])=>{
      for(const page of pages||[]){
        const route=`#/${category.id}/${page.id}`;
        for(const parent of [`#/${category.id}`,...parents]){
          (ancestors[parent] ||= []).push(route);
        }
        traverse(page.children,[...parents,route]);
      }
    };
    traverse(category.subcategories);
  }
  ancestorsOfChanges=ancestors;
  remember(safeRoute(location.hash));decorate();
  window.addEventListener('hashchange',()=>{remember(safeRoute(location.hash));requestAnimationFrame(decorate)});
  window.addEventListener('ri-route-rendered',decorate);
  window.addEventListener('ri-edit-content',()=>requestAnimationFrame(decorate));
 }catch{/* Not available on older deployments; badge system is optional. */}
}
