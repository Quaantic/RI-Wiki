// ==== APP ENTRY ====

import { esc, qs } from './utils.js';
import { initShell, initUpdateBadge, buildNav } from './ui.js';
import { refreshLocalIcons } from './icon-catalog.js';
import { initRouter } from './router.js';
import { LATEST_UPDATE, LATEST_UPDATE_ID } from './data/update-log.js';
import {formatReleaseVersion} from './releases.js';
import { loadEditableContent } from './services.js';
import { initNewBadges } from './new-badges.js';
import { initReadingTools } from './reading-tools.js';

async function boot() {
  try {
    // Load actual icon files before rendering the sidebar and editor.
    await refreshLocalIcons();
    await loadEditableContent();
  } catch (error) {
    console.error('[main] Failed to load editable site content:', error);
    qs('#view').innerHTML = `
      <div class="notfound">
        <h1>Website content could not be loaded</h1>
        <p style="color:var(--c-text-3)">${esc(error.message || 'Check the content files and reload the page.')}</p>
      </div>`;
    qs('#boot')?.classList.add('is-done');
    return;
  }

  initShell();
  const header = qs('.topbar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', header.offsetHeight + 'px')).observe(header);
  document.querySelectorAll('.primary-nav a').forEach(a => a.setAttribute('aria-label',a.textContent.trim()));

  qs('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    const content = qs('#view');
    content.focus({ preventScroll: true });
    content.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  initReadingTools();
  qs('#wiki-version').textContent = formatReleaseVersion(LATEST_UPDATE?.version);
  initUpdateBadge(LATEST_UPDATE_ID);

  // Editor inline: reconstrói a sidebar/versão quando aplicado um rascunho.
  window.addEventListener('ri-edit-content', () => {
    buildNav();
    qs('#wiki-version').textContent = formatReleaseVersion(LATEST_UPDATE?.version);
    initUpdateBadge(LATEST_UPDATE_ID);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.res--link');
    if (!link || !link.closest('[data-resource-links]')) return;
    e.preventDefault();
    e.stopPropagation();
    window.__riFlashNext = true;
    if (location.hash === link.dataset.href) return;
    location.hash = link.dataset.href;
  });

  // Public visitors never load the editor or see its sign-in controls.
  // Staff may explicitly request it with ?editor=1, but must still pass
  // server-side GitHub OAuth and repository write-permission checks.
  let restoreEditorForm;
  if (new URLSearchParams(window.location.search).get('editor') === '1') {
    try {
      const editor = await import('./edit/edit-mode.js');
      // Only authenticated staff can load and edit the shared draft.
      await editor.initEditMode({ deferRender: true });
      restoreEditorForm = editor.restoreEditorForm;
    } catch (error) {
      console.error('[main] Inline edit mode failed to start:', error);
    }
  }
  await initRouter();
  void initNewBadges();
  restoreEditorForm?.();

  qs('#boot')?.classList.add('is-done');
}

boot();
// ==== APP ENTRY ====

import { esc, qs } from './utils.js';
import { initShell, initUpdateBadge, buildNav } from './ui.js';
import { refreshLocalIcons } from './icon-catalog.js';
import { initRouter } from './router.js';
import { LATEST_UPDATE, LATEST_UPDATE_ID } from './data/update-log.js';
import {formatReleaseVersion} from './releases.js';
import { loadEditableContent } from './services.js';
import { initNewBadges } from './new-badges.js';
import { initReadingTools } from './reading-tools.js';

async function boot() {
  try {
    // Load actual icon files before rendering the sidebar and editor.
    await refreshLocalIcons();
    await loadEditableContent();
  } catch (error) {
    console.error('[main] Failed to load editable site content:', error);
    qs('#view').innerHTML = `
      <div class="notfound">
        <h1>Website content could not be loaded</h1>
        <p style="color:var(--c-text-3)">${esc(error.message || 'Check the content files and reload the page.')}</p>
      </div>`;
    qs('#boot')?.classList.add('is-done');
    return;
  }

  initShell();
  const header = qs('.topbar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', header.offsetHeight + 'px')).observe(header);
  document.querySelectorAll('.primary-nav a').forEach(a => a.setAttribute('aria-label',a.textContent.trim()));

  qs('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    const content = qs('#view');
    content.focus({ preventScroll: true });
    content.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  initReadingTools();
  qs('#wiki-version').textContent = formatReleaseVersion(LATEST_UPDATE?.version);
  initUpdateBadge(LATEST_UPDATE_ID);

  // Editor inline: reconstrói a sidebar/versão quando aplicado um rascunho.
  window.addEventListener('ri-edit-content', () => {
    buildNav();
    qs('#wiki-version').textContent = formatReleaseVersion(LATEST_UPDATE?.version);
    initUpdateBadge(LATEST_UPDATE_ID);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.res--link');
    if (!link || !link.closest('[data-resource-links]')) return;
    e.preventDefault();
    e.stopPropagation();
    window.__riFlashNext = true;
    if (location.hash === link.dataset.href) return;
    location.hash = link.dataset.href;
  });

  // Public visitors never load the editor or see its sign-in controls.
  // Staff may explicitly request it with ?editor=1, but must still pass
  // server-side GitHub OAuth and repository write-permission checks.
  let restoreEditorForm;
  if (new URLSearchParams(window.location.search).get('editor') === '1') {
    try {
      const editor = await import('./edit/edit-mode.js');
      // Only authenticated staff can load and edit the shared draft.
      await editor.initEditMode({ deferRender: true });
      restoreEditorForm = editor.restoreEditorForm;
    } catch (error) {
      console.error('[main] Inline edit mode failed to start:', error);
    }
  }
  await initRouter();
  void initNewBadges();
  restoreEditorForm?.();

  qs('#boot')?.classList.add('is-done');
}

boot();
