// Per-visitor read receipts for newly published page changes. Nothing is sent
// to the backend; the user can clear localStorage to see badges again.
const STORAGE='ri-seen-content-revisions-v1';
const safeRoute=(href)=>{
 try{const hash=href.startsWith('#')?href:new URL(href,location.href).hash;
  return /^#\/[\w-]+(?:\/[\w-]+)?$/.test(hash)?hash:null;
 }catch{return null;}
};
let latest={};let seen={};
try{seen=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{seen={};}
function remember(route){
 if(!route||!latest[route]||seen[route]===latest[route])return;
 seen[route]=latest[route];
 try{localStorage.setItem(STORAGE,JSON.stringify(seen));}catch{}
 decorate();
}
function decorate(){
 for(const link of document.querySelectorAll('a[href^="#/"]')){
  if(link.closest('.ri-edit-bar,.ri-edit-popover,[data-ri-nav-tools],.ri-review-dialog'))continue;
  const route=safeRoute(link.getAttribute('href')||'');
  const unread=route&&latest[route]&&latest[route]!==seen[route];
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
  remember(safeRoute(location.hash));decorate();
  window.addEventListener('hashchange',()=>{remember(safeRoute(location.hash));requestAnimationFrame(decorate)});
  window.addEventListener('ri-route-rendered',decorate);
  window.addEventListener('ri-edit-content',()=>requestAnimationFrame(decorate));
 }catch{/* Not available on older deployments; badge system is optional. */}
}
