// ==== ROUTER ====

import { qs } from './utils.js';
import { setCrumbs, setActiveNav, emblem, resetReveal } from './ui.js';
import { mountPageMotion } from './page-motion.js';
import {
  homeView, categoryView, subcategoryView,
  searchView, updatesView, creditsView, notFoundView,
} from './views.js';
import { feedbackView } from './feedback.js';
import {getCategory,getSubcategory} from './data/wiki-data.js';

const ROUTES = [
  { pattern: /^$/, view: homeView },
  { pattern: /^updates$/, view: updatesView },
  { pattern: /^feedback$/, view: feedbackView },
  { pattern: /^credits$/, view: creditsView },
  { pattern: /^search$/, view: searchView },
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

async function renderView(view, params, query, opts = {}) {
  // A removed/old bookmark is a normal missing route, not a failed renderer.
  if((view===subcategoryView&&!getSubcategory(params[0],params[1]))||(view===categoryView&&!getCategory(params[0]))){
    params=[params.join('/')];view=notFoundView;
  }
  const seq = ++renderSeq;
  const viewEl = qs('#view');
  const nav = view.nav ? view.nav(params, query) : null;
  setActiveNav(Array.isArray(nav) ? nav[0] : nav, Array.isArray(nav) ? nav[1] : null);
  setCrumbs(view.crumbs ? view.crumbs(params, query) : []);
  document.title = view.title ? view.title(params, query) : 'RI Gaming Wiki';

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
  viewEl.replaceChildren(container);
  // The view is swapped immediately; animations never delay navigation.
  if (window.__riFlashNext) {
    delete window.__riFlashNext;
    container.classList.add('page-flash');
    setTimeout(() => container.classList.remove('page-flash'), 1000);
  }
  if (pendingScrollAfterRender === 'preserve') {
    pendingScrollAfterRender = null;
  } else {
    const target = pendingScrollAfterRender?.top;
    pendingScrollAfterRender = null;
    window.scrollTo({ top: target ?? 0, behavior: 'instant' });
  }
  resetReveal();
  mountPageMotion(container, { animate: opts.animate !== false });
  window.dispatchEvent(new Event('ri-route-rendered'));
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
  window.addEventListener('hashchange', () => {
    const { path, query } = parseHash();
    void navigate(path, query);
  });
  window.addEventListener('ri-number-format-change', () => {
    const { path, query } = parseHash();
    void navigate(path, query, { animate: false });
  });
  const { path, query } = parseHash();
  await navigate(path, query);
}
