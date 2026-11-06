// Route transitions for the static RI Wiki (no animation library required).
// All transitions are compositor-friendly (opacity + transform), interruptible,
// and never delay navigation, input, or rendering. Works in the inline Admin too.

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SURFACES = '.hero, .cat-hero, .upd-hero, .page-head, .ri-admin-section, .notfound';
const INTRO = [
  '.hero__badge', '.hero__title', '.hero__sub', '.hero__search',
  '.hero__chips', '.hero__art', '.hero__stats',
  '.cat-hero__crumbs', '.cat-hero__title', '.cat-hero__tagline',
  '.cat-hero__facts', '.cat-hero .vitals',
  '.page-head h1', '.page-head p',
  '.ri-page-content-tools', '.sub-pills-wrap', '.search-hero',
].join(',');
const BLOCKS = [
  '.section-head', '.section-title', '.cat-card', '.info-card', '.sub-link',
  '.upgrade-card', '.stage-card', '.milestone-card', '.rune-card',
  '.ore-card', '.layer-card', '.area-card', '.gear-card',
  '.reset-calc-card', '.table-wrap', '.result-item', '.ri-text-section',
  '.ri-faq-item', '.upd-version', '.upd-group', '.empty-state',
  '.stat-card', '.feature-card', '.reveal',
].join(',');

let current = null;

function disabled() {
  return document.documentElement.classList.contains('reduce-motion') ||
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

function schedule(state, el, delay = 0, kind = 'block') {
  if (!el?.isConnected || state.cancelled || disabled() || typeof el.animate !== 'function') return;
  const compact = window.matchMedia?.('(max-width: 720px)').matches ?? false;
  const mobileDistance = compact ? 13 : 20;
  const distance = kind === 'surface' ? mobileDistance : Math.round(mobileDistance * .8);
  const duration = compact ? 365 : kind === 'surface' ? 470 : 430;
  const frames = kind === 'surface'
    ? [{ opacity: .12, transform: `translate3d(0,${distance}px,0)` }, { opacity: 1, transform: 'translate3d(0,0,0)' }]
    : [{ opacity: 0, transform: `translate3d(0,${distance}px,0)` }, { opacity: 1, transform: 'translate3d(0,0,0)' }];
  const animation = el.animate(frames, { duration, delay, easing: EASE, fill: 'both' });
  state.animations.add(animation);
  const cleanup = () => {
    state.animations.delete(animation);
    // Base CSS remains visible: do not leave a lingering fill layer or transform.
    animation.cancel();
  };
  animation.addEventListener('finish', cleanup, { once: true });
}

function begin(state, root) {
  if (state.cancelled || !root.isConnected || disabled()) return;
  const viewport = window.innerHeight || 800;
  const seen = new Set();

  // The hero's background enters first; then each piece of content arrives in
  // a visibly ordered sequence. Only the visible portion animates at load.
  const surfaces = [...root.querySelectorAll(SURFACES)].filter(el => {
    const r = el.getBoundingClientRect();
    return r.bottom >= -30 && r.top <= viewport + 40;
  }).slice(0, 3);
  surfaces.forEach((el, i) => { seen.add(el); schedule(state, el, i * 45, 'surface'); });

  let introIndex = 0;
  for (const el of root.querySelectorAll(INTRO)) {
    if (seen.has(el) || el.closest('[hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < -30 || r.top > viewport + 65) continue;
    seen.add(el);
    schedule(state, el, 65 + Math.min(introIndex++, 7) * 62, 'intro');
    if (introIndex >= 12) break;
  }

  // The observer only schedules elements as they enter the viewport. Large
  // upgrade grids don't create hundreds of concurrent animations.
  const candidates = [];
  for (const el of root.querySelectorAll(BLOCKS)) {
    if (seen.has(el) || el.closest('[hidden]')) continue;
    // When a text section has animated descendants, animate the section only.
    if (el.closest('.ri-text-section') && !el.classList.contains('ri-text-section')) continue;
    seen.add(el);
    candidates.push(el);
  }
  if (!candidates.length) return;

  // Animate what is already on screen *synchronously*, before the first paint.
  // Waiting for an IntersectionObserver callback here made cards flash fully
  // visible for a frame, which looked like there was no transition.
  const immediate = [], deferred = [];
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    (r.bottom >= -25 && r.top <= viewport + 65 ? immediate : deferred).push(el);
  }
  immediate.sort((a, b) => {
    const aa = a.getBoundingClientRect(), bb = b.getBoundingClientRect();
    return aa.top - bb.top || aa.left - bb.left;
  });
  immediate.slice(0, 28).forEach((el, i) => schedule(state, el, 105 + Math.min(i, 7) * 53));
  if (!deferred.length) return;

  const cap = 180;
  if (typeof IntersectionObserver !== 'function') return;
  state.observer = new IntersectionObserver(entries => {
    if (state.cancelled) return;
    const entering = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
    entering.forEach((entry, i) => {
      state.observer?.unobserve(entry.target);
      const el = entry.target;
      // All blocks in a single entering group get a bounded cascade.
      schedule(state, el, Math.min(i, 7) * 56 + 90);
    });
  }, { root: null, rootMargin: '0px 0px 65px 0px', threshold: 0.025 });
  for (const el of deferred.slice(0, cap)) state.observer.observe(el);
}

export function clearPageMotion() {
  if (!current) return;
  current.cancelled = true;
  current.observer?.disconnect();
  current.bootObserver?.disconnect();
  for (const animation of current.animations) animation.cancel();
  current.animations.clear();
  current = null;
}

export function mountPageMotion(root, { animate = true } = {}) {
  clearPageMotion();
  root.classList.add('ri-motion-managed');
  // Legacy cards have a paused reveal by default. The router now owns their
  // entrance, but every card remains readable if animations are disabled.
  root.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  if (!animate || disabled() || typeof root.animate !== 'function') return;

  const state = { animations: new Set(), observer: null, bootObserver: null, cancelled: false };
  current = state;
  const boot = document.getElementById('boot');
  if (boot && !boot.classList.contains('is-done')) {
    state.bootObserver = new MutationObserver(() => {
      if (!boot.classList.contains('is-done')) return;
      state.bootObserver?.disconnect();
      if (!state.cancelled) begin(state, root);
    });
    state.bootObserver.observe(boot, { attributes: true, attributeFilter: ['class'] });
  } else {
    begin(state, root);
  }
}

// Search results can be replaced without a hash navigation.
export function animateDynamicContent(root) {
  if (disabled() || !root?.isConnected) return;
  const state = current;
  if (!state || state.cancelled) return;
  root.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  [...root.querySelectorAll('.result-item, .reveal')].slice(0, 16)
    .forEach((el, i) => schedule(state, el, Math.min(i, 7) * 48, 'block'));
}
