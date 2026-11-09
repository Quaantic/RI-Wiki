// RI Wiki: page-local finder and a convenient return path after global search.
// Only the current rendered wiki view is indexed; no external service required.
import { icon } from './ui.js';

const RETURN_KEY = 'ri-return-navigation-v2';
let activePanelController = null;

function getReturn() {
  try { return JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null'); }
  catch { return null; }
}
function rememberReturn(destination) {
  const current = window.location.hash || '#/';
  if (!destination || destination === current || destination.split('?')[0] === current.split('?')[0] || !/^#\/[\w-]+(?:\/[\w-]+)*(?:\?.*)?$|^#\/$/.test(destination)) return;
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({
    from:current, to:destination, top:window.scrollY, at:Date.now(),
  })); } catch { /* storage may be unavailable */ }
}
export function initReadingTools() {
  // Shared return control for navigation from Explorer, search, cards and
  // sidebar. Use real hash links; never override native browser Back.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#/"], .res--link[data-href]');
    if (!link || link.closest('.ri-return-toast, #sidebar-nav, .primary-nav, .topbar') || link.hasAttribute('download')) return;
    rememberReturn(link.getAttribute('href') || link.dataset.href);
  }, true);
}
function showReturnControl(viewRoot) {
  const saved = getReturn();
  const route = window.location.hash || '#/';
  if (!saved || saved.to !== route || !saved.from || Date.now() - saved.at > 10000) return;
  const bar = document.createElement('div');
  bar.className = 'ri-return-toast';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-label', 'Return to previous wiki page');
  bar.innerHTML = `<span class="ri-return-toast__message">${icon('corner-up-left',17)} Go back to your previous page?</span><div class="ri-return-toast__actions"><button class="ri-return-toast__yes" type="button">Yes</button><button class="ri-return-toast__no" type="button">No</button></div>`;
  let closed = false;
  let timer;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    window.removeEventListener('hashchange', close);
    bar.remove();
    try { sessionStorage.removeItem(RETURN_KEY); } catch {}
  };
  bar.querySelector('.ri-return-toast__yes').addEventListener('click', () => {
    const previous = saved.from;
    const position = saved.top || 0;
    close();
    const restore=()=>window.requestAnimationFrame(()=>window.scrollTo({top:position,behavior:'instant'}));
    window.addEventListener('ri-route-rendered',restore,{once:true});
    if(window.location.hash===previous) restore();
    else window.location.hash=previous;
  });
  bar.querySelector('.ri-return-toast__no').addEventListener('click',close);
  window.addEventListener('hashchange',close,{once:true});
  timer = window.setTimeout(close,10000);
  document.body.append(bar);
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
  document.querySelectorAll('body > .ri-return-toast').forEach(bar=>bar.remove());
  activePanelController?.abort();
  activePanelController = null;
  showReturnControl(viewRoot);
}

// Deep links produced by the Explorer and the global search palette.
// A match is selected from structured cards, not from arbitrary paragraphs;
// this also works for source types that do not have numeric upgrade IDs.
export function withFocusHref(href, name, kind = 'search') {
  if (!/^#\/[\w-]+(?:\/[\w-]+)*(?:\?.*)?$/.test(String(href || ''))) return href;
  const [route,qs=''] = href.split('?');
  const params = new URLSearchParams(qs);
  if (name?.trim()) params.set('focus',name.trim());
  params.set('focusKind',kind);
  return `${route}?${params.toString()}`;
}

const HIGHLIGHT_CARDS = '.upgrade-card, .rune-card, .ore-card, .mastery-card, .stage-card, .milestone-card, .ri-faq-item, .bonus-card, .info-card, .data-table tr, .rune-boost, .stage-chip, .stage-rewards, .stage-place, .stage-feature, .sub-link, .section h2, .section h3, .ri-text-section__body, .section p, .section li';
const normalizedText = value => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g,' ');
export function focusIncomingSource(viewRoot, params) {
  const term = params?.get('focus')?.trim();
  const number = params?.get('upgrade');
  const preferredName = params?.get('upgradeName');
  if (!term && number === null) return false;
  let target = null;
  if (number !== null) target = [...viewRoot.querySelectorAll('[data-upgrade-number]')].find(node =>
    node.dataset.upgradeNumber === number && (!preferredName || node.dataset.upgradeName === preferredName));
  if (!target && term) {
    const name = normalizedText(term);
    const cards = [...viewRoot.querySelectorAll(HIGHLIGHT_CARDS)];
    // Exact heading/card name first. Search results need a similarly precise
    // destination to avoid highlighting a random paragraph containing a word.
    const headingOf = el => el.querySelector('.upgrade-card__head b, .rune-card__name, .ore-card__name, .stage-card__title, .milestone-card__title, .section-title, h2, h3')?.textContent || '';
    target = cards.find(el => normalizedText(el.dataset.upgradeName || headingOf(el)) === name);
    if (!target) target = cards.find(el => normalizedText(el.dataset.upgradeName || headingOf(el)).includes(name) && !!headingOf(el));
    if (!target) target = cards.find(el => normalizedText(el.textContent) === name);
    if (!target && name.length >= 3) target = cards.find(el =>
      !el.matches('.section p,.section li') && normalizedText(el.textContent).includes(name));
    if (!target && name.length >= 3) target = cards.find(el => normalizedText(el.textContent).includes(name));
  }
  if (!target) return false;
  // Large containers are narrowed to their actual matching title when present.
  for (let parent=target;parent;parent=parent.parentElement) if (parent.tagName==='DETAILS') parent.open=true;
  requestAnimationFrame(() => {
    if (!target.isConnected) return;
    target.classList.remove('ri-explorer-highlight');
    void target.offsetWidth;
    target.classList.add('ri-explorer-highlight');
    target.scrollIntoView({ block:'center', behavior:'instant' });
    setTimeout(() => { if(target.isConnected) target.scrollIntoView({block:'center',behavior:'instant'}); }, 300);
    setTimeout(() => target.classList.remove('ri-explorer-highlight'), 3400);
  });
  return true;
}
