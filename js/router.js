// ==== ROUTER ====

import { qs } from './utils.js';
import { setCrumbs, setActiveNav, emblem } from './ui.js';
import {
  homeView, categoryView, subcategoryView, articleView,
  searchView, updatesView, creditsView, notFoundView,
} from './views.js';
import { feedbackView } from './feedback.js';

const ROUTES = [
  { pattern: /^$/, view: homeView },
  { pattern: /^updates$/, view: updatesView },
  { pattern: /^feedback$/, view: feedbackView },
  { pattern: /^credits$/, view: creditsView },
  { pattern: /^search$/, view: searchView },
  { pattern: /^article\/([\w-]+)$/, view: articleView },
  { pattern: /^([\w-]+)$/, view: categoryView },
  { pattern: /^([\w-]+)\/([\w-]+)$/, view: subcategoryView },
];

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  return {
    path: pathPart.replace(/\/+$/, '').replace(/^\/+/, ''),
    query: new URLSearchParams(queryPart || ''),
  };
}

let renderSeq = 0;

async function renderView(view, params, query) {
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
  container.classList.add('page-enter');
  if (window.__riFlashNext) {
    delete window.__riFlashNext;
    container.classList.add('page-flash');
    setTimeout(() => container.classList.remove('page-flash'), 1000);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function navigate(path, query) {
  for (const route of ROUTES) {
    const match = path.match(route.pattern);
    if (match) {
      await renderView(route.view, match.slice(1), query);
      return;
    }
  }
  await renderView(notFoundView, [path], query);
}

export async function initRouter() {
  window.addEventListener('hashchange', () => {
    const { path, query } = parseHash();
    void navigate(path, query);
  });
  const { path, query } = parseHash();
  await navigate(path, query);
}
