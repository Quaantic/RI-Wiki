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

// The page finder is now part of the normal global search palette.
// No floating page-search button or second search interface.
export function getCurrentPageMatches(term, limit = 6) {
  const root = document.querySelector('#view');
  if (!root || !term || term.trim().length < 2) return [];
  return findOnPage(root, term).slice(0, limit).map((element, index) => ({
    element,
    label: element.matches('[data-upgrade-number]')
      ? `${element.dataset.upgradeNumber}. ${element.dataset.upgradeName || 'Upgrade'}`
      : (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    index,
  }));
}

export function focusCurrentPageMatch(element) {
  revealAndScrollTo(element);
}

export function mountReadingTools(viewRoot, routePath) {
  activePanelController?.abort();
  activePanelController = null;
  document.querySelector('.ri-return-search')?.remove();
  clearTimeout(returnTimer);
  if (/^[\w-]+(?:\/[\w-]+)?$/.test(routePath) &&
      !['search', 'calculator', 'updates', 'feedback', 'credits'].includes(routePath)) {
    showReturnToSearch();
  }
}
