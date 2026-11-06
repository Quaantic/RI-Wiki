// RI Wiki page motion v3.
// A reliable CSS-first entrance on EVERY hash route (including on first boot),
// plus optional IntersectionObserver reveals for below-the-fold content.
// No animation library, no text-by-text rewriting and no layout animation.

const INTRO_SELECTORS = [
  '.hero__badge', '.hero__title', '.hero__sub', '.hero__search',
  '.hero__chips', '.hero__art', '.hero__stats',
  '.cat-hero__crumbs', '.cat-hero__icon', '.cat-hero__name',
  '.cat-hero__tagline', '.cat-hero__description', '.cat-hero__facts',
  '.cat-hero .vitals', '.page-head h1', '.page-head p',
  '.sub-pills-wrap', '.search-hero', '.ri-page-content-tools',
].join(', ');

const CONTENT_SELECTORS = [
  '.section-head', '.section-title', '.cat-card', '.info-card',
  '.sub-link', '.upgrade-card', '.stage-card', '.milestone-card',
  '.rune-card', '.ore-card', '.layer-card', '.area-card',
  '.gear-card', '.reset-calc-card', '.table-wrap', '.result-item',
  '.ri-text-section', '.ri-faq-item', '.upd-version', '.upd-group',
  '.empty-state', '.stat-card', '.feature-card', '.sub-pager',
  '.section > p', '.section > h2', '.section > h3',
].join(', ');

let active = null;

function motionDisabled() {
  return document.documentElement.classList.contains('reduce-motion') ||
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

function disconnect() {
  if (!active) return;
  active.cancelled = true;
  active.observer?.disconnect();
  active.bootObserver?.disconnect();
  if (active.failsafe) clearTimeout(active.failsafe);
  active = null;
}

export function clearPageMotion() { disconnect(); }

// Called after the new page is inserted, in the same JavaScript task as the DOM
// replacement. Attributes/classes are added BEFORE the browser's next paint,
// so they cannot flash as unanimated content for a frame.
export function mountPageMotion(root, { animate = true } = {}) {
  disconnect();
  root.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  if (!animate || motionDisabled() || !root.isConnected) return;

  const state = { cancelled: false, observer: null, bootObserver: null, failsafe: null };
  active = state;
  root.classList.add('ri-page-motion');
  const viewport = Math.max(window.innerHeight || 700, 400);
  const seen = new Set();
  const visible = [];
  const offscreen = [];

  const add = (el, priority) => {
    if (!el || !el.isConnected || seen.has(el) || el.closest('[hidden], details:not([open])')) return;
    // Avoid animating the internal elements of a card twice.
    if (!priority && el.closest('.ri-text-section') && !el.classList.contains('ri-text-section')) return;
    seen.add(el);
    const box = el.getBoundingClientRect();
    if (box.bottom < -30) return;
    if (box.top <= viewport + 65) visible.push({ el, priority, top: box.top, left: box.left });
    else offscreen.push(el);
  };

  root.querySelectorAll('.hero, .cat-hero, .upd-hero, .page-head, .notfound').forEach(el => add(el, 0));
  root.querySelectorAll(INTRO_SELECTORS).forEach(el => add(el, 1));
  root.querySelectorAll(CONTENT_SELECTORS).forEach(el => add(el, 2));

  // Order by actual visual position, not DOM nesting. Delay is bounded: large
  // upgrade grids never become a several-second cascade.
  visible.sort((a, b) => a.top - b.top || a.left - b.left || a.priority - b.priority);
  let n = 0;
  for (const { el, priority } of visible.slice(0, 46)) {
    const delay = priority === 0 ? 50 : 135 + Math.min(n++, 8) * 75;
    el.style.setProperty('--ri-enter-delay', `${delay}ms`);
    el.dataset.riEnter = priority === 0 ? 'surface' : priority === 1 ? 'intro' : 'block';
  }
  // Only elements that will be observed are hidden. Avoid hiding hundreds of
  // cards on a long upgrades page or creating a fallback that needs a timer.
  if ('IntersectionObserver' in window) {
    const targets = offscreen.slice(0, 150);
    targets.forEach(el => { el.dataset.riEnter = 'scroll'; });
    if (targets.length) {
      state.observer = new IntersectionObserver(entries => {
        if (state.cancelled) return;
        const entering = entries.filter(entry => entry.isIntersecting).sort((a,b) =>
          a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        entering.forEach((entry,i) => {
          state.observer?.unobserve(entry.target);
          entry.target.style.setProperty('--ri-enter-delay', `${Math.min(i, 6) * 65}ms`);
          entry.target.classList.add('ri-entered');
        });
      }, { rootMargin: '0px 0px 70px 0px', threshold: 0.02 });
      targets.forEach(el => state.observer.observe(el));
      // Safety: if the observer never fires (tab suspension etc.), content
      // is always made visible eventually, without requiring user input.
      state.failsafe = setTimeout(() => {
        if (state.cancelled) return;
        targets.forEach(el => { el.style.animation = 'none'; el.classList.add('ri-entered'); });
        state.observer?.disconnect();
      }, 20000);
    }
  }

  const start = () => {
    if (state.cancelled || !root.isConnected) return;
    state.bootObserver?.disconnect();
    // This CSS class triggers route and individual element animations. Unlike
    // the old Web Animations API implementation, no el.animate() call is needed.
    root.classList.add('ri-motion-start');
  };
  const boot = document.getElementById('boot');
  if (boot && !boot.classList.contains('is-done')) {
    // Initial site load: the splash obscures the first ~half second. Wait
    // until it begins fading so the visitor actually sees the entrance.
    state.bootObserver = new MutationObserver(() => {
      if (boot.classList.contains('is-done')) start();
    });
    state.bootObserver.observe(boot, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }
}

export function animateDynamicContent(root) {
  if (!root?.isConnected || motionDisabled()) return;
  root.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  // Search results are regenerated without a route change. Keep the same
  // compositor-only reveal, without modifying the actual search results.
  for (const [i, el] of [...root.querySelectorAll('.result-item')].slice(0, 16).entries()) {
    el.style.setProperty('--ri-enter-delay', `${Math.min(i, 7) * 55}ms`);
    el.classList.remove('ri-search-reenter');
    void el.offsetWidth;
    el.classList.add('ri-search-reenter');
  }
}
