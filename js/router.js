// ==== ROUTER ====

import { qs } from './utils.js';
import { setCrumbs, setActiveNav, emblem, decorateWiki } from './ui.js';
import { mountPageMotion, clearPageMotion } from './page-motion.js';
import { mountReadingTools, focusIncomingSource } from './reading-tools.js';
import {
  homeView, categoryView, subcategoryView,
  searchView, updatesView, creditsView, notFoundView,
} from './views.js';
import { feedbackView } from './feedback.js';
import { calculatorView } from './calculator.js';
import { currenciesView, explorerView, explorerHubView } from './currencies.js';
import {getCategory,getSubcategory} from './data/wiki-data.js';

const ROUTES = [
  { pattern: /^$/, view: homeView },
  { pattern: /^updates$/, view: updatesView },
  { pattern: /^feedback$/, view: feedbackView },
  { pattern: /^credits$/, view: creditsView },
  { pattern: /^search$/, view: searchView },
  { pattern: /^calculator$/, view: calculatorView },
  { pattern: /^explorer$/, view: explorerHubView },
  { pattern: /^currencies$/, view: currenciesView },
  { pattern: /^currency-explorer$/, view: explorerView },
];

// Paginas genericas por id (categorias e subpaginas) casam por ULTIMO, para
// abrir espaco para rotas registradas depois (ex.: Colors/Versions do editor).
const PAGE_FALLBACKS = [
  { pattern: /^([\w-]+)$/, view: categoryView },
  { pattern: /^([\w-]+)\/([\w-]+)$/, view: subcategoryView },
];

// Paginas do editor inline (Colors / Versions) sao registradas pelo proprio
// modulo delas via registerRoute() e casam antes das categorias genericas.
export function registerRoute(pattern, view) {
  ROUTES.push({ pattern, view });
}

function routesInOrder() {
  return [...ROUTES, ...PAGE_FALLBACKS];
}

// Gancho para testes: ordem efetiva de casamento das rotas.
export function __testRoutes() {
  return routesInOrder();
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  return {
    path: pathPart.replace(/\/+$/, '').replace(/^\/+/, ''),
    query: new URLSearchParams(queryPart || ''),
  };
}

let renderSeq = 0;
let pendingScrollAfterRender = null;
// Store each page's reading position for Back/Forward in this browser tab.
const SCROLL_KEY = 'ri-wiki-reading-positions-v1';
const storedPositions = (() => {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
  catch { return {}; }
})();
let renderedHash = location.hash || '#/';
let historyTraversal = false;
let scrollSaveTimer;
function saveReadingPosition(route = renderedHash, position = window.scrollY) {
  if (!route) return;
  storedPositions[route] = Math.max(0, Math.round(position));
  // Prevent an unbounded sessionStorage map during long wiki visits.
  const keys = Object.keys(storedPositions);
  for (const old of keys.slice(0, Math.max(0, keys.length - 80))) delete storedPositions[old];
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(storedPositions)); } catch {}
}


async function renderView(view, params, query, opts = {}) {
  // A removed/old bookmark is a normal missing route, not a failed renderer.
  if((view===subcategoryView&&!getSubcategory(params[0],params[1]))||(view===categoryView&&!getCategory(params[0]))){
    params=[params.join('/')];view=notFoundView;
  }
  const seq = ++renderSeq;
  clearPageMotion();
  const viewEl = qs('#view');
  const nav = view.nav ? view.nav(params, query) : null;
  setActiveNav(Array.isArray(nav) ? nav[0] : nav, Array.isArray(nav) ? nav[1] : null);
  setCrumbs(view.crumbs ? view.crumbs(params, query) : []);
  document.querySelectorAll('.primary-nav a[data-primary]').forEach(link => {
    const route = (location.hash.split('?')[0] || '#/').replace(/^#\/?/,'');
    const target = link.dataset.primary;
    link.classList.toggle('active', target === route || (target === 'explorer' && ['currencies','currency-explorer'].includes(route)) || (target === '' && route === ''));
    if (link.classList.contains('active')) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  document.title = pathLabel(view, params, query);

  const container = document.createElement('div');
  try {
    await view.render(container, params, query);
  } catch (err) {
    console.error('[router] view failed:', err);
    container.innerHTML = `
      <div class="notfound">
        <span data-emblem="64"></span>
        <h1>Something wilted</h1>
        <p style="color:var(--c-text-3)">This view failed to render. Try reloading.</p>
        <a class="btn btn--primary" href="#/">Back to Main</a>
      </div>`;
    setCrumbs([]);
  }

  if (seq !== renderSeq) return; // uma navegacao mais nova comecou: descarta
  container.querySelectorAll('[data-emblem]').forEach((el) => {
    el.innerHTML = emblem(parseInt(el.dataset.emblem, 10) || 24);
  });
  clearPageMotion();
  viewEl.replaceChildren(container);
  decorateWiki();
  mountReadingTools(container, window.location.hash.replace(/^#\/?/, '').split('?')[0]);
  // The view is swapped immediately; animations never delay navigation.
  if (window.__riFlashNext) {
    delete window.__riFlashNext;
    container.classList.add('page-flash');
    setTimeout(() => container.classList.remove('page-flash'), 1000);
  }
  if (pendingScrollAfterRender === 'preserve') {
    pendingScrollAfterRender = null;
  } else {
    const target = pendingScrollAfterRender?.top ?? opts.restoreScroll;
    pendingScrollAfterRender = null;
    window.scrollTo({ top: target ?? 0, behavior: 'instant' });
    // Layout settles after DOM attachment; restore again on the next frame if
    // this is a browser history traversal rather than a fresh navigation.
    if (Number.isFinite(opts.restoreScroll) && opts.restoreScroll > 0) {
      requestAnimationFrame(() => {
        if (seq === renderSeq) window.scrollTo({ top: opts.restoreScroll, behavior: 'instant' });
      });
    }
  }
  mountPageMotion(container, { animate: opts.animate !== false });
  // The same red outline + scroll applies to upgrades, runes, stages,
  // milestones, cores, perks, bonuses and search matches.
  focusIncomingSource(container,query);
  window.dispatchEvent(new Event('ri-route-rendered'));
}

function pathLabel(view, params, query) {
  const edition = 'Regrowth Incremental - WIKI';
  if (view === homeView || !view.title) return edition;
  return `${view.title(params, query).split(' — ')[0]} | ${edition}`;
}

async function navigate(path, query, opts = {}) {
  for (const route of routesInOrder()) {
    const match = path.match(route.pattern);
    if (match) {
      await renderView(route.view, match.slice(1), query, opts);
      return;
    }
  }
  await renderView(notFoundView, [path], query, opts);
}

/**
 * Re-renders the current page in place without recreating browser history.
 * Usado pelo modo de edicao para refletir conteudo salvo sem recarregar.
 * @param {{ scroll?: 'top' | 'preserve', scrollTop?: number }} [opts]
 */
export async function rerender(opts = {}) {
  const { path, query } = parseHash();
  pendingScrollAfterRender = opts.scroll === 'preserve'
    ? 'preserve'
    : { top: opts.scrollTop ?? null };
  for (const route of routesInOrder()) {
    const match = path.match(route.pattern);
    if (match) {
      await renderView(route.view, match.slice(1), query, { animate: false });
      return true;
    }
  }
  await renderView(notFoundView, [path], query, { animate: false });
  return true;
}

export async function initRouter() {
  renderedHash = location.hash || '#/';
  // Browser-native scroll restoration can race with our async view renderer.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => {
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => saveReadingPosition(), 130);
  }, { passive: true });
  window.addEventListener('pagehide', () => saveReadingPosition());
  window.addEventListener('popstate', () => { historyTraversal = true; });
  window.addEventListener('hashchange', () => {
    clearTimeout(scrollSaveTimer);
    saveReadingPosition(renderedHash, window.scrollY);
    renderedHash = location.hash || '#/';
    const restoreScroll = historyTraversal ? storedPositions[renderedHash] : undefined;
    historyTraversal = false;
    const { path, query } = parseHash();
    void navigate(path, query, { restoreScroll });
  });
  window.addEventListener('ri-number-format-change', () => {
    const { path, query } = parseHash();
    void navigate(path, query, { animate: false });
  });
  const { path, query } = parseHash();
  await navigate(path, query, { restoreScroll: storedPositions[renderedHash] });
}
