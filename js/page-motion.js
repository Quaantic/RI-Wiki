// One route-scoped controller. Content is visible by default; only running
// native animations supply the temporary entrance opacity/transform.
const BREADCRUMBS = '#crumbs, .cat-hero__crumbs';
const ICONS = '.cat-hero__icon, .hero__art, .ri-calc__intro > svg, .notfound > [data-emblem]';
const HEADINGS = 'h1, .ri-admin-section__title';
const DESCRIPTIONS = '.hero__sub, .cat-hero__tagline, .cat-hero__description, .page-head p, .notfound p, .upd-hero__intro p, .search-page__head > p, .ri-calc__intro p';
const CONTROLS = '.hero__badge, .hero__search, .hero__chips > *, .hero__stat, .cat-hero__facts > *, .vitals > *, .pill-nav > .pill, .ri-page-content-tools, .upd-filters > *, .search-page__input, .filters-row > :not(.pill-nav), .reset-tier-head, .reset-calc-power, .upd-hero__eyebrow';
const BLOCKS = '.section-head, .section-title, .cat-card, .info-card, .sub-link, .upgrade-card, .stage-card, .milestone-card, .rune-card, .ore-card, .layer-card, .area-card, .gear-card, .reset-calc-card, .table-wrap, .result-item, .ri-text-section, .ri-faq-item, .upd-version__head, .upd-group__label, .upd-entry, .empty-state, .stat-card, .feature-card, .sub-pager, .formula-group, .formula-card, .ri-calc__form, .ri-calc__result, .ri-calc__formulas, .callout, .fb-cat, .fb-form, .section > p, .section > h2, .section > h3, .reveal';
const SELECTORS = [BREADCRUMBS, ICONS, HEADINGS, DESCRIPTIONS, CONTROLS, BLOCKS].join(',');
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
  state.root.removeEventListener('focusin', state.onInteraction);
  state.root.removeEventListener('pointerdown', state.onInteraction);
  for (const animation of state.animations) animation.cancel();
  state.animations.clear();
}

function play(state, el, delay = 0, duration = 140) {
  if (active !== state || !el.isConnected || reduced()) return;
  // No persistent hidden classes or fill-forwards: failure/cancellation exposes
  // the normal CSS immediately and doesn't replace hover transforms afterward.
  try {
    // Reveal existing rich text without splitting nodes or changing layout.
    const text = el.matches(`${HEADINGS}, ${DESCRIPTIONS}`);
    const frames = text ? [
      { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
    ] : [
      { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ];
    const animation = el.animate(frames, { duration, delay, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'backwards' });
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
  const candidates = [...state.root.querySelectorAll(SELECTORS)].filter(el =>
    // Group wrappers must not swallow individual card entrances.
    !el.matches('.reveal, .formula-group, .ri-text-section') || !el.querySelector(BLOCKS)
  );
  if (initial && document.getElementById('crumbs')) candidates.unshift(document.getElementById('crumbs'));
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
  schedule(state, visible, initial, startDelay);
}

function priority(el) {
  return el.matches(BREADCRUMBS) ? 0 : el.matches(ICONS) ? 1 : el.matches(HEADINGS) ? 2 : el.matches(DESCRIPTIONS) ? 3 : el.matches(CONTROLS) ? 4 : 5;
}

function schedule(state, elements, initial = false, startDelay = 0) {
  const now = performance.now();
  let cursor = now + startDelay;
  if (initial) {
    for (let phase = 0; phase < 5; phase++) {
      const group = elements.filter(el => priority(el) === phase);
      const duration = [70, 80, 120, 140, 100][phase];
      const stagger = phase === 0 ? 0 : phase === 4 ? Math.min(16, 120 / Math.max(1, group.length - 1)) : duration;
      group.forEach((el, i) => play(state, el, cursor - now + i * stagger, duration));
      if (group.length) cursor += (group.length - 1) * stagger + duration;
    }
    state.headerEnd = cursor;
  }
  // Share a timeline across observer callbacks, so starts never collapse together.
  cursor = Math.max(cursor, state.headerEnd, state.nextContent);
  const content = initial ? elements.filter(el => priority(el) === 5) : elements;
  content.slice(0, 32).forEach(el => {
    play(state, el, cursor - now);
    cursor += 32;
  });
  state.nextContent = cursor;
}

export function mountPageMotion(root, { animate = true } = {}) {
  clearPageMotion();
  root.classList.add('ri-page-motion');
  root.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
  if (!animate || !root.isConnected || reduced() || typeof root.animate !== 'function') return;
  const state = { root, frame: 0, started: false, headerEnd: 0, nextContent: 0, seen: new WeakSet(), pending: new Set(), animations: new Set() };
  active = state;
  if ('IntersectionObserver' in window) {
    state.observer = new IntersectionObserver(entries => {
      if (active !== state) return;
      const visible = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
      visible.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      visible.forEach(el => {
        state.observer.unobserve(el);
        state.pending.delete(el);
      });
      schedule(state, visible);
    }, { threshold: 0.01 });
  }
  state.onInteraction = event => {
    for (const animation of state.animations) {
      if (animation.effect?.target?.contains(event.target)) animation.cancel();
    }
  };
  root.addEventListener('focusin', state.onInteraction);
  root.addEventListener('pointerdown', state.onInteraction);
  state.onPreference = () => { if (reduced() && active === state) clearPageMotion(); };
  state.media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  state.media?.addEventListener('change',state.onPreference);
  state.settings = new MutationObserver(state.onPreference);
  state.settings.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const start = (startDelay = 0) => {
    if (active !== state || !root.isConnected) return;
    state.started = true;
    // Only route entrances reach here; in-place saves remain fully visible.
    collect(state,true,animate,startDelay);
    state.mutations = new MutationObserver(records=>{
      // Calculator text and counters don't need another geometry scan.
      if (records.some(record=>record.type === 'attributes' || [...record.addedNodes,...record.removedNodes].some(node=>
        node.nodeType === 1 && (node.matches(SELECTORS) || node.querySelector(SELECTORS))
      ))) animateDynamicContent(root, { animateVisible: false });
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

export function animateDynamicContent(root, { animateVisible = true } = {}) {
  if (!root?.isConnected) return;
  root.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
  const state=active;
  if (!state?.started || !state.root.contains(root) || reduced()) return;
  cancelAnimationFrame(state.frame);
  // In-place refreshes stay still; newly added offscreen content reveals on scroll.
  state.animateVisible = state.animateVisible || animateVisible;
  state.frame=requestAnimationFrame(() => {
    const reveal = state.animateVisible;
    state.animateVisible = false;
    collect(state, false, reveal);
  });
}
