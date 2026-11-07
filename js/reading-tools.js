// RI Wiki: page-local finder and a convenient return path after global search.
// Only the current rendered wiki view is indexed; no external service required.
import { icon } from './ui.js';

const RETURN_KEY = 'ri-return-to-search-v1';
let activePanelController = null;
let returnTimer = null;

function getReturn() {
  try { return JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null'); }
  catch { return null; }
}

export function initReadingTools() {
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a.searchbox__item[href], a.result-item[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!/^#\/[\w-]+(?:\/[\w-]+)?(?:\?.*)?$/.test(href || '')) return;
    const preview = link.closest('#search-panel');
    const fullPage = link.closest('#search-results');
    if (!preview && !fullPage) return;
    const q = (preview ? document.querySelector('#search-input') : document.querySelector('#search-page-input'))?.value.trim();
    if (!q) return;
    const returnHash = fullPage && location.hash.startsWith('#/search')
      ? location.hash : `#/search?q=${encodeURIComponent(q)}`;
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ href, returnHash, at: Date.now() }));
    } catch { /* private mode */ }
  }, true);
}

function showReturnToSearch() {
  document.querySelector('.ri-return-search')?.remove();
  clearTimeout(returnTimer);
  const saved = getReturn();
  if (!saved || saved.href !== location.hash || Date.now() - saved.at > 10 * 60 * 1000) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ri-return-search';
  button.innerHTML = `${icon('arrow-left', 14)} Back to Search`;
  button.setAttribute('aria-label', 'Return to your previous wiki search results');
  button.addEventListener('click', () => {
    button.remove();
    try { sessionStorage.removeItem(RETURN_KEY); } catch {}
    location.hash = saved.returnHash;
  });
  document.body.appendChild(button);
  returnTimer = setTimeout(() => button.remove(), 18000);
}

const TARGETS = '[data-upgrade-number], .ri-faq-item, h1, h2, h3, h4, h5, .ri-text-section__body, .cat-hero__tagline, .cat-hero__description, .section p, .info-card, .sub-link, .milestone-card, .data-table tr, .chip, .section li';
function findOnPage(root, term) {
  const normalized = term.toLocaleLowerCase().trim();
  if (!normalized) return [];
  return [...root.querySelectorAll(TARGETS)].filter(el => {
    if (el.closest('.ri-reading-tools, .ri-edit-bar, .ri-edit-popover, .ri-content-menu')) return false;
    if (el.closest('[data-upgrade-number]') && !el.matches('[data-upgrade-number]')) return false;
    if (el.closest('.ri-faq-item') && !el.matches('.ri-faq-item')) return false;
    return el.textContent.toLocaleLowerCase().includes(normalized);
  });
}

function revealAndScrollTo(element) {
  if (!element?.isConnected) return;
  for (let parent = element; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true; // FAQ / collapsed sections
  }
  document.querySelectorAll('.ri-reading-tools__target').forEach(el => el.classList.remove('ri-reading-tools__target'));
  element.classList.add('ri-reading-tools__target');
  requestAnimationFrame(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  setTimeout(() => element.classList.remove('ri-reading-tools__target'), 2200);
}

export function mountReadingTools(viewRoot, routePath) {
  activePanelController?.abort();
  const controller = new AbortController();
  activePanelController = controller;
  document.querySelector('.ri-return-search')?.remove();
  clearTimeout(returnTimer);
  if (!/^[\w-]+(?:\/[\w-]+)?$/.test(routePath) ||
      ['search', 'calculator', 'updates', 'feedback', 'credits'].includes(routePath)) return;

  const bar = document.createElement('div');
  bar.className = 'ri-reading-tools';
  bar.innerHTML = `
    <button type="button" class="ri-reading-tools__btn" aria-expanded="false" aria-controls="ri-find-panel">
      ${icon('search', 14)} Search this page
    </button>
    <div class="ri-reading-tools__panel" id="ri-find-panel" hidden>
      <div class="ri-reading-tools__search">
        ${icon('search', 16)} <input type="search" class="ri-reading-tools__input" placeholder="Find an upgrade or text…" aria-label="Find text on this page" autocomplete="off" />
        <button type="button" class="ri-reading-tools__close" aria-label="Close page search">${icon('x', 16)}</button>
      </div>
      <div class="ri-reading-tools__count" role="status">Type to search this page</div>
      <div class="ri-reading-tools__results"></div>
      <div class="ri-reading-tools__nav">
        <button type="button" data-ri-prev aria-label="Previous match">${icon('arrow-up', 13)} Previous</button>
        <button type="button" data-ri-next aria-label="Next match">Next ${icon('arrow-down', 13)}</button>
      </div>
    </div>`;
  viewRoot.prepend(bar);
  const toggle = bar.querySelector('.ri-reading-tools__btn');
  const panel = bar.querySelector('.ri-reading-tools__panel');
  const input = bar.querySelector('.ri-reading-tools__input');
  const count = bar.querySelector('.ri-reading-tools__count');
  const results = bar.querySelector('.ri-reading-tools__results');
  let matches = [];
  let selected = -1;
  const close = () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  const open = () => { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); input.focus(); };
  function select(index) {
    if (!matches.length) return;
    selected = (index + matches.length) % matches.length;
    [...results.children].forEach((child, i) => child.classList.toggle('is-selected', i === selected));
    count.textContent = `${selected + 1} of ${matches.length} matches`;
    revealAndScrollTo(matches[selected]);
  }
  function search() {
    matches = findOnPage(viewRoot, input.value);
    selected = -1;
    results.replaceChildren();
    if (!input.value.trim()) { count.textContent = 'Type to search this page'; return; }
    count.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} on this page`;
    if (!matches.length) { results.innerHTML = '<div class="ri-reading-tools__empty">No matches in this page.</div>'; return; }
    for (const [idx, match] of matches.slice(0, 150).entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ri-reading-tools__result';
      const label = match.matches('[data-upgrade-number]') ? `Upgrade ${match.dataset.upgradeNumber}: ` : '';
      button.textContent = (label + match.textContent.replace(/\s+/g, ' ').trim()).slice(0, 150);
      button.title = button.textContent;
      button.addEventListener('click', () => select(idx));
      results.appendChild(button);
    }
    if (matches.length > 150) {
      const info = document.createElement('div'); info.className = 'ri-reading-tools__empty';
      info.textContent = 'Showing the first 150 matches. Refine your search to see more.';
      results.appendChild(info);
    }
  }
  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  bar.querySelector('.ri-reading-tools__close').addEventListener('click', close);
  input.addEventListener('input', search);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); select(selected + (event.shiftKey ? -1 : 1)); }
    if (event.key === 'Escape') { event.preventDefault(); close(); toggle.focus(); }
  });
  bar.querySelector('[data-ri-prev]').addEventListener('click', () => select(selected - 1));
  bar.querySelector('[data-ri-next]').addEventListener('click', () => select(selected + 1));
  document.addEventListener('click', event => {
    if (!bar.contains(event.target)) close();
  }, { signal: controller.signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) close();
  }, { signal: controller.signal });
  showReturnToSearch();
}
