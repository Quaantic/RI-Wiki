// ==== EDIT MODE: sessao, barra, chips e popover de edicao inline ====

import { esc, qs, qsa } from '../utils.js';
import { icon } from '../ui.js';
import {
  githubRequest,
  githubContentsUrl,
  githubSignIn,
  githubUser,
  githubCollaboratorPermission,
  hasWriteAccess,
} from '../github.js';
import { CONTEXTS } from '../content-schema.js';
import { LUCIDE_ICONS } from '../lib/lucide-data.js';
import { CATEGORIES, getSubcategory, getSubcategoryDocPath, collectSubtreeIds } from '../data/wiki-data.js';
import { buildNav } from '../ui.js';
import * as draft from './draft.js';
import { rerender, registerRoute } from '../router.js';

const LUCIDE_ICON_NAMES = Object.keys(LUCIDE_ICONS);

const TOKEN_KEY = 'ri-edit-token';

const session = {
  token: '',
  user: '',
  avatar: '',
  allowed: false,
  ready: false,
  editing: false,
  started: false,
  busy: false,
};

const layer = { bar: null, chip: null, popover: null, toast: null };
let popState = null;

// Listas aninhadas em uma linha por item ("Target | mult | caps").
const LIST_PARSERS = {
  'area-list': {
    print: (v) => (Array.isArray(v) ? v.join('\n') : ''),
    parse: (text) => text.split('\n').map((line) => line.trim()).filter(Boolean),
  },
  'boost-list': {
    print: (v) => (Array.isArray(v) ? v.map((b) => [b.target, b.mult, b.capsAt ?? ''].join(' | ')).join('\n') : ''),
    parse: (text) => text.split('\n').map((line) => {
      const [target, mult, capsAt] = line.split('|').map((part) => part.trim());
      if (!target || mult == null || mult === '') return null;
      const boost = { target, mult };
      if (capsAt) boost.capsAt = capsAt;
      return boost;
    }).filter(Boolean),
  },
  'features-list': {
    print: (v) => (Array.isArray(v) ? v.map((f) => [f.name, ...(f.subs || [])].join(' ;; ')).join('\n') : ''),
    parse: (text) => text.split('\n').map((line) => {
      const [name, ...subs] = line.split(';;').map((part) => part.trim()).filter(Boolean);
      if (!name) return null;
      return { name, subs };
    }).filter(Boolean),
  },
};

// ==== SCHEMAS DOS CAMPOS POR KIND ====

const SINGLE_TYPES = {
  text: { type: 'line', labelSuffix: 'text' },
  long: { type: 'area', labelSuffix: 'description' },
  num: { type: 'line', labelSuffix: 'value' },
};

const SCHEMAS = {
  pair: [
    { key: 'label', label: 'Label', type: 'line' },
    { key: 'value', label: 'Value', type: 'line' },
  ],
  card: [
    { key: 'title', label: 'Title', type: 'line' },
    { key: 'icon', label: 'Icon (lucide)', type: 'line', mono: true, picker: 'icon' },
    { key: 'text', label: 'Text', type: 'area' },
  ],
  'category-card': [
    { key: 'id', label: 'URL id (letters, numbers, -)', type: 'line', mono: true },
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'tagline', label: 'Tagline', type: 'area' },
    { key: 'icon', label: 'Icon (lucide)', type: 'line', mono: true, picker: 'icon' },
  ],
  'sub-card': [
    { key: 'id', label: 'URL id (letters, numbers, -)', type: 'line', mono: true },
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'desc', label: 'Description', type: 'area' },
    { key: 'icon', label: 'Icon (lucide)', type: 'line', mono: true, picker: 'icon' },
  ],
  entry: [
    { key: 'context', label: 'Category', type: 'select', options: () => CONTEXTS.map((id) => ({ id, label: id })) },
    { key: 'title', label: 'Title', type: 'line' },
    { key: 'href', label: 'Wiki link (#/route, empty = no link)', type: 'line' },
    { key: 'description', label: 'Description', type: 'area' },
  ],
  version: [
    { key: 'version', label: 'Version', type: 'line' },
    { key: 'date', label: 'Date (YYYY-MM-DD)', type: 'line' },
  ],
  credit: [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'handle', label: '@handle (empty hides)', type: 'line' },
    { key: 'role', label: 'Role (empty = Contributor)', type: 'line' },
    { key: 'avatar', label: 'Avatar image', type: 'image' },
    { key: 'banner', label: 'Banner color (CSS color)', type: 'line', mono: true },
  ],
  'game:ore': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'icon', label: 'Icon (lucide)', type: 'line', mono: true, picker: 'icon' },
    { key: 'color', label: 'Color (CSS color)', type: 'line', mono: true },
    { key: 'depth', label: 'Depth', type: 'line' },
    { key: 'luck', label: 'Best luck', type: 'line' },
  ],
  'game:layer': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'num', label: 'Layer number', type: 'line' },
    { key: 'depth', label: 'Depth', type: 'line' },
  ],
  'game:stage': [
    { key: 'title', label: 'Title', type: 'line' },
    { key: 'num', label: 'Stage number', type: 'line' },
    { key: 'requirements', label: 'Requirements (one per line)', type: 'area-list' },
    { key: 'boosts', label: 'Boosts (one per line)', type: 'area-list' },
    { key: 'boostsNote', label: 'Boost note', type: 'line' },
    { key: 'unlocks.area', label: 'Unlocks area (empty = none)', type: 'line' },
    { key: 'unlocks.places', label: 'Unlocked places (one per line)', type: 'area-list' },
    { key: 'unlocks.features', label: 'Unlock features (one per line: Name ;; sub ;; sub)', type: 'features-list' },
  ],
  'game:area': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'reqT1', label: 'T1 requirement', type: 'line' },
    { key: 'multiT1', label: 'T1 multiplier', type: 'line' },
    { key: 'reqT2', label: 'T2 requirement', type: 'line' },
    { key: 'multiT2', label: 'T2 multiplier', type: 'line' },
  ],
  'game:gear': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'rarity', label: 'Rarity', type: 'line' },
  ],
  'game:upgrade': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'n', label: 'Number (#)', type: 'line' },
    { key: 'cap', label: 'Cap (empty = no cap)', type: 'line' },
    { key: 'price', label: 'Price formula (L = level)', type: 'line', mono: true },
    { key: 'multi', label: 'Effect formula (L = level)', type: 'line', mono: true },
  ],
  'game:rune': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'icon', label: 'Icon (lucide)', type: 'line', mono: true, picker: 'icon' },
    { key: 'luck', label: 'Recommended luck', type: 'line' },
    { key: 'baseChance', label: 'Base chance', type: 'line' },
    { key: 'recChance', label: 'Chance at rec. luck', type: 'line' },
    { key: 'boosts', label: 'Boosts (Target | multiplier | caps at, one per line)', type: 'boost-list' },
  ],
  'game:bonus': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'id', label: 'Internal id', type: 'line', mono: true },
    { key: 'value', label: 'Value formula', type: 'area', mono: true },
    { key: 'cap', label: 'Cap (empty = none)', type: 'line' },
    { key: 'capUnit', label: 'Cap unit', type: 'line' },
    { key: 'unit', label: 'Unit', type: 'line' },
    { key: 'unlockAt', label: 'Unlocks at', type: 'line' },
    { key: 'unlockLabel', label: 'Unlock label', type: 'line' },
    { key: 'unlockLevel', label: 'Unlock level', type: 'line' },
  ],
  'game:bonus-group': [
    { key: 'id', label: 'Unique group ID', type: 'line' },
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'color', label: 'Color (#hex)', type: 'line' },
    { key: 'dropChance', label: 'Drop chance', type: 'line' },
    { key: 'amountLabel', label: 'Amount label', type: 'line' },
  ],
  'game:tier': [
    { key: 'name', label: 'Name', type: 'line' },
  ],
};

function fieldsFor(kind) {
  if (SCHEMAS[kind]) return SCHEMAS[kind];
  if (SINGLE_TYPES[kind]) return null;
  return null;
}

function parseBinding(el) {
  const path = el.getAttribute('data-edit') || '';
  const kind = el.getAttribute('data-edit-kind') || 'text';
  const sep = path.indexOf(':');
  if (sep <= 0) return null;
  const docName = path.slice(0, sep);
  const valuePath = path.slice(sep + 1);
  if (!['wiki', 'updates', 'game'].includes(docName) || !valuePath) return null;
  if (!draft.isLoaded() || !draft.doc(docName)) return null;
  return { docName, valuePath, kind, label: el.getAttribute('data-edit-label') || 'Content' };
}

// ==== TOAST ====

function notify(message, isError = false) {
  if (!layer.toast) return;
  layer.toast.className = `ri-edit-toast${isError ? ' ri-edit-toast--error' : ''}`;
  layer.toast.textContent = message;
  layer.toast.classList.add('is-on');
  clearTimeout(notify._t);
  notify._t = setTimeout(() => layer.toast.classList.remove('is-on'), 3200);
}

// ==== BARRA E STATUS ====

function barStatus(text, kind = '') {
  const chip = layer.bar?.querySelector('[data-edit-status]');
  if (!chip) return;
  chip.textContent = text;
  chip.classList.toggle('is-dirty', kind === 'dirty');
  chip.classList.toggle('is-busy', kind === 'busy');
}

function updateToolbar() {
  if (!layer.bar) return;
  const { ready, editing, user, avatar } = session;
  const draftOnline = draft.draftOnline();
  const draftDirty = draft.draftDirty();

  layer.bar.querySelector('[data-edit-user]').hidden = !ready;
  layer.bar.querySelector('[data-edit-user]').innerHTML = ready
    ? `${avatar ? `<img class="ri-edit-bar__avatar" src="${esc(avatar)}" alt="" />` : ''}<b>${esc(user)}</b>`
    : '';

  layer.bar.querySelector('[data-edit-toggle]').disabled = !ready;
  layer.bar.querySelector('[data-edit-undo]').disabled = !ready || !draft.canUndo();
  layer.bar.querySelector('[data-edit-save]').disabled = !ready;
  layer.bar.querySelector('[data-edit-publish]').disabled = !ready;
  layer.bar.querySelector('[data-edit-discard]').disabled = !ready;

  layer.bar.querySelector('[data-edit-mode-label]').textContent = editing ? 'Preview' : 'Edit';
  layer.bar.querySelector('[data-edit-toggle]').classList.toggle('is-on', editing);

  if (!ready) {
    barStatus('Checking sign-in…');
  } else if (draftDirty) {
    barStatus('Unsaved changes', 'dirty');
  } else if (draftOnline) {
    barStatus('Draft saved on GitHub (unpublished)');
  } else {
    barStatus('Everything saved');
  }
}

function buildToolbar() {
  layer.bar = document.createElement('div');
  layer.bar.id = 'ri-edit-bar';
  layer.bar.className = 'ri-edit-bar';
  layer.bar.innerHTML = `
    <span class="ri-edit-bar__brand">${icon('edit', 14)} Inline editor</span>
    <span class="chip ri-edit-bar__status" data-edit-status>Checking sign-in…</span>
    <span style="flex:1"></span>
    <button class="btn btn--ghost btn--sm" data-edit-toggle title="Toggle between edit and preview (Alt+E)">
      <span data-edit-mode-label>Edit</span>
    </button>
    <button class="btn btn--ghost btn--sm" data-edit-undo title="Undo the last change in the draft (Ctrl+Z)">${icon('undo-2', 13)} Undo</button>
    <button class="btn btn--ghost btn--sm" data-edit-save title="Save for all editors and refresh their admin Wiki">${icon('save', 13)} Save for everyone</button>
    <button class="btn btn--ghost btn--sm" data-edit-discard title="Discard the draft and return to the published content">${icon('rotate-ccw', 13)} Discard</button>
    <button class="btn btn--primary btn--sm" data-edit-publish title="Publish the changes to the live Wiki (creates a backup first)">${icon('upload', 13)} Publish</button>
    <span class="ri-edit-bar__user" data-edit-user hidden></span>
    <button class="btn btn--ghost btn--sm" data-edit-signout title="End this edit session">${icon('log-out', 13)} Sign out</button>`;
  document.body.appendChild(layer.bar);

  layer.bar.addEventListener('click', (event) => {
    const action = event.target.closest('[data-edit-toggle],[data-edit-undo],[data-edit-save],[data-edit-publish],[data-edit-discard],[data-edit-signout]');
    if (!action) return;
    onToolbarAction(action);
  });

  layer.chip = document.createElement('div');
  layer.chip.id = 'ri-edit-chip';
  layer.chip.hidden = true;
  document.body.appendChild(layer.chip);

  layer.popover = document.createElement('div');
  layer.popover.id = 'ri-edit-popover';
  layer.popover.className = 'ri-edit-popover';
  layer.popover.hidden = true;
  layer.popover.innerHTML = `
    <div class="ri-edit-popover__head">
      <b data-edit-pop-title>Edit</b>
      <button class="ri-edit-popover__close" data-edit-pop-close aria-label="Close">${icon('x', 14)}</button>
    </div>
    <div class="ri-edit-popover__body" data-edit-pop-body></div>
    <div class="ri-edit-popover__foot">
      <span class="ri-edit-popover__warn" data-edit-pop-warn hidden></span>
      <button class="btn btn--ghost btn--sm ri-edit-popover__delete" data-edit-pop-delete hidden title="Remove this item from the list in the draft">${icon('trash-2', 13)} Delete</button>
      <span style="flex:1"></span>
      <button class="btn btn--ghost btn--sm" data-edit-pop-cancel>Cancel</button>
      <button class="btn btn--primary btn--sm" data-edit-pop-apply>${icon('check', 13)} Apply</button>
    </div>`;
  document.body.appendChild(layer.popover);

  layer.toast = document.createElement('div');
  layer.toast.id = 'ri-edit-toast';
  layer.toast.className = 'ri-edit-toast';
  document.body.appendChild(layer.toast);

  layer.popover.addEventListener('click', (event) => {
    const target = event.target;
    if (target.closest('[data-edit-pop-close],[data-edit-pop-cancel]')) {
      closePopover(true);
      return;
    }
    if (target.closest('[data-edit-pop-apply]')) {
      void applyPopover();
      return;
    }
    if (target.closest('[data-edit-pop-delete]')) {
      void deletePopoverItem();
      return;
    }
    const imageInput = target.closest('input[data-edit-pop-image]');
    if (imageInput) onImagePicked(imageInput);
  });

  layer.popover.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input.input')) {
      event.preventDefault();
      void applyPopover();
    }
  });

  installSigninButton();
}

function onToolbarAction(button) {
  if (session.busy) return;
  const act = button.getAttribute('data-edit-toggle') != null
    ? 'toggle'
    : button.getAttribute('data-edit-undo') != null
      ? 'undo'
      : button.getAttribute('data-edit-save') != null
        ? 'save'
        : button.getAttribute('data-edit-publish') != null
          ? 'publish'
          : button.getAttribute('data-edit-discard') != null
            ? 'discard'
            : 'signout';
  if (act === 'toggle') {
    if (session.ready && session.allowed) setEditing(!session.editing);
    return;
  }
  if (act === 'undo') {
    void doUndo();
    return;
  }
  if (act === 'signout') {
    signOut();
    return;
  }
  if (!session.token || !session.allowed) return;
  void (async () => {
    session.busy = true;
    try {
      if ((act === 'save' || act === 'publish') && popState) {
        await applyPopover();
        if (popState) return;
      }
      if (act === 'save') {
        barStatus('Saving draft…', 'busy');
        await draft.saveDraft(session.token);
        window.location.reload();
      } else if (act === 'publish') {
        if (!window.confirm('Publish the changes to the live Wiki? A backup is created first.')) return;
        if (popState) closePopover(true);
        barStatus('Publishing…', 'busy');
        await draft.publishChanges(session.token);
        notify('Changes published! GitHub is deploying the update.');
      } else {
        if (!window.confirm('Discard the draft and return to the published content?')) return;
        if (popState) closePopover(true);
        barStatus('Discarding draft…', 'busy');
        await draft.discardDraft(session.token);
        await rerender({ scroll: 'preserve' });
        notify('Draft discarded. The published content is showing.');
      }
    } catch (error) {
      notify(error.message || 'Operation failed.', true);
    } finally {
      session.busy = false;
    }
    updateToolbar();
  })();
}

function signOut() {
  if (!window.confirm('Sign out of the inline editor?')) return;
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  window.location.reload();
}

function installSigninButton() {
  const menu = qs('#settings-menu');
  if (!menu || menu.querySelector('[data-ri-edit-signin]')) return;
  const row = document.createElement('button');
  row.className = 'settings-row settings-row--btn';
  row.setAttribute('data-ri-edit-signin', '');
  row.innerHTML = `<span class="settings-row__label">${icon('pencil', 13)} Sign in to edit</span>`;
  menu.appendChild(row);
  row.addEventListener('click', () => {
    menu.hidden = true;
    void enterWithSignIn();
  });
}

// ==== SESSAO ====

async function startSession(token) {
  try {
    layer.bar.classList.remove('is-hidden');
    document.documentElement.classList.add('ri-edit-bar');
    // Barra visivel mas com TODOS os botoes desligados ate a checagem de
    // permissao terminar — sem janela em que Save/Publish dispare 403.
    updateToolbar();
    barStatus('Checking your write permission…', 'busy');
    const permission = await githubCollaboratorPermission(token, session.user || (await githubUser(token).catch(() => ({ login: '' }))).login).catch(() => 'none');
    session.allowed = hasWriteAccess(permission);
    if (!session.allowed) {
      // Sem permissao de escrita: esconde a barra de editar e explica por que.
      notify('This account cannot edit the Wiki (write permission required).', true);
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
      document.documentElement.classList.remove('ri-edit-bar');
      layer.bar.classList.add('is-hidden');
      return;
    }
    barStatus('Loading repository content…', 'busy');
    const signedInUser = await githubUser(token);
    const info = await draft.initSession(token, signedInUser.login);
    if (info.sanitized) {
      notify(`${info.sanitized} invalid resource entr${info.sanitized === 1 ? 'y was' : 'ies were'} removed from your draft to keep editing working.`, true);
    }
    session.token = token;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
    const user = await githubUser(token).catch(() => ({ login: 'admin', name: 'admin', avatar: '' }));
    session.user = user.login;
    session.avatar = user.avatar || '';
    session.ready = true;
    setEditing(true);
    startSharedRefresh();
    const signinRow = qs('[data-ri-edit-signin]');
    if (signinRow) signinRow.hidden = true;
    installSidebarTools();
    if (info.draftLoaded) {
      draft.applyDraftToSite();
      await rerender({ scroll: 'preserve' });
      notify('A draft saved on GitHub was restored.');
    }
    updateToolbar();
  } catch (error) {
    notify(error.message || 'Failed to load the editing session.', true);
    barStatus('Failed to load editing session');
    // Nunca deixar uma barra inutil na tela: sem sessao pronta ela some.
    document.documentElement.classList.remove('ri-edit-bar');
    layer.bar.classList.add('is-hidden');
  }
}

async function enterWithSignIn() {
  try {
    const token = await githubSignIn();
    await startSession(token);
  } catch (error) {
    notify(error.message || 'Sign-in cancelled.', true);
  }
}

function toggleSession() {
  if (session.ready) setEditing(!session.editing);
  else void enterWithSignIn();
}

// ==== MODO DE EDICAO (preview/edit) ====

function setEditing(on) {
  session.editing = on;
  document.documentElement.classList.toggle('ri-edit-on', on);
  if (!on) {
    layer.chip.hidden = true;
    if (popState) closePopover(true);
  }
  updateToolbar();
  applyDragMode();
}

let sharedRefreshTimer;
let sharedRefreshChecking = false;
function startSharedRefresh() {
  clearInterval(sharedRefreshTimer);
  const check = async () => {
    if (!session.ready || session.busy || sharedRefreshChecking || document.hidden) return;
    sharedRefreshChecking = true;
    try {
      if (await draft.remoteChanged(session.token)) window.location.reload();
    } catch (error) {
      console.warn('[editor-sync]', error.message);
    } finally {
      sharedRefreshChecking = false;
    }
  };
  sharedRefreshTimer = setInterval(check, 15000);
  window.addEventListener('focus', check);
}

// ==== DESFAZER (Ctrl+Z / botão Undo) ====

async function doUndo() {
  if (!session.ready || !session.allowed) return;
  if (!draft.canUndo()) {
    notify('Nothing left to undo.', true);
    return;
  }
  if (popState) closePopover(true);
  try {
    const result = draft.undoLast();
    if (!result) {
      notify('Nothing left to undo.', true);
      return;
    }
    draft.applyDraftToSite();
    await rerender({ scroll: 'preserve' });
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    updateToolbar();
    notify(`Undone: ${result.message}.`);
  } catch (error) {
    updateToolbar();
    notify(error.message || 'The undo failed, but the draft is intact.', true);
  }
}

// ==== CHIPS DE HOVER ====

function showChip(binding) {
  if (!session.editing || !layer.chip) return;
  const rect = binding.el.getBoundingClientRect();
  layer.chip.hidden = false;
  layer.chip.textContent = binding.label || 'Edit';
  const top = Math.max(8, rect.top - 26);
  layer.chip.style.left = `${Math.min(rect.right - 8, window.innerWidth - 160)}px`;
  layer.chip.style.top = `${top}px`;
}

function hideChip() {
  if (layer.chip) layer.chip.hidden = true;
}

// ==== POPOVER ====

function openPopover(binding) {
  if (popState) closePopover(true);
  const fields = fieldsFor(binding.kind);
  popState = { ...binding, fields };
  const body = qs('[data-edit-pop-body]', layer.popover);
  const title = qs('[data-edit-pop-title]', layer.popover);
  title.textContent = binding.label || 'Edit content';
  const warn = qs('[data-edit-pop-warn]', layer.popover);
  warn.hidden = true;

  body.innerHTML = '';
  if (!fields) {
    const single = SINGLE_TYPES[binding.kind] || SINGLE_TYPES.text;
    body.appendChild(createField(
      { type: single.type, label: binding.label || 'Text' },
      binding.valuePath,
      binding.docName,
    ));
  } else {
    fields.forEach((meta) => body.appendChild(createField(meta, `${binding.valuePath}.${meta.key}`, binding.docName)));
  }
  const lastSegment = binding.valuePath.split('.').at(-1) || '';
  qs('[data-edit-pop-delete]', layer.popover).hidden = !/^\d+$/.test(lastSegment);
  layer.popover.hidden = false;
  // O popover edita o item (binding.el), mas pode ser ancorado em outro
  // elemento (ex.: o botao "+ New" que o abriu) para aparecer perto dele.
  positionPopover(binding.anchorEl?.isConnected ? binding.anchorEl : binding.el);
  body.querySelector('input, textarea, select')?.focus({ preventScroll: true });
}

async function deletePopoverItem() {
  if (!popState) return;
  const state = popState;
  const path = state.valuePath;
  const lastSegment = path.split('.').at(-1) || '';
  if (!/^\d+$/.test(lastSegment)) {
    notify('Only list items can be deleted.', true);
    return;
  }
  const okDelete = window.confirm(`Remove "${state.label || 'this item'}" from the list? It stays in the draft until you publish.`);
  if (!okDelete) return;
  try {
    draft.removeValue(state.docName, path);
    draft.applyDraftToSite();
    await rerender({ scroll: 'preserve' });
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    closePopover(true);
    updateToolbar();
    notify('Item removed. Remember to save/publish.');
  } catch (error) {
    notify(error.message || 'Could not remove this item.', true);
  }
}

function readValueForInput(type, original) {
  if (original == null) return '';
  const parser = LIST_PARSERS[type];
  if (parser) return parser.print(original);
  if (Array.isArray(original)) return original.join('\n');
  return String(original);
}

function createField(meta, path, docName) {
  if (meta.picker === 'icon') return createIconField(meta, path, docName);
  const original = draft.getValue(docName, path);
  const wrap = document.createElement('label');
  wrap.className = 'ri-edit-field';
  if (meta.label) {
    const label = document.createElement('span');
    label.className = 'ri-edit-field__label';
    label.textContent = meta.label;
    if (original === undefined) label.appendChild(Object.assign(document.createElement('small'), { textContent: ' (missing)' }));
    wrap.appendChild(label);
  }
  const numeric = typeof original === 'number';

  let input;
  if (meta.type === 'select') {
    input = document.createElement('select');
    input.className = 'input';
    (meta.options?.() || []).forEach((opt) => {
      const option = document.createElement('option');
      option.value = typeof opt === 'string' ? opt : opt.id;
      option.textContent = typeof opt === 'string' ? opt : (opt.label || opt.id);
      input.appendChild(option);
    });
    input.value = String(original ?? '');
    if (!input.value && input.options.length) input.selectedIndex = 0;
  } else if (meta.type === 'image') {
    wrap.innerHTML += `
      <div class="ri-edit-field__image">
        <img src="${esc(String(original || ''))}" alt="" onerror="this.hidden = true" />
        <div>
          <input class="input" value="${esc(String(original || ''))}" data-edit-pop-avatar-path readonly />
          <input type="file" accept="image/*" data-edit-pop-image data-edit-pop-doc="${esc(docName)}" data-edit-pop-path="${esc(path.replace(/\./g, '·'))}" aria-label="Upload image" />
          <small>Uploading creates a new image file in images/credits on GitHub.</small>
        </div>
      </div>`;
    return wrap;
  } else if (meta.type === 'area' || meta.type === 'area-list' || LIST_PARSERS[meta.type]) {
    input = document.createElement('textarea');
    input.className = 'input';
    input.rows = meta.type !== 'area' ? (readValueForInput(meta.type, original).split('\n').length + 2) : 4;
    input.value = readValueForInput(meta.type, original);
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.value = readValueForInput(meta.type, original);
    if (meta.mono) input.style.fontFamily = 'var(--font-mono, monospace)';
  }
  input.dataset.editFieldPath = path.replace(/\./g, '·');
  input.dataset.editFieldDoc = docName;
  input.dataset.editFieldType = meta.type;
  input.dataset.editFieldNumeric = numeric ? '1' : '0';
  wrap.appendChild(input);
  return wrap;
}

// Campo com o seletor visual de ícones: mostra o ícone atual e abre uma
// grade pesquisável (com preview) de todos os ícones lucide disponíveis.
function makeIconPicker(initialValue) {
  const row = document.createElement('div');
  row.className = 'ri-icon-row';

  const preview = document.createElement('span');
  preview.className = 'ri-icon-row__preview';
  preview.innerHTML = icon(initialValue || 'circle', 22);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.value = String(initialValue || '');
  input.placeholder = 'circle';

  const browse = document.createElement('button');
  browse.type = 'button';
  browse.className = 'btn btn--ghost btn--sm';
  browse.textContent = 'Browse';

  row.appendChild(preview);
  row.appendChild(input);
  row.appendChild(browse);

  const panel = document.createElement('div');
  panel.className = 'ri-icon-picker';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="ri-icon-picker__search">
      <input class="input" type="search" placeholder="Search icons (type a word)…" aria-label="Search icons" />
      <small>Click an icon to select it.</small>
    </div>
    <div class="ri-icon-picker__grid"></div>`;

  const grid = panel.querySelector('.ri-icon-picker__grid');
  const search = panel.querySelector('input');
  const renderGrid = () => {
    const query = search.value.trim().toLowerCase();
    const all = LUCIDE_ICON_NAMES;
    const names = (query ? all.filter((name) => name.includes(query)) : all).slice(0, 400);
    grid.innerHTML = names
      .map((name) => `<button type="button" class="ri-icon-cell${name === input.value ? ' is-on' : ''}" title="${esc(name)}" data-icon-name="${esc(name)}">${icon(name, 18)}<span>${esc(name)}</span></button>`)
      .join('');
  };

  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-icon-name]');
    if (!cell) return;
    input.value = cell.dataset.iconName;
    preview.innerHTML = icon(input.value || 'circle', 22);
    grid.querySelectorAll('.ri-icon-cell').forEach((el) => el.classList.toggle('is-on', el === cell));
  });

  input.addEventListener('input', () => {
    preview.innerHTML = icon(input.value.trim() || 'circle', 22);
  });
  browse.addEventListener('click', (event) => {
    event.preventDefault();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      search.value = '';
      renderGrid();
      search.focus({ preventScroll: true });
    }
  });
  search.addEventListener('input', renderGrid);

  return { row, panel, input, preview };
}

function createIconField(meta, path, docName) {
  const original = String(draft.getValue(docName, path) ?? '');
  const wrap = document.createElement('div');
  wrap.className = 'ri-edit-field';

  const label = document.createElement('span');
  label.className = 'ri-edit-field__label';
  label.textContent = `${meta.label} — click Browse and pick`;
  wrap.appendChild(label);

  const picker = makeIconPicker(original);
  picker.input.dataset.editFieldPath = path.replace(/\./g, '·');
  picker.input.dataset.editFieldDoc = docName;
  picker.input.dataset.editFieldType = 'line';
  picker.input.dataset.editFieldNumeric = '0';
  wrap.appendChild(picker.row);
  wrap.appendChild(picker.panel);
  return wrap;
}

function positionPopover(el) {
  if (!layer.popover || layer.popover.hidden || !el) return;
  const rect = el.getBoundingClientRect();
  const pop = layer.popover.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 8;
  if (left + pop.width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - pop.width - 12);
  if (top + pop.height > window.innerHeight - 12) top = Math.max(12, rect.top - pop.height - 8);
  layer.popover.style.left = `${Math.max(12, left)}px`;
  layer.popover.style.top = `${Math.max(56, top)}px`;
}

function closePopover(silent = false) {
  if (!popState) return;
  popState = null;
  layer.popover.hidden = true;
  layer.popover.querySelector('[data-edit-pop-body]').innerHTML = '';
  if (!silent) updateToolbar();
}

async function applyPopover() {
  if (!popState) return;
  if (popState.manage) {
    await applyManageAdd();
    return;
  }
  const state = popState;
  const applyButton = layer.popover.querySelector('[data-edit-pop-apply]');
  applyButton.disabled = true;
  try {
    const inputs = [...layer.popover.querySelectorAll('[data-edit-field-path]')];
    for (const input of inputs) {
      const path = input.dataset.editFieldPath.replaceAll('·', '.');
      const docName = input.dataset.editFieldDoc;
      const type = input.dataset.editFieldType;
      if (input.value === readValueForInput(type, draft.getValue(docName, path))) continue;
      const numeric = input.dataset.editFieldNumeric === '1';
      let value = input.value;
      if (LIST_PARSERS[type]) {
        value = LIST_PARSERS[type].parse(value);
      } else if (type === 'area-list') {
        value = value.split('\n').map((line) => line.trim()).filter(Boolean);
      } else if (numeric) {
        const parsed = Number(value.replace(',', '.'));
        value = Number.isFinite(parsed) ? parsed : value;
      }
      draft.setValue(docName, path, value);
    }
    try {
      draft.applyDraftToSite();
      await rerender({ scroll: 'preserve' });
      window.dispatchEvent(new CustomEvent('ri-edit-content'));
      closePopover(true);
      updateToolbar();
      notify('Content applied. Remember to save/publish.');
    } catch (error) {
      const warn = qs('[data-edit-pop-warn]', layer.popover);
      warn.textContent = error.message || 'The content is invalid, but it stays in your draft.';
      warn.hidden = false;
    }
  } finally {
    applyButton.disabled = false;
  }
}

async function onImagePicked(inputEl) {
  const docName = inputEl.dataset.editPopDoc;
  const path = inputEl.dataset.editPopPath.replaceAll('·', '.');
  const file = inputEl.files?.[0];
  if (!file) return;
  if (file.size > 2.5 * 1024 * 1024) {
    notify('Choose a smaller image (max ~2 MB).', true);
    return;
  }
  const nameValue = draft.getValue(docName, `${path.split('.').slice(0, -1).join('.')}.name`) || 'credit';
  const ext = (file.name.split('.').at(-1) || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const slug = String(nameValue).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'image';
  const remotePath = `images/credits/${slug}-${Date.now()}.${ext}`;
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < buffer.length; offset += 0x8000) {
      binary += String.fromCharCode(...buffer.subarray(offset, Math.min(offset + 0x8000, buffer.length)));
    }
    const content = btoa(binary);
    const result = await githubRequest(githubContentsUrl(remotePath), session.token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Upload ${remotePath} via inline editor`,
        content,
        branch: 'main',
      }),
    });
    if (!result?.content?.sha) throw new Error('The image upload did not succeed.');
    draft.setValue(docName, path, remotePath);
    const pathInput = layer.popover.querySelector('[data-edit-pop-avatar-path]');
    if (pathInput) pathInput.value = remotePath;
    notify('Image uploaded and added to the draft.');
    try {
      draft.applyDraftToSite();
      await rerender({ scroll: 'preserve' });
    } catch (error) {
      const warn = qs('[data-edit-pop-warn]', layer.popover);
      warn.textContent = error.message || 'The image was uploaded, but the content in the draft is invalid.';
      warn.hidden = false;
    }
  } catch (error) {
    notify(error.message || 'Image upload failed.', true);
  }
}

// ==== BARRA LATERAL DO EDITOR: adicionar páginas e reordenar com drag ====

let dragArmed = false;
let dragSource = null;
let dropTarget = null;
let sidebarDndBound = false;

function navEl() {
  return qs('#sidebar-nav');
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function applyDragMode() {
  const nav = navEl();
  if (!nav) return;
  qsa('.nav-item, [data-sub]', nav).forEach((el) => { el.draggable = dragArmed && session.editing; });
  const hint = nav.querySelector('.ri-nav-tools__hint');
  const dragBtn = nav.querySelector('[data-ri-nav-tool="drag"]');
  if (hint) hint.hidden = !dragArmed;
  if (dragBtn) {
    dragBtn.classList.toggle('is-on', dragArmed);
    dragBtn.setAttribute('aria-pressed', String(dragArmed));
  }
}

function installSidebarTools() {
  const nav = navEl();
  if (!nav || !session.ready || !session.allowed) return;
  let box = nav.querySelector('[data-ri-nav-tools]');
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-ri-nav-tools', '');
    box.innerHTML = `
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="add">${icon('plus', 14)} Add pages</button>
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="drag" aria-pressed="false">${icon('folder-tree', 14)} Reorder / nest</button>
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="colors">${icon('palette', 14)} Colors</button>
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="versions">${icon('history', 14)} Versions</button>
      <small class="ri-nav-tools__hint" hidden>Drag a page between two items to reposition it — or drop it in the middle of a category/page header to nest it inside. Only in Edit mode.</small>`;
    nav.appendChild(box);
    box.querySelector('[data-ri-nav-tool="add"]').addEventListener('click', (event) => openManageAdd(event.currentTarget));
    box.querySelector('[data-ri-nav-tool="colors"]').addEventListener('click', () => openAdminPage('colors'));
    box.querySelector('[data-ri-nav-tool="versions"]').addEventListener('click', () => openAdminPage('versions'));
    box.querySelector('[data-ri-nav-tool="drag"]').addEventListener('click', () => {
      dragArmed = !dragArmed;
      if (dragArmed && !session.editing) setEditing(true);
      if (!dragArmed) {
        clearDndMarks();
        dragSource = null;
      }
      applyDragMode();
    });
    bindSidebarDnd(nav);
  }
  applyDragMode();
}

// ==== PAGINAS DO EDITOR: Colors e Versions ====
// Paginas de verdade (mesma casca do site, sem texto de descricao), com rotas
// proprias (#/colors e #/versions) registradas ANTES das categorias genericas.

let adminColorsQuery = '';
const COLORS_ROW_CAP = 80;

// As paginas so existem para editores logados: qualquer outro visitante que
// digite a rota na mao ve apenas um aviso.
function editorPageShell(root, icon_, heading, bodyHtml) {
  if (!session.ready || !session.allowed) {
    root.innerHTML = `
      <section class="section ri-admin-section">
        <h2 class="ri-admin-section__title">${icon(icon_, 15)} ${esc(heading)}</h2>
        <p class="ri-color-row__empty">This page is part of the inline Edit mode. Log in as an editor and enable Edit mode to use it.</p>
      </section>`;
    return false;
  }
  return true;
}

const colorsView = {
  title: () => 'Colors — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Colors', icon: 'palette' }],
  nav: () => null,
  render(root) {
    if (!editorPageShell(root, 'palette', 'Resource colors & links')) return;
    if (popState) closePopover(true);
    if (!session.editing) setEditing(true);
    renderColorsPage(root);
  },
};

const versionsView = {
  title: () => 'Versions — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Versions', icon: 'history' }],
  nav: () => null,
  render(root) {
    if (!editorPageShell(root, 'history', 'Versions & Update History')) return;
    if (popState) closePopover(true);
    if (!session.editing) setEditing(true);
    renderVersionsPage(root);
  },
};

registerRoute(/^colors$/, colorsView);
registerRoute(/^versions$/, versionsView);

function formatHistoryDate(at) {
  const date = new Date(at || 0);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderHistoryList(container, entries, filterKind) {
  const shown = entries
    .filter((entry) => entry.text && (!filterKind || entry.kind === filterKind))
    .slice(0, 60);
  if (!shown.length) {
    container.innerHTML = '<p class="ri-color-row__empty">Nothing logged yet. Every edit (created/renamed/removed/moved, colors and links) is logged automatically.</p>';
    return;
  }
  container.innerHTML = shown.map((entry) => `
    <div class="ri-history-row">
      <span class="ri-history-row__date">${esc(formatHistoryDate(entry.at))}</span>
      <span class="ri-history-row__kind ri-history-row__kind--${entry.kind === 'colors' ? 'colors' : 'content'}">${entry.kind === 'colors' ? 'Colors' : 'Content'}</span>
      <span class="ri-history-row__text">${esc(entry.text)}</span>
      <span class="ri-history-row__actor">${entry.actor ? `@${esc(entry.actor)}` : 'Legacy edit'}</span>
      ${entry.pending ? '<span class="ri-history-row__pending">pending</span>' : ''}
    </div>`).join('');
}

function openAdminPage(kind) {
  if (!session.ready || !session.allowed) return;
  window.location.hash = kind === 'colors' ? '#/colors' : '#/versions';
}

function renderVersionsPage(root) {
  root.innerHTML = `
    <section class="section ri-admin-section">
      <div class="ri-versions-actions">
        <button type="button" class="btn btn--ghost btn--sm" data-ri-versions-save>${icon('save', 13)} Save version now</button>
      </div>
      <div data-ri-versions-list><p class="ri-color-row__empty">Loading versions…</p></div>
    </section>
    <section class="section ri-admin-section">
      <h2 class="ri-admin-section__title">${icon('history', 15)} Update History</h2>
      <div data-ri-history><p class="ri-color-row__empty">Loading…</p></div>
    </section>`;

  const restoreFlow = async (name) => {
    if (!window.confirm(`Restore "${draft.versionLabel(name)}"? This replaces the live Wiki and your current draft edits. A safety version of the current content is saved first.`)) return;
    try {
      await draft.restoreVersion(session.token, name);
      updateToolbar();
      await rerender({ scroll: 'preserve' });
      notify(`Version restored: ${draft.versionLabel(name)}`);
    } catch (error) {
      notify(error.message || 'Restore failed.', true);
    }
  };

  qs('[data-ri-versions-save]', root).addEventListener('click', async () => {
    try {
      await draft.createVersion(session.token, draft.snapshotDocs() || undefined, 'Manual version');
      notify('Version saved.');
      renderVersionsPage(root);
    } catch (error) {
      notify(error.message || 'Could not save the version.', true);
    }
  });

  void (async () => {
    const list = qs('[data-ri-versions-list]', root);
    const historyBox = qs('[data-ri-history]', root);
    try {
      const [versions, history] = await Promise.all([
        draft.listVersions(session.token),
        draft.listEditHistory(session.token).catch(() => []),
      ]);
      if (!root.isConnected) return;
      if (!versions.length) {
        list.innerHTML = '<p class="ri-color-row__empty">No versions yet. Publish an edit or click "Save version now".</p>';
      } else {
        list.innerHTML = versions.map((v) => `
          <div class="ri-version-row">
            <span class="ri-version-row__name" title="${esc(v.name)}">${esc(draft.versionLabel(v.name))}</span>
            <button type="button" class="btn btn--ghost btn--sm" data-ri-version-restore="${esc(v.name)}">${icon('rotate-ccw', 12)} Restore</button>
          </div>`).join('');
        list.querySelectorAll('[data-ri-version-restore]').forEach((btn) => {
          btn.addEventListener('click', () => restoreFlow(btn.getAttribute('data-ri-version-restore')));
        });
      }
      renderHistoryList(historyBox, history);
    } catch (error) {
      list.innerHTML = `<p class="ri-color-row__empty">${esc(error.message || 'Failed to list versions.')}</p>`;
    }
  })();
}

// ==== GERENCIADOR DE CORES DOS RECURSOS ====
// Cada recurso tem uma cor (resources.colors.<nome>) e um link opcional
// (resources.pageLinks.<nome>) que transforma o nome em atalho para a pagina.

const RESERVED_KEYS = ['__proto__', 'constructor', 'prototype'];

function hexTo6(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  else if (h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  else if (h.length === 8) h = h.slice(0, 6);
  return `#${h.toLowerCase()}`;
}

// O link salvo pode ter caixa diferente do nome da cor (ex.: "silver sap"
// vs "Silver Sap") — o site resolve lowercase, entao aqui tambem.
function pageLinksEntry(name) {
  const links = locate(draft.doc('game'), 'resources.pageLinks') || {};
  const wanted = String(name).toLowerCase();
  const exact = Object.prototype.hasOwnProperty.call(links, name) ? name : null;
  if (exact) return { key: exact, value: links[exact] };
  const found = Object.keys(links).find((k) => k.toLowerCase() === wanted);
  return found ? { key: found, value: links[found] } : null;
}

// Lista completa de destinos: categorias, paginas e paginas filhas em
// QUALQUER nivel (ex.: #/life/rare-saps fica dentro de Tree > Sap).
function collectPageRoutes() {
  const routes = [];
  for (const cat of CATEGORIES) {
    const base = `#/${cat.id}`;
    routes.push({ route: base, label: `${cat.name} (category)`, search: `${cat.name}`.toLowerCase() });
    const walk = (items, prefix) => {
      for (const item of items || []) {
        const label = `${prefix}${item.name}`;
        routes.push({ route: `${base}/${item.id}`, label, search: `${cat.name} ${prefix} ${item.name} ${item.id}`.toLowerCase() });
        walk(item.children, `${label} › `);
      }
    };
    walk(cat.subcategories, '');
  }
  return routes;
}

function routeLabel(route, routes = collectPageRoutes()) {
  if (!route) return '';
  return routes.find((item) => item.route === route)?.label || '';
}

// Campo de link pesquisavel: digite para filtrar paginas, clique para
// escolher. Mostra o NOME da pagina (nao a rota crua) quando escolhido.
function makeLinkPicker({ value, routes, onPick }) {
  const routeList = routes || collectPageRoutes();
  const wrap = document.createElement('div');
  wrap.className = 'ri-linkpick';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input ri-linkpick__input';
  input.autocomplete = 'off';
  input.value = value ? (routeLabel(value, routeList) || value) : '';
  input.placeholder = 'No page link — click to search pages…';
  input.setAttribute('aria-label', 'Page link');
  const list = document.createElement('div');
  list.className = 'ri-linkpick__list';
  list.hidden = true;
  wrap.appendChild(input);
  wrap.appendChild(list);

  let rows = [];
  const open = (query) => {
    const wanted = query.trim().toLowerCase();
    const matches = routeList.filter((item) => !wanted || item.search.includes(wanted) || item.route.toLowerCase().includes(wanted));
    rows = [
      { route: '', label: 'No page link', search: '' },
      ...matches.slice(0, 60),
    ];
    list.innerHTML = rows.map((item) => `
      <button type="button" class="ri-linkpick__row${item.route === value ? ' is-current' : ''}" data-route="${esc(item.route)}">
        <b>${esc(item.label)}</b>${item.route ? `<small>${esc(item.route)}</small>` : ''}
      </button>`).join('');
    list.hidden = false;
  };
  const pick = (route) => {
    value = route;
    input.value = route ? (routeLabel(route, routeList) || route) : '';
    list.hidden = true;
    onPick(route);
  };
  input.addEventListener('focus', () => open(''));
  input.addEventListener('input', () => open(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = list.querySelector('[data-route]');
      if (first) pick(first.getAttribute('data-route'));
    }
    if (event.key === 'Escape') { list.hidden = true; input.blur(); }
  });
  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-route]');
    if (row) pick(row.getAttribute('data-route'));
  });
  wrap.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget)) list.hidden = true;
  });
  return wrap;
}

// Cache das rotas por abertura da pagina (evita reconstruir a lista de
// paginas a cada linha/campo de link).
let pageRoutesCache = null;

function cachedPageRoutes() {
  if (!pageRoutesCache) pageRoutesCache = collectPageRoutes();
  return pageRoutesCache;
}

function renderColorsRows(list) {
  if (!list) return;
  list.innerHTML = '';
  const query = adminColorsQuery.trim().toLowerCase();
  const allNames = Object.keys(locate(draft.doc('game'), 'resources.colors') || {})
    .filter((n) => !query || n.toLowerCase().includes(query))
    .sort((a, b) => a.localeCompare(b));
  const names = allNames.slice(0, COLORS_ROW_CAP);
  if (!allNames.length) {
    const empty = document.createElement('p');
    empty.className = 'ri-color-row__empty';
    empty.textContent = query
      ? `No resources match "${query}".`
      : 'No colored resources yet. Add one above.';
    list.appendChild(empty);
  } else if (allNames.length > names.length) {
    const more = document.createElement('p');
    more.className = 'ri-color-row__empty';
    more.textContent = `Showing ${names.length} of ${allNames.length} — refine the search to see the rest.`;
    list.appendChild(more);
  }
  for (const name of names) {
    const color = hexTo6(locate(draft.doc('game'), `resources.colors.${name}`) || '#ffffff');
    const link = pageLinksEntry(name)?.value || '';
    const row = document.createElement('div');
    row.className = 'ri-color-row';
    const main = document.createElement('div');
    main.className = 'ri-color-row__main';
    main.innerHTML = `
      <b style="color:${esc(color)}">${esc(name)}</b>`;
    main.appendChild(makeLinkPicker({
      value: link,
      routes: cachedPageRoutes(),
      onPick: (route) => applyResourceChange(name, { link: route }, { rerender: false }),
    }));
    row.innerHTML = `
      <input type="color" class="ri-color-row__swatch" value="${esc(color)}" data-ri-color-swatch aria-label="${esc(name)} color">`;
    row.appendChild(main);
    row.insertAdjacentHTML('beforeend', `
      <button type="button" class="ri-color-row__remove" data-ri-color-remove title="Remove this resource">${icon('trash-2', 13)}</button>`);
    row.querySelector('[data-ri-color-swatch]').addEventListener('change', (event) => {
      applyResourceChange(name, { color: event.target.value }, { rerender: false });
      row.querySelector('b').style.color = event.target.value;
    });
    row.querySelector('[data-ri-color-remove]').addEventListener('click', () => {
      if (!window.confirm(`Remove "${name}" from the colored resources?`)) return;
      applyResourceChange(name, { color: undefined, link: undefined }, { rerender: false });
      renderColorsRows(list);
    });
    list.appendChild(row);
  }
}

function renderColorsPage(root) {
  const count = Object.keys(locate(draft.doc('game'), 'resources.colors') || {}).length;
  pageRoutesCache = null;
  adminColorsQuery = '';
  root.innerHTML = `
    <section class="section ri-admin-section">
      <div class="ri-color-add ri-color-add--top">
        <input type="text" class="input" data-ri-color-name placeholder="Add a resource (ex.: Bone Dust)" aria-label="New resource name">
        <input type="color" class="ri-color-row__swatch" data-ri-color-new-color value="#86d62b" aria-label="New resource color">
        <button type="button" class="btn btn--ghost btn--sm" data-ri-color-add>${icon('plus', 13)} Add</button>
      </div>
      <div class="ri-admin-toolbar">
        <input type="search" class="input ri-color-search" data-ri-color-search placeholder="Search resources (${count})..." aria-label="Search colored resources">
      </div>
      <div data-ri-color-list></div>
    </section>
    <section class="section ri-admin-section">
      <h2 class="ri-admin-section__title">${icon('palette', 15)} Recent color changes</h2>
      <div data-ri-color-history><p class="ri-color-row__empty">Loading…</p></div>
    </section>`;

  const searchInput = root.querySelector('[data-ri-color-search]');
  let searchTimer = 0;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      adminColorsQuery = searchInput.value;
      renderColorsRows(root.querySelector('[data-ri-color-list]'));
    }, 120);
  });

  const fail = (msg) => notify(msg, true);
  const addResource = () => {
    const nameIn = root.querySelector('[data-ri-color-name]');
    const colorIn = root.querySelector('[data-ri-color-new-color]');
    const name = (nameIn?.value || '').trim();
    if (name.length < 2) return fail('Give the resource a name (2+ letters).');
    if (name.includes('.')) return fail('The resource name cannot contain dots.');
    if (RESERVED_KEYS.includes(name)) return fail('That name is not allowed.');
    const colorsNow = locate(draft.doc('game'), 'resources.colors') || {};
    if (Object.keys(colorsNow).some((k) => k.toLowerCase() === name.toLowerCase())) {
      return fail(`"${name}" is already listed.`);
    }
    draft.setValue('game', `resources.colors.${name}`, colorIn?.value || '#86d62b');
    draft.applyDraftToSite();
    updateToolbar();
    nameIn.value = '';
    pageRoutesCache = null;
    renderColorsRows(root.querySelector('[data-ri-color-list]'));
  };

  root.querySelector('[data-ri-color-add]').addEventListener('click', addResource);
  root.querySelector('[data-ri-color-name]').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); addResource(); }
  });

  renderColorsRows(root.querySelector('[data-ri-color-list]'));
  void draft.listEditHistory(session.token)
    .then((entries) => renderHistoryList(root.querySelector('[data-ri-color-history]'), entries, 'colors'))
    .catch(() => {
      const box = root.querySelector('[data-ri-color-history]');
      if (box) box.innerHTML = '<p class="ri-color-row__empty">History could not be loaded (it still saves on GitHub with your next publish).</p>';
    });
}

// Aplica a mudanca de um recurso (cor e/ou link) e reflete na hora.
// undefined remove a chave do rascunho (o undo guarda o valor anterior).
// Se o link vivia sob chave com outra caixa ("silver sap"), ele migra para
// a chave do nome da cor e a antiga e removida (tudo undoable, LIFO).
// Rotas invalidas sao recusadas ANTES de gravar: uma entrada ruim nao pode
// derrubar o applyDraftToSite inteiro.
const LINK_ROUTE_RE = /^#\/[\w-]+(?:\/[\w-]+)*$/;

function applyResourceChange(name, { color, link } = {}, { rerenderPage = true } = {}) {
  if (color !== undefined) draft.setValue('game', `resources.colors.${name}`, color);
  if (link !== undefined) {
    if (link && !LINK_ROUTE_RE.test(link)) {
      notify(`"${link}" is not a valid page route — the link was not saved.`, true);
      return;
    }
    const legacy = pageLinksEntry(name);
    if (legacy && legacy.key !== name) draft.setValue('game', `resources.pageLinks.${legacy.key}`, undefined);
    draft.setValue('game', `resources.pageLinks.${name}`, link || undefined);
  }
  if (color === undefined && link === undefined) {
    const legacy = pageLinksEntry(name);
    draft.setValue('game', `resources.colors.${name}`, undefined);
    if (legacy) draft.setValue('game', `resources.pageLinks.${legacy.key}`, undefined);
    if (!legacy || legacy.key !== name) draft.setValue('game', `resources.pageLinks.${name}`, undefined);
  }
  draft.applyDraftToSite();
  if (rerenderPage) void rerender({ scroll: 'preserve' });
  updateToolbar();
}

// Popover de criação: nova categoria ou nova página dentro de uma categoria.
function openManageAdd(anchor = null) {
  if (!session.ready || !session.allowed) return;
  if (popState) closePopover(true);
  if (!session.editing) setEditing(true);
  popState = { manage: true, label: 'Add pages' };
  const body = qs('[data-edit-pop-body]', layer.popover);
  const title = qs('[data-edit-pop-title]', layer.popover);
  const warn = qs('[data-edit-pop-warn]', layer.popover);
  title.textContent = 'Add pages';
  warn.hidden = true;
  body.innerHTML = '';

  const field = (label) => {
    const wrap = document.createElement('label');
    wrap.className = 'ri-edit-field';
    const span = document.createElement('span');
    span.className = 'ri-edit-field__label';
    span.textContent = label;
    wrap.appendChild(span);
    body.appendChild(wrap);
    return wrap;
  };

  const kindWrap = field('What are you adding?');
  const kindSel = document.createElement('select');
  kindSel.className = 'input';
  kindSel.setAttribute('data-ri-manage-kind', '');
  kindSel.innerHTML = '<option value="sub">Page inside a category</option><option value="cat">Top-level category</option>';
  kindWrap.appendChild(kindSel);

  const typeWrap = field('Page type (what content lives here)');
  const typeSel = document.createElement('select');
  typeSel.className = 'input';
  typeSel.setAttribute('data-ri-manage-type', '');
  typeSel.innerHTML = [
    ['generic', 'Generic page (text, facts, highlights)'],
    ['stages', 'Stages page (like Main › Stages)'],
    ['barns', 'Barns page'],
    ['ranks', 'Ranks page'],
    ['ascensions', 'Ascensions page'],
    ['lifeRanks', 'Life ranks page'],
    ['cores', 'Core ranks page'],
    ['upgrades', 'Upgrades page (price/effect formulas)'],
    ['calc-amount', 'Bonus calculator (single total)'],
    ['calc-groups', 'Grouped bonus calculator (like Rare Saps)'],
    ['calc-level', 'Level calculator (like Dungeon Level)'],
    ['calc-gears', 'Gears calculator (tiers)'],
    ['calc-dust', 'Bone Dust calculator'],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  typeWrap.appendChild(typeSel);

  const parentWrap = field('Parent category');
  const parentSel = document.createElement('select');
  parentSel.className = 'input';
  parentSel.setAttribute('data-ri-manage-parent', '');
  CATEGORIES.forEach((c) => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    parentSel.appendChild(option);
  });
  parentWrap.appendChild(parentSel);

  const nameWrap = field('Name');
  const nameIn = document.createElement('input');
  nameIn.type = 'text';
  nameIn.className = 'input';
  nameIn.setAttribute('data-ri-manage-name', '');
  nameIn.placeholder = 'Ex.: Mining';
  nameWrap.appendChild(nameIn);

  const idWrap = field('URL id (auto from the name)');
  const idIn = document.createElement('input');
  idIn.type = 'text';
  idIn.className = 'input';
  idIn.setAttribute('data-ri-manage-id', '');
  idIn.placeholder = 'mining';
  idWrap.appendChild(idIn);
  let idTouched = false;
  nameIn.addEventListener('input', () => { if (!idTouched) idIn.value = slugify(nameIn.value); });
  idIn.addEventListener('input', () => { idTouched = true; });

  const tagWrap = field('Tagline (category)');
  const tagIn = document.createElement('textarea');
  tagIn.className = 'input';
  tagIn.rows = 2;
  tagWrap.appendChild(tagIn);

  const descWrap = field('Short description (page)');
  const descIn = document.createElement('textarea');
  descIn.className = 'input';
  descIn.rows = 3;
  descWrap.appendChild(descIn);

  const iconWrap = field('Icon');
  const picker = makeIconPicker('sprout');
  iconWrap.appendChild(picker.row);
  iconWrap.appendChild(picker.panel);

  kindSel.addEventListener('change', () => {
    const isCat = kindSel.value === 'cat';
    parentWrap.hidden = isCat;
    typeWrap.hidden = isCat;
    tagWrap.hidden = !isCat;
    descWrap.hidden = isCat;
    picker.input.value = isCat ? 'sprout' : 'sparkles';
    picker.preview.innerHTML = icon(picker.input.value, 22);
  });
  kindSel.dispatchEvent(new Event('change'));

  const deleteBtn = qs('[data-edit-pop-delete]', layer.popover);
  if (deleteBtn) deleteBtn.hidden = true;

  layer.popover.hidden = false;
  positionPopover(anchor?.isConnected ? anchor : navEl()?.querySelector('[data-ri-nav-tools]'));
  body.scrollTop = 0;
  nameIn.focus({ preventScroll: true });
}

async function applyManageAdd() {
  const body = qs('[data-edit-pop-body]', layer.popover);
  const kind = body.querySelector('[data-ri-manage-kind]')?.value || 'sub';
  const parentId = body.querySelector('[data-ri-manage-parent]')?.value || CATEGORIES[0]?.id;
  const pageName = (body.querySelector('[data-ri-manage-name]')?.value || '').trim();
  const pageId = slugify(body.querySelector('[data-ri-manage-id]')?.value || pageName);
  const iconName = (body.querySelector('.ri-icon-row input')?.value || '').trim() || (kind === 'cat' ? 'sprout' : 'sparkles');
  const areas = [...body.querySelectorAll('textarea.input')];
  const warn = qs('[data-edit-pop-warn]', layer.popover);
  warn.hidden = true;

  if (!pageName || !pageId) {
    warn.textContent = 'Give the page a name (and a URL id made of letters/numbers/dashes).';
    warn.hidden = false;
    return;
  }

  try {
    let trail;
    let value;
    if (kind === 'cat') {
      trail = 'categories';
      value = buildAddValue('wiki', trail, 'category');
      value.id = pageId;
      value.name = pageName;
      value.icon = iconName;
      value.tagline = areas[0]?.value?.trim() || 'What this category is about.';
      if (areas[1]?.value?.trim()) value.desc = areas[1].value.trim();
    } else {
      const ci = CATEGORIES.findIndex((c) => c.id === parentId);
      if (ci === -1) throw new Error('Pick a parent category.');
      trail = `categories.${ci}.subcategories`;
      value = buildAddValue('wiki', trail, 'sub-card');
      value.id = pageId;
      value.name = pageName;
      value.icon = iconName;
      if (areas[0]?.value?.trim()) value.desc = areas[0].value.trim();
    }
    draft.pushValue('wiki', trail, value);
    // Conteudo do jogo: e o que da TIPO a pagina (Stages, Barns, Ranks,
    // calculadora de bonus, upgrades...). Sem isso a pagina nova nasce
    // generica mesmo escolhendo um tipo.
    let typedNote = '';
    if (kind !== 'cat') {
      const pageType = body.querySelector('[data-ri-manage-type]')?.value || 'generic';
      const result = createGamePageContainer(`${parentId}/${pageId}`, pageName, pageType);
      if (result === 'created') {
        typedNote = ` It renders as ${PAGE_TYPE_LABELS[pageType]} — edit the items in place.`;
      } else if (result === 'exists') {
        notify(`Game data for ${parentId}/${pageId} already existed — the page opened with the existing content.`, true);
      }
    }
    draft.applyDraftToSite();
    buildNav();
    applyDragMode();
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    closePopover(true);
    updateToolbar();
    window.location.hash = kind === 'cat' ? `#/${pageId}` : `#/${parentId}/${pageId}`;
    notify(`Page added to the draft.${typedNote} Edit it in place and remember to save.`);
  } catch (error) {
    warn.textContent = error.message || 'Could not create the page.';
    warn.hidden = false;
  }
}

// Conteudo do jogo que da tipo a uma pagina nova. Chaves sao "catId/pageId"
// (path do draft so divide em ".", entao "/" na chave e seguro).
const STAGE_TEMPLATE = () => ({
  num: '1',
  requirements: ['1M Energy'],
  boosts: ['2x Energy'],
  unlocks: { area: '', places: [], features: [] },
});
const BONUS_TEMPLATE = (value = 'formula: amount') => ({ id: 'b1', name: 'New bonus', value });

const PAGE_TYPE_LABELS = {
  stages: 'a Stages list',
  barns: 'a Barns list',
  ranks: 'a Ranks list',
  ascensions: 'an Ascensions list',
  lifeRanks: 'a Life Ranks list',
  cores: 'a Core Ranks list',
  upgrades: 'an Upgrades (formulas) page',
  'calc-amount': 'a bonus calculator',
  'calc-groups': 'a grouped bonus calculator',
  'calc-level': 'a level calculator',
  'calc-gears': 'a gears calculator',
  'calc-dust': 'a Bone Dust calculator',
};

function createGamePageContainer(gameKey, pageName, type) {
  if (!type || type === 'generic' || !PAGE_TYPE_LABELS[type]) return 'skipped';
  const existing = (path) => locate(draft.doc('game'), path);
  const progressionBuckets = { stages: 'stages', barns: 'barns', ranks: 'ranks', ascensions: 'ascensions', lifeRanks: 'lifeRanks', cores: 'cores' };
  const bucket = progressionBuckets[type];
  if (bucket) {
    const path = `progression.${bucket}.${gameKey}`;
    if (existing(path)) return 'exists';
    const listKey = bucket === 'stages' || bucket === 'barns' ? 'stages' : 'ranks';
    draft.setValue('game', path, { [listKey]: [STAGE_TEMPLATE()] });
    return 'created';
  }
  if (type === 'upgrades') {
    const sectionKey = gameKey.replace(/\//g, '-');
    if (existing(`upgrades.sections.${sectionKey}`)) return 'exists';
    draft.setValue('game', `upgrades.sections.${sectionKey}`, {
      name: pageName,
      upgrades: [{ n: 1, name: 'New upgrade', cap: null, price: '3*L', multi: '1' }],
    });
    draft.setValue('game', `upgrades.routes.${gameKey}`, sectionKey);
    return 'created';
  }
  const calcPath = `calculators.pages.${gameKey}`;
  if (existing(calcPath)) return 'exists';
  if (type === 'calc-amount') {
    draft.setValue('game', calcPath, {
      kind: 'amount', title: pageName, amountLabel: `Total ${pageName} owned`, bonuses: [BONUS_TEMPLATE()],
    });
  } else if (type === 'calc-groups') {
    draft.setValue('game', calcPath, {
      kind: 'amount-groups', title: pageName,
      groups: [{ id: 'g1', name: 'Group 1', color: '#86d62b', dropChance: '1 in 100', amountLabel: 'Amount owned', bonuses: [BONUS_TEMPLATE()] }],
    });
  } else if (type === 'calc-level') {
    draft.setValue('game', calcPath, {
      kind: 'level', title: pageName, maxLevel: 1000,
      xpToNextLevel: 'formula: Math.floor(10 * Math.pow(level, 1.5))',
      bonuses: [BONUS_TEMPLATE('formula: level')],
    });
  } else if (type === 'calc-gears') {
    draft.setValue('game', calcPath, {
      kind: 'gears', title: pageName,
      tiers: [{ id: 't1', name: 'New tier', bonuses: [BONUS_TEMPLATE('formula: G')] }],
    });
  } else if (type === 'calc-dust') {
    draft.setValue('game', calcPath, {
      kind: 'bone-dust', title: pageName, powerLevelMax: 6,
      powerFromLevel: 'formula: 1 + level / 10',
      bonuses: [BONUS_TEMPLATE('formula: Math.max(1, dust * p)')],
    });
  }
  return 'created';
}

// ==== DRAG PARA REORDENAR / NESTAR PÁGINAS ====

function slotFor(kind, catId, subId) {
  if (kind === 'cat') {
    const ci = CATEGORIES.findIndex((c) => c.id === catId);
    return ci === -1 ? null : { parentPath: 'categories', index: ci };
  }
  const path = getSubcategoryDocPath(catId, subId);
  if (!path) return null;
  const segments = path.split('.');
  return { parentPath: segments.slice(0, -1).join('.'), index: Number(segments.at(-1)) };
}

function clearDndMarks() {
  qsa('.ri-drop-on, .ri-drop-before, .ri-drop-after, .ri-drag-src', document)
    .forEach((el) => el.classList.remove('ri-drop-on', 'ri-drop-before', 'ri-drop-after', 'ri-drag-src'));
  dropTarget = null;
}

// Zona do cursor sobre o alvo: antes/depois (reordenar) ou dentro (nestar).
function dropBand(el, clientY) {
  const rect = el.getBoundingClientRect();
  const y = (clientY - rect.top) / Math.max(rect.height, 1);
  if (y < 0.32) return 'before';
  if (y > 0.68) return 'after';
  return 'inside';
}

function markDrop(el, band) {
  qsa('.ri-drop-on, .ri-drop-before, .ri-drop-after', navEl()).forEach((x) => {
    x.classList.remove('ri-drop-on', 'ri-drop-before', 'ri-drop-after');
  });
  if (!el) return;
  if (band === 'inside') el.classList.add('ri-drop-on');
  else if (band === 'before') el.classList.add('ri-drop-before');
  else if (band === 'after') el.classList.add('ri-drop-after');
}

function bindSidebarDnd(nav) {
  if (sidebarDndBound || !nav) return;
  sidebarDndBound = true;

  nav.addEventListener('dragstart', (event) => {
    if (!dragArmed || !session.editing) return;
    const item = event.target.closest('.nav-item[data-cat], [data-sub]');
    if (!item) return;
    event.stopPropagation();
    const catGroup = item.closest('.nav-group');
    const catId = catGroup?.dataset.cat;
    if (!catId) return;
    dragSource = item.classList.contains('nav-item')
      ? { kind: 'cat', catId }
      : { kind: 'sub', catId, subId: item.dataset.sub };
    item.classList.add('ri-drag-src');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${catId}${dragSource.subId ? `/${dragSource.subId}` : ''}`);
  });

  nav.addEventListener('dragend', () => {
    clearDndMarks();
    dragSource = null;
  });

  nav.addEventListener('dragover', (event) => {
    if (!dragArmed || !dragSource || !session.editing) return;
    const subItem = event.target.closest('[data-sub]');
    const catItem = subItem ? null : event.target.closest('.nav-item[data-cat]');
    const labelItem = !subItem && !catItem ? event.target.closest('.sidebar__label') : null;
    if (!subItem && !catItem && !labelItem) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    let info = null;
    let el = null;
    if (subItem) {
      // Ponta = reordenar (antes/depois); meio = virar filho daquela pagina.
      info = {
        type: 'sub',
        catId: subItem.closest('.nav-group')?.dataset.cat,
        subId: subItem.dataset.sub,
        pos: dropBand(subItem, event.clientY),
      };
      el = subItem;
    } else if (catItem) {
      // Ponta = reordenar a categoria; meio = nestar dentro dela.
      const band = dropBand(catItem, event.clientY);
      info = { type: 'cat', catId: catItem.dataset.cat, pos: band === 'inside' ? 'inside' : band };
      el = catItem;
    } else {
      info = { type: 'top' };
      el = labelItem;
    }
    dropTarget = { info, src: dragSource, el };
    markDrop(el, info.type === 'top' ? 'inside' : info.pos);
  });

  nav.addEventListener('drop', (event) => {
    if (!dragArmed || !session.editing) return;
    if (!dropTarget) return;
    event.preventDefault();
    const { info, src } = dropTarget;
    clearDndMarks();
    dragSource = null;
    if (!info || !src) return;
    void runHierarchyDrop(src, info);
  });
}

// Converte uma categoria em pagina (children) para poder nasar dentro de
// outra categoria ou pagina. Feita como um setValue proprio no historico:
// o undo restaura o formato original.
function planCategoryToPage(srcIndex, toPath, toIndex, dstCatId) {
  const cat = locate(draft.doc('wiki'), `categories.${srcIndex}`);
  if (!cat) throw new Error('The category vanished from the list. Try again.');
  const converted = {
    id: cat.id,
    name: cat.name,
    icon: cat.icon || 'sparkles',
    desc: cat.desc || cat.tagline || 'Describe this page here.',
    tagline: cat.tagline || '',
    children: Array.isArray(cat.subcategories) ? cat.subcategories : [],
    highlights: Array.isArray(cat.overview?.highlights) ? cat.overview.highlights : [],
    facts: Array.isArray(cat.overview?.facts) ? cat.overview.facts : [],
    vitals: Array.isArray(cat.vitals) ? cat.vitals : [],
  };
  return {
    converts: [{ path: `categories.${srcIndex}`, value: converted }],
    move: { fromPath: 'categories', fromIndex: srcIndex, toPath, toIndex },
    dstCatId,
  };
}

// Garante que a lista de destino existe (paginas novas ainda nao tem children).
function ensureChildrenList(childrenPath) {
  if (!Array.isArray(locate(draft.doc('wiki'), childrenPath))) {
    draft.setValue('wiki', childrenPath, []);
  }
}

async function runHierarchyDrop(src, target) {
  const srcSlot = slotFor(src.kind, src.catId, src.subId);
  if (!srcSlot) { notify('The page to move vanished from the list. Try again.', true); return; }

  let plan = null;
  let dstCatId = src.catId;
  if (target.type === 'top') {
    if (src.kind !== 'cat') { notify('Only categories can sit at the top level.', true); return; }
    plan = { move: { fromPath: 'categories', fromIndex: srcSlot.index, toPath: 'categories', toIndex: 0 }, dstCatId: src.catId };
  } else if (target.type === 'cat') {
    const ti = CATEGORIES.findIndex((c) => c.id === target.catId);
    if (ti === -1) { notify('The target category vanished. Try again.', true); return; }
    if (target.pos === 'inside') {
      if (src.kind === 'cat') {
        if (src.catId === target.catId) return;
        ensureChildrenList(`categories.${ti}.subcategories`);
        const inside = locate(draft.doc('wiki'), `categories.${ti}.subcategories`) || [];
        plan = planCategoryToPage(srcSlot.index, `categories.${ti}.subcategories`, inside.length, target.catId);
      } else {
        const insidePath = `categories.${ti}.subcategories`;
        ensureChildrenList(insidePath);
        if (srcSlot.parentPath === insidePath && srcSlot.index === (locate(draft.doc('wiki'), insidePath) || []).length - 1) return;
        plan = { move: { fromPath: srcSlot.parentPath, fromIndex: srcSlot.index, toPath: insidePath, toIndex: (locate(draft.doc('wiki'), insidePath) || []).length }, dstCatId: target.catId };
      }
      dstCatId = target.catId;
    } else {
      if (src.kind !== 'cat') { notify('Drop onto the middle of the category header to nest this page inside it.', true); return; }
      if (src.catId === target.catId) return;
      plan = { move: { fromPath: 'categories', fromIndex: srcSlot.index, toPath: 'categories', toIndex: target.pos === 'before' ? ti : ti + 1 }, dstCatId: src.catId };
    }
  } else {
    const dstSlot = slotFor('sub', target.catId, target.subId);
    if (!dstSlot) { notify('The target page vanished. Try again.', true); return; }
    if (target.pos === 'inside') {
      // Virar filho da pagina alvo. Impedir ciclos: ninguem entra dentro de
      // si mesmo nem dentro da propria subarvore.
      const subtree = collectSubtreeIds(src.catId, src.kind === 'sub' ? src.subId : null);
      if (subtree.has(target.subId)) {
        notify('You cannot nest a page inside itself (or inside its own children).', true);
        return;
      }
      const targetPath = getSubcategoryDocPath(target.catId, target.subId);
      if (!targetPath) { notify('The target page vanished. Try again.', true); return; }
      const childListPath = `${targetPath}.children`;
      ensureChildrenList(childListPath);
      const inside = locate(draft.doc('wiki'), childListPath) || [];
      if (src.kind === 'cat') {
        // Categoria solta no meio de uma pagina: vira pagina filha dela.
        plan = planCategoryToPage(srcSlot.index, childListPath, inside.length, target.catId);
      } else {
        if (srcSlot.parentPath === childListPath && srcSlot.index === inside.length - 1) return;
        plan = { move: { fromPath: srcSlot.parentPath, fromIndex: srcSlot.index, toPath: childListPath, toIndex: (locate(draft.doc('wiki'), childListPath) || []).length }, dstCatId: target.catId };
      }
      dstCatId = target.catId;
    } else {
      if (dstSlot.parentPath === srcSlot.parentPath && dstSlot.index === srcSlot.index) return;
      const toIndex = target.pos === 'before' ? dstSlot.index : dstSlot.index + 1;
      if (src.kind === 'cat') {
        // Categoria entre duas paginas: vira pagina naquela posicao.
        const subtree = collectSubtreeIds(src.catId, null);
        if (subtree.has(target.subId)) { notify('You cannot place a category inside its own children.', true); return; }
        ensureChildrenList(dstSlot.parentPath);
        plan = planCategoryToPage(srcSlot.index, dstSlot.parentPath, toIndex, target.catId);
      } else {
        if (dstSlot.parentPath === srcSlot.parentPath && toIndex === srcSlot.index) return;
        plan = { move: { fromPath: srcSlot.parentPath, fromIndex: srcSlot.index, toPath: dstSlot.parentPath, toIndex }, dstCatId: target.catId };
      }
      dstCatId = target.catId;
    }
  }

  try {
    for (const conv of plan.converts || []) draft.setValue('wiki', conv.path, conv.value);
    draft.moveValue('wiki', plan.move.fromPath, plan.move.fromIndex, plan.move.toPath, plan.move.toIndex);
    draft.applyDraftToSite();
    buildNav();
    applyDragMode();
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    const hashParts = window.location.hash.replace(/^#\/?/, '').split('/');
    const subId = hashParts[1];
    const stillThere = subId ? getSubcategory(hashParts[0], subId) : true;
    if (!stillThere) {
      window.location.hash = `#/${dstCatId}/${subId}`;
    } else {
      await rerender({ scroll: 'preserve' });
    }
    updateToolbar();
    notify('Hierarchy updated. Remember to save/publish.');
  } catch (error) {
    notify(error.message || 'Could not move that item.', true);
  }
}

// ==== ROTEAMENTO DOS CLIQUES ====

function locate(root, path) {
  return path ? path.split('.').reduce((node, key) => (node == null ? node : node[key]), root) : root;
}

function collectPageIds(node, out = new Set()) {
  if (!node) return out;
  if (node.id && typeof node.id === 'string') out.add(node.id);
  if (Array.isArray(node.children)) node.children.forEach((c) => collectPageIds(c, out));
  return out;
}

function uniqueIn(base, used) {
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function buildAddValue(docName, trail, template) {
  const doc = draft.doc(docName);
  if (!doc) return null;
  if (template === 'category') {
    const id = uniqueIn('new-category', new Set((doc.categories || []).map((c) => c.id)));
    return {
      id,
      name: 'New category',
      desc: 'Overview of this new category.',
      tagline: 'What this category is about.',
      icon: 'sprout',
      vitals: [],
      subcategories: [],
      overview: { desc: '', facts: [], highlights: [] },
    };
  }
  if (template === 'sub-card') {
    const parentPath = trail.split('.').slice(0, -1).join('.');
    const parent = locate(doc, parentPath);
    const id = uniqueIn('new-page', collectPageIds(parent));
    return {
      id,
      name: 'New page',
      desc: 'Describe this page here.',
      icon: 'sparkles',
      highlights: [],
      facts: [],
      vitals: [],
      children: [],
    };
  }
  if (template === 'version') {
    return { version: 'v0.0', date: new Date().toISOString().slice(0, 10), entries: [] };
  }
  if (template === 'entry') {
    return { context: 'Feature', title: 'New update', href: '', description: 'What changed in the game.' };
  }
  if (template === 'upgrade') {
    const list = locate(doc, trail) || [];
    const used = new Set(list.map((u) => Number(u.n)).filter((n) => Number.isFinite(n)));
    let n = 1;
    while (used.has(n)) n += 1;
    return { n, name: 'New upgrade', cap: null, price: '3*L', multi: '1' };
  }
  if (template === 'bonus') {
    const list = locate(doc, trail) || [];
    const used = new Set(list.map((b) => b.id).filter(Boolean));
    return { id: uniqueIn('b', used), name: 'New bonus', value: 'formula: amount' };
  }
  if (template === 'bonus-group') {
    const used = new Set((locate(doc, trail) || []).map((group) => group.id));
    return { id: uniqueIn('sap', used), name: 'New sap', color: '#86d62b', dropChance: '1 in 100', amountLabel: 'Amount owned', bonuses: [BONUS_TEMPLATE()] };
  }
  if (template === 'stage') {
    const list = locate(doc, trail) || [];
    return {
      num: String(list.length + 1),
      requirements: ['1M Energy'],
      boosts: ['2x Energy'],
      unlocks: { area: '', places: [], features: [] },
    };
  }
  return null;
}

async function addItemFromTrigger(trigger) {
  const bindingPath = trigger.getAttribute('data-edit-add') || '';
  const template = trigger.getAttribute('data-edit-add-template') || '';
  const sep = bindingPath.indexOf(':');
  if (sep <= 0) return;
  const docName = bindingPath.slice(0, sep);
  const trail = bindingPath.slice(sep + 1);
  if (popState) closePopover(true);
  try {
    const value = buildAddValue(docName, trail, template);
    if (!value) {
      notify('This add button is not wired to a template yet.', true);
      return;
    }
    const index = draft.pushValue(docName, trail, value);
    draft.applyDraftToSite();
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    await rerender({ scroll: 'preserve' });
    // O popover abre junto ao botao "+ New" clicado — nao no item novo, que
    // pode ser o ultimo de uma lista longa e ficar longe da tela.
    const el = document.querySelector(`[data-edit="${bindingPath}.${index}"]`);
    const anchor = document.querySelector(`[data-edit-add="${bindingPath}"]`);
    if (el && session.editing) {
      const info = parseBinding(el);
      if (info) openPopover({ ...info, el, anchorEl: anchor || el });
    }
    updateToolbar();
    notify('Item added to the draft. Fill it in and remember to save.');
  } catch (error) {
    notify(error.message || 'Could not add the item.', true);
  }
}

function installInteraction() {
  document.addEventListener('click', (event) => {
    if (!session.ready || !session.allowed) return;
    if (event.target.closest('#ri-edit-bar, .ri-edit-popover, .ri-edit-chip')) return;

    const addTrigger = event.target.closest('[data-edit-add]');
    if (addTrigger && session.editing) {
      event.preventDefault();
      event.stopPropagation();
      void addItemFromTrigger(addTrigger);
      return;
    }

    // Clicar fora fecha o popover aberto (descarta mudanças não aplicadas).
    if (popState) closePopover(true);

    const binding = event.target.closest('[data-edit]');
    if (!binding) return;
    const info = parseBinding(binding);
    if (!info) return;
    if (!session.editing) return;
    event.preventDefault();
    event.stopPropagation();
    openPopover({ ...info, el: binding });
  }, true);

  document.addEventListener('mouseover', (event) => {
    if (!session.editing) return;
    const binding = event.target.closest('[data-edit]');
    if (!binding) { hideChip(); return; }
    const info = parseBinding(binding);
    if (!info) { hideChip(); return; }
    showChip({ el: binding, label: info.label });
  });

  document.addEventListener('mouseout', (event) => {
    if (!session.editing) return;
    const from = event.target.closest('[data-edit]');
    const to = event.relatedTarget?.closest?.('[data-edit]');
    if (from && !to) hideChip();
  });

  document.addEventListener('esc-edit', () => {
    if (popState) { closePopover(true); return; }
    if (session.editing) setEditing(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (popState) { closePopover(true); return; }
      if (session.editing) setEditing(false);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z') && !event.shiftKey) {
      const tag = event.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;
      if (typing) return;
      event.preventDefault();
      void doUndo();
      return;
    }
    if (event.altKey && (event.key === 'e' || event.key === 'E')) {
      event.preventDefault();
      if (!session.ready || !session.allowed) { void enterWithSignIn(); return; }
      setEditing(!session.editing);
    }
  });

  window.addEventListener('scroll', () => {
    const anchor = popState?.anchorEl?.isConnected
      ? popState.anchorEl
      : (popState?.el?.isConnected ? popState.el : null);
    positionPopover(anchor);
    hideChip();
  }, { passive: true, capture: true });
}

// ==== EXPORT ====

// Ganchos usados pelos testes (tests/page-types.test.cjs): criacao do
// conteudo de jogo por tipo de pagina e templates de itens novos.
export { createGamePageContainer, buildAddValue };

export function initEditMode() {
  if (session.started) return;
  session.started = true;
  buildToolbar();
  installInteraction();
  installSidebarTools();
  window.addEventListener('ri-edit-content', () => {
    installSidebarTools();
    applyDragMode();
  });
  layer.bar.classList.add('is-hidden');
  try {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (stored) void startSession(stored);
  } catch { /* sem token salvo */ }
}
