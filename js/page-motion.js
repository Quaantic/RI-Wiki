// One route-scoped controller. Content is visible by default; only running
// native animations supply the temporary entrance opacity/transform.
const HEADINGS = 'h1, .ri-admin-section__title';
const DESCRIPTIONS = '.hero__sub, .cat-hero__tagline, .cat-hero__description, .page-head p, .notfound p, .upd-hero__intro p, .search-page__head > p';
const CONTROLS = '.hero__badge, .hero__search, .hero__chips, .hero__art, .hero__stats, .cat-hero__crumbs, .cat-hero__icon, .cat-hero__facts, .vitals, .sub-pills-wrap, .ri-page-content-tools, .upd-filters, .search-page__input, .filters-row, .reset-tier-head, .reset-calc-power';
const BLOCKS = '.section-head, .section-title, .cat-card, .info-card, .sub-link, .upgrade-card, .stage-card, .milestone-card, .rune-card, .ore-card, .layer-card, .area-card, .gear-card, .reset-calc-card, .table-wrap, .result-item, .ri-text-section, .ri-faq-item, .upd-version, .empty-state, .stat-card, .feature-card, .sub-pager, .formula-group, .formula-card, .callout, .fb-cat, .fb-form, .section > p, .section > h2, .section > h3, .reveal';
const SELECTORS = [HEADINGS, DESCRIPTIONS, CONTROLS, BLOCKS].join(',');
let active = null;
const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function clearPageMotion() {
  if (!active) return;
  const state = active;
  active = null;
  state.observer?.disconnect();
  state.mutations?.disconnect();
  state.settings?.disconnect();
  state.boot?.disconnect();
  state.media?.removeEventListener('change', state.onPreference);
  cancelAnimationFrame(state.frame);
  for (const animation of state.animations) animation.cancel();
  state.animations.clear();
}

function play(state, el, delay = 0) {
  if (active !== state || !el.isConnected || reduced() || state.animations.size >= 40) return;
  // No persistent hidden classes or fill-forwards: failure/cancellation exposes
  // the normal CSS immediately and doesn't replace hover transforms afterward.
  try {
    const animation = el.animate([
      { opacity: 0, transform: 'translate3d(0, 14px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration: 560, delay, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'backwards' });
    state.animations.add(animation);
    animation.finished.then(() => state.animations.delete(animation), () => state.animations.delete(animation));
  } catch { /* Animation support is optional; content stays visible. */ }
}

function collect(state, initial = false, animateVisible = true, startDelay = 0) {
  if (active !== state || !state.root.isConnected || reduced()) return;
  // Search can replace results without changing routes. Don't retain detached
  // offscreen results in IntersectionObserver during a long editing session.
  for (const el of state.pending) {
    if (!state.root.contains(el)) {
      state.observer.unobserve(el);
      state.pending.delete(el);
    }
  }
  const candidates = [...state.root.querySelectorAll(SELECTORS)];
  const selected = new Set(candidates);
  const viewport = window.innerHeight;
  const visible = [];
  // Read geometry first, then start animations: no alternating layout writes.
  for (const el of candidates) {
    if (state.seen.has(el) || el.closest('[hidden]')) continue;
    let parent = el.parentElement, nested = false;
    while (parent && parent !== state.root) {
      if (selected.has(parent)) { nested = true; break; }
      parent = parent.parentElement;
    }
    if (nested) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    state.seen.add(el);
    if (box.bottom <= 0) continue;
    if (box.top < viewport) { if (animateVisible) visible.push(el); }
    else if (state.observer && state.pending.size < 240) {
      state.pending.add(el);
      state.observer.observe(el);
    }
  }
  visible.sort((a,b) => priority(a)-priority(b));
  visible.slice(0,32).forEach((el,i) => play(state, el, startDelay + (initial ? Math.min(i,7)*55 : Math.min(i,4)*45)));
}

function priority(el) {
  return el.matches(HEADINGS) ? 0 : el.matches(DESCRIPTIONS) ? 1 : el.matches(CONTROLS) ? 2 : 3;
}

export function mountPageMotion(root, { animate = true } = {}) {
  clearPageMotion();
  root.classList.add('ri-page-motion');
  root.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
  if (!root.isConnected || reduced() || typeof root.animate !== 'function') return;
  const state = { root, frame: 0, started: false, seen: new WeakSet(), pending: new Set(), animations: new Set() };
  active = state;
  if ('IntersectionObserver' in window) {
    state.observer = new IntersectionObserver(entries => {
      if (active !== state) return;
      entries.filter(entry=>entry.isIntersecting).forEach((entry,i)=>{
        state.observer.unobserve(entry.target);
        state.pending.delete(entry.target);
        play(state,entry.target,Math.min(i,4)*45);
      });
    }, { threshold: 0.01 });
  }
  state.onPreference = () => { if (reduced() && active === state) clearPageMotion(); };
  state.media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  state.media?.addEventListener('change',state.onPreference);
  state.settings = new MutationObserver(state.onPreference);
  state.settings.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const start = (startDelay = 0) => {
    if (active !== state || !root.isConnected) return;
    state.started = true;
    // In-place saves keep visible content still; offscreen blocks still reveal
    // on their first scroll into view after the refresh.
    collect(state,true,animate,startDelay);
    state.mutations = new MutationObserver(records=>{
      // Calculator text and counters don't need another geometry scan.
      if (records.some(record=>record.type === 'attributes' || [...record.addedNodes,...record.removedNodes].some(node=>
        node.nodeType === 1 && (node.matches(SELECTORS) || node.querySelector(SELECTORS))
      ))) animateDynamicContent(root);
    });
    state.mutations.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  };
  const boot = document.getElementById('boot');
  const afterBoot = () => {
    state.boot?.disconnect();
    // Schedule before the splash fades. Backwards fill holds each element
    // at its starting opacity until the splash transition has finished.
    const transitions = boot?.getAnimations?.() || [];
    const delay = transitions.reduce((remaining, animation) => {
      const end = animation.effect?.getComputedTiming().endTime;
      return Number.isFinite(end) ? Math.max(remaining, end - (animation.currentTime ?? 0)) : remaining;
    }, 0);
    start(delay);
  };
  if (boot && !boot.classList.contains('is-done')) {
    state.boot=new MutationObserver(()=>{if(boot.classList.contains('is-done'))afterBoot();});
    state.boot.observe(boot,{attributes:true,attributeFilter:['class']});
  } else afterBoot();
}

export function animateDynamicContent(root) {
  if (!root?.isConnected) return;
  root.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
  const state=active;
  if (!state?.started || !state.root.contains(root) || reduced()) return;
  cancelAnimationFrame(state.frame);
  state.frame=requestAnimationFrame(()=>collect(state));
}
