import { evaluateExpression } from '../js/utils.js';
import { REPOSITORY, BRANCH, FILES, BACKUP_DIRECTORY, CONTEXTS, GAME_GROUPS,
  validateDocuments, encodeBase64Content, decodeBase64Content } from '../js/content-schema.js';
import { SITE_ORIGIN, githubContentsUrl, githubRequest, githubSignIn } from '../js/github.js';

const state = {
  token: '',
  user: '',
  screen: 'wiki',
  selected: '',
  documents: { wiki: null, updates: null, game: null },
  originalDocuments: { wiki: null, updates: null, game: null },
  shas: {},
  dirty: new Set(),
  expanded: new Set(),
  gameSelection: null,
  backups: [],
  selectedBackup: '',
  toastTimer: 0,
  searchQuery: '',
  searchOpen: false,
};

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const screenContent = $('#screen-content');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return String(text).replace(regex, (match) => `<mark>${escapeHtml(match)}</mark>`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setStatus(message, kind = '') {
  const status = $('#status');
  status.textContent = message;
  status.dataset.state = kind;
}

function toast(message, error = false) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.toggle('is-error', error);
  element.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => element.classList.remove('is-visible'), 4500);
}

function setConnected(connected) {
  $('#workspace').hidden = !connected;
  $('#save').disabled = !connected || !state.dirty.size;
  if (!connected) {
    setStatus('Connect GitHub to edit content');
  } else {
    setStatus(state.dirty.size ? 'Unsaved changes' : 'All changes saved', state.dirty.size ? '' : 'saved');
  }
}

function getPath(path) {
  return path.split('.').reduce((value, part) => value?.[part], {
    categories: state.documents.wiki?.categories,
    versions: state.documents.updates?.versions,
    game: state.documents.game,
  });
}

function setPath(path, value) {
  const parts = path.split('.');
  const roots = {
    categories: state.documents.wiki?.categories,
    versions: state.documents.updates?.versions,
    game: state.documents.game,
  };
  let target = roots[parts[0]];
  for (const part of parts.slice(1, -1)) {
    if (target[part] == null) target[part] = {};
    target = target[part];
  }
  if (!target) throw new Error('The selected editor field no longer exists. Reload the content and try again.');
  target[parts.at(-1)] = value;
}

function markDirty(documentName) {
  state.dirty.add(documentName);
  $('#save').disabled = !state.token;
  setStatus('Unsaved changes');
}

function markInputDirty(target) {
  const path = target.dataset.bind;
  if (!path) return;
  let value;
  if (target.type === 'checkbox') value = target.checked;
  else if (target.type === 'number') value = target.value === '' ? (target.dataset.nullable ? null : 0) : Number(target.value);
  else value = target.value;
  setPath(path, value);
  markDirty(documentForPath(path));
}

function documentForPath(path) {
  if (path.startsWith('categories.')) return 'wiki';
  if (path.startsWith('versions.')) return 'updates';
  if (path.startsWith('game.')) return 'game';
  throw new Error('This editor field is not connected to a content file.');
}

function field(path, label, value, options = {}) {
  const type = options.type || 'text';
  const wide = options.wide ? ' field--wide' : '';
  if (type === 'checkbox') {
    return `<label class="check-field${wide}"><input type="checkbox" data-bind="${escapeHtml(path)}"${value ? ' checked' : ''}><span>${escapeHtml(label)}</span></label>`;
  }
  if (type === 'select') {
    const choices = options.options || [];
    return `<div class="field${wide}"><label for="${escapeHtml(path)}">${escapeHtml(label)}</label><select id="${escapeHtml(path)}" data-bind="${escapeHtml(path)}">${choices.map(({ label: optionLabel, value: optionValue }) => `<option value="${escapeHtml(optionValue)}"${value === optionValue ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}</select></div>`;
  }
  if (type === 'textarea') {
    return `<div class="field${wide}"><label for="${escapeHtml(path)}">${escapeHtml(label)}</label><textarea id="${escapeHtml(path)}" data-bind="${escapeHtml(path)}" placeholder="${escapeHtml(options.placeholder || '')}">${escapeHtml(value || '')}</textarea></div>`;
  }
  const inputType = ['date', 'number'].includes(type) ? type : 'text';
  const nullable = type === 'number' && value === null;
  return `<div class="field${wide}"><label for="${escapeHtml(path)}">${escapeHtml(label)}</label><input id="${escapeHtml(path)}" type="${inputType}" data-bind="${escapeHtml(path)}"${nullable ? ' data-nullable="true"' : ''} value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(options.placeholder || (nullable ? 'Leave blank for none' : ''))}"${options.min != null ? ` min="${options.min}"` : ''}></div>`;
}

function objectFields(path, object, definitions) {
  return `<div class="form-grid">${definitions.map((definition) => field(
    `${path}.${definition.key}`,
    definition.label,
    object?.[definition.key],
    definition,
  )).join('')}</div>`;
}

function renderObjectArray(path, values, label, definitions, createItem, options = {}) {
  const items = values || [];
  const rows = items.map((item, index) => {
    const controls = `<div class="repeat-item__tools">
      ${index ? `<button class="mini-button" data-action="move" data-list="${escapeHtml(path)}" data-index="${index}" data-delta="-1" type="button" aria-label="Move up">↑</button>` : ''}
      ${index < items.length - 1 ? `<button class="mini-button" data-action="move" data-list="${escapeHtml(path)}" data-index="${index}" data-delta="1" type="button" aria-label="Move down">↓</button>` : ''}
      <button class="mini-button mini-button--danger" data-action="remove" data-list="${escapeHtml(path)}" data-index="${index}" type="button">Remove</button>
    </div>`;
    return `<article class="repeat-item">${controls}${objectFields(`${path}.${index}`, item, definitions)}</article>`;
  }).join('');
  return `<div class="panel"><div class="panel__heading"><h3>${escapeHtml(label)} <span class="count">${items.length}</span></h3><button class="mini-button" data-action="add-object" data-list="${escapeHtml(path)}" data-template="${escapeHtml(JSON.stringify(createItem()))}" type="button">+ Add ${escapeHtml(options.addLabel || label.replace(/s$/, ''))}</button></div><div class="repeat-list">${rows || '<div class="repeat-empty">Nothing here yet. Add the first item when you are ready.</div>'}</div></div>`;
}

function addListItem(path, item) {
  const parts = path.split('.');
  const listName = parts.pop();
  const roots = {
    categories: state.documents.wiki?.categories,
    versions: state.documents.updates?.versions,
    game: state.documents.game,
  };
  let parent = roots[parts.shift()];
  for (const part of parts) {
    if (parent[part] == null) parent[part] = {};
    parent = parent[part];
  }
  if (!parent) throw new Error('This list could not be updated. Reload and try again.');
  if (parent[listName] == null) parent[listName] = [];
  const array = parent[listName];
  if (!Array.isArray(array)) throw new Error('This list could not be updated. Reload and try again.');
  array.push(item);
  markDirty(documentForPath(path));
}

function removeListItem(path, index) {
  const array = getPath(path);
  if (!Array.isArray(array) || !Number.isInteger(index) || index < 0 || index >= array.length) {
    throw new Error('This list item could not be removed.');
  }
  array.splice(index, 1);
  markDirty(documentForPath(path));
}

function moveListItem(path, index, delta) {
  const array = getPath(path);
  const destination = index + delta;
  if (!Array.isArray(array) || destination < 0 || destination >= array.length) return;
  [array[index], array[destination]] = [array[destination], array[index]];
  markDirty(documentForPath(path));
  render();
}

function markTreeDirty(path) {
  markDirty(path.startsWith('categories.') ? 'wiki' : 'wiki');
}

function pageName(node) {
  return node?.name || node?.id || 'Untitled page';
}

function renderTreeNode(node, path, branchPath, depth = 0, query = '') {
  const isExpanded = state.expanded.has(path);
  const selected = state.selected === path;
  const childrenPath = `${path}.children`;
  const children = node.children || [];
  const siblings = getPath(branchPath) || [];
  const index = Number(path.split('.').at(-1));
  return `<div class="tree-category">
    <div class="tree-row">
      <button class="tree-expand" data-action="toggle-node" data-path="${escapeHtml(path)}" type="button" aria-label="${isExpanded ? 'Colapsar' : 'Expandir'} ${escapeHtml(pageName(node))}"${children.length ? '' : ' disabled'} style="margin-left:${depth * 5}px">${children.length ? (isExpanded ? '▾' : '▸') : '·'}</button>
      <button class="tree-item${selected ? ' is-selected' : ''}" data-action="select" data-path="${escapeHtml(path)}" type="button"><span class="tree-item__name">${highlightText(pageName(node), query)}</span></button>
      ${index ? `<button class="tree-order" data-action="move" data-list="${escapeHtml(branchPath)}" data-index="${index}" data-delta="-1" type="button" title="Mover para cima">↑</button>` : ''}
      ${index < siblings.length - 1 ? `<button class="tree-order" data-action="move" data-list="${escapeHtml(branchPath)}" data-index="${index}" data-delta="1" type="button" title="Mover para baixo">↓</button>` : ''}
      <button class="tree-add" data-action="add-page" data-list="${escapeHtml(childrenPath)}" data-parent="${escapeHtml(path)}" type="button" title="Adicionar subpágina">+</button>
    </div>
    ${isExpanded && children.length ? `<div class="tree-children">${children.map((child, index) => renderTreeNode(child, `${childrenPath}.${index}`, childrenPath, depth + 1, query)).join('')}</div>` : ''}
  </div>`;
}

function treePaths(categories) {
  const paths = [];
  function visit(nodes, parentPath) {
    nodes.forEach((node, index) => {
      const path = `${parentPath}.${index}`;
      paths.push(path);
      visit(node.children || [], `${path}.children`);
    });
  }
  categories.forEach((category, index) => {
    const path = `categories.${index}`;
    paths.push(path);
    visit(category.subcategories || [], `${path}.subcategories`);
  });
  return paths;
}

function pageCount(categories) {
  return treePaths(categories).length - categories.length;
}

function matchesQuery(itemText, query) {
  if (!query) return true;
  return String(itemText).toLowerCase().includes(query.toLowerCase());
}

function renderTree() {
  const tree = $('#tree');
  const categories = state.documents.wiki?.categories || [];
  const query = state.searchQuery.trim();
  const searching = !!query;

  if (state.screen === 'wiki') {
    $('#toggle-tree').hidden = searching;
    $('#add-category').hidden = searching;
    if (searching) {
      $('#toggle-tree').hidden = true;
      $('#add-category').hidden = true;
    }

    const matched = [];
    categories.forEach((category, catIndex) => {
      const catMatch = matchesQuery(pageName(category), query);
      const matchingPages = [];
      (category.subcategories || []).forEach((page, pageIndex) => {
        if (matchesQuery(pageName(page), query)) {
          matchingPages.push({ page, pageIndex, catIndex, path: `categories.${catIndex}.subcategories.${pageIndex}` });
        }
      });
      if (catMatch || matchingPages.length) {
        matched.push({ category, catIndex, path: `categories.${catIndex}`, catMatch, matchingPages, expanded: catMatch || matchingPages.length > 0 });
      }
    });

    $('#tree-heading').textContent = searching
      ? `WIKI · ${matched.length} result${matched.length !== 1 ? 's' : ''} for "${escapeHtml(query)}"`
      : `WIKI · ${categories.length} categories · ${pageCount(categories)} pages`;

    if (!matched.length) {
      tree.innerHTML = `<div class="tree-empty">No pages or categories found for “${escapeHtml(query)}”.</div>`;
      return;
    }

    tree.innerHTML = matched.map(({ category, catIndex, path, catMatch, matchingPages, expanded }) => {
      const selected = state.selected === path;
      const sections = category.subcategories || [];
      return `<div class="tree-category">
        <div class="tree-row">
          <button class="tree-expand" data-action="toggle-node" data-path="${path}" type="button" aria-label="${expanded ? 'Collapse' : 'Expand'} ${escapeHtml(pageName(category))}"${sections.length ? '' : ' disabled'}>${sections.length ? (expanded ? '▾' : '▸') : '·'}</button>
          <button class="tree-item${selected ? ' is-selected' : ''}${catMatch ? ' tree-match' : ''}" data-action="select" data-path="${path}" type="button"><span class="tree-item__name">${highlightText(pageName(category), query)}</span></button>
          ${catIndex ? `<button class="tree-order" data-action="move" data-list="categories" data-index="${catIndex}" data-delta="-1" type="button" title="Move up">↑</button>` : ''}
          ${catIndex < categories.length - 1 ? `<button class="tree-order" data-action="move" data-list="categories" data-index="${catIndex}" data-delta="1" type="button" title="Move down">↓</button>` : ''}
          <button class="tree-add" data-action="add-page" data-list="${path}.subcategories" data-parent="${path}" type="button" title="Add page">+</button>
        </div>
        ${expanded && matchingPages.length ? `<div class="tree-children">${matchingPages.map(({ page, pageIndex }) => {
          const pagePath = `categories.${catIndex}.subcategories.${pageIndex}`;
          const pageSelected = state.selected === pagePath;
          return renderTreeNode(page, pagePath, `categories.${catIndex}.subcategories`, true, query);
        }).join('')}</div>` : ''}
      </div>`;
    }).join('');
    return;
  }
  $('#add-category').hidden = true;
  $('#toggle-tree').hidden = true;
  if (state.screen === 'game') {
    $('#tree-heading').textContent = searching ? `GAME DATA · search "${escapeHtml(query)}"` : 'GAME DATA';
    const matchedGroups = GAME_GROUPS.flatMap((group) => {
      const value = getPath(`game.${group.path}`);
      const keys = group.mode === 'map' ? Object.keys(value || {}) : [];
      const matchingKeys = keys.filter((key) => matchesQuery(key, query));
      if (!matchingKeys.length && (!query || !matchesQuery(group.label, query))) return null;
      return { group, keys: searching ? matchingKeys : keys, labelMatch: matchesQuery(group.label, query) };
    }).filter(Boolean);

    if (!matchedGroups.length) {
      tree.innerHTML = `<div class="tree-empty">No game items found for “${escapeHtml(query)}”.</div>`;
      return;
    }

    tree.innerHTML = matchedGroups.map(({ group, keys, labelMatch }) => {
      const selectedKey = state.gameSelection?.group === group.id ? state.gameSelection.key : undefined;
      const selected = (key) => selectedKey === key;
      return `<section class="tree-data-group">
        <div class="tree-data-heading"><span class="${labelMatch ? 'tree-match' : ''}">${highlightText(group.label, query)}</span>${group.mode === 'map' ? `<button class="tree-add" data-action="add-game-entry" data-group="${group.id}" type="button" title="Add ${escapeHtml(group.label)}">+</button>` : ''}</div>
        ${group.mode === 'map'
          ? keys.map((key) => `<button class="tree-item${selected(key) ? ' is-selected' : ''}" data-action="select-game" data-group="${group.id}" data-key="${escapeHtml(key)}" type="button"><span class="tree-item__name">${highlightText(key, query)}</span></button>`).join('')
          : `<button class="tree-item${selected(null) ? ' is-selected' : ''}" data-action="select-game" data-group="${group.id}" type="button"><span class="tree-item__name">${escapeHtml(group.label)}</span></button>`}
      </section>`;
    }).join('');
    return;
  }
  if (state.screen === 'versions') {
    $('#tree-heading').textContent = searching ? `BACKUPS · search "${escapeHtml(query)}"` : 'BACKUPS';
    const filteredBackups = state.backups.filter((backup) => matchesQuery(backup.name, query));
    tree.innerHTML = `<button class="button button--primary button--small" data-action="create-backup" type="button">+ Create backup now</button>${filteredBackups.map((backup) => `<button class="tree-item${state.selectedBackup === backup.name ? ' is-selected' : ''}" data-action="select-backup" data-name="${escapeHtml(backup.name)}" type="button"><span class="tree-item__chevron">◷</span><span class="tree-item__name">${highlightText(backup.name.replace(/^backup-/, '').replace(/\.json$/, '').replace(/-/g, ' '), query)}</span></button>`).join('') || '<div class="tree-empty">No backups found.</div>'}`;
    return;
  }
  const versions = state.documents.updates?.versions || [];
  $('#tree-heading').textContent = searching ? `RELEASES · search "${escapeHtml(query)}"` : 'RELEASES';
  const filteredVersions = versions.filter((version) => matchesQuery(version.version || '', query));
  tree.innerHTML = `<button class="button button--primary button--small" data-action="new-release" type="button">+ New version</button>${filteredVersions.map((version, index) => `<button class="tree-item${state.selected === `versions.${index}` ? ' is-selected' : ''}" data-action="select" data-path="versions.${index}" type="button"><span class="tree-item__chevron">·</span><span class="tree-item__name">Version ${highlightText(version.version || '—', query)}</span></button>`).join('') || '<div class="tree-empty">No versions found.</div>'}`;
}

const CATEGORY_FIELDS = [
  { key: 'id', label: 'URL ID' },
  { key: 'name', label: 'Category name' },
  { key: 'icon', label: 'Icon name' },
  { key: 'desc', label: 'Category description', type: 'textarea', wide: true },
  { key: 'tagline', label: 'Tagline', type: 'textarea', wide: true },
];
const PAGE_FIELDS = [
  { key: 'id', label: 'URL ID' },
  { key: 'name', label: 'Page name' },
  { key: 'icon', label: 'Icon name' },
  { key: 'desc', label: 'Description', type: 'textarea', wide: true },
];
const HIGHLIGHT_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'icon', label: 'Icon name' },
  { key: 'text', label: 'Text', type: 'textarea', wide: true },
];
const PAIR_FIELDS = [
  { key: 'label', label: 'Label' },
  { key: 'value', label: 'Value' },
];
function renderFacts(path, value, label = 'Facts') {
  return renderObjectArray(path, value, label, PAIR_FIELDS, () => ({ label: '', value: '' }), { addLabel: 'fact' });
}

function emptyLike(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, emptyLike(child)]));
  }
  if (typeof value === 'string') return value.startsWith('formula: ') ? 'formula: 1' : '';
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  return null;
}

function renderGameNode(path, label, value, depth = 0) {
  if (Array.isArray(value)) {
    const items = value.map((item, index) => {
      const itemPath = `${path}.${index}`;
      const controls = `<div class="game-item__tools">
        <span>${escapeHtml(label.replace(/s$/, ''))} ${index + 1}</span>
        ${index ? `<button class="mini-button" data-action="game-move-item" data-path="${escapeHtml(path)}" data-index="${index}" data-delta="-1" type="button" aria-label="Move up">↑</button>` : ''}
        ${index < value.length - 1 ? `<button class="mini-button" data-action="game-move-item" data-path="${escapeHtml(path)}" data-index="${index}" data-delta="1" type="button" aria-label="Move down">↓</button>` : ''}
        <button class="mini-button mini-button--danger" data-action="game-remove-item" data-path="${escapeHtml(path)}" data-index="${index}" type="button">Remove</button>
      </div>`;
      return `<div class="game-item">${controls}${renderGameNode(itemPath, `${label} ${index + 1}`, item, depth + 1)}</div>`;
    }).join('');
    return `<section class="game-array"><div class="game-array__heading"><h3>${escapeHtml(label)} <span class="count">${value.length}</span></h3><button class="mini-button" data-action="game-add-item" data-path="${escapeHtml(path)}" type="button">+ Add item</button></div><div class="game-array__items">${items || '<div class="repeat-empty">No entries yet. Add one to get started.</div>'}</div></section>`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const children = entries.map(([key, child]) => `<div class="game-field">${renderGameNode(`${path}.${key}`, key, child, depth + 1)}<button class="game-field__remove" data-action="game-remove-field" data-path="${escapeHtml(path)}.${escapeHtml(key)}" data-key="${escapeHtml(key)}" type="button" aria-label="Remove ${escapeHtml(key)}">×</button></div>`).join('');
    return `<section class="game-object${depth ? ' game-object--nested' : ''}"><div class="game-object__heading"><h3>${escapeHtml(label)}</h3><button class="mini-button" data-action="game-add-field" data-path="${escapeHtml(path)}" type="button">+ Add field</button></div><div class="game-object__fields">${children || '<p class="tree-empty">No fields yet.</p>'}</div></section>`;
  }
  const type = typeof value === 'number' || value === null ? 'number'
    : typeof value === 'boolean' ? 'checkbox'
      : String(value).length > 90 || String(value).startsWith('formula: ') ? 'textarea' : 'text';
  return field(path, label, value, { type, wide: type === 'textarea', placeholder: type === 'textarea' && String(value).startsWith('formula: ') ? 'formula: Math.max(1, amount / 10)' : '' });
}

function gameEntryPath(group, key) {
  return `game.${group.path}${group.mode === 'map' ? `.${key}` : ''}`;
}

function renderGameScreen() {
  const selection = state.gameSelection;
  const group = GAME_GROUPS.find((item) => item.id === selection?.group);
  if (!group) {
    screenContent.innerHTML = `<div class="empty-state"><h2>All game data, in one place</h2><p>Choose an item from the left to edit upgrades, formulas, runes, mining, progression, dungeon data, calculators, and resource colors. Add or remove entries without editing source code.</p></div>`;
    return;
  }
  const key = group.mode === 'map' ? selection.key : null;
  const value = getPath(gameEntryPath(group, key));
  if (value === undefined) throw new Error('This game-data entry no longer exists. Reload the editor and try again.');
  const title = group.mode === 'map' ? key : group.label;
  const remove = group.mode === 'map'
    ? `<button class="mini-button mini-button--danger" data-action="remove-game-entry" data-group="${group.id}" data-key="${escapeHtml(key)}" type="button">Delete entry</button>`
    : '';
  const note = group.id === 'formula-sections'
    ? '<div class="notice">Each upgrade has a name, cap, price formula and effect formula. Leave the cap empty for no cap. Formula fields use safe math expressions, not JavaScript code.</div>'
    : group.id === 'calculators'
      ? '<div class="notice">Calculator expressions use formula: followed by math, for example formula: Math.max(1, amount / 10). Supported functions: min, max, floor, ceil, round, abs, log10 and sqrt.</div>'
      : '';
  screenContent.innerHTML = `${pageHeading('GAME DATA', title, `${group.label} · Changes publish with the live Wiki.`)}
    <div class="crumbs"><span>Game data</span><span>${escapeHtml(group.label)}</span>${group.mode === 'map' ? `<span>${escapeHtml(key)}</span>` : ''}</div>
    <section class="panel game-data-panel"><div class="panel__heading"><h2>${escapeHtml(title)}</h2>${remove}</div>${note}${renderGameNode(gameEntryPath(group, key), title, value)}</section>`;
}

function renderCategoryEditor(index, category) {
  const path = `categories.${index}`;
  const overview = category.overview || {};
  const header = pageHeading('WIKI CATEGORY', category.name || 'New category', 'Edit the category shown on the live Wiki.', livePageHref(path));
  const overviewFields = `<section class="panel"><div class="panel__heading"><h2>Overview panel</h2></div>${field(`${path}.overview.desc`, 'Overview description', overview.desc, { type: 'textarea', wide: true })}</section>`;
  const highlights = renderObjectArray(`${path}.overview.highlights`, overview.highlights, 'Overview highlights', HIGHLIGHT_FIELDS, () => ({ title: '', text: '', icon: '' }), { addLabel: 'highlight' });
  const facts = renderFacts(`${path}.overview.facts`, overview.facts, 'Overview facts');
  const vitals = renderFacts(`${path}.vitals`, category.vitals, 'Key information');
  const pages = category.subcategories || [];
  return `${header}
    <div class="crumbs"><span>Wiki</span><span>${escapeHtml(category.name || 'New category')}</span></div>
    <section class="panel"><div class="panel__heading"><h2>Category details</h2><button class="mini-button mini-button--danger" data-action="delete-category" data-index="${index}" type="button">Delete category</button></div>${objectFields(path, category, CATEGORY_FIELDS)}</section>
    ${overviewFields}${highlights}${facts}${vitals}
    <section class="panel"><div class="panel__heading"><div><h2>Pages and subpages <span class="count">${pages.length}</span></h2><p class="subheading">Add pages, nest subpages, and select any item in the sidebar to edit it.</p></div><button class="button" data-action="add-page" data-list="${path}.subcategories" data-parent="${path}" type="button">+ Add page</button></div><div class="notice">Page changes are saved in the same Wiki content file. Keep existing URL IDs unchanged when only editing text.</div></section>`;
}

function renderPageEditor(path, page, category) {
  const crumbs = [];
  const parts = path.split('.');
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] === 'categories') crumbs.push(pageName(state.documents.wiki.categories[Number(parts[i + 1])]));
    if (parts[i] === 'subcategories' || parts[i] === 'children') {
      const itemPath = parts.slice(0, i + 2).join('.');
      const item = getPath(itemPath);
      if (item) crumbs.push(pageName(item));
    }
  }
  const childrenPath = `${path}.children`;
  return `${pageHeading('WIKI PAGE', pageName(page), 'Edit the page shown on the live Wiki.', livePageHref(path))}
    <div class="crumbs"><span>Wiki</span>${crumbs.map((crumb) => `<span>${escapeHtml(crumb)}</span>`).join('')}</div>
    <section class="panel"><div class="panel__heading"><h2>Page details</h2><button class="mini-button mini-button--danger" data-action="delete-page" data-path="${escapeHtml(path)}" type="button">Delete page</button></div>${objectFields(path, page, PAGE_FIELDS)}</section>
    ${renderObjectArray(`${path}.highlights`, page.highlights, 'Highlights', HIGHLIGHT_FIELDS, () => ({ title: '', text: '', icon: '' }), { addLabel: 'highlight' })}
    ${renderFacts(`${path}.facts`, page.facts, 'Facts')}
    ${renderFacts(`${path}.vitals`, page.vitals, 'Key information')}
    <section class="panel"><div class="panel__heading"><div><h2>Subpages <span class="count">${(page.children || []).length}</span></h2><p class="subheading">Create another level beneath this page.</p></div><button class="button" data-action="add-page" data-list="${escapeHtml(childrenPath)}" data-parent="${escapeHtml(path)}" type="button">+ Add subpage</button></div></section>`;
}

function livePageHref(path) {
  const parts = path.split('.');
  const category = state.documents.wiki.categories[Number(parts[1])];
  if (!category) throw new Error('The selected Wiki category no longer exists.');
  if (parts.length === 2) return `../#/${category.id}`;
  const page = getPath(path);
  if (!page) throw new Error('The selected Wiki page no longer exists.');
  return `../#/${category.id}/${page.id}`;
}

function pageHeading(section, title, description, href = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(section)}</span><h1>${escapeHtml(title)}</h1><p class="subheading">${escapeHtml(description)}</p></div>${href ? `<a class="button button--quiet" href="${escapeHtml(href)}" target="_blank" rel="noopener">View live page ↗</a>` : ''}</div>`;
}

function findCategoryForPage(path) {
  const index = Number(path.split('.')[1]);
  return state.documents.wiki.categories[index];
}

function renderWikiScreen() {
  const selected = state.selected || (state.documents.wiki.categories.length ? 'categories.0' : '');
  if (!selected) {
    screenContent.innerHTML = `<div class="empty-state"><h2>Your Wiki is ready for its first category</h2><p>Create a category to start adding pages, subpages, descriptions, facts and overview cards.</p><button class="button button--primary" data-action="add-category" type="button">+ Create category</button></div>`;
    return;
  }
  const parts = selected.split('.');
  if (parts[0] !== 'categories') throw new Error('The selected Wiki item is invalid.');
  if (parts.length === 2) {
    const category = getPath(selected);
    if (!category) throw new Error('The selected category no longer exists.');
    screenContent.innerHTML = renderCategoryEditor(Number(parts[1]), category);
    return;
  }
  const page = getPath(selected);
  const category = findCategoryForPage(selected);
  if (!page || !category) throw new Error('The selected Wiki page no longer exists.');
  screenContent.innerHTML = renderPageEditor(selected, page, category);
}

const ENTRY_FIELDS = [
  { key: 'context', label: 'Category', type: 'select', options: CONTEXTS.map((context) => ({ value: context, label: context })) },
  { key: 'title', label: 'Title' },
  { key: 'href', label: 'Wiki link (optional)', placeholder: '#/life/power-of-fossils' },
  { key: 'description', label: 'What changed', type: 'textarea', wide: true },
];
const RELEASE_FIELDS = [
  { key: 'version', label: 'Version number' },
  { key: 'date', label: 'Release date', type: 'date' },
];

function renderRelease(index, version) {
  const path = `versions.${index}`;
  return `${pageHeading('UPDATE LOG', `Version ${version.version || '—'}`, 'Publish release notes and keep readers up to date.')}
    <section class="panel"><div class="panel__heading"><h2>Release details</h2><button class="mini-button mini-button--danger" data-action="delete-release" data-index="${index}" type="button">Delete release</button></div>${objectFields(path, version, RELEASE_FIELDS)}</section>
    ${renderObjectArray(`${path}.entries`, version.entries, 'Updates in this release', ENTRY_FIELDS, () => ({ context: 'Feature', title: '', href: '', description: '' }), { addLabel: 'update' })}`;
}

function renderUpdatesScreen() {
  const versions = state.documents.updates.versions;
  if (!versions.length) {
    screenContent.innerHTML = `<div class="empty-state"><h2>No releases yet</h2><p>Add a release to start the update log.</p><button class="button button--primary" data-action="new-release" type="button">+ Create release</button></div>`;
    return;
  }
  const index = Number((state.selected || 'versions.0').split('.')[1]);
  const version = versions[index];
  if (!version) throw new Error('The selected release no longer exists.');
  screenContent.innerHTML = renderRelease(index, version);
}

function renderVersionsScreen() {
  const backup = state.backups.find((item) => item.name === state.selectedBackup);
  screenContent.innerHTML = `${pageHeading('VERSIONS', 'Wiki backups', 'Restore a complete saved copy of the Wiki and all game data. A backup is created automatically before every save.')}
    <section class="panel">
      <div class="panel__heading"><div><h2>${backup ? escapeHtml(backup.name.replace(/^backup-/, '').replace(/\.json$/, '').replace(/-/g, ' ')) : 'Safe restore points'}</h2><p class="subheading">${state.backups.length} backup${state.backups.length === 1 ? '' : 's'} stored in the repository</p></div><button class="button button--primary" data-action="create-backup" type="button">Create backup now</button></div>
      ${backup
        ? `<p class="subheading">This snapshot contains the Wiki pages, update log, upgrades, calculators and all other game data.</p><button class="button button--danger" data-action="restore-backup" data-name="${escapeHtml(backup.name)}" type="button">Restore this backup</button>`
        : '<div class="notice">Choose a backup from the left to inspect or restore it. Restoring first creates a safety backup of the current content.</div>'}
    </section>`;
}

function render() {
  if (!state.documents.wiki) return;
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item.dataset.screen === state.screen));
  renderTree();
  if (state.screen === 'wiki') renderWikiScreen();
  else if (state.screen === 'game') renderGameScreen();
  else if (state.screen === 'updates') renderUpdatesScreen();
  else renderVersionsScreen();
  $('#save').disabled = !state.dirty.size;
  setStatus(state.dirty.size ? 'Unsaved changes' : 'All changes saved', state.dirty.size ? '' : 'saved');
}

async function loadDocuments() {
  setStatus('Loading Wiki content…');
  const loaded = await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
    const result = await gh(githubContentsUrl(path));
    if (result.type !== 'file' || typeof result.content !== 'string') throw new Error(`GitHub did not return ${path} as a file.`);
    state.shas[name] = result.sha;
    return [name, JSON.parse(decodeBase64Content(result.content))];
  }));
  state.documents = Object.fromEntries(loaded);
  state.originalDocuments = JSON.parse(JSON.stringify(state.documents));
  validateDocuments(state.documents);
  state.screen = 'wiki';
  state.selected = state.documents.wiki.categories.length ? 'categories.0' : '';
  state.expanded = new Set(treePaths(state.documents.wiki.categories));
  const firstGroup = GAME_GROUPS[0];
  state.gameSelection = { group: firstGroup.id, key: Object.keys(getPath(`game.${firstGroup.path}`))[0] || '' };
  await loadBackups();
  setConnected(true);
  render();
}

const gh = (url, options = {}) => githubRequest(url, state.token, options);

/**
 * Loads content from the local content/ JSON files instead of the GitHub API.
 * Used when there is no GitHub token (local development / offline), so the
 * editor UI still opens in read-only mode. Publishing still requires sign-in.
 */
async function loadLocalDocuments() {
  setStatus('Loading Wiki content…');
  const documents = {};
  for (const [name, path] of Object.entries(FILES)) {
    const response = await fetch(`../${path}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }
    documents[name] = await response.json();
  }
  state.documents = documents;
  state.originalDocuments = JSON.parse(JSON.stringify(documents));
  state.shas = {};
  validateDocuments(documents);
  state.screen = 'wiki';
  state.selected = state.documents.wiki.categories.length ? 'categories.0' : '';
  state.expanded = new Set(treePaths(state.documents.wiki.categories));
  const firstGroup = GAME_GROUPS[0];
  state.gameSelection = {
    group: firstGroup.id,
    key: Object.keys(getPath(`game.${firstGroup.path}`))[0] || '',
  };
  state.backups = [];
  $('#workspace').hidden = false;
  $('#save').disabled = true;
  setStatus('Local content loaded (read-only)', 'saved');
  render();
}

async function loadBackups() {
  const result = await gh(githubContentsUrl(BACKUP_DIRECTORY), { allowNotFound: true });
  state.backups = Array.isArray(result)
    ? result.filter((item) => item.type === 'file' && /^backup-.*\.json$/.test(item.name)).sort((a, b) => b.name.localeCompare(a.name))
    : [];
}

async function createBackup(documents = state.documents) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z');
  const name = `backup-${timestamp}.json`;
  const backup = {
    format: 1,
    createdAt: new Date().toISOString(),
    documents: JSON.parse(JSON.stringify(documents)),
  };
  await gh(githubContentsUrl(`${BACKUP_DIRECTORY}/${name}`), {
    method: 'PUT',
    body: JSON.stringify({
      message: `Create content backup ${timestamp}`,
      content: encodeBase64Content(`${JSON.stringify(backup, null, 2)}\n`),
      branch: BRANCH,
    }),
  });
  state.backups = [{ name }, ...state.backups.filter((item) => item.name !== name)].sort((a, b) => b.name.localeCompare(a.name));
  return name;
}

async function restoreBackup(name) {
  if (!window.confirm(`Restore ${name}? This will replace the live Wiki, upgrade data, calculators and update log. A backup of the current content will be created first.`)) return;
  const result = await gh(githubContentsUrl(`${BACKUP_DIRECTORY}/${encodeURIComponent(name)}`));
  const backup = JSON.parse(decodeBase64Content(result.content));
  if (backup.format !== 1 || !backup.documents?.wiki || !backup.documents?.updates || !backup.documents?.game) {
    throw new Error('This backup is incomplete or has an unsupported format.');
  }
  state.documents = backup.documents;
  validateDocuments(state.documents);
  state.dirty = new Set(Object.keys(FILES));
  await saveDocuments();
}

async function saveDocuments() {
  if (!state.dirty.size) return;
  $('#save').disabled = true;
  const pending = [...state.dirty];
  try {
    validateDocuments(state.documents);
    await createBackup(state.originalDocuments);
    for (const name of pending) {
      const path = FILES[name];
      const content = `${JSON.stringify(state.documents[name], null, 2)}\n`;
      const response = await gh(githubContentsUrl(path), {
        method: 'PUT',
        body: JSON.stringify({
          message: `Update ${path.split('/').at(-1).replace('.json', '')} content`,
          content: encodeBase64Content(content),
          sha: state.shas[name],
          branch: BRANCH,
        }),
      });
      state.shas[name] = response.content.sha;
      state.originalDocuments[name] = JSON.parse(JSON.stringify(state.documents[name]));
      state.dirty.delete(name);
      toast(`Saved ${path} to ${BRANCH}.`);
    }
    setStatus('All changes saved', 'saved');
    render();
  } catch (error) {
    $('#save').disabled = false;
    setStatus('Save failed', 'error');
    toast(error.message || 'Could not save your changes.', true);
  }
}

function newPage() {
  return { id: 'new-page', name: 'New page', desc: '', icon: '', highlights: [], facts: [], vitals: [], children: [] };
}

function uniqueId(base, items) {
  const used = new Set(items.map((item) => item.id));
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  return id;
}

function newCategory() {
  const categories = state.documents.wiki.categories;
  return { id: uniqueId('new-category', categories), name: 'New category', desc: '', icon: 'compass', tagline: '', vitals: [], subcategories: [], overview: { desc: '', highlights: [], facts: [] } };
}

function newPageForList(path) {
  const category = state.documents.wiki.categories[Number(path.split('.')[1])];
  const ids = new Set();
  const collect = (pages) => (pages || []).forEach((page) => {
    ids.add(page.id);
    collect(page.children);
  });
  collect(category?.subcategories);
  const id = uniqueId('new-page', [...ids].map((item) => ({ id: item })));
  return { ...newPage(), id };
}

function newRelease() {
  const versions = state.documents.updates.versions.map((item) => Number(item.version)).filter(Number.isFinite);
  const nextVersion = versions.length ? (Math.max(...versions) + 0.01).toFixed(2) : '1.00';
  return { version: nextVersion, date: new Date().toISOString().slice(0, 10), entries: [] };
}

function addGameEntry(groupId) {
  const group = GAME_GROUPS.find((item) => item.id === groupId);
  if (!group || group.mode !== 'map') throw new Error('This game-data section cannot accept a named entry.');
  const map = getPath(`game.${group.path}`);
  const key = window.prompt(`Name this ${group.label.toLowerCase()} entry:`);
  if (key === null) return;
  const name = key.trim();
  if (!name || name.includes('.')) throw new Error('Enter a non-empty name without periods.');
  if (Object.hasOwn(map, name)) throw new Error(`"${name}" already exists.`);
  if (group.id === 'formula-sections') map[name] = { name: 'New upgrade section', upgrades: [] };
  else map[name] = emptyLike(Object.values(map)[0] ?? {});
  state.gameSelection = { group: group.id, key: name };
  markDirty('game');
  render();
}

function addGameArrayItem(path) {
  const array = getPath(path);
  if (!Array.isArray(array)) throw new Error('This field is not a list.');
  let item;
  if (path.startsWith('game.upgrades.sections.') && path.endsWith('.upgrades')) {
    const nextNumber = Math.max(0, ...array.map((upgrade) => Number(upgrade.n) || 0)) + 1;
    item = { n: nextNumber, name: 'New upgrade', cap: null, price: '', multi: '' };
  } else item = array.length ? emptyLike(array[0]) : '';
  addListItem(path, item);
  render();
}

function confirmDelete(message) {
  return window.confirm(`${message} This cannot be undone after you save.`);
}

function handleAction(button) {
  const { action, path, list } = button.dataset;
  const index = Number(button.dataset.index);
  if (action === 'select') {
    const selected = button.dataset.path;
    state.selected = selected;
    if (selected.split('.').length > 2) {
      const parts = selected.split('.');
      for (let length = 2; length < parts.length; length += 2) state.expanded.add(parts.slice(0, length).join('.'));
    }
    if (selected === `categories.${selected.split('.')[1]}` || getPath(selected)?.children?.length) state.expanded.add(selected);
    render();
  } else if (action === 'toggle-node') {
    state.expanded.has(path) ? state.expanded.delete(path) : state.expanded.add(path);
    renderTree();
  } else if (action === 'select-game') {
    state.gameSelection = { group: button.dataset.group, key: button.dataset.key ?? null };
    render();
  } else if (action === 'select-backup') {
    state.selectedBackup = button.dataset.name;
    render();
  } else if (action === 'add-game-entry') {
    addGameEntry(button.dataset.group);
  } else if (action === 'remove-game-entry' && confirmDelete(`Delete "${button.dataset.key}" from game data?`)) {
    const group = GAME_GROUPS.find((item) => item.id === button.dataset.group);
    delete getPath(`game.${group.path}`)[button.dataset.key];
    state.gameSelection = null;
    markDirty('game');
    render();
  } else if (action === 'game-add-item') {
    addGameArrayItem(path);
  } else if (action === 'game-remove-item' && confirmDelete('Remove this game-data item?')) {
    removeListItem(path, index);
    render();
  } else if (action === 'game-move-item') {
    moveListItem(path, index, Number(button.dataset.delta));
  } else if (action === 'game-add-field') {
    const object = getPath(path);
    const key = window.prompt('Name this field:');
    if (key === null) return;
    const name = key.trim();
    if (!name || name.includes('.')) throw new Error('Enter a non-empty field name without periods.');
    if (Object.hasOwn(object, name)) throw new Error(`"${name}" already exists.`);
    object[name] = emptyLike(Object.values(object)[0] ?? '');
    markDirty('game');
    render();
  } else if (action === 'game-remove-field' && confirmDelete(`Remove the "${button.dataset.key}" field?`)) {
    const parts = path.split('.');
    const key = parts.pop();
    delete getPath(parts.join('.'))[key];
    markDirty('game');
    render();
  } else if (action === 'create-backup') {
    createBackup().then((name) => {
      toast(`Backup created: ${name}`);
      void loadBackups();
      render();
    }).catch((error) => toast(error.message || 'Could not create a backup.', true));
  } else if (action === 'restore-backup') {
    restoreBackup(button.dataset.name).catch((error) => toast(error.message || 'Could not restore this backup.', true));
  } else if (action === 'toggle-category') {
    state.expanded.has(path) ? state.expanded.delete(path) : state.expanded.add(path);
    renderTree();
  } else if (action === 'add-category') {
    state.documents.wiki.categories.push(newCategory());
    state.selected = `categories.${state.documents.wiki.categories.length - 1}`;
    markDirty('wiki');
    render();
  } else if (action === 'add-page') {
    addListItem(list, newPageForList(list));
    state.selected = `${list}.${getPath(list).length - 1}`;
    state.expanded.add(button.dataset.parent);
    render();
  } else if (action === 'add-object') {
    let item;
    try { item = JSON.parse(button.dataset.template); } catch {
      throw new Error('The new item template is invalid. Reload the editor and try again.');
    }
    addListItem(list, item);
    render();
  } else if (action === 'remove' && confirmDelete('Remove this item?')) {
    removeListItem(list, index);
    if (state.screen === 'updates' && state.documents.updates.versions.length) state.selected = 'versions.0';
    render();
  } else if (action === 'move') {
    moveListItem(list, index, Number(button.dataset.delta));
  } else if (action === 'delete-category' && confirmDelete('Delete this category and all of its pages?')) {
    removeListItem('categories', index);
    state.selected = state.documents.wiki.categories.length ? 'categories.0' : '';
    render();
  } else if (action === 'delete-page' && confirmDelete('Delete this page and its subpages?')) {
    removeListItem(path.split('.').slice(0, -1).join('.'), Number(path.split('.').at(-1)));
    state.selected = `categories.${path.split('.')[1]}`;
    render();
  } else if (action === 'new-release') {
    state.documents.updates.versions.unshift(newRelease());
    markDirty('updates');
    state.screen = 'updates';
    state.selected = 'versions.0';
    render();
  } else if (action === 'delete-release' && confirmDelete('Delete this release?')) {
    removeListItem('versions', index);
    state.selected = state.documents.updates.versions.length ? 'versions.0' : '';
    render();
  }
}

function createLogin() {
  if (location.origin !== SITE_ORIGIN) {
    toast('For secure sign-in, open https://regrowthinc.vercel.app/admin/.', true);
    return;
  }
  setStatus('Waiting for GitHub authorization…');
  githubSignIn()
    .then(async (token) => {
      state.token = token;
      try {
        const user = await githubRequest('https://api.github.com/user', token);
        state.user = user.login;
        await loadDocuments();
      } catch (error) {
        state.token = '';
        setConnected(false);
        setStatus('Could not load repository content', 'error');
        toast(error.message || 'Could not load the Wiki from GitHub.', true);
      }
    })
    .catch((error) => {
      if (!state.token) {
        setStatus('Sign-in window was closed', 'error');
        toast(error.message || 'GitHub sign-in was cancelled.', true);
      }
    });
}

function signOut() {
  if (state.dirty.size && !window.confirm('You have unsaved edits. Sign out and discard them?')) return;
  state.token = '';
  state.user = '';
  state.documents = { wiki: null, updates: null, game: null };
  state.originalDocuments = { wiki: null, updates: null, game: null };
  state.shas = {};
  state.backups = [];
  state.gameSelection = null;
  state.selectedBackup = '';
  state.dirty.clear();
  setConnected(false);
  screenContent.replaceChildren();
}

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-bind]')) markInputDirty(event.target);
  if (event.target.matches('#studio-search')) {
    state.searchQuery = event.target.value;
    renderTree();
  }
});
document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-bind]')) {
    markInputDirty(target);
  }
});
document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-screen]');
  if (tab) {
    state.screen = tab.dataset.screen;
    state.searchQuery = '';
    state.searchOpen = false;
    $('#studio-search').hidden = true;
    $('#studio-search').value = '';
    if (state.screen === 'updates') {
      state.selected = state.documents.updates?.versions?.length ? 'versions.0' : '';
    } else if (state.screen === 'wiki') {
      state.selected = state.documents.wiki?.categories?.length ? 'categories.0' : '';
    } else if (state.screen === 'game' && !state.gameSelection) {
      const firstGroup = GAME_GROUPS[0];
      const gameValue = getPath(`game.${firstGroup.path}`);
      state.gameSelection = { group: firstGroup.id, key: gameValue ? Object.keys(gameValue)[0] || null : null };
    } else if (state.screen === 'versions') {
      state.selectedBackup = '';
    }
    document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item === tab));
    render();
    return;
  }
  if (event.target.closest('#login') || event.target.closest('#login-card-button')) {
    createLogin();
    return;
  }
  if (event.target.closest('#logout')) {
    signOut();
    return;
  }
  if (event.target.closest('#save')) {
    if (!state.token) {
      toast('Save requires GitHub sign-in. Connect to publish changes.', true);
      return;
    }
    saveDocuments();
    return;
  }
  if (event.target.closest('#toggle-tree')) {
    const categories = state.documents.wiki?.categories || [];
    const paths = treePaths(categories);
    state.expanded = paths.every((path) => state.expanded.has(path)) ? new Set() : new Set(paths);
    renderTree();
    return;
  }
  if (event.target.closest('#toggle-search')) {
    const btn = $('#toggle-search');
    state.searchOpen = !state.searchOpen;
    btn.classList.toggle('is-active', state.searchOpen);
    $('#studio-search').hidden = !state.searchOpen;
    if (state.searchOpen) {
      $('#studio-search').focus();
    } else {
      state.searchQuery = '';
      $('#studio-search').value = '';
      renderTree();
    }
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    try { handleAction(actionButton); } catch (error) { toast(error.message, true); }
  }
});

$('#add-category').addEventListener('click', () => {
  try { handleAction({ dataset: { action: 'add-category' } }); } catch (error) { toast(error.message, true); }
});

if (state.token) {
  loadDocuments().catch((error) => {
    setStatus('Could not load repository content', 'error');
    toast(error.message || 'Could not load the Wiki from GitHub.', true);
  });
} else {
  // Local development: no GitHub token -> load from local content/ JSON files.
  loadLocalDocuments().catch((error) => {
    setStatus('Could not load local content', 'error');
    toast(error.message || 'Could not load the local Wiki content.', true);
  });
}
