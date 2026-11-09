// ==== UI: ICONES, COMPONENTES E SHELL (nao precisa editar) ====

import { qs, qsa, esc, html, debounce, markMatches } from './utils.js';
import { animateDynamicContent } from './page-motion.js';
import { getCurrentPageMatches, focusCurrentPageMatch, withFocusHref } from './reading-tools.js';
import { CATEGORIES, getSubcategory, getSubcategoryDocPath } from './data/wiki-data.js';
import { getInlineUpgradePages } from './data/formulas.js';
import { colorizeResources, resourceColor, RESOURCE_COLORS, PAGE_LINKS } from './data/resource-colors.js';
import { dataProvider } from './services.js';
import { ed } from './edit/ed-attr.js';
import { formatReleaseVersion } from './releases.js';

import { LUCIDE_ICONS } from './lib/lucide-data.js';
import { gameIconReference, localIconReference, iconAssetURL, namedIconReference, customIconEntries } from './icon-catalog.js';

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
  fire: 'flame',
  fogo: 'flame',
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
  const asset = localIconReference(name);
  if (asset) return `<img class="wiki-icon${cls ? ` ${esc(cls)}` : ''}" src="${esc(iconAssetURL(asset))}" width="${size}" height="${size}" alt="" decoding="async">`;
  const gameReference = gameIconReference(name);
  if (gameReference) return `<svg ${cls ? `class="${esc(cls)}" ` : ''}width="${size}" height="${size}" viewBox="0 0 512 512" fill="currentColor" stroke="none" aria-hidden="true" focusable="false"><use href="${esc(iconAssetURL(gameReference))}" /></svg>`;
  const body = iconNode(name)
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
      return `<${tag}${a}/>`;
    })
    .join('');
  return `<svg ${cls ? `class="${cls}" ` : ''}width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function namedIcon(name, fallback = '', size = 20, cls = '') {
  return icon(namedIconReference(name, fallback), size, cls);
}

export function emblem(size = 32, cls = '') {
  return `<img class="wiki-icon ${esc(cls)}" src="${esc(iconAssetURL('images/favicon.svg'))}" width="${size}" height="${size}" alt="">`;
}

// Restored from the pre-redesign wiki: reveal newly inserted results, while
// the page-motion controller prevents duplicate animations and rerender flicker.
export function initReveal(root = document) {
  if (root.isConnected) animateDynamicContent(root);
}

export function reveal(index = 0, extra = '') {
  return `class="reveal ${extra}" style="--reveal-delay: ${Math.min(index * 55, 500)}ms"`;
}

export function categoryCard(cat) {
  const countPages = (pages) => pages.reduce((count, page) => count + 1 + countPages(page.children || []), 0);
  const totalPages = countPages(cat.subcategories || []);
  const ci = CATEGORIES.indexOf(cat);
  return `
  <a class="cat-card" data-chapter="${esc(cat.id)}" ${ed(`wiki:categories.${ci}`, 'category-card', cat.name || 'Category')} href="#/${esc(cat.id)}">
    <span class="cat-card__icon">${namedIcon(cat.name, cat.icon, 34)}</span>
    <span class="cat-card__text">
      <strong class="cat-card__name">${esc(cat.name)}</strong>
      <span class="cat-card__blurb">${esc(cat.tagline?.split('.')[0] || cat.desc || '')}</span>
    </span>
    <span class="cat-card__count">${totalPages} ${totalPages === 1 ? 'page' : 'pages'}</span>
    ${icon('chevron-right', 16, 'cat-card__arrow')}
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
  let localMatches = [];

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

    if (!results.length && !getCurrentPageMatches(query).length && !['dashboard','update log','updates','upgrade calculator','calculator','feedback'].some(label => label.includes(query.toLowerCase()))) {
      panel.innerHTML = `<div class="searchbox__empty">No results for <b>"${esc(query)}"</b>.<br><small>Try a keyword like "voidstone", "respawn" or "crit".</small></div>`;
      return;
    }
    // A command-palette style preview: navigation first, content results second.
    // Upgrades stay linked to their original wiki page, never to the Calculator.
    const quickLinks = [
      { name: 'Dashboard', href: '#/', icon: 'layout-dashboard', path: 'Navigation' },
      { name: 'Update Log', href: '#/updates', icon: 'scroll', path: 'Tools' },
      { name: 'Upgrade Calculator', href: '#/calculator', icon: 'calculator', path: 'Tools' },
      { name: 'Feedback', href: '#/feedback', icon: 'heart', path: 'Tools' },
    ];
    const lower = query.toLowerCase();
    const navigation = [
      ...quickLinks.filter(item => item.name.toLowerCase().includes(lower)),
      ...results.filter(item => item.kind === 'category').map(item => ({
        name: item.sub.name, href: item.href, icon: item.cat.icon, path: 'Categories',
      })),
    ];
    const content = results.filter(item => item.kind !== 'category');
    const crumbsFor = (result) => {
      const findPath = (pages, id, trail = []) => {
        for (const page of pages || []) {
          const next = [...trail, page.name];
          if (page.id === id) return next;
          const found = findPath(page.children, id, next);
          if (found) return found;
        }
        return null;
      };
      if (result.kind === 'upgrade') return [result.cat.name, result.sub.desc?.split(' · ')[0] || 'Upgrades'];
      const trail = findPath(result.cat.subcategories, result.sub.id);
      return [result.cat.name, ...(trail || []).slice(0, -1)];
    };
    // Search the current page in the same dropdown, before wiki-wide results.
    localMatches = getCurrentPageMatches(query, 7);
    const localHTML = localMatches.length ? `<div class="dropdown__label">This Page</div>${localMatches.map((item, i) => `
      <button type="button" class="searchbox__item searchbox__local" role="option" data-local-index="${i}">
        <span class="searchbox__item-icon">${icon('locate-fixed', 16)}</span>
        <span class="searchbox__copy"><b>${markMatches(item.label, query)}</b><small class="searchbox__path">Jump to match on this page</small></span>
      </button>`).join('')}` : '';
    const navHTML = navigation.length ? `<div class="dropdown__label">Navigation</div>${navigation.slice(0, 6).map(item => `
      <a class="searchbox__item" role="option" href="${esc(item.href)}">
        <span class="searchbox__item-icon">${icon(item.icon, 16)}</span>
        <span class="searchbox__copy"><b>${markMatches(item.name, query)}</b>
          <small class="searchbox__path">${esc(item.path)}</small></span>
      </a>`).join('')}` : '';
    const contentHTML = content.length ? `<div class="dropdown__label">Content Search</div>${content.slice(0, 9).map(result => `
      <a class="searchbox__item" role="option" href="${esc(withFocusHref(result.href,result.sub.name,result.kind))}">
        <span class="searchbox__item-icon">${icon(result.cat.icon, 16)}</span>
        <span class="searchbox__copy">
          <b>${colorizeResources(markMatches(result.sub.name, query))}</b>
          <small class="searchbox__path">${crumbsFor(result).map(segment => colorizeResources(esc(segment))).join('<span class="searchbox__chevron"> » </span>')}${result.kind === 'upgrade' ? ' · Upgrade' : ''}</small>
          ${result.sub.desc || result.sub.tagline ? `<small class="searchbox__description">${colorizeResources(markMatches(result.sub.desc || result.sub.tagline, query))}</small>` : ''}
        </span>
      </a>`).join('')}` : '';
    panel.innerHTML = localHTML + navHTML + contentHTML + `
      <div class="searchbox__footer">
        <a href="#/search?q=${encodeURIComponent(query)}">
          See all search results for "${esc(query)}" ${icon('arrow-right', 13)}
        </a>
        <div class="searchbox__shortcuts">${icon('arrow-up', 12)} ${icon('arrow-down', 12)} Navigate &nbsp; ${icon('corner-down-left', 12)} Select &nbsp; Esc Close</div>
      </div>`;

    items = [...panel.querySelectorAll('.searchbox__item')].map((el) => ({ el, href: el.getAttribute('href'), localIndex: el.dataset.localIndex }));
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
      if (target) { if (target.localIndex !== undefined) { focusCurrentPageMatch(localMatches[Number(target.localIndex)]?.element); } else if (target.href) { window.location.hash = target.href.slice(1); } close(); input.blur(); }
      else if (input.value.trim()) { window.location.hash = `/search?q=${encodeURIComponent(input.value.trim())}`; close(); }
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });

  panel.addEventListener('click', event => {
    const local = event.target.closest('[data-local-index]');
    if (local) {
      event.preventDefault();
      focusCurrentPageMatch(localMatches[Number(local.dataset.localIndex)]?.element);
    }
    close();
  });

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

// The sidebar keeps each resource's own color even when it becomes active.
// This scoped colorization avoids the generic page-level `.active .res` override.
const navColorize = (name) => colorizeResources(esc(name))
  .replace(/style="color:(#[0-9a-fA-F]{3,8})"/g, 'style="color:$1 !important"');

function renderSubTree(catId, items, depth) {
  const boxCls = depth === 1 ? 'nav-sub' : `nav-sub${Math.min(depth,3)}`;
  const itemCls = depth === 1 ? 'nav-sub__item' : `nav-sub${Math.min(depth,3)}__item`;
  return `
    <div class="${boxCls}" data-parent-sub="${items[0]?.__parentId || ''}"><div>
      <div class="${boxCls}__list">
        ${items.map((s) => {
          const inlineUpgradeIds = new Set(getInlineUpgradePages(catId, s).map(({ child }) => child.id));
          const children = (s.children || []).filter((child) => !inlineUpgradeIds.has(child.id));
          return `
          <a class="${itemCls}${children.length ? ' nav-has-children' : ''}" style="--nav-node:${esc(resourceColor(s.name) || resourceColor(s.__parentName) || resourceColor(CATEGORIES.find(c=>c.id===catId)?.name) || '#a8ef45')}" data-depth="${depth}" data-sub="${s.id}" href="#/${catId}/${s.id}"${children.length ? ' aria-expanded="false"' : ''}>
            <span class="nav-sub__icon">${namedIcon(s.name, s.icon, 25)}</span><span class="nav-sub__label">${navColorize(s.name)}</span>
          </a>
          ${children.length
            ? renderSubTree(catId, children.map((c) => ({ ...c, __parentId: s.id, __parentName: s.name })), depth + 1)
            : ''}`;
        }).join('')}
      </div>
    </div></div>`;
}

let navWired = false;
const NAV_STATE_KEY = 'ri-sidebar-state-v2';
const savedNavState = (() => {
  try { return JSON.parse(localStorage.getItem(NAV_STATE_KEY) || '{}') || {}; }
  catch { return {}; }
})();
const expandedGroups = new Set(Array.isArray(savedNavState.groups) ? savedNavState.groups : []);
const branchStates = new Map(Array.isArray(savedNavState.branches) ? savedNavState.branches : []);
let sidebarScrollTop = Math.max(0, Number(savedNavState.scrollTop) || 0);
let navSaveTimer;
let lastCategoryTap = null;
const branchKey = el => `${el.closest('.nav-group')?.dataset.cat}/${el.dataset.parentSub}`;
const onMobileNav = () => window.matchMedia('(max-width: 920px)').matches;
function persistNavState() {
  clearTimeout(navSaveTimer);
  navSaveTimer = setTimeout(() => {
    try { localStorage.setItem(NAV_STATE_KEY, JSON.stringify({
      groups: [...expandedGroups], branches: [...branchStates], scrollTop: sidebarScrollTop,
    })); } catch { /* storage disabled */ }
  }, 100);
}
// Mark every opened and current ancestor, not only the deepest selected page.
function syncSidebarHierarchy() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  qsa('.nav-group', nav).forEach(group => {
    group.classList.toggle('is-current-branch', !!group.querySelector('[data-sub].active, :scope > .nav-item.active'));
    qsa('a[data-sub]', group).forEach(link => {
      const branch = link.nextElementSibling;
      if (!branch?.matches('.nav-sub2,.nav-sub3')) return;
      const expanded = branch.classList.contains('open');
      const ancestor = !!branch.querySelector('a[data-sub].active');
      link.classList.toggle('is-branch-open', expanded);
      link.classList.toggle('is-ancestor', ancestor);
      link.setAttribute('aria-expanded', String(expanded));
    });
  });
}

function syncGroupUI() {
  qsa('#sidebar-nav .nav-group').forEach(group => {
    const open = expandedGroups.has(group.dataset.cat);
    group.classList.toggle('open', open);
    const submenu = group.querySelector(':scope > .nav-sub');
    if (submenu) submenu.inert = !open;
    group.querySelector(':scope > [data-toggle-cat]')?.setAttribute('aria-expanded', String(open));
    group.querySelector(':scope > .nav-item')?.setAttribute('aria-expanded', String(open));
  });
  syncSidebarHierarchy();
  moveIndicator();
}
function setGroupExpanded(catId, expanded) {
  if (!catId) return;
  if (expanded) expandedGroups.add(catId); else expandedGroups.delete(catId);
  syncGroupUI();
  persistNavState();
}

// Keep the sidebar's fixed community links in sync with Colors in the editor.
// Match by linked route first (works even when the color entry has a custom
// name), then by the visible link name. Nothing is hardcoded to a color.
export function syncFooterResourceColors() {
  const entries = Object.entries(RESOURCE_COLORS);
  const routeByName = new Map(Object.entries(PAGE_LINKS).map(([name, route]) => [name.toLowerCase(), route]));
  for (const link of qsa('.sidebar__foot a.foot-link[href]')) {
    const route = link.getAttribute('href');
    const label = link.querySelector('span:not(.nav-item__icon):not(.nav-badge)')?.textContent?.trim() || '';
    const byRoute = entries.find(([name]) => routeByName.get(name.toLowerCase()) === route);
    const byName = entries.find(([name]) => name.toLowerCase() === label.toLowerCase());
    const color = (byRoute || byName)?.[1];
    if (color) {
      link.style.setProperty('--ri-editor-link-color', color);
      link.classList.add('foot-link--custom-color');
    } else {
      link.style.removeProperty('--ri-editor-link-color');
      link.classList.remove('foot-link--custom-color');
    }
  }
}

export function buildNav() {
  const nav = qs('#sidebar-nav');
  if (!nav) return;
  const oldScrollTop = nav.scrollTop || sidebarScrollTop;
  // Rebuilds (including live editor sync) preserve open/closed branches.
  // Keep all opened categories when the sidebar is rebuilt in edit mode.
  qsa('.nav-group.open', nav).forEach(el => expandedGroups.add(el.dataset.cat));
  qsa('[data-parent-sub].open', nav).forEach(el => branchStates.set(branchKey(el), true));
  nav.innerHTML =
    '<span class="sidebar__label">Categories</span>' +
    CATEGORIES.map((c) => {
      const color = resourceColor(c.name);
      const iconStyle = color ? ` style="color:${color}"` : '';
      return `
      <div class="nav-group" data-cat="${c.id}" data-chapter="${esc(c.id)}" style="--nav-branch:${esc(color || '#a8ef45')}">
        <a class="nav-item" data-cat="${c.id}" href="#/${c.id}" aria-expanded="false">
          <span class="nav-item__icon"${iconStyle}>${namedIcon(c.name, c.icon, 30)}</span>
          <span class="nav-item__label">${navColorize(c.name)}</span>
        </a>
        <button type="button" class="nav-item__expand" aria-label="Toggle ${esc(c.name)} subsections" aria-expanded="false" data-toggle-cat="${esc(c.id)}"><span class="nav-expand-line" aria-hidden="true"></span></button>
        <div class="nav-mobile-overview" data-overview-for="${esc(c.id)}"><a href="#/${esc(c.id)}" aria-label="Open ${esc(c.name)} overview page">${icon('book-open', 15)} <span>${esc(c.name)} overview</span> ${icon('arrow-up-right',13)}</a></div>
        ${renderSubTree(c.id, c.subcategories, 1)}
      </div>`;
    }).join('');

  syncFooterResourceColors();
  qsa('[data-parent-sub]', nav).forEach(el => el.classList.toggle('open', branchStates.get(branchKey(el)) === true));
  syncGroupUI();
  nav.scrollTop = oldScrollTop;
  sidebarScrollTop = oldScrollTop;
  // Saves and live sync rebuild this tree after the router has highlighted
  // the page. Reapply its full ancestor chain so nested pages stay visible.
  const [catId,subId]=(window.location.hash||'').replace(/^#\/?/,'').split('?')[0].split('/');
  setActiveNav(CATEGORIES.some(cat=>cat.id===catId)?catId:null,subId||null);
  if (navWired) return;
  navWired = true;
  nav.addEventListener('scroll', () => {
    sidebarScrollTop = nav.scrollTop;
    persistNavState();
  }, { passive: true });
  nav.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-cat]');
    if (toggle) {
      e.preventDefault();
      lastCategoryTap = null;
      setGroupExpanded(toggle.dataset.toggleCat, !expandedGroups.has(toggle.dataset.toggleCat));
      return;
    }
    const link = e.target.closest('a.nav-item, a[data-sub]');
    if (!link) return;
    const item = e.target.closest('.nav-item');
    if (item) {
      const catId = item.dataset.cat;
      if (onMobileNav()) {
        // Legacy QoL: first tap expands the category without opening its page,
        // second quick tap opens the overview. Keep an explicit Overview link
        // for slower browsing and keyboard/screen-reader navigation too.
        const secondTap = lastCategoryTap?.id === catId &&
          Date.now() - lastCategoryTap.time < 1800;
        if (!secondTap) {
          e.preventDefault();
          lastCategoryTap = { id:catId, time:Date.now() };
          setGroupExpanded(catId, true);
          return;
        }
        lastCategoryTap = null;
        setGroupExpanded(catId, true);
        return;
      }
      lastCategoryTap = null;
      if (item.classList.contains('active')) {
        e.preventDefault();
        openGroup(null);
        window.location.hash = '#/';
        return;
      }
      openGroup(catId);
      return;
    }
    lastCategoryTap = null;
    const subId = link.dataset.sub;
    const wrapper = qsa('[data-parent-sub]', link.closest('.nav-group'))
      .find(el => el.dataset.parentSub === subId);
    if (wrapper) {
      // Subcategories retain their single-click navigation behavior.
      const open = !wrapper.classList.contains('open');
      wrapper.classList.toggle('open', open);
      branchStates.set(branchKey(wrapper), open);
      persistNavState();
      link.setAttribute('aria-expanded', String(open));
      syncSidebarHierarchy();
      if (link.hash === window.location.hash) e.preventDefault();
      return;
    }
    if (link.hash === window.location.hash) e.preventDefault();
  });
}

export function openGroup(catId) {
  if (catId) expandedGroups.add(catId);
  else expandedGroups.clear();
  syncGroupUI();
  persistNavState();
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
  // Two measurements are enough to follow the sidebar accordion.
  // The former 650ms requestAnimationFrame loop continuously forced layout.
  const token = ++indicatorToken;
  requestAnimationFrame(() => { if (token === indicatorToken) sync(); });
  setTimeout(() => { if (token === indicatorToken) sync(); }, 260);
}

export function setActiveNav(catId, subId = null) {
  qsa('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.classList.contains('nav-item--calculator')
      ? window.location.hash.startsWith('#/calculator') : !!catId && el.dataset.cat === catId);
  });
  qsa('[data-sub]').forEach((el) => {
    el.classList.toggle('active', !!catId && el.closest('.nav-group')?.dataset.cat===catId && el.dataset.sub === subId);
  });
  if (catId) openGroup(catId);
  qsa('[data-parent-sub]').forEach((el) => {
    const key=branchKey(el);
    const inCurrentCategory = !!catId && el.closest('.nav-group')?.dataset.cat===catId;
    const onSelectedPath = inCurrentCategory && !!el.querySelector('[data-sub].active');
    const isSelectedParent = inCurrentCategory && el.dataset.parentSub===subId;
    // Only the active trail remains expanded after navigation, avoiding
    // stale colored/open siblings such as Californium while viewing Jewels.
    const expanded = onSelectedPath || (isSelectedParent && branchStates.get(key)===true);
    el.classList.toggle('open', expanded);
    branchStates.set(key,expanded);
    if(el.dataset.parentSub){
      const link=qsa('[data-sub]',el.closest('.nav-group')).find(link=>link.dataset.sub===el.dataset.parentSub);
      link?.setAttribute('aria-expanded',String(el.classList.contains('open')));
    }
  });
  persistNavState();
  syncSidebarHierarchy();
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
    if (sidebar.classList.contains('is-open')) return;
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
    // A prevented mobile category tap only expands; it must not close.
    if (e.target.closest('a') && !e.defaultPrevented) close();
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
    // Do not steal slider/input movement; only respond to a clear horizontal swipe.
    if (e.target.closest('input, textarea, select, [data-upgrade-slider]')) return;
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

// ==== Unread release badge ====

const UPDATE_SEEN_KEY = 'ri-seen-update-id';
let lastSeenUpdate = '';

export function initUpdateBadge(latestId) {
  let seen = lastSeenUpdate === latestId;
  try { seen ||= localStorage.getItem(UPDATE_SEEN_KEY) === latestId; } catch { /* file:// etc */ }
  const unread = Boolean(latestId && !seen);
  const version = formatReleaseVersion(latestId);
  qsa('[data-update-badge]').forEach((badge) => {
    badge.textContent = unread ? `New ${version}` : '';
    badge.hidden = !unread;
    badge.closest('.topbar__updates')?.setAttribute('aria-label', unread ? `Update Log, unread release ${version}` : 'Update Log');
  });
}

export function markUpdateSeen(latestId) {
  if (!latestId) return;
  lastSeenUpdate = latestId;
  try { localStorage.setItem(UPDATE_SEEN_KEY, latestId); } catch { /* ignore */ }
  initUpdateBadge(latestId);
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

let cachedCustomEntries = null;
let resourceAssets = [];
export function resourceAsset(text) {
  const entries = customIconEntries();
  if (cachedCustomEntries !== entries) {
    cachedCustomEntries = entries;
    resourceAssets = entries.filter(entry => !entry.id.includes('/Runes/')).map(entry => ({
      path: entry.id, name: entry.name.toLowerCase(),
    })).sort((a,b) => b.name.length-a.name.length);
  }
  const value = String(text || '').toLowerCase();
  return resourceAssets.find(entry => new RegExp('(^|[^a-z])'+entry.name.replace(/s$/, '')+'s?([^a-z]|$)').test(value))?.path;
}
function routePage(href) {
  const [catId, subId] = String(href).replace(/^#\//,'').split('?')[0].split('/');
  const cat = CATEGORIES.find(c=>c.id===catId);
  return subId ? getSubcategory(catId,subId) : cat;
}
function selectionColor(name, href) {
  return resourceColor(name) || Object.entries(PAGE_LINKS)
    .filter(([,route])=>route===href).map(([name])=>resourceColor(name)).find(Boolean) || 'var(--c-accent)';
}
export function decorateWiki() {
  const route = location.hash.split('?')[0] || '#/';
  for (const a of document.querySelectorAll('.nav-item[href], [data-sub][href], .pill[href], .sub-pager a[href], .primary-nav a')) {
    const href = a.getAttribute('href');
    const page = routePage(href);
    a.style.setProperty('--selection',selectionColor(page?.name || a.textContent.trim(),href));
    if (a.matches('.pill[href]') && page && !a.querySelector('.page-nav-icon')) {
      a.insertAdjacentHTML('afterbegin','<span class="page-nav-icon">'+namedIcon(page.name,page.icon,28)+'</span>');
    }
    if (a.matches('.primary-nav a')) {
      const selected = a.dataset.primary ? route==='#/'+a.dataset.primary : !['calculator','updates','feedback','credits'].some(r=>route==='#/'+r);
      a.classList.toggle('active',selected);
    }
    if (a.matches('.active')) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  }
  const page = routePage(route);
  const hero = document.querySelector('#view .cat-hero');
  if(hero && page) {
    hero.style.setProperty('--selection',selectionColor(page.name,route));


  }
  for(const card of document.querySelectorAll('[data-upgrade-name]')) {
    const name = card.dataset.upgradeName;
    const linked = Object.entries(PAGE_LINKS).sort((a,b)=>b[0].length-a[0].length).find(([term])=>name.toLowerCase().includes(term.toLowerCase()));
    const asset=resourceAsset(name) || routePage(linked?.[1])?.icon || 'trending-up';
    const heading=card.querySelector('.upgrade-card__head > b');
    if(asset && heading && !heading.querySelector('.upgrade-art')) heading.insertAdjacentHTML('afterbegin',namedIcon(name,asset,40,'upgrade-art'));
    const cost=card.querySelector('.upgrade-card__row--price .upgrade-card__rowlabel');
    const currency=resourceAsset(page?.name);
    if(cost && currency) { const old=cost.querySelector('svg,img');if(old)old.outerHTML=namedIcon(page?.name,currency,18); }
    card.style.setProperty('--selection',selectionColor(page?.name || '',route));
  }
}
