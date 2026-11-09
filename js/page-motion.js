let animations = [];
const reduced = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
export function clearPageMotion() { animations.forEach(a=>a.cancel()); animations=[]; }
export function mountPageMotion(root, {animate=true}={}) {
  if (!animate || reduced()) return;
  const blocks = [...root.querySelectorAll('.cat-hero,.hero,.pill-nav,.section-head,.upgrade-card')].filter(el=>el.getBoundingClientRect().top<innerHeight).slice(0,10);
  const targets = blocks.length ? blocks : [root];
  animations = targets.map((el,i)=>el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:Math.min(i*24,150),easing:'cubic-bezier(.2,.7,.3,1)',fill:'backwards'}));
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(reduced())clearPageMotion();});
new MutationObserver(()=>{if(reduced())clearPageMotion();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
