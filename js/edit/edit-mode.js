// ==== EDIT MODE: sessao, barra, chips e popover de edicao inline ====

import { esc, qs } from '../utils.js';
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
import * as draft from './draft.js';
import { rerender } from '../router.js';

const TOKEN_KEY = 'ri-edit-token';

const session = {
  token: '',
  user: '',
  avatar: '',
  allowed: false,
  ready: false,
  editing: false,
  started: false,
};

const layer = { bar: null, chip: null, popover: null, toast: null };
let popState = null;

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
    { key: 'icon', label: 'Icon name (lucide)', type: 'line', mono: true },
    { key: 'text', label: 'Text', type: 'area' },
  ],
  'category-card': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'tagline', label: 'Tagline', type: 'area' },
    { key: 'icon', label: 'Icon name (lucide)', type: 'line', mono: true },
  ],
  'sub-card': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'desc', label: 'Description', type: 'area' },
    { key: 'icon', label: 'Icon name (lucide)', type: 'line', mono: true },
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
    { key: 'icon', label: 'Icon name (lucide)', type: 'line', mono: true },
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
    { key: 'requirements', label: 'Requirements (one per line)', type: 'area-list' },
    { key: 'boosts', label: 'Boosts (one per line)', type: 'area-list' },
    { key: 'boostsNote', label: 'Boost note', type: 'line' },
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
    <button class="btn btn--ghost btn--sm" data-edit-save title="Save a draft on GitHub so no change is lost">${icon('save', 13)} Save draft</button>
    <button class="btn btn--ghost btn--sm" data-edit-discard title="Discard the draft and return to the published content">${icon('rotate-ccw', 13)} Discard</button>
    <button class="btn btn--primary btn--sm" data-edit-publish title="Publish the changes to the live Wiki (creates a backup first)">${icon('upload', 13)} Publish</button>
    <span class="ri-edit-bar__user" data-edit-user hidden></span>
    <button class="btn btn--ghost btn--sm" data-edit-signout title="End this edit session">${icon('log-out', 13)} Sign out</button>`;
  document.body.appendChild(layer.bar);

  layer.bar.addEventListener('click', (event) => {
    const action = event.target.closest('[data-edit-toggle],[data-edit-save],[data-edit-publish],[data-edit-discard],[data-edit-signout]');
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
  const act = button.getAttribute('data-edit-toggle') != null
    ? 'toggle'
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
  if (act === 'signout') {
    signOut();
    return;
  }
  if (!session.token) return;
  void (async () => {
    try {
      if (act === 'save') {
        barStatus('Saving draft…', 'busy');
        await draft.saveDraft(session.token);
        notify('Draft saved on GitHub. Changes are not published yet.');
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
    bar.classList.remove('is-hidden');
    barStatus('Loading repository content…', 'busy');
    const info = await draft.initSession(token);
    session.token = token;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
    const user = await githubUser(token).catch(() => ({ login: 'admin', name: 'admin', avatar: '' }));
    session.user = user.login;
    session.avatar = user.avatar || '';
    const permission = await githubCollaboratorPermission(token, session.user).catch(() => 'none');
    session.allowed = hasWriteAccess(permission);
    if (!session.allowed) {
      notify('This account cannot edit the Wiki (write permission required).', true);
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
      document.documentElement.classList.remove('ri-edit-bar');
      layer.bar.classList.add('is-hidden');
      return;
    }
    session.ready = true;
    if (info.draftLoaded) {
      draft.applyDraftToSite();
      await rerender({ scroll: 'preserve' });
      notify('A draft saved on GitHub was restored.');
    }
    updateToolbar();
  } catch (error) {
    notify(error.message || 'Failed to load the editing session.', true);
    barStatus('Failed to load editing session');
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
  layer.popover.hidden = false;
  positionPopover(binding.el);
  body.querySelector('input, textarea, select')?.focus({ preventScroll: true });
}

function readValueForInput(docName, path, original) {
  if (original == null) return '';
  if (Array.isArray(original)) return original.join('\n');
  return String(original);
}

function createField(meta, path, docName) {
  const original = draft.getValue(docName, path);
  const warn = original === undefined ? 'This field does not exist in the content.' : '';
  const wrap = document.createElement('label');
  wrap.className = 'ri-edit-field';
  wrap.innerHTML = `<span class="ri-edit-field__label">${esc(meta.label)}${warn ? ` <small>(missing)</small>` : ''}</span>`;
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
  } else if (meta.type === 'area' || meta.type === 'area-list') {
    input = document.createElement('textarea');
    input.className = 'input';
    input.rows = meta.type === 'area-list' ? (readValueForInput(docName, path, original).split('\n').length + 2) : 4;
    input.value = readValueForInput(docName, path, original);
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.value = readValueForInput(docName, path, original);
    if (meta.mono) input.style.fontFamily = 'var(--font-mono, monospace)';
  }
  input.dataset.editFieldPath = path.replace(/\./g, '·');
  input.dataset.editFieldDoc = docName;
  input.dataset.editFieldType = meta.type;
  input.dataset.editFieldNumeric = numeric ? '1' : '0';
  wrap.appendChild(input);
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
  const state = popState;
  const applyButton = layer.popover.querySelector('[data-edit-pop-apply]');
  applyButton.disabled = true;
  try {
    const inputs = [...layer.popover.querySelectorAll('[data-edit-field-path]')];
    for (const input of inputs) {
      const path = input.dataset.editFieldPath.replaceAll('·', '.');
      const docName = input.dataset.editFieldDoc;
      const type = input.dataset.editFieldType;
      const numeric = input.dataset.editFieldNumeric === '1';
      let value = input.value;
      if ((type === 'area-list')) {
        value = value.split('\n').map((line) => line.trim()).filter(Boolean);
      } else if (type === 'select') {
        value = input.value;
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

// ==== ROUTING DOS CLIQUES ====

function installInteraction() {
  document.addEventListener('click', (event) => {
    if (!session.ready || !session.allowed) return;
    if (event.target.closest('#ri-edit-bar, .ri-edit-popover, .ri-edit-chip')) return;
    const binding = event.target.closest('[data-edit]');
    if (!binding) return;
    const info = parseBinding(binding);
    if (!info) return;
    if (!session.editing) {
      return;
    }
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
    if (event.altKey && (event.key === 'e' || event.key === 'E')) {
      event.preventDefault();
      if (!session.ready || !session.allowed) { void enterWithSignIn(); return; }
      setEditing(!session.editing);
    }
  });

  window.addEventListener('scroll', () => {
    if (popState) positionPopover(popState.el?.isConnected ? popState.el : null);
    hideChip();
  }, { passive: true, capture: true });
}

// ==== EXPORT ====

export function initEditMode() {
  if (session.started) return;
  session.started = true;
  buildToolbar();
  installInteraction();
  layer.bar.classList.add('is-hidden');
  try {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (stored) void startSession(stored);
  } catch { /* sem token salvo */ }
}
