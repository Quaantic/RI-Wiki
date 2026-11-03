const SITE_ORIGIN = 'https://regrowthinc.vercel.app';
const REPOSITORY = 'Quaantic/RI-Wiki';
const BRANCH = 'main';
const FILES = {
  wiki: 'content/wiki-data.json',
  updates: 'content/update-log.json',
};
const CONTEXTS = ['Feature', 'Changes', 'UI', 'Bugs'];

const state = {
  token: '',
  user: '',
  screen: 'wiki',
  selected: '',
  documents: { wiki: null, updates: null },
  shas: {},
  dirty: new Set(),
  expanded: new Set(),
  toastTimer: 0,
};

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const screenContent = $('#screen-content');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
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
  $('#login').hidden = connected;
  $('#logout').hidden = !connected;
  $('#account').hidden = !connected;
  $('#workspace').hidden = !connected;
  $('#login-screen').hidden = connected;
  $('#account').textContent = state.user ? `@${state.user}` : '';
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
  });
}

function setPath(path, value) {
  const parts = path.split('.');
  const roots = {
    categories: state.documents.wiki?.categories,
    versions: state.documents.updates?.versions,
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
  $('#save').disabled = false;
  setStatus('Unsaved changes');
}

function markInputDirty(target) {
  const path = target.dataset.bind;
  if (!path) return;
  let value;
  if (target.type === 'checkbox') value = target.checked;
  else if (target.type === 'number') value = target.value === '' ? 0 : Number(target.value);
  else value = target.value;
  setPath(path, value);
  markDirty(path.startsWith('categories.') ? 'wiki' : 'updates');
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
  return `<div class="field${wide}"><label for="${escapeHtml(path)}">${escapeHtml(label)}</label><input id="${escapeHtml(path)}" type="${inputType}" data-bind="${escapeHtml(path)}" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(options.placeholder || '')}"${options.min != null ? ` min="${options.min}"` : ''}></div>`;
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
  markDirty(path.startsWith('categories.') ? 'wiki' : 'updates');
}

function removeListItem(path, index) {
  const array = getPath(path);
  if (!Array.isArray(array) || !Number.isInteger(index) || index < 0 || index >= array.length) {
    throw new Error('This list item could not be removed.');
  }
  array.splice(index, 1);
  markDirty(path.startsWith('categories.') ? 'wiki' : 'updates');
}

function moveListItem(path, index, delta) {
  const array = getPath(path);
  const destination = index + delta;
  if (!Array.isArray(array) || destination < 0 || destination >= array.length) return;
  [array[index], array[destination]] = [array[destination], array[index]];
  markDirty(path.startsWith('categories.') ? 'wiki' : 'updates');
  render();
}

function markTreeDirty(path) {
  markDirty(path.startsWith('categories.') ? 'wiki' : 'wiki');
}

function pageName(node) {
  return node?.name || node?.id || 'Untitled page';
}

function renderTreeNode(node, path, branchPath, depth = 0) {
  const isExpanded = state.expanded.has(path);
  const selected = state.selected === path;
  const childrenPath = `${path}.children`;
  const children = node.children || [];
  const siblings = getPath(branchPath) || [];
  const index = Number(path.split('.').at(-1));
  return `<div class="tree-category">
    <div class="tree-row">
      <button class="tree-item${selected ? ' is-selected' : ''}" data-action="select" data-path="${escapeHtml(path)}" type="button" style="padding-left:${8 + depth * 5}px">
        <span class="tree-item__chevron">${children.length ? (isExpanded ? '▾' : '▸') : '·'}</span><span class="tree-item__name">${escapeHtml(pageName(node))}</span>
      </button>
      ${index ? `<button class="tree-order" data-action="move" data-list="${escapeHtml(branchPath)}" data-index="${index}" data-delta="-1" type="button" title="Move up">↑</button>` : ''}
      ${index < siblings.length - 1 ? `<button class="tree-order" data-action="move" data-list="${escapeHtml(branchPath)}" data-index="${index}" data-delta="1" type="button" title="Move down">↓</button>` : ''}
      <button class="tree-add" data-action="add-page" data-list="${escapeHtml(childrenPath)}" data-parent="${escapeHtml(path)}" type="button" title="Add subpage">+</button>
    </div>
    ${isExpanded && children.length ? `<div class="tree-children">${children.map((child, index) => renderTreeNode(child, `${childrenPath}.${index}`, childrenPath, depth + 1)).join('')}</div>` : ''}
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

function renderTree() {
  const tree = $('#tree');
  const categories = state.documents.wiki?.categories || [];
  if (state.screen === 'wiki') {
    const paths = treePaths(categories);
    $('#tree-heading').textContent = `WIKI · ${categories.length} categories · ${pageCount(categories)} pages`;
    $('#toggle-tree').hidden = !paths.length;
    $('#toggle-tree').textContent = paths.every((path) => state.expanded.has(path)) ? 'Collapse all' : 'Expand all';
    $('#add-category').hidden = false;
    tree.innerHTML = categories.map((category, index) => {
      const path = `categories.${index}`;
      const selected = state.selected === path;
      const expanded = state.expanded.has(path);
      const sections = category.subcategories || [];
      return `<div class="tree-category">
        <div class="tree-row">
          <button class="tree-item${selected ? ' is-selected' : ''}" data-action="select" data-path="${path}" type="button">
            <span class="tree-item__chevron">${sections.length ? (expanded ? '▾' : '▸') : '·'}</span><span class="tree-item__name">${escapeHtml(pageName(category))}</span>
          </button>
          ${index ? `<button class="tree-order" data-action="move" data-list="categories" data-index="${index}" data-delta="-1" type="button" title="Move up">↑</button>` : ''}
          ${index < categories.length - 1 ? `<button class="tree-order" data-action="move" data-list="categories" data-index="${index}" data-delta="1" type="button" title="Move down">↓</button>` : ''}
          <button class="tree-add" data-action="add-page" data-list="${path}.subcategories" data-parent="${path}" type="button" title="Add page">+</button>
        </div>
        ${expanded && sections.length ? `<div class="tree-children">${sections.map((page, pageIndex) => renderTreeNode(page, `${path}.subcategories.${pageIndex}`, `${path}.subcategories`)).join('')}</div>` : ''}
      </div>`;
    }).join('');
    return;
  }
  $('#add-category').hidden = true;
  $('#toggle-tree').hidden = true;
  const versions = state.documents.updates?.versions || [];
  $('#tree-heading').textContent = 'RELEASES';
  tree.innerHTML = `<button class="button button--primary button--small" data-action="new-release" type="button">+ New release</button>${versions.map((version, index) => `<button class="tree-item${state.selected === `versions.${index}` ? ' is-selected' : ''}" data-action="select" data-path="versions.${index}" type="button"><span class="tree-item__chevron">·</span><span class="tree-item__name">Version ${escapeHtml(version.version || '—')}</span></button>`).join('')}`;
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

function render() {
  if (!state.token || !state.documents.wiki) return;
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item.dataset.screen === state.screen));
  renderTree();
  if (state.screen === 'wiki') renderWikiScreen();
  else renderUpdatesScreen();
  $('#save').disabled = !state.dirty.size;
  setStatus(state.dirty.size ? 'Unsaved changes' : 'All changes saved', state.dirty.size ? '' : 'saved');
}

function apiHeaders(json = false) {
  return {
    Authorization: `Bearer ${state.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...apiHeaders(Boolean(options.body)), ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || `GitHub returned HTTP ${response.status}.`;
    if ([401, 403, 404].includes(response.status)) {
      throw new Error(`${message} Check that this GitHub account can access ${REPOSITORY} and has write permission.`);
    }
    if (response.status === 409 || response.status === 422) {
      throw new Error(`${message} The file may have changed on GitHub. Reload the editor before saving again.`);
    }
    throw new Error(message);
  }
  return payload;
}

function decodeBase64Content(content) {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function loadDocuments() {
  setStatus('Loading Wiki content…');
  const [wiki, updates] = await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
    const result = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/contents/${path}?ref=${BRANCH}`);
    if (result.type !== 'file' || typeof result.content !== 'string') throw new Error(`GitHub did not return ${path} as a file.`);
    state.shas[name] = result.sha;
    return [name, JSON.parse(decodeBase64Content(result.content))];
  }));
  state.documents = Object.fromEntries([wiki, updates]);
  validateDocuments();
  state.screen = 'wiki';
  state.selected = state.documents.wiki.categories.length ? 'categories.0' : '';
  state.expanded = new Set(treePaths(state.documents.wiki.categories));
  setConnected(true);
  render();
}

function encodeBase64Content(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

async function saveDocuments() {
  if (!state.dirty.size) return;
  $('#save').disabled = true;
  const pending = [...state.dirty];
  try {
    for (const name of pending) {
      validateDocuments();
      const path = FILES[name];
      const content = `${JSON.stringify(state.documents[name], null, 2)}\n`;
      const response = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Update ${path.split('/').at(-1).replace('.json', '')} content`,
          content: encodeBase64Content(content),
          sha: state.shas[name],
          branch: BRANCH,
        }),
      });
      state.shas[name] = response.content.sha;
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

function flattenPageIds(category) {
  const ids = new Set();
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (!node || !/^[\w-]+$/.test(node.id || '')) throw new Error(`Page "${node?.name || 'Untitled'}" needs a URL ID using letters, numbers, underscores, or hyphens.`);
      if (ids.has(node.id)) throw new Error(`The page ID "${node.id}" appears more than once in category ${category.name}.`);
      ids.add(node.id);
      if (!node.name?.trim() || typeof node.desc !== 'string') throw new Error(`Page "${node.id}" needs a name and a description.`);
      walk(node.children);
    }
  };
  walk(category.subcategories);
  return ids;
}

function validateDocuments() {
  const categories = state.documents.wiki.categories;
  const versions = state.documents.updates.versions;
  if (!Array.isArray(categories) || !Array.isArray(versions)) throw new Error('A content file is missing its expected list.');
  const categoryIds = new Set();
  for (const category of categories) {
    if (!/^[\w-]+$/.test(category.id || '') || !category.name?.trim() || typeof category.desc !== 'string' || typeof category.tagline !== 'string') {
      throw new Error(`Category "${category.name || 'Untitled'}" needs a valid URL ID, name, description, and tagline.`);
    }
    if (categoryIds.has(category.id)) throw new Error(`The category ID "${category.id}" is used more than once.`);
    categoryIds.add(category.id);
    flattenPageIds(category);
  }
  if (!versions.length) throw new Error('The update log must contain at least one release.');
  const releaseIds = new Set();
  for (const version of versions) {
    if (!version.version?.trim() || !Array.isArray(version.entries)) throw new Error('Each release needs a version and an update list.');
    if (releaseIds.has(version.version)) throw new Error(`Release version "${version.version}" appears more than once.`);
    releaseIds.add(version.version);
    for (const entry of version.entries) {
      if (!CONTEXTS.includes(entry.context) || !entry.title?.trim() || typeof entry.description !== 'string') throw new Error(`An update in release ${version.version} needs a category, title, and description.`);
      if (entry.href && !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(entry.href)) throw new Error(`The Wiki link "${entry.href}" is invalid; use a route like #/life/power-of-fossils.`);
    }
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
  const url = `${SITE_ORIGIN}/api/auth?provider=github&site_id=${encodeURIComponent(new URL(SITE_ORIGIN).host)}`;
  const popup = window.open(url, 'RIWikiAuthorization', 'popup,width=960,height=650');
  if (!popup) {
    toast('The browser blocked the sign-in popup. Allow pop-ups for regrowthinc.vercel.app and try again.', true);
    return;
  }
  setStatus('Waiting for GitHub authorization…');
  const listener = async (event) => {
    if (event.origin !== SITE_ORIGIN || event.source !== popup || typeof event.data !== 'string') return;
    if (event.data === 'authorizing:github') {
      popup.postMessage(event.data, event.origin);
      return;
    }
    if (!event.data.startsWith('authorization:github:')) return;
    window.removeEventListener('message', listener);
    try { popup.close(); } catch {}
    const result = event.data.match(/^authorization:github:(success|error):(.+)$/);
    if (!result) {
      setStatus('Sign-in response was not recognized', 'error');
      toast('GitHub returned an unrecognized sign-in response.', true);
      return;
    }
    const [, status, payloadText] = result;
    let payload;
    try { payload = JSON.parse(payloadText); } catch {
      setStatus('Sign-in response was invalid', 'error');
      toast('GitHub returned invalid sign-in data. Please try again.', true);
      return;
    }
    if (status === 'error') {
      setStatus('GitHub sign-in failed', 'error');
      toast(payload.message || 'GitHub could not sign you in.', true);
      return;
    }
    if (!payload.token || payload.provider !== 'github') {
      setStatus('Sign-in response was invalid', 'error');
      toast('GitHub did not return a usable access token.', true);
      return;
    }
    state.token = payload.token;
    try {
      const user = await githubRequest('https://api.github.com/user');
      state.user = user.login;
      await loadDocuments();
    } catch (error) {
      state.token = '';
      setConnected(false);
      setStatus('Could not load repository content', 'error');
      toast(error.message || 'Could not load the Wiki from GitHub.', true);
    }
  };
  window.addEventListener('message', listener);
  const popupWatcher = setInterval(() => {
    if (popup.closed) {
      clearInterval(popupWatcher);
      window.removeEventListener('message', listener);
      if (!state.token) setStatus('Sign-in window was closed');
    }
  }, 600);
}

function signOut() {
  if (state.dirty.size && !window.confirm('You have unsaved edits. Sign out and discard them?')) return;
  state.token = '';
  state.user = '';
  state.documents = { wiki: null, updates: null };
  state.shas = {};
  state.dirty.clear();
  setConnected(false);
  screenContent.replaceChildren();
}

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-bind]')) markInputDirty(event.target);
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
    const list = state.screen === 'updates' ? state.documents.updates.versions : state.documents.wiki.categories;
    state.selected = list.length ? `${state.screen === 'updates' ? 'versions' : 'categories'}.0` : '';
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
    saveDocuments();
    return;
  }
  if (event.target.closest('#toggle-tree')) {
    const paths = treePaths(state.documents.wiki.categories);
    state.expanded = paths.every((path) => state.expanded.has(path)) ? new Set() : new Set(paths);
    renderTree();
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

setConnected(false);
