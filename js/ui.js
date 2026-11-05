// ==== UI: ICONES, COMPONENTES E SHELL (nao precisa editar) ====

import { qs, qsa, esc, html, debounce, markMatches } from './utils.js';
import { CATEGORIES, getSubcategory } from './data/wiki-data.js';
import { getInlineUpgradePages } from './data/formulas.js';
import { colorizeResources, resourceColor } from './data/resource-colors.js';
import { dataProvider } from './services.js';
import { ed } from './edit/ed-attr.js';

import { LUCIDE_ICONS } from './lib/lucide-data.js';

const ICON_ALIASES = {
  rune: 'hexagon',
  hex: 'hexagon',
  ingot: 'gem',
  branch: 'git-branch',
  spark: 'sparkle',
  coin: 'coins',
  card: 'credit-card',
  refresh: 'refresh-cw',
  flask: 'flask-conical',
  drop: 'droplet',
  chart: 'chart-no-axes-column',
  alert: 'triangle-alert',
  sort: 'arrow-up-down',
  fuck: 'infinity',
};

const ICON_STROKE = 2;

function iconNode(name) {
  const key = String(name || '').toLowerCase().trim();
  return LUCIDE_ICONS[key] || LUCIDE_ICONS[ICON_ALIASES[key]] || LUCIDE_ICONS.circle;
}

export function icon(name, size = 20, cls = '') {
  const body = iconNode(name)
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
      return `<${tag}${a}/>`;
    })
    .join('');
  return `<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

let uid = 0;

export function emblem(size = 32, cls = '') {
  const id = `ri-grad-${++uid}`;
  return `
<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C9FF74"/>
      <stop offset="1" stop-color="#86D62B"/>
    </linearGradient>
  </defs>
  <path d="M32 3.5 57.5 18.25v27.5L32 60.5 6.5 45.75v-27.5Z" fill="#1D241F" stroke="url(#${id})" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 46V29" stroke="#A8EF45" stroke-width="4" stroke-linecap="round"/>
  <path d="M32 34c0-8-5.5-12.5-14-12.5 0 8.5 5.5 12.5 14 12.5Z" fill="#A8EF45"/>
  <path d="M32 29c0-7 5-11 13-11 0 7.5-5 11-13 11Z" fill="#C9FF74"/>
</svg>`;
}

// ==== REVEAL: entrada em sequencia (stagger) + escrita progressiva ====

const REVEAL_STEP = 70;        // intervalo entre elementos que entram na tela juntos (ms)
const REVEAL_MAX_STEPS = 9;    // limite do atraso acumulado (~630 ms)
const TYPE_MS_PER_CHAR = 26;   // velocidade base da escrita
const TYPE_MIN_MS = 450;       // textos curtos nao terminam em menos que isso
const TYPE_MAX_MS = 1300;      // textos longos nao passam disso
const TYPE_HIGHLIGHT = 'ri-untyped';

// Textos que "sao escritos". Para incluir outro elemento, basta dar data-type="" nele.
const TYPE_SELECTOR = [
  '[data-type]',
  '.hero__title', '.hero__sub',
  '.cat-hero__name', '.cat-hero__tagline',
  '.page-head h1', '.page-head p',
  '.section-title',
].join(',');

let observer = null;
let revealToken = 0;               // invalida callbacks de uma pagina anterior
let untypedHL = null;              // CSS Custom Highlight: pinta de transparente o texto ainda nao escrito
let typeRaf = 0;
const typeSeen = new WeakSet();    // elementos que ja foram preparados (nunca reescreve duas vezes)
const typePending = new Map();     // elemento -> job (esperando entrar na tela)
const typeActive = new Set();      // jobs escrevendo agora

const motionOff = () => document.documentElement.classList.contains('reduce-motion');
const canTypeText = () => typeof Highlight === 'function' && !!(window.CSS && CSS.highlights);

// Escrita progressiva SEM dividir o texto em elementos: o texto continua inteiro no DOM
// (layout fixo, sem espacos artificiais) e um Range "esconde" so a parte ainda nao escrita.
function prepareTyping(el) {
  if (typeSeen.has(el)) return false;
  typeSeen.add(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let total = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    nodes.push(n);
    total += n.nodeValue.length;
  }
  if (!nodes.length) return false;

  const range = document.createRange();
  range.setStart(nodes[0], 0);
  const last = nodes[nodes.length - 1];
  range.setEnd(last, last.nodeValue.length);
  if (!untypedHL) {
    untypedHL = new Highlight();
    CSS.highlights.set(TYPE_HIGHLIGHT, untypedHL);
  }
  untypedHL.add(range);

  const duration = Math.min(TYPE_MAX_MS, Math.max(TYPE_MIN_MS, total * TYPE_MS_PER_CHAR));
  typePending.set(el, { nodes, total, range, duration, begin: 0 });
  return true;
}

function startTyping(el, delay) {
  const job = typePending.get(el);
  if (!job) return;
  typePending.delete(el);
  job.begin = performance.now() + delay;
  typeActive.add(job);
  if (!typeRaf) typeRaf = requestAnimationFrame(typeTick);
}

function typeTick(now) {
  typeRaf = 0;
  for (const job of typeActive) {
    const p = (now - job.begin) / job.duration;
    if (p <= 0) continue;                       // ainda no atraso do stagger
    if (p >= 1) {                               // terminou: revela tudo
      untypedHL.delete(job.range);
      typeActive.delete(job);
      continue;
    }
    let left = Math.floor(p * job.total);       // caracteres ja escritos
    for (const node of job.nodes) {
      const len = node.nodeValue.length;
      if (left <= len) { job.range.setStart(node, left); break; }
      left -= len;
    }
  }
  if (typeActive.size) typeRaf = requestAnimationFrame(typeTick);
}

function onIntersect(entries, obs) {
  const batch = entries
    .filter((e) => e.isIntersecting && e.target.isConnected)
    .sort((a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  // Todos os elementos que entram juntos formam um lote: o atraso e a posicao no lote
  // (e nao o indice no array de dados), entao o stagger funciona tambem ao rolar a pagina.
  batch.forEach((entry, i) => {
    const el = entry.target;
    const delay = Math.min(i, REVEAL_MAX_STEPS) * REVEAL_STEP;
    obs.unobserve(el);
    if (el.classList.contains('reveal')) {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.classList.add('is-visible');
    }
    startTyping(el, delay);
  });
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  }
  return observer;
}

// Na primeira carga a tela de boot cobre a pagina por ~0,5 s: espera ela sair para
// a animacao de entrada nao acontecer escondida atras dela.
function whenBootDone(cb) {
  const boot = document.getElementById('boot');
  if (!boot || boot.classList.contains('is-done')) { cb(); return; }
  const mo = new MutationObserver(() => {
    if (boot.classList.contains('is-done')) { mo.disconnect(); cb(); }
  });
  mo.observe(boot, { attributes: true, attributeFilter: ['class'] });
}

// Chamada pelo router a cada pagina nova: descarta tudo da pagina anterior.
export function resetReveal() {
  revealToken++;
  if (observer) { observer.disconnect(); observer = null; }
  typePending.clear();
  typeActive.clear();
  if (typeRaf) { cancelAnimationFrame(typeRaf); typeRaf = 0; }
  if (untypedHL) untypedHL.clear();
}

export function initReveal(root = document) {
  // Raiz ainda fora do DOM (as views chamam isto dentro de render()):
  // nao da para medir nada, o router chama de novo depois de inserir a pagina.
  if (!root.isConnected) return;

  const reveals = [...root.querySelectorAll('.reveal:not(.is-visible)')];
  const typers = !motionOff() && canTypeText()
    ? [...root.querySelectorAll(TYPE_SELECTOR)].filter(prepareTyping)
    : [];
  if (!reveals.length && !typers.length) return;

  const token = revealToken;
  whenBootDone(() => {
    if (token !== revealToken) return;          // o usuario ja navegou para outra pagina
    if (!('IntersectionObserver' in window)) {  // navegador sem IO: mostra tudo de uma vez
      reveals.forEach((el) => el.classList.add('is-visible'));
      typers.forEach((el) => startTyping(el, 0));
      return;
    }
    const io = getObserver();
    [...reveals, ...typers].forEach((el) => { if (el.isConnected) io.observe(el); });
  });
}

export function reveal(index = 0, extra = '') {
  return `class="reveal ${extra}" style="--reveal-delay: ${Math.min(index * 55, 500)}ms"`;
}

export function categoryCard(cat, i = 0) {
  const countPages = (pages) => pages.reduce((count, page) => count + 1 + countPages(page.children || []), 0);
  const totalPages = countPages(cat.subcategories || []);
  const ci = CATEGORIES.indexOf(cat);
  return `
  <a ${`class="cat-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`}${ed(`wiki:categories.${ci}`, 'category-card', cat.name || 'Category')} href="#/${esc(cat.id)}">
    <span class="cat-card__top">
      <span class="cat-card__icon">${icon(cat.icon, 22)}</span>
      ${icon('arrow-right', 18, 'cat-card__arrow')}
    </span>
    <span class="cat-card__name">${esc(cat.name)}</span>
    <span class="cat-card__blurb">${esc(cat.tagline.split('.')[0])}.</span>
    <span class="cat-card__count">${totalPages} wiki pages</span>
  </a>`;
}

export function infoCard(h, i = 0, prefix = '') {
  return `
  <div ${`class="info-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`}${prefix ? ed(prefix, 'card', h.title || 'Highlight') : ''}>
    <span class="info-card__icon">${icon(h.icon || 'star', 18)}</span>
    <span class="info-card__title">${esc(h.title)}</span>
    <span class="info-card__text">${colorizeResources(esc(h.text))}</span>
  </div>`;
}

export function sectionHead(title, linkHref = '', linkLabel = 'View all') {
  return `
  <div class="section-head">
    <h2 class="section-title"><span class="hex-dot"></span>${esc(title)}</h2>
    ${linkHref ? `<a class="section-link" href="${esc(linkHref)}">${esc(linkLabel)} ${icon('arrow-right', 14)}</a>` : ''}
  </div>`;
}

export function mountSearchBox(root) {
  root.innerHTML = `
    <div class="searchbox">
      <div class="input-wrap" style="width:100%">
        ${icon('search', 17)}
        <input class="input" id="search-input" type="search" autocomplete="off"
               placeholder="Search the wiki…" aria-label="Search the wiki" role="combobox"
               aria-expanded="false" aria-controls="search-panel" />
        <span class="kbd searchbox__kbd">Ctrl K</span>
      </div>
      <div class="searchbox__panel" id="search-panel" role="listbox" hidden></div>
    </div>`;

  const input = root.querySelector('#search-input');
  const panel = root.querySelector('#search-panel');

  let items = [];
  let focusedIdx = -1;
  let reqToken = 0;

  const close = () => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    focusedIdx = -1;
  };

  const open = () => {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const focusItem = (idx) => {
    const els = [...panel.querySelectorAll('.searchbox__item')];
    if (!els.length) return;
    focusedIdx = (idx + els.length) % els.length;
    els.forEach((el, i) => el.classList.toggle('is-focused', i === focusedIdx));
    els[focusedIdx].scrollIntoView({ block: 'nearest' });
  };

  const renderPanel = (results, query) => {
    if (!query) { close(); return; }
    open();

    if (!results.length) {
      panel.innerHTML = `<div class="searchbox__empty">No results for <b>"${esc(query)}"</b>.<br><small>Try a keyword like "voidstone", "respawn" or "crit".</small></div>`;
      return;
    }
    const body = `<div class="dropdown__label">${icon('grid', 12)} Wiki pages</div>${results.map((result) => `
        <a class="searchbox__item" role="option" href="${esc(result.href)}">
          <span class="searchbox__item-icon">${icon(result.cat.icon, 15)}</span>
          <span>
            <b>${colorizeResources(markMatches(result.sub.name, query))}</b>
            <small>${colorizeResources(esc(result.cat.name))} · ${colorizeResources(markMatches(result.sub.desc || result.sub.tagline || '', query))}</small>
          </span>
        </a>`).join('')}`;

    panel.innerHTML = body + `
      <div class="searchbox__footer">
        <a href="#/search?q=${encodeURIComponent(query)}">
          See all ${results.length} result${results.length === 1 ? '' : 's'} for "${esc(query)}" ${icon('arrow-right', 13)}
        </a>
      </div>`;

    items = [...panel.querySelectorAll('.searchbox__item')].map((el) => ({ el, href: el.getAttribute('href') }));
  };

  const runSearch = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    const token = ++reqToken;
    panel.hidden = false;
    panel.innerHTML = `<div class="searchbox__loading"><span class="spinner"></span> Searching…</div>`;
    const results = await dataProvider.search(q);
    if (token !== reqToken) return;
    renderPanel(results.slice(0, 9), q);
  }, 140);

  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) open(); });

  input.addEventListener('keydown', (e) => {
    if (panel.hidden) {
      if (e.key === 'ArrowDown' && input.value.trim().length >= 2) { open(); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { focusItem(focusedIdx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { focusItem(focusedIdx - 1); e.preventDefault(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[focusedIdx] || items[0];
      if (target) { window.location.hash = target.href.slice(1); close(); input.blur(); }
      else if (input.value.trim()) { window.location.hash = `/search?q=${encodeURIComponent(input.value.trim())}`; close(); }
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });

  panel.addEventListener('click', () => close());

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      input.focus();
    }
  });

  window.addEventListener('hashchange', () => {
    close();
    input.value = '';
  });
}

export function fillStaticIcons() {
  qsa('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 20); });
  qsa('[data-icon-link]').forEach((el) => { el.innerHTML = icon(el.dataset.iconLink, 18); });
  qsa('[data-emblem]').forEach((el) => { el.innerHTML = emblem(parseInt(el.dataset.emblem, 10) || 24); });
}

function renderSubTree(catId, items, depth) {
  const boxCls = depth === 1 ? 'nav-sub' : `nav-sub${Math.min(depth,3)}`;
  const itemCls = depth === 1 ? 'nav-sub__item' : `nav-sub${Math.min(depth,3)}__item`;
  return `
    <div class="${boxCls}" data-parent-sub="${items[0]?.__parentId || ''}"><div>
      <div class="${boxCls}__list">
        ${items.map((s) => {
          const inlineUpgradeIds = new Set(getInlineUpgradePages(catId, s).map(({ child }) => child.id));
          const children = (s.children || []).filter((child) => !inlineUpgradeIds.has(child.id));
          const color = resourceColor(s.name);
          const dotStyle = color ? ` style="background:${color}"` : '';
          return `
          <a class="${itemCls}" data-sub="${s.id}" href="#/${catId}/${s.id}">
            <span class="nav-sub__dot"${dotStyle}></span><span class="nav-sub__label">${colorizeResources(esc(s.name))}</span>
          </a>
          ${children.length
            ? renderSubTree(catId, children.map((c) => ({ ...c, __parentId: s.id })), depth + 1)
            : ''}`;
        }).join('')}
      </div>
    </div></div>`;
}

let navWired = false;

export function buildNav() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  const openGroups=new Set(qsa('.nav-group.open',nav).map(el=>el.dataset.cat));
  const openBranches=new Set(qsa('[data-parent-sub].open',nav).map(el=>`${el.closest('.nav-group')?.dataset.cat}/${el.dataset.parentSub}`));
  nav.innerHTML =
    '<span class="sidebar__label">Categories</span>' +
    CATEGORIES.map((c) => {
      const color = resourceColor(c.name);
      const iconStyle = color ? ` style="color:${color}"` : '';
      return `
      <div class="nav-group" data-cat="${c.id}">
        <a class="nav-item" data-cat="${c.id}" href="#/${c.id}">
          <span class="nav-item__icon"${iconStyle}>${icon(c.icon, 19)}</span>
          <span class="nav-item__label">${colorizeResources(esc(c.name))}</span>
          ${icon('chevron-down', 15, 'nav-item__chev')}
        </a>
        ${renderSubTree(c.id, c.subcategories, 1)}
      </div>`;
    }).join('');

  qsa('.nav-group',nav).forEach(el=>el.classList.toggle('open',openGroups.has(el.dataset.cat)));
  qsa('[data-parent-sub]',nav).forEach(el=>el.classList.toggle('open',openBranches.has(`${el.closest('.nav-group')?.dataset.cat}/${el.dataset.parentSub}`)));
  // Saves and live sync rebuild this tree after the router has highlighted
  // the page. Reapply its full ancestor chain so nested pages stay visible.
  const [catId,subId]=(window.location.hash||'').replace(/^#\/?/,'').split('?')[0].split('/');
  setActiveNav(CATEGORIES.some(cat=>cat.id===catId)?catId:null,subId||null);
  if (navWired) return;
  navWired = true;
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a.nav-item, a[data-sub]');
    if (!link) return;

    const item = e.target.closest('.nav-item');
    if (item) {
      if (item.classList.contains('active')) {
        e.preventDefault();
        openGroup(null);
        window.location.hash = '#/';
        return;
      }
      openGroup(item.dataset.cat);
      return;
    }

    if (link.hash === window.location.hash) {
      e.preventDefault();
      const [catId, subId] = link.hash.replace(/^#\/?/, '').split('/');
      const sub = getSubcategory(catId, subId);
      if (sub?.parentId) {
        window.location.hash = `#/${catId}/${sub.parentId}`;
        return;
      }

      const wrapper = nav.querySelector(`[data-parent-sub="${subId}"]`);
      if (wrapper) wrapper.classList.toggle('open');
      return;
    }

    const subItem = e.target.closest('[data-sub]');
    if (subItem) {
      const wrapper = nav.querySelector(`[data-parent-sub="${subItem.dataset.sub}"]`);
      if (wrapper) wrapper.classList.toggle('open');
    }
  });
}

export function openGroup(catId) {
  qsa('.nav-group').forEach((g) => g.classList.toggle('open', g.dataset.cat === catId));
}

// ==== Indicador deslizante da categoria (a "linha verde") ====
let navIndicator = null;
let indicatorToken = 0;
let navScrollTimer;

function moveIndicator() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  if (!navIndicator?.isConnected) {
    navIndicator = document.createElement('span');
    navIndicator.className = 'nav-indicator';
    navIndicator.setAttribute('aria-hidden', 'true');
    nav.appendChild(navIndicator);
  }
  const active = qs('.nav-item.active', nav);
  if (!active) {
    navIndicator.classList.add('is-hidden');
    return;
  }
  navIndicator.classList.remove('is-hidden');
  const sync = () => {
    const navRect = nav.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    navIndicator.style.top = `${r.top - navRect.top + nav.scrollTop}px`;
    navIndicator.style.height = `${r.height}px`;
  };
  sync();
  const token = ++indicatorToken;
  const t0 = performance.now();
  const step = () => {
    if (token !== indicatorToken) return;
    sync();
    if (performance.now() - t0 < 650) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function setActiveNav(catId, subId = null) {
  qsa('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.cat === catId);
  });
  qsa('[data-sub]').forEach((el) => {
    el.classList.toggle('active', !!catId && el.dataset.sub === subId);
  });
  if (catId) openGroup(catId);
  qsa('[data-parent-sub]').forEach((el) => {
    if(el.dataset.parentSub === subId || el.querySelector('[data-sub].active'))el.classList.add('open');
  });
  moveIndicator();
  clearTimeout(navScrollTimer);
  // Search can open a new nested page below the sidebar's visible area.
  // Wait for the accordion to expand, then reveal only within its scroller.
  navScrollTimer=setTimeout(()=>{
    const nav=qs('#sidebar-nav'),active=nav?.querySelector('[data-sub].active');
    if(!active)return;
    const bounds=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
    if(item.bottom>bounds.bottom-12)nav.scrollTop+=item.bottom-bounds.bottom+12;
    else if(item.top<bounds.top+12)nav.scrollTop-=bounds.top-item.top+12;
  },300);
}

export function setCrumbs(items = []) {
  const root = qs('#crumbs');
  if (!items.length) { root.innerHTML = ''; return; }
  root.innerHTML = items
    .map((it, i) => {
      const last = i === items.length - 1;
      const iconHtml = it.icon ? icon(it.icon, 14) : '';
      const label = esc(it.label);
      if (last) return `<span class="crumbs__current">${iconHtml}<span>${label}</span></span>`;
      return `<a href="${it.href || '#/'}">${iconHtml}<span>${label}</span></a>${icon('chevron-right', 12)}`;
    })
    .join('');
}

export function setupDrawer() {
  const sidebar = qs('#sidebar');
  const menuBtn = qs('#menu-btn');

  const close = () => {
    sidebar.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    qs('.sidebar-backdrop')?.remove();
  };

  const open = () => {
    sidebar.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', close);
    document.body.appendChild(backdrop);
  };

  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? close() : open();
  });

  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  window.addEventListener('hashchange', close);

  // ==== Atalho mobile: deslize da borda esquerda para a direita abre o menu ====
  // Sem arrastar o elemento (so detecta a intencao) para nunca brigar com a
  // rolagem vertical. Um deslize para a esquerda com o menu aberto fecha.
  const EDGE = 32;       // px a partir da borda esquerda que inicia o gesto
  const OPEN_AT = 64;    // deslocamento horizontal minimo para abrir
  const CLOSE_AT = -64;  // deslocamento para fechar (com o menu aberto)
  let touch = null;

  const horizontalIntent = (dx, dy) => Math.abs(dx) > Math.abs(dy) * 1.4;

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const isOpen = sidebar.classList.contains('is-open');
    if (!isOpen && t.clientX > EDGE) return;
    touch = { x: t.clientX, y: t.clientY, isOpen };
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (horizontalIntent(dx, dy)) {
      if (!touch.isOpen && dx > OPEN_AT) open();
      else if (touch.isOpen && dx < CLOSE_AT) close();
    }
    touch = null;
  }, { passive: true });

  document.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
}

export function setupBackTop() {
  const btn = qs('#back-top');
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const onScroll = () => {
    btn.classList.toggle('is-visible', window.scrollY > 620);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ==== Badge de update nova (! vermelho no Update Log) ====

const UPDATE_SEEN_KEY = 'ri-seen-update-id';

export function initUpdateBadge(latestId) {
  let unseen = true;
  try { unseen = localStorage.getItem(UPDATE_SEEN_KEY) !== latestId; } catch { /* file:// etc */ }
  qsa('[data-update-badge]').forEach((b) => { b.hidden = !unseen; });
}

export function markUpdateSeen(latestId) {
  try { localStorage.setItem(UPDATE_SEEN_KEY, latestId); } catch { /* ignore */ }
  qsa('[data-update-badge]').forEach((b) => { b.hidden = true; });
}

// ==== Settings ====

const SETTINGS_TOGGLES = {
  motion: {
    key: 'ri-motion',
    default: false,
    apply: (on) => document.documentElement.classList.toggle('reduce-motion', on),
  },
  'res-colors': {
    key: 'ri-res-colors',
    default: true,
    apply: (on) => document.documentElement.classList.toggle('res-off', !on),
  },
  textures: {
    key: 'ri-textures',
    default: true,
    apply: (on) => document.documentElement.classList.toggle('tex-off', !on),
  },
  scientific: {
    key: 'ri-scientific',
    default: false,
    apply: () => {},
  },
};

function settingState(id) {
  let v = null;
  try { v = localStorage.getItem(SETTINGS_TOGGLES[id].key); } catch { /* ignore */ }
  return v == null ? SETTINGS_TOGGLES[id].default : v === '1';
}

function applySetting(id, on) {
  SETTINGS_TOGGLES[id].apply(on);
  try { localStorage.setItem(SETTINGS_TOGGLES[id].key, on ? '1' : '0'); } catch { /* ignore */ }
}

export function applyStoredSettings() {
  Object.keys(SETTINGS_TOGGLES).forEach((id) => SETTINGS_TOGGLES[id].apply(settingState(id)));
}

export function setupSettings() {
  const btn = qs('#settings-btn');
  const menu = qs('#settings-menu');
  if (!btn || !menu) return;

  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('ri-theme', theme); } catch { /* ignore */ }
    syncUI();
  };

  const syncUI = () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    qsa('[data-set-theme]', menu).forEach((b) => b.classList.toggle('active', b.dataset.setTheme === theme));
    qsa('[data-toggle]', menu).forEach((row) => {
      const on = settingState(row.dataset.toggle);
      row.classList.toggle('on', on);
      row.setAttribute('aria-checked', String(on));
    });
  };

  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('[data-set-theme]');
    if (themeBtn) { setTheme(themeBtn.dataset.setTheme); return; }
    const row = e.target.closest('[data-toggle]');
    if (row) {
      applySetting(row.dataset.toggle, !settingState(row.dataset.toggle));
      syncUI();
      if (row.dataset.toggle === 'scientific') {
        window.dispatchEvent(new Event('ri-number-format-change'));
      }
    }
  });
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.hidden = true;
  });
  syncUI();
}

export function initShell() {
  fillStaticIcons();
  buildNav();
  setupDrawer();
  setupBackTop();
  mountSearchBox(qs('#search-root'));
  setupSettings();
  window.addEventListener('resize', moveIndicator);
  if (document.fonts?.ready) document.fonts.ready.then(moveIndicator);
}
