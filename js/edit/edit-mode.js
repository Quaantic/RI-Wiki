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
import { CONTEXTS,validateDocuments } from '../content-schema.js';
import { searchIcons } from '../icon-catalog.js';
import { CATEGORIES, getSubcategory, getSubcategoryDocPath, collectSubtreeIds } from '../data/wiki-data.js';
import { buildNav } from '../ui.js';
import * as draft from './draft.js';
import { rerender, registerRoute } from '../router.js';
import { pinContentKeys, resolveContentKey } from '../page-content.js';
import { nextReleaseVersion } from '../releases.js';
import {readRecovery,storeFormRecovery,removeFormRecovery,isRecoveryStored} from './recovery.js';
import {GENERATOR_FORMULAS} from '../data/generators.js';
import { documentChanges, pageFromDocs } from './version-tools.js';
import { live } from './live-client.js';


const TOKEN_KEY = 'ri-edit-token';

const session = {
  token: '',
  user: '',
  avatar: '',
  allowed: false,
  canPublish: false,
  ready: false,
  editing: false,
  started: false,
  busy: false,
  syncError: '',
};

const layer = { bar: null, chip: null, popover: null, toast: null };
let popState = null;

// Listas aninhadas em uma linha por item ("Target | mult | caps").
const LIST_PARSERS = {
  'mastery-list': {
    print: (value) => (value || []).map((item) => [item.effect,item.cap ?? '',item.req ?? ''].join(' | ')).join('\n'),
    parse: (text) => text.split('\n').filter((line)=>line.trim()).map((line)=>{
      const [effect,cap,req] = line.split('|').map((part)=>part.trim());
      return { effect, cap:cap ? Number(cap) || cap : null, req:req ? Number(req) || req : null };
    }),
  },
  'stats-list': {
    print: (value) => Object.entries(value || {}).map(([name, amount]) => `${name} | ${amount}`).join('\n'),
    parse: (text) => Object.fromEntries(text.split('\n').filter((line) => line.trim()).map((line) => {
      const [name, value] = line.split('|').map((part) => part.trim());
      if (!name || !value) throw new Error('Use one stat per line: name | value.');
      return [name, Number.isFinite(Number(value)) ? Number(value) : value];
    })),
  },
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
  'game:generator': [
    {key:'name',label:'Name',type:'line'},
    ...['unlockCost','startIncome','startTime','scale','maxLevel','maxSpeed','maxTier','tierPrice','levelPrice','speedPrice'].map(key=>({key,label:key.replace(/([A-Z])/g,' $1'),type:'line',numeric:true})),
    ...Object.entries(GENERATOR_FORMULAS).map(([key,fallback])=>({key,label:key.replace(/([A-Z])/g,' $1'),type:'formula',advanced:true,fallback})),
  ],
  pair: [
    { key: 'label', label: 'Label', type: 'line' },
    { key: 'value', label: 'Value', type: 'line' },
  ],
  card: [
    { key: 'title', label: 'Title', type: 'line' },
    { key: 'icon', label: 'Icon', type: 'line', mono: true, picker: 'icon' },
    { key: 'text', label: 'Text', type: 'area' },
  ],
  'category-card': [
    { key: 'id', label: 'URL id (letters, numbers, -)', type: 'line', mono: true },
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'tagline', label: 'Tagline', type: 'area' },
    { key: 'icon', label: 'Icon', type: 'line', mono: true, picker: 'icon' },
  ],
  'sub-card': [
    { key: 'id', label: 'URL id (letters, numbers, -)', type: 'line', mono: true },
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'desc', label: 'Description', type: 'area' },
    { key: 'icon', label: 'Icon', type: 'line', mono: true, picker: 'icon' },
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
    { key: 'avatar', label: 'Image name (e.g. nath → images/credits/nath.png)', type: 'line' },
    { key: 'banner', label: 'Banner color (CSS color)', type: 'line', mono: true },
  ],
  'game:ore': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'icon', label: 'Icon', type: 'line', mono: true, picker: 'icon' },
    { key: 'color', label: 'Color (CSS color)', type: 'line', mono: true },
    { key: 'depth', label: 'Depth', type: 'line' },
    { key: 'luck', label: 'Best luck', type: 'line' },
  ],
  'game:layer': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'num', label: 'Layer number', type: 'line' },
    { key: 'depth', label: 'Depth', type: 'line' },
    { key: 'ores', label: 'Ores found here (one per line)', type: 'area-list' },
  ],
  'game:mastery': [
    { key:'name',label:'Ore name',type:'line' },
    { key:'icon',label:'Icon',type:'line',picker:'icon' },
    { key:'color',label:'Color',type:'line' },
    { key:'upgrades',label:'Upgrades (one per line: effect | cap | requirement)',type:'mastery-list' },
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
    { key: 'stats', label: 'Stats (one per line: name | multiplier)', type: 'stats-list' },
  ],
  'game:upgrade': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'n', label: 'Number (#)', type: 'line' },
    { key: 'cap', label: 'Cap (empty = no cap)', type: 'line' },
    { key: 'price', label: 'Price formula (L = level)', type: 'line', mono: true },
    { key: 'multi', label: 'Effect formula (L = level)', type: 'line', mono: true },
    { key: 'requirement', label: 'Unlock requirement (optional)', type: 'line' },
  ],
  'game:perk-controls': [
    { key: 'treeUpgrade15.label', label: 'Tree Upgrade 15 label', type: 'line', fallback: 'Tree Upgrade 15' },
    { key: 'treeUpgrade15.defaultLevel', label: 'Tree Upgrade 15 starting level', type: 'line', numeric: true, fallback: 0 },
    { key: 'treeUpgrade51.label', label: 'Tree Upgrade 51 label', type: 'line', fallback: 'Tree Upgrade 51' },
    { key: 'treeUpgrade51.defaultLevel', label: 'Tree Upgrade 51 starting level', type: 'line', numeric: true, fallback: 0 },
    { key: 'treeUpgrade51.maxLevel', label: 'Tree Upgrade 51 maximum level', type: 'line', numeric: true, fallback: 3 },
  ],
  'game:rune': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'icon', label: 'Icon', type: 'line', mono: true, picker: 'icon' },
    { key: 'luck', label: 'Recommended luck', type: 'line' },
    { key: 'baseChance', label: 'Base chance', type: 'line' },
    { key: 'recChance', label: 'Chance at rec. luck', type: 'line' },
    { key: 'boosts', label: 'Boosts (Target | multiplier | caps at, one per line)', type: 'boost-list' },
  ],
  'game:bonus': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'value', label: 'Bonus formula', type: 'formula', mono: true },
    { key: 'unit', label: 'Display as', type: 'select', options: () => [
      { id: '', label: 'Number' }, { id: 'x', label: 'Multiplier (×)' },
      { id: '%', label: 'Percentage (%)' }, { id: 'cap', label: 'Added capacity (+ CAP)' },
    ] },
    { key: 'cap', label: 'Maximum bonus (optional)', type: 'line', numeric: true },
  ],
  'text-section': [
    { key: 'title', label: 'Heading or question', type: 'line' },
    { key: 'text', label: 'Description or answer', type: 'area' },
  ],
  'table-section': [
    { key: 'title', label: 'Table heading', type: 'line' },
    { key: 'columns', label: 'Column headings (one per line)', type: 'area-list' },
    { key: 'text', label: 'Notes (optional)', type: 'area' },
  ],
  'game:progression-page': [
    { key: 'title', label: 'Section heading (Stages, Evolutions, Milestones…)', type: 'line' },
    { key: 'itemLabel', label: 'Item name (Stage, Evolution, Milestone…)', type: 'line' },
  ],
  'game:calculator-settings': [
    { key: 'title', label: 'Calculator heading', type: 'line' },
    { key: 'amountLabel', label: 'Owned amount label (optional)', type: 'line' },
    { key: 'showAmount', label: 'Owned amount field', type: 'select', options: () => [{ id: 'true', label: 'Show input' }, { id: 'false', label: 'Hide input — use the default amount' }] },
    { key: 'defaultAmount', label: 'Default amount', type: 'line', numeric: true },
  ],
  'game:bonus-group': [
    { key: 'name', label: 'Name', type: 'line' },
    { key: 'color', label: 'Color (#hex)', type: 'line' },
    { key: 'dropChance', label: 'Drop chance', type: 'line' },
    { key: 'amountLabel', label: 'Amount label', type: 'line' },
    { key: 'description', label: 'Notes (optional)', type: 'area' },
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

export function bonusFields(binding) {
  const pagePath = binding.valuePath.split('.').slice(0, 3).join('.');
  const kind = draft.getValue('game', pagePath)?.kind;
  return [...SCHEMAS['game:bonus'], {
    key: kind === 'level' ? 'unlockLevel' : 'unlockAt',
    label: kind === 'level' ? 'Required level (optional)' : 'Required amount (optional)',
    type: 'line', numeric: true,
  }];
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

let presenceTimer=null;
let presenceUnavailable=false;
async function updateLivePresence(){
  if(!session.ready||!session.allowed||document.hidden||presenceUnavailable)return;
  try{
    const data=await live('presence',{page:location.hash.split('?')[0]||'#/'});
    if(!session.ready)return;
    const others=(data.editors||[]).filter(e=>e.editor!==session.user).slice(0,4);
    const chip=layer.bar?.querySelector('[data-edit-presence]');if(!chip)return;
    chip.hidden=false;
    chip.innerHTML=`${icon('users',12)} <span>${others.length?`${others.length} other editor${others.length>1?'s':''} online`:'Only you online'}</span>${others.length?` <small>${others.map(e=>`@${esc(e.editor)} · ${esc(e.page)}`).join(' / ')}</small>`:''}`;
  }catch(error){
    // The optional presence table might not have been installed yet.
    // Do not affect editing, autosave, permissions or Publish.
    presenceUnavailable=true;
    const chip=layer.bar?.querySelector('[data-edit-presence]');if(chip)chip.hidden=true;
    console.info('[ri-presence] Optional presence needs setup/live-presence.sql.',error.message);
  }
}
function startLivePresence(){
  clearInterval(presenceTimer);
  void updateLivePresence();
  presenceTimer=setInterval(()=>void updateLivePresence(),18000);
  if(!startLivePresence.wired){
    startLivePresence.wired=true;
    window.addEventListener('hashchange',()=>void updateLivePresence());
    window.addEventListener('focus',()=>void updateLivePresence());
  }
}

function updateToolbar() {
  if (!layer.bar) return;
  const localSaved=session.ready ? draft.persistLocalRecovery()!==false : true;
  const resume=layer.bar.querySelector('[data-edit-resume]');
  if(resume)resume.hidden=Boolean(popState)||!readRecovery(formRecoveryKey());
  const { ready, editing, user, avatar } = session;
  const draftOnline = draft.draftOnline();
  const draftDirty = draft.draftDirty();

  layer.bar.querySelector('[data-edit-user]').hidden = !ready;
  layer.bar.querySelector('[data-edit-user]').innerHTML = ready
    ? `${avatar ? `<img class="ri-edit-bar__avatar" src="${esc(avatar)}" alt="" />` : ''}<b>${esc(user)}</b>`
    : '';

  layer.bar.querySelector('[data-edit-toggle]').disabled = !ready;
  layer.bar.querySelector('[data-edit-undo]').disabled = !ready || !draft.canUndo();
  layer.bar.querySelector('[data-edit-sync]').disabled = !ready;
  layer.bar.querySelector('[data-edit-save]').disabled = !ready;
  // Restore/dowloaded snapshots require an explicit Share click; ordinary
  // editing is automatic and shows only Publish.
  layer.bar.querySelector('[data-edit-save]').hidden = !draft.hasRestoredDraft();
  const saveLabel=layer.bar.querySelector('[data-edit-save] .ri-save-full');
  if(saveLabel)saveLabel.textContent=draft.hasRestoredDraft()?'Share restored draft':'Save for everyone';
  layer.bar.querySelector('[data-edit-publish]').disabled = !ready || !draftOnline || !session.canPublish || draftDirty || Boolean(autosaveWorking) || Boolean(autosaveTimer);
  layer.bar.querySelector('[data-edit-publish]').hidden = !session.canPublish;
  layer.bar.querySelector('[data-edit-discard]').disabled = !ready;
  layer.bar.querySelector('[data-edit-restore]').disabled = !ready;
  layer.bar.querySelector('[data-edit-more]').disabled = !ready;
  resume.disabled = !ready;
  if (session.busy || sharedRefreshChecking) {
    qsa('button', layer.bar).forEach((button) => { button.disabled = true; });
  } else {
    layer.bar.querySelector('[data-edit-signout]').disabled = false;
    layer.bar.querySelector('[data-edit-download]').disabled = !ready;
  }

  layer.bar.querySelector('[data-edit-mode-label]').textContent = editing ? 'Preview' : 'Edit';
  layer.bar.querySelector('[data-edit-toggle]').classList.toggle('is-on', editing);

  if (!ready) {
    barStatus('Checking sign-in…');
  } else if (session.syncError) {
    barStatus(session.syncError, 'dirty');
  } else if(!localSaved||!isRecoveryStored(formRecoveryKey())) {
    barStatus('Local backup unavailable — download your draft','dirty');
  } else if(readRecovery(formRecoveryKey())) {
    barStatus('Unfinished edits saved on this device','dirty');
  } else if (draftDirty) {
    barStatus(draft.hasRestoredDraft() ? 'Restored snapshot staged · not shared' : (localSaved ? 'Unsynced edits · autosave pending' : 'Local backup unavailable — download your draft'), 'dirty');
  } else if (draftOnline) {
    barStatus('Live · All edits shared');
  } else {
    barStatus('Live editor not initialized · Restore draft to begin','dirty');
  }
}

function buildToolbar() {
  layer.bar = document.createElement('div');
  layer.bar.id = 'ri-edit-bar';
  layer.bar.className = 'ri-edit-bar';
  layer.bar.innerHTML = `
    <span class="ri-edit-bar__brand">${icon('edit', 14)} Inline editor</span>
    <span class="chip ri-edit-bar__status" data-edit-status>Checking sign-in…</span>
    <span class="ri-presence" data-edit-presence hidden title="Collaborators editing the wiki"></span>
    <span class="ri-edit-bar__spacer" style="flex:1"></span>
    <button class="btn btn--ghost btn--sm" data-edit-toggle title="Toggle between edit and preview (Alt+E)">
      <span data-edit-mode-label>Edit</span>
    </button>
    <button class="btn btn--ghost btn--sm" data-edit-undo title="Undo the last change in the draft (Ctrl+Z)">${icon('undo-2', 13)} Undo</button>
    <button class="btn btn--ghost btn--sm" data-edit-sync title="Load your collaborators' latest changes from live storage">${icon('refresh-cw', 13)} Sync</button>
    <button class="btn btn--ghost btn--sm" data-edit-save hidden title="Share the restored snapshot with everyone">${icon('save', 13)} <span class="ri-save-full">Save for everyone</span><span class="ri-save-short">Save</span></button>
    <button class="btn btn--ghost btn--sm" data-edit-download title="Download a recovery copy of your current draft">${icon('download', 13)} Download draft</button>
    <button class="btn btn--ghost btn--sm" data-edit-restore title="Open a downloaded wiki draft in this browser">${icon('upload', 13)} Restore draft</button>
    <input type="file" accept=".json,application/json" data-edit-restore-file hidden>
    <button class="btn btn--ghost btn--sm" data-edit-resume hidden>Resume edit</button>
    <button class="btn btn--ghost btn--sm" data-edit-discard title="Discard the draft and return to the published content">${icon('rotate-ccw', 13)} Discard</button>
    <button class="btn btn--primary btn--sm" data-edit-publish title="Publish the changes to the live Wiki (creates a backup first)">${icon('upload', 13)} Publish</button>
    <button class="btn btn--ghost btn--sm ri-edit-more" data-edit-more aria-expanded="false">${icon('menu', 13)} More</button>
    <span class="ri-edit-bar__user" data-edit-user hidden></span>
    <button class="btn btn--ghost btn--sm" data-edit-signout title="End this edit session">${icon('log-out', 13)} Sign out</button>`;
  document.body.appendChild(layer.bar);
  const resizeToolbar = () => document.documentElement.style.setProperty('--ri-edit-bar-h', `${Math.ceil(layer.bar.getBoundingClientRect().height) || 46}px`);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resizeToolbar).observe(layer.bar);
  window.addEventListener('resize', resizeToolbar);

  layer.bar.addEventListener('click', (event) => {
    const action = event.target.closest('[data-edit-toggle],[data-edit-undo],[data-edit-sync],[data-edit-save],[data-edit-publish],[data-edit-discard],[data-edit-signout],[data-edit-download],[data-edit-restore],[data-edit-more],[data-edit-resume]');
    if (!action) return;
    onToolbarAction(action);
  });
  const restoreInput = layer.bar.querySelector('[data-edit-restore-file]');
  restoreInput.addEventListener('change', () => {
    const file = restoreInput.files[0];
    restoreInput.value = '';
    if (file) void restoreDownloadedDraft(file);
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
      closePopover(true,Boolean(target.closest('[data-edit-pop-cancel]')));
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
  layer.popover.addEventListener('input',persistForm);
  layer.popover.addEventListener('change',persistForm);
  layer.popover.setAttribute('role','dialog');
  layer.popover.setAttribute('aria-label','Edit content');
  const preserve=(event)=>{
    const formSaved=persistForm(),draftSaved=draft.persistLocalRecovery();
    // A successful local recovery is not a GitHub Save. Warn before F5
    // whenever the shared draft hasn't been verified, even if localStorage
    // happened to accept the browser-only copy.
    if(event?.type==='beforeunload'&&(formSaved===false||draftSaved===false||draft.draftDirty()||Boolean(popState))){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('pagehide',preserve);
  window.addEventListener('beforeunload',preserve);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)preserve();});

  installSigninButton();
}

function confirmReleaseOrder(version, source) {
  const explanation = source === 'shared'
    ? 'The shared draft and the published wiki have different orders. Keep the shared draft order when merging?'
    : 'Your draft and the latest shared revision have different orders. Keep your draft order when merging?';
  return window.confirm(`Update Log ${version}\n\n${explanation}\n\nCompatible edits and entries from both versions are kept. Cancel to keep working without changing the shared draft.`);
}

confirmReleaseOrder.confirmInvalidDraft = () => window.confirm('The shared draft file on GitHub contains invalid JSON. The currently published wiki is safe. Back up the exact broken file to content/backups and replace it with your current edits? Cancel keeps everything unchanged.');

// No write occurs until all conflicts have a choice. Cancel preserves the draft.
confirmReleaseOrder.resolveConflict = ({ path, local, remote, source }) => {
  const describe = (value) => {
    if (value === undefined) return '(deleted)';
    const text = JSON.stringify(value, null, 2);
    return text.length > 1800 ? `${text.slice(0, 1800)}\n… (preview truncated; this choice applies to the whole item)` : text;
  };
  const left = source === 'shared' ? 'Shared draft' : 'Your draft';
  const right = source === 'shared' ? 'Published wiki' : 'Latest shared version';
  const choice = window.prompt(`Conflicting edit: ${path}\n\n1 — ${left}\n${describe(local)}\n\n2 — ${right}\n${describe(remote)}\n\nType 1 or 2 to choose. Cancel keeps your work without saving or publishing.`);
  return choice?.trim() === '1' ? 'local' : choice?.trim() === '2' ? 'remote' : undefined;
};

async function restoreDownloadedDraft(file) {
  if (!session.ready || !session.allowed || session.busy) return;
  session.busy = true;
  updateToolbar();
  try {
    // Closing the file picker can trigger a focus refresh before its change event.
    await sharedRefreshChecking;
    const snapshot = JSON.parse(await file.text());
    const unfinished = snapshot?._unfinishedForm;
    const forms = unfinished ? [...(unfinished.pending || []), unfinished] : [];
    for (const form of forms) {
      const binding = form?.binding;
      const validPath = typeof binding?.valuePath === 'string' && /^[\w./ -]+$/.test(binding.valuePath)
        && !binding.valuePath.split('.').some((part) => ['__proto__', 'constructor', 'prototype'].includes(part));
      if (typeof form?.hash !== 'string' || !form.hash.startsWith('#/')
        || !(binding?.manage === true || (['wiki', 'game', 'updates'].includes(binding?.docName) && validPath))
        || !Array.isArray(form.fields) || form.fields.some((field) => !Number.isSafeInteger(field?.index)
          || typeof field.value !== 'string' || typeof field.original !== 'string')) {
        throw new Error('The downloaded draft contains an invalid unfinished form.');
      }
    }
    if ((draft.draftDirty() || popState || readRecovery(formRecoveryKey()))
      && !window.confirm('Replace the working draft in this browser with the downloaded snapshot? Download your current draft first if you need a copy.')) return;
    const stored = draft.restoreDraftSnapshot(snapshot);
    if (popState) closePopover(true);
    for (const form of forms) {
      storeFormRecovery(formRecoveryKey(), { hash: form.hash, binding: form.binding, targetId: form.targetId, fields: form.fields });
    }
    draft.applyDraftToSite();
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    await rerender({ scroll: 'preserve' });
    notify(stored ? 'Draft restored in this browser. Review it before saving for everyone.' : 'Draft opened. Keep your downloaded copy because browser storage is unavailable.', !stored);
  } catch (error) {
    notify(error.message || 'Could not restore the downloaded draft.', true);
  } finally {
    session.busy = false;
    updateToolbar();
  }
}

function onToolbarAction(button) {
  if (session.busy) return;
  if(button.hasAttribute('data-edit-resume')){
    const saved=readRecovery(formRecoveryKey());
    if(saved)void(async()=>{setEditing(true);if(saved.hash!==location.hash)location.hash=saved.hash;await rerender({scroll:'preserve'});restoreForm();})();
    return;
  }
  if (button.hasAttribute('data-edit-sync')) {
    void syncSharedNow();
    return;
  }
  if (button.hasAttribute('data-edit-more')) {
    const expanded = layer.bar.classList.toggle('is-expanded');
    button.setAttribute('aria-expanded', String(expanded));
    return;
  }
  if (button.hasAttribute('data-edit-download')) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({...draft.snapshotDocs(),_unfinishedForm:readRecovery(formRecoveryKey())}, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `wiki-draft-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (button.hasAttribute('data-edit-restore')) {
    layer.bar.querySelector('[data-edit-restore-file]').click();
    return;
  }
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
        if (draft.hasRestoredDraft() && !window.confirm('Share this restored snapshot? Newer collaborator edits will be checked for conflicts first. No site publication occurs.')) return;
        barStatus('Saving draft…', 'busy');
        const saved = await draft.saveDraft(session.token, confirmReleaseOrder);
        session.syncError = '';
        draft.applyDraftToSite();
        buildNav();
        await rerender({ scroll: 'preserve' });
        window.dispatchEvent(new CustomEvent('ri-edit-content'));
        notify('Restored draft shared with all editors. It has NOT been published.');
      } else if (act === 'publish') {
        if (!session.canPublish) throw new Error('Permission denied. Only Quaantic and zzinss can publish.');
        const message = draft.hasRestoredDraft()
          ? 'Publish this restored snapshot to the live Wiki? It may replace changes made after the download. A backup is created first.'
          : 'Publish the changes to the live Wiki? A backup is created first.';
        if (!(await showPublishPreview())) return;
        if(await draft.remoteChanged(session.token)) throw new Error('A collaborator saved a newer draft while the Publish preview was open. Click Sync and review the new version before publishing.');
        if (popState) closePopover(true);
        barStatus('Syncing draft before publishing…', 'busy');
        cancelAutosave();
        await draft.saveDraft(session.token, confirmReleaseOrder, {automatic:true});
        barStatus('Publishing…', 'busy');
        const result = await draft.publishChanges(session.token, confirmReleaseOrder);
        session.syncError = '';
        draft.applyDraftToSite();
        buildNav();
        await rerender({ scroll: 'preserve' });
        window.dispatchEvent(new CustomEvent('ri-edit-content'));
        notify('Published to GitHub. The live site updates only after Vercel finishes deployment. Check Vercel if the site stays unchanged.');
      } else {
        if (!window.confirm('Discard only your unsynced edits and reload the latest shared draft? Other contributors will not be affected.')) return;
        if (popState) closePopover(true);
        barStatus('Discarding draft…', 'busy');
        await draft.discardDraft(session.token);
        await rerender({ scroll: 'preserve' });
        notify('Local edits discarded. Latest shared draft loaded.');
      }
    } catch (error) {
      if (error.name === 'SyncConflict') session.syncError = error.release ? 'Update Log order conflict' : 'Sync conflict — click Sync to review';
      notify(error.message || 'Operation failed.', true);
    } finally {
      session.busy = false;
      updateToolbar();
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

async function startSession(token, {deferRender=false}={}) {
  try {
    layer.bar.classList.remove('is-hidden');
    document.documentElement.classList.add('ri-edit-bar');
    // Barra visivel mas com TODOS os botoes desligados ate a checagem de
    // permissao terminar — sem janela em que Save/Publish dispare 403.
    updateToolbar();
    barStatus('Checking your write permission…', 'busy');
    const user = await githubUser(token);
    session.canPublish = user.canPublish;
    const permission = await githubCollaboratorPermission(token, user.login).catch(() => 'none');
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
    const info = await draft.initSession(token, user.login);
    if (info.invalidSharedDraft) session.syncError = 'Shared draft cannot be loaded — keep your downloaded recovery copy';
    if (info.contentConflict) session.syncError = 'Draft conflict — click Sync to review';
    else if (info.orderConflict) session.syncError = 'Update Log order conflict';
    else if (info.recoveryConflict) session.syncError = 'Sync conflict — click Sync to review';
    if (info.sanitized) {
      notify(`${info.sanitized} invalid resource entr${info.sanitized === 1 ? 'y was' : 'ies were'} removed from your draft to keep editing working.`, true);
    }
    session.token = token;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
    session.user = user.login;
    session.avatar = user.avatar || '';
    draft.applyDraftToSite();
    // Initial sign-in must update navigation too, not only the current view.
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    session.ready = true;
    let editing=true;
    try{editing=sessionStorage.getItem(`ri-edit-mode:${session.user}`)!=='preview';}catch{}
    setEditing(editing);
    startSharedRefresh();
    startLivePresence();
    const signinRow = qs('[data-ri-edit-signin]');
    if (signinRow) signinRow.hidden = true;
    installSidebarTools();
    {
      if(!deferRender)await rerender({ scroll: 'preserve' });
      notify(info.liveUninitialized ? 'Live collaboration is empty. Quaantic or zzinss: Restore draft using your latest downloaded JSON, then click Share restored draft once to initialize.' : (info.recovered ? 'Unsynced edits from this browser recovered. They are not shared until synced.' : 'Live collaborative editor ready.'), info.liveUninitialized);
    }
    updateToolbar();
    if(!deferRender&&session.editing)restoreForm();
    if(info.recovered && !info.liveUninitialized)queueAutosave(1200);
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
  if(session.user)try{sessionStorage.setItem(`ri-edit-mode:${session.user}`,on?'edit':'preview');}catch{}
  document.documentElement.classList.toggle('ri-edit-on', on);
  if (!on) {
    layer.chip.hidden = true;
    if (popState) closePopover(true);
  }
  updateToolbar();
  applyDragMode();
}

// Auto-save shared drafts after a pause in editing. This does NOT Publish.
// 60s debounce reduces GitHub commits and Vercel deployment pressure and each PUT uses the
// remote SHA to prevent one contributor from overwriting another.
let autosaveTimer=null, autosaveWorking=null, autosaveFailures=0;
function cancelAutosave(){clearTimeout(autosaveTimer);autosaveTimer=null;}
function queueAutosave(delay=1700){
  if(!session.ready||!session.allowed||!draft.draftOnline()||!draft.draftDirty()||draft.hasRestoredDraft())return;
  cancelAutosave();
  autosaveTimer=setTimeout(()=>{autosaveTimer=null;void runAutosave();},delay);
  updateToolbar();
}
async function runAutosave(){
  if(!session.ready||!session.allowed||!draft.draftDirty()||draft.hasRestoredDraft()||autosaveWorking)return;
  if(session.busy||popState||dragSource||document.hidden){queueAutosave(6000);return;}
  autosaveWorking=(async()=>{
    try{
      barStatus('Syncing live revision…','busy');
      // Unresolved conflicts must not be chosen silently by background saves.
      await draft.saveDraft(session.token, undefined,{automatic:true});
      autosaveFailures=0;
      session.syncError='';
      if(draft.draftDirty())queueAutosave(4000);
    }catch(error){
      autosaveFailures=Math.min(autosaveFailures+1,5);
      session.syncError=error?.name==='SyncConflict'?'Editing conflict · use Sync to review':'Autosave failed · local recovery kept';
      console.warn('[editor-autosave]',error.message);
      // Preserve unsaved work. Do not flood Vercel/GitHub on an outage.
      if(error.name!=='SyncConflict')queueAutosave(Math.min(120000,12000*2**(autosaveFailures-1)));
    }finally{autosaveWorking=null;updateToolbar();}
  })();
  return autosaveWorking;
}
window.addEventListener('ri-editor-dirty',()=>queueAutosave());
let sharedRefreshTimer;
let sharedRefreshChecking = null;
async function syncSharedNow() {
  if (!session.ready || session.busy || sharedRefreshChecking) return;
  if (popState && !window.confirm('Close the open editor form and sync changes from other contributors? Unapplied form fields remain locally recoverable.')) return;
  session.busy = true;
  if (popState) closePopover(true);
  updateToolbar();
  try {
    const changed = await draft.syncRemote(session.token, confirmReleaseOrder);
    session.syncError = '';
    if (changed) {
      draft.applyDraftToSite();
      window.dispatchEvent(new CustomEvent('ri-edit-content'));
      await rerender({ scroll: 'preserve' });
    }
    notify(changed ? 'Shared editor updated with collaborators’ changes.' : 'Already using the latest shared revision.');
  } catch (error) {
    session.syncError = 'Sync conflict — review before saving';
    notify(error.message || 'Could not load the shared draft.', true);
  } finally {
    session.busy = false;
    updateToolbar();
  }
}
function startSharedRefresh() {
  clearInterval(sharedRefreshTimer);
  const refresh = async () => {
    try {
      if (await draft.syncRemote(session.token)) {
        session.syncError = '';
        draft.applyDraftToSite();
        window.dispatchEvent(new CustomEvent('ri-edit-content'));
        await rerender({ scroll: 'preserve' });
        notify('Synced your collaborators’ changes. Your unsaved edits are still here.');
      }
    } catch (error) {
      if (!refresh._lastWarn || Date.now()-refresh._lastWarn>60000) {console.warn('[editor-sync]',error.message);refresh._lastWarn=Date.now();}
      session.syncError = error.release ? 'Update Log order conflict'
        : error.name === 'SyncConflict' ? 'Sync conflict — click Sync to review' : 'Sync unavailable — local edits kept';
    } finally {
      sharedRefreshChecking = null;
      updateToolbar();
    }
  };
  const check = () => {
    if (!session.ready || session.busy || sharedRefreshChecking || autosaveWorking || popState || dragSource || document.hidden) return;
    sharedRefreshChecking = refresh();
  };
  sharedRefreshTimer = setInterval(check, 2500);
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
    window.dispatchEvent(new CustomEvent('ri-editor-dirty'));
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
  const fields = binding.kind === 'game:bonus' ? bonusFields(binding)
    : binding.kind === 'table-row' ? (draft.getValue(binding.docName, binding.valuePath.replace(/\.rows\.\d+$/, '.columns')) || []).map((label, i) => ({ key: `cells.${i}`, label, type: 'area' }))
    : fieldsFor(binding.kind);
  popState = { ...binding, fields, hash:window.location.hash,recoveryTargetId:draft.getValue(binding.docName,binding.valuePath)?.id };
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
    fields.filter(meta=>!meta.advanced).forEach((meta) => body.appendChild(createField(meta, `${binding.valuePath}.${meta.key}`, binding.docName)));
    if(fields.some(meta=>meta.advanced)){
      const advanced=document.createElement('details');advanced.innerHTML='<summary>Advanced formulas</summary>';
      fields.filter(meta=>meta.advanced).forEach(meta=>advanced.appendChild(createField(meta,`${binding.valuePath}.${meta.key}`,binding.docName)));
      const help=document.createElement('p');help.className='ri-form-help';
      help.textContent='L = level, S = speed, T = tier. baseIncome, baseTime, scale, tierPrice, levelPrice and speedPrice use the settings above. Tier multipliers and global upgrades are applied separately.';
      advanced.appendChild(help);
      body.appendChild(advanced);
    }
    if (binding.kind === 'game:bonus') {
      const help = document.createElement('p');
      help.className = 'ri-form-help';
      help.textContent = 'Use amount for owned resources, level for levels, G for gears, or dust and p for Bone Dust. Leave the maximum and unlock empty if unused.';
      body.appendChild(help);
    }
  }
  const lastSegment = binding.valuePath.split('.').at(-1) || '';
  qs('[data-edit-pop-delete]', layer.popover).hidden = !/^\d+$/.test(lastSegment) && binding.kind !== 'game:calculator-settings';
  layer.popover.hidden = false;
  document.documentElement.classList.add('ri-edit-form-open');
  layer.bar.querySelector('[data-edit-resume]').hidden=true;
  // O popover edita o item (binding.el), mas pode ser ancorado em outro
  // elemento (ex.: o botao "+ New" que o abriu) para aparecer perto dele.
  positionPopover(binding.anchorEl?.isConnected ? binding.anchorEl : binding.el);
  body.querySelector('input, textarea, select')?.focus({ preventScroll: true });
  body.querySelectorAll('input,textarea,select').forEach((input)=>{input.dataset.recoveryOriginal=input.value;});
  restoreMatchingFields();
  persistForm();
}

function formRecoveryKey(){return `ri-editor-form:${session.user}`;}
function restoreMatchingFields(){
  const saved=readRecovery(formRecoveryKey());
  if(!saved||!popState)return;
  const targetId=popState.recoveryTargetId??draft.getValue(popState.docName,popState.valuePath)?.id;
  const match=[...(saved.pending||[]),saved].reverse().find(form=>form.hash===popState.hash&&Boolean(form.binding?.manage)===Boolean(popState.manage)&&form.binding?.docName===popState.docName&&(targetId?form.targetId===targetId:form.binding?.valuePath===popState.valuePath));
  if(match)restoreFields(match.fields);
}
function restoreFields(fields=[]){
  const inputs=[...layer.popover.querySelectorAll('input,textarea,select')].filter(input=>input.type!=='file');
  for(const field of fields){
    if(field.value===field.original)continue;
    const input=field.path?inputs.find(item=>item.dataset.editFieldPath===field.path)||inputs[field.index]:inputs[field.index];
    if(input){input.value=field.value;input.dispatchEvent(new Event('change',{bubbles:true}));}
  }
}
function persistForm(){
  if(!popState||!session.user)return isRecoveryStored(formRecoveryKey());
  const fields=[...layer.popover.querySelectorAll('input,textarea,select')].filter(input=>input.type!=='file').map((input,index)=>({index,path:input.dataset.editFieldPath,value:input.value,original:input.dataset.recoveryOriginal??input.defaultValue??''}));
  const {docName,valuePath,kind,label,manage}=popState;
  const value=docName&&valuePath?draft.getValue(docName,valuePath):null;
  const targetId=popState.recoveryTargetId??value?.id;
  if(!fields.some(field=>field.value!==field.original)){
    removeFormRecovery(formRecoveryKey(),{hash:popState.hash,binding:popState,targetId});
    return isRecoveryStored(formRecoveryKey());
  }
  const saved=storeFormRecovery(formRecoveryKey(),{hash:popState.hash,binding:{docName,valuePath,kind,label,manage},targetId,fields});
  if(!session.busy)barStatus(saved?'Editing · saved on this device':'Local backup unavailable — download draft','dirty');
  return saved;
}
function restoreForm(){
  const saved=readRecovery(formRecoveryKey());
  if(!saved||saved.hash!==window.location.hash||popState)return;
  const binding=saved.binding;
  if(!binding)return;
  if(binding.manage){openManageAdd(layer.bar);}else{
    if(!binding.docName||!binding.valuePath)return;
    if(saved.targetId && draft.getValue(binding.docName,binding.valuePath)?.id!==saved.targetId){
      const paths=[];
      const walk=(node,path='')=>{if(!node||typeof node!=='object')return;if(node.id===saved.targetId)paths.push(path);for(const [key,child]of Object.entries(node))walk(child,path?`${path}.${key}`:key);};
      walk(draft.doc(binding.docName));
      if(paths.length!==1){notify('Your saved form is preserved. Its item moved; reopen the item to continue.',true);return;}
      binding.valuePath=paths[0];
    }
    const el=document.querySelector(`[data-edit="${binding.docName}:${binding.valuePath}"]`)||layer.bar;
    openPopover({...binding,el});
  }
  restoreFields(saved.fields);
  persistForm();notify('Your unfinished edit was restored.');
}

async function deletePopoverItem() {
  if (!popState) return;
  const state = popState;
  const path = state.valuePath;
  const lastSegment = path.split('.').at(-1) || '';
  if (!/^\d+$/.test(lastSegment) && state.kind !== 'game:calculator-settings') {
    notify('Only list items can be deleted.', true);
    return;
  }
  const okDelete = window.confirm(`Remove "${state.label || 'this item'}" from the list? It stays in the draft until you publish.`);
  if (!okDelete) return;
  try {
    if (state.kind === 'game:calculator-settings') draft.setValue(state.docName, path, undefined);
    else draft.removeValue(state.docName, path);
    draft.applyDraftToSite();
    await rerender({ scroll: 'preserve' });
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    closePopover(true,true);
    updateToolbar();
    notify('Item removed. Remember to save/publish.');
  } catch (error) {
    notify(error.message || 'Could not remove this item.', true);
  }
}

function readValueForInput(type, original) {
  if (original == null) return '';
  if (type === 'formula') return String(original).replace(/^formula:\s*/, '');
  const parser = LIST_PARSERS[type];
  if (parser) return parser.print(original);
  if (Array.isArray(original)) return original.join('\n');
  return String(original);
}

function createField(meta, path, docName) {
  if (meta.picker === 'icon') return createIconField(meta, path, docName);
  const original = draft.getValue(docName, path) ?? meta.fallback;
  const wrap = document.createElement('label');
  wrap.className = 'ri-edit-field';
  if (meta.label) {
    const label = document.createElement('span');
    label.className = 'ri-edit-field__label';
    label.textContent = meta.label;
    wrap.appendChild(label);
  }
  const numeric = meta.numeric || typeof original === 'number';

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
    if (original && ![...input.options].some((option) => option.value === String(original))) {
      input.appendChild(Object.assign(document.createElement('option'), { value: String(original), textContent: String(original) }));
    }
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
  } else if (meta.type === 'area' || meta.type === 'formula' || meta.type === 'area-list' || LIST_PARSERS[meta.type]) {
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
// Official Game Icons and existing Lucide icons, with searchable previews.
export function makeIconPicker(initialValue) {
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
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Browse wiki icons');
  panel.innerHTML = `
    <div class="ri-icon-picker__header"><strong>Browse icons</strong><button type="button" class="btn btn--ghost btn--sm ri-icon-picker__close" aria-label="Close icon browser">Close ✕</button></div>
    <div class="ri-icon-picker__search">
      <input class="input" type="search" placeholder="Search: fire, sword, crystal, fogo…" aria-label="Search icons" />
      <select class="input" aria-label="Icon collection"><option value="all">All icons</option><option value="game">Game Icons — game items & fantasy</option><option value="lucide">Lucide — interface & outlines</option></select>
      <small class="ri-icon-picker__count" role="status" aria-live="polite"></small>
    </div>
    <div class="ri-icon-picker__grid"></div>
    <button type="button" class="btn btn--ghost btn--sm ri-icon-picker__more" hidden>Show more</button>
    <small class="ri-icon-picker__source">Icons by <a href="https://game-icons.net/" target="_blank" rel="noopener noreferrer">Game-icons.net</a> · <a href="images/icons/game-icons/LICENSE.txt" target="_blank" rel="noopener noreferrer">Authors / CC BY 3.0</a> · <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide</a></small>`;

  const grid = panel.querySelector('.ri-icon-picker__grid');
  const search = panel.querySelector('input');
  const collection = panel.querySelector('select');
  const count = panel.querySelector('.ri-icon-picker__count');
  const more = panel.querySelector('.ri-icon-picker__more');
  let limit = 64;
  const renderGrid = () => {
    const matches = searchIcons(search.value, collection.value);
    const visible = matches.slice(0, limit);
    count.textContent = matches.length ? `${visible.length} of ${matches.length} icons · click to select` : 'No icons found. Try fire, sword, crystal or fogo.';
    grid.innerHTML = visible.map(({id,name,source}) => `<button type="button" class="ri-icon-cell${id === input.value ? ' is-on' : ''}" aria-label="${esc(name)} (${source === 'game' ? 'Game Icons' : 'Lucide'})" aria-pressed="${id === input.value}" title="${esc(name)} — ${source === 'game' ? 'Game Icons' : 'Lucide'}" data-icon-name="${esc(id)}">${icon(id, 28)}<span>${esc(name.replaceAll('-', ' '))}</span></button>`).join('');
    more.hidden = visible.length >= matches.length;
  };
  const resetGrid = () => { limit = 64; renderGrid(); grid.scrollTop = 0; };

  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-icon-name]');
    if (!cell) return;
    input.value = cell.dataset.iconName;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    preview.innerHTML = icon(input.value || 'circle', 22);
    grid.querySelectorAll('.ri-icon-cell').forEach((el) => { el.classList.toggle('is-on', el === cell); el.setAttribute('aria-pressed', String(el === cell)); });
    // Selecting an icon returns to the form, where Apply commits the edit.
    closeBrowser();
  });

  input.addEventListener('input', () => {
    preview.innerHTML = icon(input.value.trim() || 'circle', 22);
  });
  // Move the browser outside the small clipped editor popover so it can
  // occupy the whole viewport. Keep input/preview in the original form.
  let home = null;
  let previousFocus = null;
  const closeBrowser = () => {
    if (panel.hidden) return;
    panel.hidden = true;
    panel.classList.remove('ri-icon-picker--fullscreen');
    if (home?.isConnected) home.appendChild(panel);
    else panel.remove();
    document.documentElement.classList.remove('ri-icon-browser-open');
    document.removeEventListener('keydown', onBrowserKeydown, true);
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const onBrowserKeydown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeBrowser(); }
  };
  browse.addEventListener('click', (event) => {
    event.preventDefault();
    if (!panel.hidden) { closeBrowser(); return; }
    // Close any other icon browser first, including one left open by a
    // previous form. The full-screen panel is always a single active dialog.
    document.querySelectorAll('.ri-icon-picker--fullscreen').forEach(el => el.dispatchEvent(new Event('ri-picker-close')));
    home = panel.parentElement;
    previousFocus = document.activeElement;
    document.body.appendChild(panel);
    panel.hidden = false;
    panel.classList.add('ri-icon-picker--fullscreen');
    document.documentElement.classList.add('ri-icon-browser-open');
    document.addEventListener('keydown', onBrowserKeydown, true);
    search.value = '';
    resetGrid();
    search.focus({ preventScroll: true });
  });
  // This modal lives under <body> while open, outside the edit popover.
  // Stop its events before the page-level edit click handler can cancel them.
  panel.addEventListener('click', (event) => event.stopPropagation());
  panel.addEventListener('pointerdown', (event) => event.stopPropagation());
  panel.addEventListener('ri-picker-close', closeBrowser);
  panel.querySelector('.ri-icon-picker__close').addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); closeBrowser(); });
  search.addEventListener('input', resetGrid);
  collection.addEventListener('change', resetGrid);
  more.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); limit += 64; renderGrid(); });

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

function closePopover(silent = false,discard = false) {
  document.querySelectorAll('.ri-icon-picker--fullscreen').forEach(el => el.dispatchEvent(new Event('ri-picker-close')));
  if (!popState) return;
  if(discard)removeFormRecovery(formRecoveryKey(),{hash:popState.hash,binding:popState,targetId:popState.recoveryTargetId??draft.getValue(popState.docName,popState.valuePath)?.id});else persistForm();
  popState = null;
  layer.popover.hidden = true;
  document.documentElement.classList.remove('ri-edit-form-open');
  layer.popover.querySelector('[data-edit-pop-body]').innerHTML = '';
  updateToolbar();
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
    const writes=[];
    for (const input of inputs) {
      const path = input.dataset.editFieldPath.replaceAll('·', '.');
      const docName = input.dataset.editFieldDoc;
      const type = input.dataset.editFieldType;
      if (input.value === (input.dataset.recoveryOriginal ?? readValueForInput(type, draft.getValue(docName, path)))) continue;
      const numeric = input.dataset.editFieldNumeric === '1';
      let value = input.value;
      if (state.kind === 'game:calculator-settings' && path.endsWith('.showAmount')) value = value !== 'false';
      if (docName === 'updates' && /versions\.\d+\.version$/.test(path)) {
        value = value.trim();
        if (draft.doc('updates').versions.some((release, i) => i !== Number(path.split('.')[1]) && release.version.trim() === value)) throw new Error('That version already exists. Choose a different release version.');
      }
      if(docName==='updates'&&/versions\.\d+\.date$/.test(path)){
        value=value.trim();
        const date=new Date(`${value}T12:00:00Z`);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Enter a valid release date in YYYY-MM-DD format.');
      }
      if (type === 'formula') {
        value = `formula: ${value.replace(/^formula:\s*/, '').trim()}`;
      } else if (LIST_PARSERS[type]) {
        value = LIST_PARSERS[type].parse(value);
      } else if (type === 'area-list') {
        value = value.split('\n').map((line) => line.trim()).filter(Boolean);
      } else if (numeric) {
        const parsed = Number(value.replace(',', '.'));
        if (value.trim() && !Number.isFinite(parsed)) throw new Error('Enter a valid number, or leave the optional field empty.');
        value = value.trim() === '' ? undefined : parsed;
      }
      if (state.kind === 'game:bonus' && /\.(unlockAt|unlockLevel)$/.test(path)) writes.push([docName, `${state.valuePath}.unlockLabel`, undefined]);
      if (state.kind === 'game:bonus' && path.endsWith('.unit')) writes.push([docName, `${state.valuePath}.capUnit`, value === 'cap' ? 'CAP' : value || 'x']);
      writes.push([docName,path,value]);
    }
    const candidate=draft.snapshotDocs();
    for(const[name,path,value]of writes){
      const keys=path.split('.');let node=candidate[name];
      for(let i=0;i<keys.length-1;i++)node=node[keys[i]]??=(/^\d+$/.test(keys[i+1])?[]:{});
      if(value===undefined)delete node[keys.at(-1)];else node[keys.at(-1)]=value;
    }
    validateDocuments(candidate);
    for(const[name,path,value]of writes){if(name==='wiki'&&path.endsWith('.id'))pinContentKeys(draft.doc('wiki'));draft.setValue(name,path,value);}
    try {
      draft.applyDraftToSite();
      await rerender({ scroll: 'preserve' });
      window.dispatchEvent(new CustomEvent('ri-edit-content'));
      closePopover(true,true);
      updateToolbar();
      notify('Content applied. Remember to save/publish.');
    } catch (error) {
      const warn = qs('[data-edit-pop-warn]', layer.popover);
      warn.textContent = error.message || 'The content is invalid, but it stays in your draft.';
      warn.hidden = false;
    }
  } catch (error) {
    const warn = qs('[data-edit-pop-warn]', layer.popover);
    warn.textContent = error.message || 'Check the entered values.';
    warn.hidden = false;
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
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="bulk">${icon('layers', 14)} Bulk editor</button>
      <button type="button" class="ri-nav-tool" data-ri-nav-tool="versions">${icon('history', 14)} Versions</button>
      <small class="ri-nav-tools__hint" hidden>Drag a page between two items to reposition it — or drop it in the middle of a category/page header to nest it inside. Only in Edit mode.</small>`;
    nav.appendChild(box);
    box.querySelector('[data-ri-nav-tool="add"]').addEventListener('click', (event) => openManageAdd(event.currentTarget));
    box.querySelector('[data-ri-nav-tool="colors"]').addEventListener('click', () => openAdminPage('colors'));
    box.querySelector('[data-ri-nav-tool="versions"]').addEventListener('click', () => openAdminPage('versions'));
    box.querySelector('[data-ri-nav-tool="bulk"]').addEventListener('click', () => openAdminPage('bulk'));
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

const bulkView={
  title:()=> 'Bulk editor — RI Gaming Wiki',
  crumbs:()=>[{label:'Main',href:'#/',icon:'compass'},{label:'Bulk editor',icon:'layers'}],
  nav:()=>null,
  render(root){
    if(!editorPageShell(root,'layers','Bulk editor'))return;
    if(popState)closePopover(true);
    if(!session.editing)setEditing(true);
    renderBulkEditor(root);
  }
};
registerRoute(/^bulk$/,bulkView);

function allBulkPages(){
  const pages=[];
  const walk=(items,parentPath,group)=>{
    (items||[]).forEach((page,index)=>{
      const path=`${parentPath}.${index}`;
      pages.push({path,id:page.id,name:page.name,group});
      walk(page.children,`${path}.children`,`${group} › ${page.name}`);
    });
  };
  (draft.doc('wiki')?.categories||[]).forEach((cat,i)=>{
    pages.push({path:`categories.${i}`,id:cat.id,name:cat.name,group:'Categories'});
    walk(cat.subcategories,`categories.${i}.subcategories`,cat.name);
  });
  return pages;
}

function renderBulkEditor(root){
  const pages=allBulkPages();
  root.innerHTML=`<section class="section ri-admin-section ri-bulk">
    <h2 class="ri-admin-section__title">${icon('layers',16)} Bulk edit pages</h2>
    <p class="ri-review-hint">Select pages, choose one operation and review the count before applying. This stages ordinary draft edits with Undo and Supabase autosave; it does <b>not Publish</b>. IDs, names, children and page hierarchy are protected.</p>
    <div class="ri-bulk__controls"><label>Filter pages <input type="search" class="input" data-bulk-filter placeholder="Search pages…" /></label><label>Operation<select class="input" data-bulk-action><option value="icon">Set icon</option><option value="desc">Set description</option><option value="replace">Find and replace descriptions</option></select></label></div>
    <div class="ri-bulk__inputs"><label data-bulk-find-label hidden>Find text <input class="input" data-bulk-find placeholder="Existing phrase"></label><label>New value <input class="input" data-bulk-value placeholder="e.g. game-icons:leaf" /></label></div>
    <div class="ri-bulk__select"><label><input type="checkbox" data-bulk-all> Select visible</label><span data-bulk-count>0 selected</span></div>
    <div class="ri-bulk__list">${pages.map((p,i)=>`<label class="ri-bulk__page" data-bulk-row data-bulk-key="${i}"><input type="checkbox" data-bulk-check value="${i}"><span><b>${esc(p.name)}</b><small>${esc(p.group)}</small></span></label>`).join('')}</div>
    <div class="ri-bulk__actions"><button class="btn btn--primary" type="button" data-bulk-apply disabled>${icon('check',15)} Apply to selected pages</button></div>
  </section>`;
  const filter=root.querySelector('[data-bulk-filter]'),action=root.querySelector('[data-bulk-action]'),value=root.querySelector('[data-bulk-value]'),find=root.querySelector('[data-bulk-find]'),count=root.querySelector('[data-bulk-count]'),apply=root.querySelector('[data-bulk-apply]'),all=root.querySelector('[data-bulk-all]'),rows=[...root.querySelectorAll('[data-bulk-row]')];
  const selected=()=>rows.filter(row=>row.querySelector('[data-bulk-check]').checked).map(row=>pages[Number(row.dataset.bulkKey)]);
  const refresh=()=>{const n=selected().length;count.textContent=`${n} page${n===1?'':'s'} selected`;apply.disabled=!n||!value.value.trim()||(action.value==='replace'&&!find.value);root.querySelector('[data-bulk-find-label]').hidden=action.value!=='replace';value.placeholder=action.value==='icon'?'e.g. game-icons:leaf':action.value==='desc'?'Description for every selected page':'Replacement phrase';};
  filter.addEventListener('input',()=>{const q=filter.value.toLowerCase().trim();rows.forEach(row=>{const page=pages[Number(row.dataset.bulkKey)];row.hidden=!(page.name+' '+page.group).toLowerCase().includes(q);});});
  all.addEventListener('change',()=>{rows.filter(row=>!row.hidden).forEach(row=>{row.querySelector('[data-bulk-check]').checked=all.checked;});refresh()});
  root.querySelector('.ri-bulk__list').addEventListener('change',refresh);
  [action,value,find].forEach(el=>el.addEventListener('input',refresh));
  apply.addEventListener('click',async()=>{
    const chosen=selected(),op=action.value,next=value.value,term=find.value;
    if(!chosen.length||!next.trim()||chosen.length>250)return;
    if(op==='replace'&&!term)return;
    if(op==='icon'&&!/^[a-z0-9_:.-]{1,100}$/i.test(next.trim())){notify('Use a valid icon name (e.g. leaf or game-icons:leaf).',true);return;}
    const changes=chosen.flatMap(page=>{
      const data=draft.doc('wiki'),node=locate(data,page.path);
      if(!node)return [];
      const key=op==='icon'?'icon':'desc';
      const original=String(node[key]||'');
      const newValue=op==='replace'?original.split(term).join(next):next;
      return newValue!==original?[{page,key,value:newValue}]:[];
    });
    if(!changes.length){notify('No matching pages need to be changed.');return;}
    const approved=await editorReviewDialog('Confirm bulk edit',`<p>This will update <b>${changes.length} page${changes.length===1?'':'s'}</b> in your working draft, and Supabase autosave may share them with collaborators. It will <b>not Publish</b> to GitHub. Use Undo or a version to recover if needed.</p><p>Operation: <b>${esc(action.selectedOptions[0].textContent)}</b>.</p>`,{confirmText:`Apply ${changes.length} edits`});
    if(!approved)return;
    try{
      // Validate the entire hypothetical edit before changing a single field.
      const candidate=draft.snapshotDocs();
      changes.forEach(item=>{const node=locate(candidate.wiki,item.page.path);if(!node)throw new Error('Page moved during bulk edit. Refresh and try again.');node[item.key]=item.value;});
      validateDocuments(candidate);
      changes.forEach(item=>draft.setValue('wiki',`${item.page.path}.${item.key}`,item.value));
      draft.applyDraftToSite();buildNav();window.dispatchEvent(new CustomEvent('ri-edit-content'));
      notify(`${changes.length} bulk edit(s) staged. Autosave will share; Publish is separate.`);
      await rerender({scroll:'preserve'});
    }catch(error){notify(error.message||'Bulk edit failed.',true)}
  });
  refresh();
}


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
      <span class="ri-history-row__pending" data-status="${esc(['pending','saved','published'].includes(entry.status) ? entry.status : (entry.pending ? 'pending' : 'published'))}">${esc(['pending','saved','published'].includes(entry.status) ? entry.status : (entry.pending ? 'pending' : 'published'))}</span>
    </div>`).join('');
}

function openAdminPage(kind) {
  if (!session.ready || !session.allowed) return;
  window.location.hash = kind === 'colors' ? '#/colors' : kind === 'bulk' ? '#/bulk' : '#/versions';
}

// Native modal: scrollable, keyboard dismissible and read-only until confirmed.
function editorReviewDialog(title,body,{confirmText='',danger=false}={}) {
  const node=document.createElement('dialog');node.className='ri-review-dialog';
  node.innerHTML=`<div class="ri-review-dialog__head"><h2>${esc(title)}</h2><button type="button" class="btn btn--ghost btn--sm" data-review-cancel aria-label="Close">${icon('x',15)}</button></div><div class="ri-review-dialog__body">${body}</div><div class="ri-review-dialog__actions"><button type="button" class="btn btn--ghost btn--sm" data-review-cancel>${confirmText?'Cancel':'Close'}</button>${confirmText?`<button type="button" class="btn ${danger?'btn--danger':'btn--primary'} btn--sm" data-review-confirm>${esc(confirmText)}</button>`:''}</div>`;
  document.body.appendChild(node);
  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;node.close?.();node.remove();resolve(value);};
    node.addEventListener('click',event=>{
      if(event.target.closest('[data-review-cancel]'))finish(false);
      if(event.target.closest('[data-review-confirm]'))finish(true);
      if(event.target===node)finish(false);
    });
    node.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
    if(typeof node.showModal==='function')node.showModal();
    else finish(window.confirm(title+'\n'+(confirmText||'Continue?')));
  });
}

function diffRowsHTML(changes) {
  if(!changes.length)return '<p class="ri-color-row__empty">No differences from the current shared draft.</p>';
  return `<p class="ri-review-count">Showing ${changes.length} change${changes.length===1?'':'s'} (up to 40).</p><div class="ri-review-diffs">${changes.map(x=>`<article class="ri-review-diff"><b>${esc(x.path)}</b><div><span>Before</span><code>${esc(x.before)}</code></div><div><span>After</span><code>${esc(x.after)}</code></div></article>`).join('')}</div>`;
}
async function showPublishPreview() {
  const published={wiki:draft.appPublishedDocs('wiki'),game:draft.appPublishedDocs('game'),updates:draft.appPublishedDocs('updates')};
  const changed=documentChanges(published,draft.snapshotDocs(),40);
  const warning=draft.hasRestoredDraft()?'<p class="ri-review-warning">This includes a restored snapshot. Confirm that no recent collaborator changes will be replaced.</p>':'';
  return editorReviewDialog('Publish preview',`
    <p>These changes will be sent to GitHub in one Publish commit. Vercel deployment happens separately. Autosave remains unpublished.</p>
    ${warning}
    <p class="ri-review-hint">Use the <b>Preview</b> toggle in the editor toolbar to see the current draft rendered exactly as a visitor would.</p>
    ${diffRowsHTML(changed)}` ,{confirmText:'Confirm Publish'});
}

function renderVersionsPage(root) {
  root.innerHTML=`<section class="section ri-admin-section">
    <h2 class="ri-admin-section__title">${icon('history',15)} Recovery versions</h2>
    <p class="ri-review-hint">Autosave syncs your draft to Supabase every time you edit, <b>without creating a Version</b>. Versions are created only by <b>Publish</b> or by clicking the checkpoint button below. Restoring stages a local draft and never publishes. <b>Discard</b> only throws away edits on this device.</p>
    <div class="ri-versions-actions"><button type="button" class="btn btn--ghost btn--sm" data-ri-versions-save>${icon('save',13)} Create manual checkpoint</button></div>
    <div data-ri-versions-list><p class="ri-color-row__empty">Loading recovery checkpoints…</p></div>
  </section>
  <section class="section ri-admin-section"><h2 class="ri-admin-section__title">${icon('history',15)} Edit activity</h2><p class="ri-review-hint">Pending = only on your device, Saved = shared live draft, Published = live on GitHub (once deployed).</p><div data-ri-history><p class="ri-color-row__empty">Loading…</p></div></section>`;

  const restoreFlow=async name=>{
    if(session.busy)return;
    if(!session.canPublish){notify('Only Quaantic and zzinss can stage full version restores.',true);return;}
    if(!window.confirm(`Stage \"${draft.versionLabel(name)}\" into your local editor?\n\nThis does NOT publish or save for everyone. Your local draft will be replaced. Download a recovery copy first if necessary.`))return;
    session.busy=true;
    try{
      await draft.restoreVersion(session.token,name);
      session.syncError='';buildNav();window.dispatchEvent(new CustomEvent('ri-edit-content'));updateToolbar();
      await rerender({scroll:'preserve'});notify('Version staged locally. Review it, then Share restored draft. Publish is always separate.');
    }catch(error){notify(error.message||'Restore failed.',true)}
    finally{session.busy=false;updateToolbar()}
  };
  const versionCompare=async name=>{
    if(session.busy)return;
    session.busy=true;updateToolbar();
    try{
      const old=await draft.readVersion(session.token,name);
      const now=draft.snapshotDocs();
      const changed=documentChanges(old,now,40);
      const pages=collectPageRoutes().filter(r=>/^#\/[\w-]+(?:\/[\w-]+)?$/.test(r.route)&&!['#/updates','#/credits','#/feedback'].includes(r.route));
      const html=`<p class="ri-review-hint">Compare a historical checkpoint against the current shared draft. This does not change anything.</p>${diffRowsHTML(changed)}
        <div class="ri-review-page"><label for="ri-review-page-picker">Restore only one page (not its child pages)</label><select id="ri-review-page-picker" class="input"><option value="">Select an existing page…</option>${pages.map(r=>`<option value="${esc(r.route)}">${esc(r.label)}</option>`).join('')}</select><div class="ri-review-page__details" data-ri-page-changes></div><button type="button" class="btn btn--ghost btn--sm" data-ri-page-restore disabled>${icon('rotate-ccw',13)} Stage selected page locally</button></div>`;
      const node=document.createElement('dialog');node.className='ri-review-dialog';
      node.innerHTML=`<div class="ri-review-dialog__head"><h2>${icon('git-compare',16)} Compare version</h2><button type="button" class="btn btn--ghost btn--sm" data-close>Close</button></div><div class="ri-review-dialog__body">${html}</div>`;
      document.body.appendChild(node);
      const close=()=>{node.close?.();node.remove()};
      node.querySelector('[data-close]').addEventListener('click',close);
      node.addEventListener('cancel',e=>{e.preventDefault();close()});
      const picker=node.querySelector('#ri-review-page-picker'),button=node.querySelector('[data-ri-page-restore]'),details=node.querySelector('[data-ri-page-changes]');
      picker.addEventListener('change',()=>{
        const [cat,sub]=picker.value.slice(2).split('/');
        const previous=pageFromDocs(old,cat,sub),current=pageFromDocs(now,cat,sub);
        if(!picker.value||!previous||!current){details.textContent='This page is unavailable in one version.';button.disabled=true;return;}
        const snapshot=structuredClone(previous),working=structuredClone(current);
        delete snapshot.children;delete working.children;delete snapshot.subcategories;delete working.subcategories;
        const differences=documentChanges({wiki:snapshot},{wiki:working},20);
        details.textContent=differences.length?`${differences.length} page field(s) differ. Check the version carefully before restoring.`:'No changes on this page.';
        button.disabled=!differences.length;
      });
      button.addEventListener('click',async()=>{
        if(!picker.value)return;
        if(!window.confirm(`Stage ${picker.selectedOptions[0].textContent} from this checkpoint? Only fields on this page will be replaced. Collaborative autosave will share it, but Publish remains manual.`))return;
        button.disabled=true;
        try{
          const [cat,sub]=picker.value.slice(2).split('/');
          const changed=await draft.restorePageFromVersion(session.token,name,cat,sub||'');
          if(changed){draft.applyDraftToSite();buildNav();window.dispatchEvent(new CustomEvent('ri-edit-content'));await rerender({scroll:'preserve'});notify('Page restored locally. Autosave will share it; Publish is separate.');}
          else notify('This page already matches that checkpoint.');
          close();
        }catch(error){notify(error.message||'Page restore failed.',true)}
      });
      if(typeof node.showModal==='function')node.showModal();else{close();notify('Version compare requires an updated browser.',true)}
    }catch(error){notify(error.message||'Compare failed.',true)}
    finally{session.busy=false;updateToolbar()}
  };

  qs('[data-ri-versions-save]',root).addEventListener('click',async()=>{
    if(session.busy)return;
    session.busy=true;updateToolbar();
    try{
      if(draft.hasRestoredDraft()&&!window.confirm('Share restored snapshot with editors before checkpointing?'))return;
      await draft.saveDraft(session.token,confirmReleaseOrder,{automatic:true});
      const name=await draft.createVersion(session.token,draft.snapshotDocs(),'Manual checkpoint','save');
      session.syncError='';draft.applyDraftToSite();window.dispatchEvent(new CustomEvent('ri-edit-content'));
      notify(`Checkpoint created: ${draft.versionLabel(name)}. Not published.`);renderVersionsPage(root);
    }catch(error){notify(error.message||'Checkpoint failed; the shared draft was not replaced.',true)}
    finally{session.busy=false;updateToolbar()}
  });
  void(async()=>{
    const list=qs('[data-ri-versions-list]',root),historyBox=qs('[data-ri-history]',root);
    try{
      const [versions,history]=await Promise.all([draft.listVersions(session.token),draft.listEditHistory(session.token).catch(()=>[])]);
      if(!root.isConnected)return;
      const group=(items,label,explanation)=>{
        if(!items.length)return '';
        return `<div class="ri-version-group"><h3>${esc(label)} <small>${items.length}</small></h3><p class="ri-review-hint">${esc(explanation)}</p>${items.map((v,i)=>`<div class="ri-version-row" ${i>=7?'hidden data-older-version':''}>
          <div class="ri-version-row__details"><b>${esc(v.action==='publish'?'Published checkpoint':v.source==='supabase'?'Manual checkpoint':v.action==='save'?'Legacy save backup':'Backup')}</b><span>${esc(v.createdAt?formatHistoryDate(v.createdAt):draft.versionLabel(v.name))}</span><small>@${esc(v.actor||'unknown')} ${v.revision!=null?` · Revision ${v.revision}`:''} · ${esc(v.source==='supabase'?'Supabase':'GitHub archive')}</small></div>
          <button type="button" class="btn btn--ghost btn--sm" data-ri-version-compare="${esc(v.name)}">${icon('git-compare',12)} Compare</button>
          <button type="button" class="btn btn--ghost btn--sm" data-ri-version-recover="${esc(v.name)}">${icon('plus',12)} Recover missing</button>
          <button type="button" class="btn btn--ghost btn--sm" data-ri-version-restore="${esc(v.name)}" ${session.canPublish?'':'disabled'}>${icon('rotate-ccw',12)} Restore all</button>
        </div>`).join('')}${items.length>7?`<button type="button" class="btn btn--ghost btn--sm" data-ri-show-older>Show ${items.length-7} older versions</button>`:''}</div>`;
      };
      const active=versions.filter(v=>v.source==='supabase'),legacy=versions.filter(v=>v.source==='github');
      list.innerHTML=versions.length?group(active,'Recent checkpoints','Created explicitly by Publish or Create manual checkpoint. Autosave does not create these.')+group(legacy,'Historical GitHub backups','Preserved from the older editor. Collapsed to keep the list readable; never automatically deleted.'):'<p class="ri-color-row__empty">No recovery checkpoints yet. Create a manual checkpoint or Publish.</p>';
      list.addEventListener('click',e=>{
        const btn=e.target.closest('[data-ri-version-compare],[data-ri-version-recover],[data-ri-version-restore],[data-ri-show-older]');if(!btn)return;
        if(btn.hasAttribute('data-ri-show-older')){
          const group=btn.closest('.ri-version-group');const hidden=group.querySelectorAll('[data-older-version]');const show=[...hidden].some(el=>el.hidden);
          hidden.forEach(el=>el.hidden=!show);btn.textContent=show?'Hide older versions':`Show ${hidden.length} older versions`;return;
        }
        if(btn.dataset.riVersionCompare){void versionCompare(btn.dataset.riVersionCompare);return;}
        if(btn.dataset.riVersionRestore){void restoreFlow(btn.dataset.riVersionRestore);return;}
        if(btn.dataset.riVersionRecover){void(async()=>{if(session.busy)return;session.busy=true;try{const n=await draft.recoverMissingPages(session.token,btn.dataset.riVersionRecover);draft.applyDraftToSite();buildNav();window.dispatchEvent(new CustomEvent('ri-edit-content'));notify(`${n} missing page(s) staged locally. Publish remains manual.`);}catch(error){notify(error.message,true)}finally{session.busy=false;updateToolbar()}})();}
      });
      renderHistoryList(historyBox,history);
    }catch(error){list.innerHTML=`<p class="ri-color-row__empty">${esc(error.message||'Could not load versions.')}</p>`;}
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
  const routes = [
    { route: '#/updates', label: 'Update Log', search: 'update log updates releases' },
    { route: '#/credits', label: 'Credits', search: 'credits' },
    { route: '#/feedback', label: 'Feedback', search: 'feedback feedbacks' },
  ];
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
  popState = { manage: true, label: 'Add pages',hash:window.location.hash };
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
    ['stages', 'Stages / Evolutions / Milestones (requirements and rewards)'],
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
  document.documentElement.classList.add('ri-edit-form-open');
  layer.bar.querySelector('[data-edit-resume]').hidden=true;
  positionPopover(anchor?.isConnected ? anchor : navEl()?.querySelector('[data-ri-nav-tools]'));
  body.scrollTop = 0;
  nameIn.focus({ preventScroll: true });
  body.querySelectorAll('input,textarea,select').forEach(input=>{input.dataset.recoveryOriginal=input.value;});
  restoreMatchingFields();
  persistForm();
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
    closePopover(true,true);
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
  evolutions: 'an Evolutions list',
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
  const progressionBuckets = { evolutions: 'stages', stages: 'stages', barns: 'barns', ranks: 'ranks', ascensions: 'ascensions', lifeRanks: 'lifeRanks', cores: 'cores' };
  const bucket = progressionBuckets[type];
  if (bucket) {
    const path = `progression.${bucket}.${gameKey}`;
    if (existing(path)) return 'exists';
    const listKey = bucket === 'stages' || bucket === 'barns' ? 'stages' : 'ranks';
    const itemLabel = type === 'evolutions' || /evolution/i.test(pageName) ? 'Evolution' : /milestone/i.test(pageName) ? 'Milestone' : ({ barns:'Barn',ranks:'Rank',ascensions:'Ascension',lifeRanks:'Life Rank',cores:'Core Rank' }[type] || 'Stage');
    draft.setValue('game', path, { title: `${itemLabel}s`, itemLabel, [listKey]: [{ ...STAGE_TEMPLATE(), title: `${itemLabel} 1` }] });
    return 'created';
  }
  if (type === 'upgrades') {
    const linkedSection = existing(`upgrades.routes.${gameKey}`);
    if (linkedSection && existing(`upgrades.sections.${linkedSection}`)) return 'exists';
    const sectionKey = gameKey.replace(/\//g, '-');
    if (existing(`upgrades.sections.${sectionKey}`)) {
      draft.setValue('game', `upgrades.routes.${gameKey}`, sectionKey);
      return 'exists';
    }
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
      kind: 'amount', title: pageName, amountLabel: `${pageName} owned`, showAmount: true, defaultAmount: 0, bonuses: [BONUS_TEMPLATE()],
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
    ...cat,
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
  delete converted.subcategories;
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
    pinContentKeys(draft.doc('wiki'));
    // The conversion was planned before pinning: keep the newly pinned data
    // identities on the converted category and all of its descendants.
    for (const conv of plan.converts || []) {
      conv.value = { ...draft.getValue('wiki', conv.path), ...conv.value };
      delete conv.value.subcategories;
    }
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
  if(template==='generator') return {id:`generator${crypto.randomUUID().replaceAll('-','')}`,name:'New generator',unlockCost:0,startIncome:1,startTime:5,scale:1,maxLevel:50,maxSpeed:10,maxTier:3,tierPrice:50,levelPrice:5,speedPrice:10};
  const simple = {
    ore: { name:'New ore',icon:'gem',color:'#86d62b',depth:'0',luck:'0' },
    layer: { name:'New layer',num:'1',depth:'0',ores:[] },
    'mastery-ore': { name:'New mastery ore',icon:'gem',color:'#86d62b',upgrades:[] },
    rune: { name:'New rune',icon:'sparkles',luck:'0',baseChance:'1 in 100',recChance:'1 in 100',boosts:[{target:'Energy',mult:'1x'}] },
    area: { name:'New area',reqT1:0,multiT1:1,reqT2:0,multiT2:1 },
    gear: { name:'New gear',rarity:1,stats:{Energy:1} },
    pair: { label:'New fact',value:'Value' },
    card: { title:'New highlight',icon:'sparkles',text:'Describe this highlight.' },
    credit: { name:'New contributor',handle:'',role:'Contributor',avatar:'',banner:'#355528' },
  };
  if (simple[template]) return structuredClone(simple[template]);
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
    return { version: nextReleaseVersion(doc.versions), date: new Date().toISOString().slice(0, 10), entries: [] };
  }
  if (template === 'entry') {
    return { id: `entry-${crypto.randomUUID()}`, context: 'Feature', title: 'New update', href: '', description: 'What changed in the game.' };
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
  if (template === 'text-section') {
    return { id: `text-${crypto.randomUUID()}`, title: 'New section', text: 'Write a description or FAQ answer here.' };
  }
  if (template === 'table-section') return { id: `table-${crypto.randomUUID()}`, title: 'New table', columns: ['Name', 'Requirement', 'Effect'], rows: [], text: '' };
  if (template === 'table-row') {
    const columns = locate(doc, trail.replace(/\.rows$/, '.columns')) || [];
    return { id: `row-${crypto.randomUUID()}`, cells: columns.map(() => '') };
  }
  if (template === 'bonus-group') {
    const used = new Set((locate(doc, trail) || []).map((group) => group.id));
    return { id: uniqueIn('group', used), name: 'New group', color: '#86d62b', dropChance: '', amountLabel: 'Amount owned', bonuses: [BONUS_TEMPLATE()] };
  }
  if (template === 'stage') {
    const list = locate(doc, trail) || [];
    const next = Math.max(0, ...list.map((item) => Number(item.num)).filter(Number.isFinite)) + 1;
    const parent = locate(doc, trail.replace(/\.(stages|ranks)$/, ''));
    const itemLabel = parent?.itemLabel || (parent?.title === 'Evolutions' ? 'Evolution' : 'Stage');
    return {
      title: `${itemLabel} ${next}`,
      num: String(next),
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
    if(template==='version')window.dispatchEvent(new CustomEvent('ri-edit-new-release'));
    if (!Array.isArray(draft.getValue(docName, trail))) draft.setValue(docName, trail, []);
    let index = draft.pushValue(docName, trail, value);
    if (template === 'version' && index > 0) {
      draft.moveValue(docName, trail, index, trail, 0);
      index = 0;
    }
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

// Content can be added to any existing page; each type keeps its own data.
export function addContentToPage(gameKey, wikiPath, type) {
  const page = draft.getValue('wiki', wikiPath);
  if (!page) throw new Error('This page no longer exists.');
  if (type === 'fact' || type === 'highlight' || type === 'subpage') {
    const field = type === 'fact' ? 'facts' : type === 'subpage' ? 'children' : 'highlights';
    const kind = type === 'fact' ? 'pair' : type === 'subpage' ? 'sub-card' : 'card';
    const path = `${wikiPath}.${field}`;
    if (!Array.isArray(draft.getValue('wiki',path))) draft.setValue('wiki',path,[]);
    const index = draft.pushValue('wiki',path,buildAddValue('wiki',path,kind));
    return { docName:'wiki',valuePath:`${path}.${index}`,kind,label:type === 'fact' ? 'Page fact' : type === 'subpage' ? 'Subpage' : 'Highlight' };
  }
  if (type === 'text' || type === 'table') {
    const path = `${wikiPath}.sections`;
    if (!Array.isArray(draft.getValue('wiki', path))) draft.setValue('wiki', path, []);
    const kind = type === 'table' ? 'table-section' : 'text-section';
    const index = draft.pushValue('wiki', path, buildAddValue('wiki', path, kind));
    return { docName: 'wiki', valuePath: `${path}.${index}`, kind, label: type === 'table' ? 'Table' : 'Text / FAQ section' };
  }
  const created = createGamePageContainer(gameKey, page.name, type);
  let listPath, kind, label;
  if (type === 'stages' || type === 'evolutions') {
    listPath = `progression.stages.${gameKey}.stages`;
    kind = 'game:stage'; label = type === 'evolutions' ? 'Evolution' : 'Stage';
  } else if (type === 'upgrades') {
    const section = draft.getValue('game', `upgrades.routes.${gameKey}`);
    listPath = `upgrades.sections.${section}.upgrades`;
    kind = 'game:upgrade'; label = 'Upgrade';
  } else if (type === 'calc-groups') {
    const calc = draft.getValue('game', `calculators.pages.${gameKey}`);
    if (calc.kind !== 'amount-groups') throw new Error('This page already has a calculator. Keep its content or remove it through Calculator settings before adding grouped bonuses.');
    const path = `calculators.pages.${gameKey}.groups`;
    const index = created === 'exists' ? draft.pushValue('game', path, buildAddValue('game', path, 'bonus-group')) : 0;
    return { docName: 'game', valuePath: `${path}.${index}`, kind: 'game:bonus-group', label: 'Bonus group' };
  } else if (type === 'calc-amount') {
    const calc = draft.getValue('game', `calculators.pages.${gameKey}`);
    if (calc.kind !== 'amount') throw new Error('This page already has a calculator. Use its New bonus button to add bonuses.');
    listPath = `calculators.pages.${gameKey}.bonuses`;
    kind = 'game:bonus'; label = 'Bonus';
  } else throw new Error('Choose a supported content type.');
  let index = 0;
  if (created === 'exists') {
    const template = type === 'upgrades' ? 'upgrade' : type === 'calc-amount' ? 'bonus' : 'stage';
    const value = buildAddValue('game', listPath, template);
    if (type === 'evolutions') value.title = `Evolution ${value.num}`;
    index = draft.pushValue('game', listPath, value);
  }
  return { docName: 'game', valuePath: `${listPath}.${index}`, kind, label };
}

async function onPageContent(trigger) {
  if (popState) closePopover(true);
  try {
    const binding = addContentToPage(trigger.dataset.pageKey, trigger.dataset.wikiPath, trigger.dataset.pageContent);
    draft.applyDraftToSite();
    await rerender({ scroll: 'preserve' });
    window.dispatchEvent(new CustomEvent('ri-edit-content'));
    updateToolbar();
    const el = document.querySelector(`[data-edit="${binding.docName}:${binding.valuePath}"]`);
    if (el) openPopover({ ...binding, el });
    notify(`${binding.label} added. Fill in the content, then save for everyone.`);
  } catch (error) { notify(error.message, true); }
}

function installInteraction() {
  document.addEventListener('click', (event) => {
    if (!session.ready || !session.allowed) return;
    if (session.busy || sharedRefreshChecking) return;
    if (event.target.closest('#ri-edit-bar, .ri-edit-popover, .ri-edit-chip, .ri-icon-picker--fullscreen')) return;
    if(popState){
      // A mouse-up outside a textarea can produce a click on the page. It
      // must never cancel the form or open a different editor underneath it.
      event.preventDefault();event.stopPropagation();persistForm();return;
    }
    const contentTrigger = event.target.closest('[data-page-content]');
    if (contentTrigger && session.editing) {
      event.preventDefault();
      event.stopPropagation();
      void onPageContent(contentTrigger);
      return;
    }

    const moveTrigger = event.target.closest('[data-update-move]');
    if (moveTrigger && session.editing) {
      event.preventDefault(); event.stopPropagation();
      const [version,index,direction]=moveTrigger.dataset.updateMove.split(':').map(Number);
      const path=`versions.${version}.entries`;
      const entries=draft.getValue('updates',path);
      let target=index+direction;
      while(target>=0&&target<entries.length&&entries[target].context!==entries[index].context) target+=direction;
      if(target>=0&&target<entries.length){
        // moveValue takes an insertion boundary in the original list.
        draft.moveValue('updates',path,index,path,target + (direction > 0 ? 1 : 0));
        draft.applyDraftToSite();
        window.dispatchEvent(new CustomEvent('ri-edit-content'));
        void rerender({scroll:'preserve'});
      }
      return;
    }
    const addTrigger = event.target.closest('[data-edit-add]');
    if (addTrigger && session.editing) {
      event.preventDefault();
      event.stopPropagation();
      void addItemFromTrigger(addTrigger);
      return;
    }


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
    if (!session.editing || popState) return;
    const binding = event.target.closest('[data-edit]');
    if (!binding) { hideChip(); return; }
    if (event.relatedTarget?.closest?.('[data-edit]') === binding) return;
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

// Criação do conteúdo de jogo por tipo de página e templates de itens novos.
export { createGamePageContainer, buildAddValue };

export function restoreEditorForm(){if(session.ready&&session.editing)restoreForm();}

export async function initEditMode({deferRender=false}={}) {
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
    if (stored) await startSession(stored,{deferRender});
  } catch { /* sem token salvo */ }
}
