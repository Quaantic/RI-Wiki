// ==== UI: ICONES, COMPONENTES E SHELL (nao precisa editar) ====

import { qs, qsa, esc, html, debounce, fmtNum, fmtDateShort, markMatches, searchPages, groupByCategory } from './utils.js';
import { CATEGORIES, getSubcategory } from './data/wiki-data.js';
import { getInlineUpgradePages } from './data/formulas.js';
import { colorizeResources, resourceColor } from './data/resource-colors.js';
import { dataProvider } from './services.js';

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

const ART = {
  main: `
    <circle cx="80" cy="80" r="62"/>
    <circle cx="80" cy="80" r="40" opacity=".55"/>
    <path d="M80 10v16M80 134v16M10 80h16M134 80h16M31 31l11 11M118 118l11 11M129 31l-11 11M42 118l-11 11" opacity=".7"/>
    <path d="M97 63 87 87 63 97 73 73Z" fill="currentColor" stroke="none"/>
    <path d="M80 74l2.5 3.5L86 80l-3.5 2.5L80 86l-2.5-3.5L74 80l3.5-2.5Z" fill="currentColor" stroke="none" opacity=".7"/>`,

  life: `
    <path d="M40 122C40 74 72 42 120 42c0 48-32 80-80 80Z"/>
    <path d="M40 122c20-38 44-60 70-70" opacity=".55"/>
    <path d="M92 132c0-20 14-34 34-34 0 20-14 34-34 34Z" opacity=".7"/>
    <path d="M118 60v0" opacity="0"/>
    <circle cx="30" cy="46" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>
    <circle cx="136" cy="112" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>
    <circle cx="112" cy="24" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>`,

  'upgrade-tree': `
    <path d="M80 128V100M80 100 46 64M80 100l34-36M46 64 28 40M46 64l22-20M114 64 96 44M114 64l20-24" opacity=".85"/>
    <circle cx="80" cy="134" r="8"/>
    <circle cx="46" cy="64" r="7"/>
    <circle cx="114" cy="64" r="7"/>
    <circle cx="26" cy="36" r="5.5"/><circle cx="70" cy="40" r="5.5"/><circle cx="94" cy="40" r="5.5"/><circle cx="136" cy="36" r="5.5"/>
    <path d="M26 30v12M20 36h12" opacity=".5"/><path d="M136 30v12M130 36h12" opacity=".5"/>`,

  mining: `
    <path d="M56 134 42 88l14-38 14 38Z" opacity=".85"/>
    <path d="M80 140 60 80 80 24l20 56Z"/>
    <path d="M108 134 96 98l12-30 12 30Z" opacity=".85"/>
    <path d="M60 80h40" opacity=".5"/><path d="M80 24v116" opacity=".35"/>
    <path d="M26 134h108" opacity=".4"/>
    <path d="M24 60v12M18 66h12" opacity=".6"/><path d="M136 88v12M130 94h12" opacity=".6"/>`,

  dungeon: `
    <path d="M26 138V56h6V44h8v12h6v94"/>
    <path d="M134 138V56h-6V44h-8v12h-6v94"/>
    <path d="M52 138V90h56v48" opacity=".8"/>
    <path d="M66 138v-20a14 14 0 0 1 28 0v20"/>
    <path d="M73 122v16M80 119v19M87 122v16" opacity=".7"/>
    <path d="M112 26h16l-5 6 5 6h-16" opacity=".8"/>
    <path d="M112 26v18"/>
    <path d="M18 138h124" opacity=".4"/>`,

  runes: `
    <path d="M30 134V72a11 11 0 0 1 22 0v62Z" opacity=".85"/>
    <path d="M64 134V58a13 13 0 0 1 26 0v76Z"/>
    <path d="M100 134V80a10 10 0 0 1 20 0v54Z" opacity=".85"/>
    <path d="M76 74v40M68 88h16M68 102h16" opacity=".75"/>
    <path d="M41 92v28M35 104l12-8" opacity=".6"/>
    <path d="M110 98v22M104 110h12" opacity=".6"/>
    <path d="M20 134h122" opacity=".4"/>`,

  perks: `
    <path d="M80 24 92 68l44 12-44 12-12 44-12-44-44-12 44-12Z"/>
    <circle cx="80" cy="80" r="15" opacity=".6"/>
    <path d="M28 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" opacity=".65"/>
    <path d="M126 108l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5Z" opacity=".65"/>
    <path d="M122 30v10M117 35h10" opacity=".5"/><path d="M30 116v10M25 121h10" opacity=".5"/>`,
};

export function categoryArt(categoryId, size = 160, cls = '') {
  const body = ART[categoryId] || ART.main;
  return `<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
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
  '.article-head__title', '.article-head__desc',
  '.page-head h1', '.page-head p',
  '.section-title', '.article-section__title',
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

const NUMERIC = /^[\d.,]+(k|M)?%?$/;

function cellHTML(v) {
  const s = String(v ?? '');
  return `<td${NUMERIC.test(s) ? ' class="num"' : ''}>${colorizeResources(esc(s))}</td>`;
}

function renderTable(b) {
  const head = b.columns
    .map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${esc(c.label)}</th>`)
    .join('');
  const rows = b.rows
    .map((r) => `<tr>${b.columns.map((c) => cellHTML(r[c.key])).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderList(b) {
  const cls = b.ordered ? 'block-list block-list--ordered' : 'block-list';
  const marker = b.ordered
    ? '' // ordered markers come from CSS counters
    : icon(b.checks ? 'check-circle' : 'hex', 15);
  const items = b.items
    .map((it) => `<li>${b.ordered ? '' : marker}<span>${colorizeResources(esc(it.text || it))}</span></li>`)
    .join('');
  return `<ul class="${cls}">${items}</ul>`;
}

function renderKv(b) {
  const rows = b.pairs
    .map((pr) => `<div class="kv-list__row"><span class="kv-list__key">${esc(pr.key)}</span><span>${colorizeResources(esc(pr.value))}</span></div>`)
    .join('');
  return `<div class="kv-list">${rows}</div>`;
}

export function renderBlocks(blocks = []) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p': return `<p>${colorizeResources(esc(b.text))}</p>`;
        case 'list': return renderList(b);
        case 'table': return renderTable(b);
        case 'kv': return renderKv(b);
        default: return '';
      }
    })
    .join('');
}

export function renderSection(s, i = 0) {
  const body = `<div class="x-section__body"><div><div class="prose article-blocks x-section__inner">${renderBlocks(s.blocks)}</div></div></div>`;

  if (s.collapsed) {
    return `
      <div class="x-section${s.collapsed ? '' : ' x-section--open'}" data-x-section>
        <button class="x-section__head" type="button" aria-expanded="false">
          <span class="hex-dot"></span>
          <span>${esc(s.title)}</span>
          ${icon('chevron-down', 18, 'x-section__chevron')}
        </button>
        ${body}
      </div>`;
  }
  return `
    <div class="article-section" data-toc-anchor="s-${i}">
      <h2 class="article-section__title"><span class="hex-dot"></span>${esc(s.title)}</h2>
      <div class="prose article-blocks">${renderBlocks(s.blocks)}</div>
    </div>`;
}

export function renderStats(stats = []) {
  if (!stats.length) return '';
  return `<div class="article-stats">${stats.map(statCard).join('')}</div>`;
}

export function statCard(s) {
  return `
    <div class="stat-card">
      <span class="stat-card__icon">${icon(s.icon || 'info', 20)}</span>
      <span>
        <span class="stat-card__value">${esc(s.value)}</span>
        <span class="stat-card__label">${esc(s.label)}</span>
      </span>
    </div>`;
}

export function wireBlocks(root) {
  root.querySelectorAll('[data-x-section] .x-section__head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const box = btn.closest('[data-x-section]');
      const open = box.classList.toggle('x-section--open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
}

export function articleCard(a, i = 0) {
  return `
  <a ${`class="article-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/article/${esc(a.id)}">
    <div class="article-card__art">${categoryArt(a.category, 120)}</div>
    <div class="article-card__body">
      <span class="article-card__meta">${icon('clock', 12)} ${fmtDateShort(a.updated)}</span>
      <span class="article-card__title">${colorizeResources(esc(a.title))}</span>
      <span class="article-card__desc">${esc(a.description)}</span>
      <span class="article-card__foot">
        ${icon('eye', 13)} ${fmtNum(a.views)} views
      </span>
    </div>
  </a>`;
}

export function articleRow(a, i = 0) {
  return `
  <a ${`class="article-row reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/article/${esc(a.id)}">
    <span class="article-row__icon">${icon('book', 17)}</span>
    <span style="min-width:0">
      <span class="article-row__title">${colorizeResources(esc(a.title))}</span>
      <span class="article-row__meta">${fmtDateShort(a.updated)} · ${fmtNum(a.views)} views</span>
    </span>
    ${icon('arrow-right', 15)}
  </a>`;
}

export function categoryCard(cat, articleCount, i = 0) {
  return `
  <a ${`class="cat-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`} href="#/${esc(cat.id)}">
    <span class="cat-card__top">
      <span class="cat-card__icon">${icon(cat.icon, 22)}</span>
      ${icon('arrow-right', 18, 'cat-card__arrow')}
    </span>
    <span class="cat-card__name">${esc(cat.name)}</span>
    <span class="cat-card__blurb">${esc(cat.tagline.split('.')[0])}.</span>
    <span class="cat-card__count">${articleCount} article${articleCount === 1 ? '' : 's'} · ${cat.subcategories.length} subsections</span>
  </a>`;
}

export function infoCard(h, i = 0) {
  return `
  <div ${`class="info-card reveal" style="--reveal-delay: ${Math.min(i * 50, 400)}ms"`}>
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

export function skeleton(kind, count = 3) {
  if (kind === 'cards') {
    return `<div class="grid grid--cards">${'<div class="skeleton skeleton--card"></div>'.repeat(count)}</div>`;
  }
  if (kind === 'rows') {
    return `<div style="display:flex;flex-direction:column;gap:10px">${'<div class="skeleton skeleton--row"></div>'.repeat(count)}</div>`;
  }
  return `<div class="skeleton skeleton--title"></div><div class="skeleton skeleton--text" style="width:80%;margin-top:10px"></div>`;
}

const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

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

  const renderPanel = (results, query, total) => {
    if (!query) { close(); return; }
    open();

    const groups = groupByCategory(results);
    let body = '';
    const pages = searchPages(query, { limit: 4 });
    if (pages.length) {
      body += `<div class="dropdown__label">${icon('grid', 12)} Sections</div>`;
      body += pages.map((p) => `
        <a class="searchbox__item" role="option" href="#/${p.cat.id}/${p.sub.id}">
          <span class="searchbox__item-icon">${icon(p.cat.icon, 15)}</span>
          <span>
            <b>${colorizeResources(markMatches(p.sub.name, query))}</b>
            <small>${colorizeResources(esc(p.cat.name))} · ${colorizeResources(markMatches(p.sub.desc || '', query))}</small>
          </span>
        </a>`).join('');
    }
    if (!results.length && !pages.length) {
      panel.innerHTML = `<div class="searchbox__empty">No results for <b>"${esc(query)}"</b>.<br><small>Try a keyword like "voidstone", "respawn" or "crit".</small></div>`;
      return;
    }
    for (const [catId, entries] of groups) {
      const cat = CAT_BY_ID.get(catId);
      body += `<div class="dropdown__label">${icon(cat.icon, 12)} ${esc(cat.name)}</div>`;
      body += entries.map((r, i) => `
        <a class="searchbox__item" role="option" href="#/article/${esc(r.article.id)}" data-idx="${items.length + i}">
          <span class="searchbox__item-icon">${icon('book', 15)}</span>
          <span>
            <b>${markMatches(r.article.title, query)}</b>
            <small>${colorizeResources(markMatches(r.snippet, query))}</small>
          </span>
        </a>`).join('');
    }

    panel.innerHTML = body + `
      <div class="searchbox__footer">
        <a href="#/search?q=${encodeURIComponent(query)}">
          See all ${total} result${total === 1 ? '' : 's'} for "${esc(query)}" ${icon('arrow-right', 13)}
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
    renderPanel(results.slice(0, 9), q, results.length + searchPages(q).length);
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
  const boxCls = depth === 1 ? 'nav-sub' : `nav-sub${depth}`;
  const itemCls = depth === 1 ? 'nav-sub__item' : `nav-sub${depth}__item`;
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

export function buildNav() {
  const nav = qs('#sidebar-nav');
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

function moveIndicator() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  if (!navIndicator) {
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
    el.classList.toggle('open', el.dataset.parentSub === subId || !!el.querySelector('[data-sub].active'));
  });
  moveIndicator();
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

