import { icon } from './ui.js';
import { searchIcons, iconAssetURL, refreshLocalIcons, customIconsAvailable } from './icon-catalog.js';
import { esc } from './utils.js';

export function makeIconPicker(initialValue) {
  const row = document.createElement('div');
  row.className = 'ri-icon-row';
  const preview = document.createElement('span');
  preview.className = 'ri-icon-row__preview';
  const input = document.createElement('input');
  input.className = 'input';
  input.value = String(initialValue || '');
  input.placeholder = 'Icon reference';
  input.setAttribute('aria-label', 'Icon reference');
  const browse = document.createElement('button');
  browse.type = 'button';
  browse.className = 'ri-icon-button';
  browse.textContent = 'Browse';
  browse.setAttribute('aria-haspopup', 'dialog');
  row.append(preview, input, browse);

  const panel = document.createElement('dialog');
  panel.className = 'ri-icon-picker';
  panel.setAttribute('aria-label', 'Browse wiki icons');
  panel.innerHTML = `
    <header class="ri-icon-picker__header">
      <div><h2>Browse icons</h2><p>Choose an SVG from the wiki library.</p></div>
      <button type="button" class="ri-icon-button" data-close>Close</button>
    </header>
    <div class="ri-icon-picker__search">
      <input class="input" type="search" placeholder="Search by icon name…" aria-label="Search icons" autofocus>
      <select class="input" aria-label="Icon collection">
        <option value="local">Regrowth SVGs</option>
        <option value="game">Game Icons (legacy)</option>
        <option value="lucide">Lucide (legacy)</option>
      </select>
    </div>
    <div class="ri-icon-picker__count" role="status"></div>
    <div class="ri-icon-picker__grid"></div>
    <footer class="ri-icon-picker__footer">
      <a href="${esc(iconAssetURL('images/icons/game-icons/LICENSE.txt'))}" hidden>Game Icons attribution</a>
      <button type="button" class="ri-icon-button" data-more hidden>Show more</button>
    </footer>`;

  const grid = panel.querySelector('.ri-icon-picker__grid');
  const search = panel.querySelector('input');
  const collection = panel.querySelector('select');
  const count = panel.querySelector('[role="status"]');
  const more = panel.querySelector('[data-more]');
  const license = panel.querySelector('footer a');
  let limit = 60;

  const updatePreview = () => { preview.innerHTML = icon(input.value.trim() || 'circle', 24); };
  const render = () => {
    const matches = searchIcons(search.value, collection.value);
    const visible = matches.slice(0, limit);
    count.textContent = matches.length ? `Showing ${visible.length} of ${matches.length} icons` : collection.value === 'local' && !searchIcons('', 'local').length ? 'Cannot load custom icons: check the deployment or local server.' : 'No icons match your search.';
    grid.innerHTML = visible.map(({id, name, group}) => `
      <button type="button" class="ri-icon-cell" aria-pressed="${id === input.value}" data-icon-name="${esc(id)}">
        ${icon(id, 36)}<span>${esc(name.replaceAll('-', ' '))}</span>${group ? `<small>${esc(group)}</small>` : ''}
      </button>`).join('');
    more.hidden = visible.length >= matches.length;
    license.hidden = collection.value !== 'game';
  };
  const reset = () => { limit = 60; render(); grid.scrollTop = 0; };

  input.addEventListener('input', updatePreview);
  updatePreview();
  browse.addEventListener('click', async () => {
    await refreshLocalIcons();
    search.value = '';
    collection.value = 'local';
    reset();
    document.body.append(panel);
    panel.showModal();
  });
  panel.addEventListener('close', () => {
    panel.remove();
    if (browse.isConnected) browse.focus({ preventScroll: true });
  });
  panel.addEventListener('keydown', event => event.stopPropagation());
  panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
  search.addEventListener('input', reset);
  collection.addEventListener('change', reset);
  more.addEventListener('click', () => {
    const oldLimit = limit;
    limit += 60;
    render();
    grid.children[oldLimit]?.focus();
  });
  grid.addEventListener('click', event => {
    const cell = event.target.closest('[data-icon-name]');
    if (!cell) return;
    input.value = cell.dataset.iconName;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    panel.close();
  });

  return { row, panel, input, preview };
}
