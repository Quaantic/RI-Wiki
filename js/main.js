// ==== APP ENTRY ====

import { qs } from './utils.js';
import { initShell, initUpdateBadge } from './ui.js';
import { initRouter } from './router.js';
import { LATEST_UPDATE, LATEST_UPDATE_ID } from './data/update-log.js';

async function boot() {
  initShell();
  qs('#wiki-version').textContent = `v${LATEST_UPDATE.version}`;
  initUpdateBadge(LATEST_UPDATE_ID);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.res--link');
    if (!link) return;
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
