// ==== APP ENTRY ====

import { esc, qs } from './utils.js';
import { initShell, initUpdateBadge } from './ui.js';
import { initRouter } from './router.js';
import { LATEST_UPDATE, LATEST_UPDATE_ID } from './data/update-log.js';
import { loadEditableContent } from './services.js';

async function boot() {
  try {
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
  qs('#wiki-version').textContent = `v${LATEST_UPDATE?.version || '—'}`;
  initUpdateBadge(LATEST_UPDATE_ID);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.res--link');
    if (!link || !link.closest('[data-resource-links]')) return;
    e.preventDefault();
    e.stopPropagation();
    window.__riFlashNext = true;
    if (location.hash === link.dataset.href) return;
    location.hash = link.dataset.href;
  });

  const t0 = performance.now();
  await initRouter();

  const wait = Math.max(0, 520 - (performance.now() - t0));
  setTimeout(() => {
    qs('#boot')?.classList.add('is-done');
  }, wait);
}

boot();
