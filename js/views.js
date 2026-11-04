// ==== VIEWS: PAGINAS DO SITE ====

import { html, esc, qs, qsa, debounce, countUp, fmtDate, fmtValue, fmtSuffix, parseGameNumber, evalFormula, markMatches } from './utils.js';
import { icon, emblem, categoryCard, infoCard, sectionHead, initReveal, setCrumbs, setActiveNav, markUpdateSeen } from './ui.js';
import { dataProvider, getCategory, getSubcategory } from './services.js';
import { CATEGORIES, CREDITS, getSubcategoryDocPath } from './data/wiki-data.js';
import { ed } from './edit/ed-attr.js';
import { getRuneFamily, FAMILY_COLORS } from './data/runes.js';
import { ORE_DATA, MASTERY_DATA, getOrePage, getMasteryPage, getLayerPage } from './data/ores.js';
import { getStagePage, getBarnPage, getRankPage, getAscensionPage, getLifeRankPage, getCorePage} from './data/progress.js';
import { getTrainingAreas, getGearPage, DUST_UNLOCK } from './data/dungeon.js';
import { getFormulaPage, getInlineUpgradePages, FORMULA_PAGE_MAP } from './data/formulas.js';
import { RESET_LAYER_PAGES, minimumForTarget } from './data/reset-layers.js';
import { MINING_PRICES } from './data/mining-prices.js';
import { colorizeResources } from './data/resource-colors.js';
import { UI_COPY } from './data/ui-copy.js';
import { LATEST_UPDATE_ID } from './data/update-log.js';

// ==== PAGINA DE FAMILIA DE RUNAS (cards por runa) ====

function runeCard(r, i, color, itemPath = '') {
  return `
    <article class="rune-card${r.special ? ' rune-card--special' : ''} reveal" ${itemPath ? ed(itemPath, 'game:rune', esc(r.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="rune-card__head">
        <span class="rune-card__icon" style="color:${esc(color)}">${icon(r.icon, 20)}</span>
        <span class="rune-card__name" style="color:${esc(color)}"><b>${esc(r.name)}</b></span>
        <span class="rune-card__luck">Recommended Luck: ${esc(fmtValue(r.luck))}</span>
      </header>
      <div class="rune-card__chances">
        <div><span>Base chance</span><b>${esc(r.baseChance)}</b></div>
        <div><span>Chance at recommended luck</span><b>${esc(r.recChance)}</b></div>
      </div>
      <div class="rune-card__boosts">
        <span class="rune-card__boosts-label">Boosts at cap</span>
        ${r.boosts.map((b) => `
          <div class="rune-boost">
            <b>${colorizeResources(esc(b.target))}</b>
            <span class="rune-boost__mult">${esc(b.mult)}</span>
            <small>caps at ${b.capsAt ? colorizeResources(esc(fmtValue(b.capsAt))) : '—'}</small>
          </div>`).join('')}
      </div>
    </article>`;
}

function runeTableHTML(runes, listPath = '') {
  return `
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>Rune</th><th>Req. luck</th><th>Base chance</th><th>Chance at rec. luck</th><th>Boosts at cap</th>
      </tr></thead>
      <tbody>
        ${runes.map((r, i) => `
          <tr ${itemListPath(listPath, i) ? ed(itemListPath(listPath, i), 'game:rune', esc(r.name)) : ''}>
            <td class="cell-strong">${icon(r.icon, 14)} ${esc(r.name)}</td>
            <td class="num">${esc(fmtValue(r.luck))}</td>
            <td class="num">${esc(r.baseChance)}</td>
            <td class="num">${esc(r.recChance)}</td>
            <td>${r.boosts.map((b) => `${colorizeResources(esc(b.target))} ${esc(b.mult)}`).join(' · ')}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function runeFamilySections(runes, slug) {
  const color = FAMILY_COLORS[slug] || 'var(--c-accent)';
  const listPath = `game:runes.families.${slug}.runes`;
  return `
    <section class="section">
      ${sectionHead('The runes')}
      <div class="rune-grid">
        ${runes.map((r, i) => runeCard(r, i, color, itemListPath(listPath, i))).join('')}
      </div>
    </section>

    <section class="section">
      ${sectionHead('Quick reference')}
      ${runeTableHTML(runes, listPath)}
    </section>`;
}

function runePlaceholderSection(sub) {
  return `
    <section class="section">
      <div class="empty-state">
        ${icon('rune', 26)}
        <h3>${esc(sub.name)} rune cards coming soon</h3>
        <p style="max-width:46ch">Riches is the first family using the full card layout — ${esc(sub.name)} gets the same treatment next. Fill its runes in <code>js/data/runes.js</code>.</p>
        <a class="btn btn--ghost" href="#/runes/money">${icon('arrow-right', 15)} See the Riches layout</a>
      </div>
    </section>`;
}

// ==== PAGINA DE ORES (onde pegar: depth, luck e layers) ====

const LAYERS_LIST = () => (getLayerPage('mining', 'layers')?.layers || []);
const oreColor = (name) => ((ORE_DATA['mining/ores']?.ores || []).find((o) => o.name === name)?.color || 'inherit');
const itemListPath = (listPath, i) => (listPath ? `${listPath}.${i}` : '');

function oreCard(o, i, itemPath = '') {
  const mineLayers = LAYERS_LIST().filter((l) => l.ores.includes(o.name));
  return `
    <article class="ore-card reveal" ${itemPath ? ed(itemPath, 'game:ore', esc(o.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="ore-card__head">
        <span class="ore-card__icon" style="color:${esc(o.color)}">${icon(o.icon, 20)}</span>
        <span class="ore-card__name" style="color:${esc(o.color)}">${esc(o.name)}</span>
        <span class="ore-card__where">Depth ${esc(fmtValue(o.depth))} · Luck ${esc(fmtValue(o.luck))}</span>
      </header>
      <div class="ore-card__layers">
        <span class="ore-card__layers-label">Found in</span>
        <div class="ore-layer-chips">
          ${mineLayers.length
            ? mineLayers.map((l) => `<span class="ore-layer-chip" style="color:${esc(o.color)}">L${l.num} ${esc(l.name)}</span>`).join('')
            : '<span class="ore-layer-chip">—</span>'}
        </div>
      </div>
    </article>`;
}

function oreTableHTML(ores, listPath = '') {
  return `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Ore</th><th>Depth</th><th>Best luck</th></tr></thead>
      <tbody>
        ${ores.map((o, i) => `
          <tr ${itemListPath(listPath, i) ? ed(itemListPath(listPath, i), 'game:ore', esc(o.name)) : ''}>
            <td class="cell-strong"><span class="ore-cell-name" style="color:${esc(o.color)}">${icon(o.icon, 14)} ${esc(o.name)}</span></td>
            <td class="num">${esc(fmtValue(o.depth))}</td>
            <td class="num">${esc(fmtValue(o.luck))}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function orePageSections(ores, listPath = '') {
  return `
    <section class="section">
      ${sectionHead('The ores')}
      <div class="rune-grid">
        ${ores.map((o, i) => oreCard(o, i, itemListPath(listPath, i))).join('')}
      </div>
    </section>

    <section class="section">
      ${sectionHead('Where to find')}
      <p class="ore-find-note">Where each ore spawns (depth) and the luck that helps you find it.</p>
      ${oreTableHTML(ores, listPath)}
    </section>`;
}

// ==== PAGINA DE MASTERY (upgrades de cada ore) ====

function masteryCard(o, i, itemPath = '') {
  return `
    <article class="ore-card mastery-card reveal" ${itemPath ? ed(itemPath, 'game:ore', esc(o.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="ore-card__head">
        <span class="ore-card__icon" style="color:${esc(o.color)}">${icon(o.icon, 20)}</span>
        <span class="ore-card__name" style="color:${esc(o.color)}">${esc(o.name)}</span>
      </header>
      <div class="ore-card__upgrades">
        <span class="ore-card__upgrades-label">Upgrades</span>
        ${o.upgrades.map((u) => `
          <div class="ore-upgrade">
            <span class="ore-upgrade__effect">
              <b>${colorizeResources(esc(u.effect))}</b>
            </span>
            ${u.cap != null
              ? `<span class="ore-upgrade__val ore-upgrade__val--cap" title="Caps at this value">cap ${esc(fmtValue(u.cap))}</span>`
              : `<span class="ore-upgrade__val ore-upgrade__val--req" title="Stops being 1x at this value">REQ ${esc(fmtValue(u.req))}</span>`}
          </div>`).join('')}
      </div>
    </article>`;
}

function masteryPageSections(ores, listPath = '') {
  return `
    <section class="section">
      ${sectionHead('Ore mastery upgrades')}
      <div class="rune-grid">
        ${ores.map((o, i) => masteryCard(o, i, itemListPath(listPath, i))).join('')}
      </div>
    </section>`;
}

// ==== PAGINA DE LAYERS (camadas da mina) ====

function layerCard(l, i, itemPath = '') {
  return `
    <article class="layer-card reveal" ${itemPath ? ed(itemPath, 'game:layer', esc(l.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="layer-card__head">
        <span class="layer-card__num">L${l.num}</span>
        <b class="layer-card__name">${esc(l.name)}</b>
        <span class="layer-card__depth">Depth ${esc(fmtValue(l.depth))}</span>
      </header>
      <div class="layer-card__ores">
        ${l.ores.map((n) => `
          <span class="ore-layer-chip" style="color:${esc(oreColor(n))}">${esc(n)}</span>`).join('')}
      </div>
    </article>`;
}

function layerPageSections(layers, listPath = '') {
  return `
    <section class="section">
      ${sectionHead('The layers')}
      <div class="layer-grid">
        ${layers.map((l, i) => layerCard(l, i, itemListPath(listPath, i))).join('')}
      </div>
    </section>`;
}

// ==== PAGINA DE TRAINING AREAS (forca / vida) ====

function areaCard(a, i, itemPath = '') {
  const row = (tier, req, mult) => `
    <div class="area-row${req == null ? ' area-row--na' : ''}">
      <span class="area-row__tier">${tier}</span>
      <span class="area-row__req">req ${req == null ? '—' : esc(fmtValue(req))}</span>
      <span class="area-row__mult">×${mult == null ? '—' : esc(fmtValue(mult))}</span>
    </div>`;
  return `
    <article class="area-card reveal" ${itemPath ? ed(itemPath, 'game:area', esc(a.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="area-card__head"><b>${esc(a.name)}</b></header>
      <div class="area-card__rows">
        ${row('T1', a.reqT1, a.multiT1)}
        ${row('T2', a.reqT2, a.multiT2)}
      </div>
    </article>`;
}

function trainingSections(groups, listPath = '') {
  return groups.map((g, gi) => `
    <section class="section">
      ${sectionHead(g.name)}
      <div class="rune-grid area-grid">
        ${g.areas.map((a, i) => areaCard(a, i, itemListPath(listPath, gi) ? `${itemListPath(listPath, gi)}.areas.${i}` : '')).join('')}
      </div>
    </section>`).join('');
}

// ==== DUST (unlock das areas T2) ====

function dustSections() {
  return `
    <section class="section">
      ${sectionHead('Tier 2 unlock costs')}
      <div class="callout callout--info">
        ${icon('info', 18)}
        <div>
          <span class="callout__title">How it works</span>
          Each Tier 2 area is unlocked with Dust, in the order below (1st area, 2nd area…).
        </div>
      </div>
      <div class="dust-grid">
        ${DUST_UNLOCK.map((d, i) => `
          <div class="dust-chip reveal" style="--reveal-delay:${Math.min(i * 50, 400)}ms" ${ed(`game:dungeon.dustUnlock.${i}`, 'num', `Tier 2 unlock #${i + 1}`)}>
            <span class="dust-chip__num">${i + 1}</span>${esc(fmtValue(d))}
          </div>`).join('')}
      </div>
    </section>`;
}

// ==== GEARS (swords, shield, items) ====

function gearCard(g, i, itemPath = '') {
  return `
    <article class="gear-card reveal" ${itemPath ? ed(itemPath, 'game:gear', esc(g.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="gear-card__head">
        <b>${esc(g.name)}</b>
        <span class="gear-card__rarity">Rarity ${esc(fmtValue(g.rarity))}</span>
      </header>
      <div class="gear-card__stats">
        ${Object.entries(g.stats).map(([k, v]) => `
          <div class="gear-stat">
            <b>${colorizeResources(esc(k))}</b>
            <span class="gear-stat__mult">×${esc(fmtValue(v))}</span>
          </div>`).join('')}
      </div>
    </article>`;
}

function gearSections(gears, listPath = '') {
  return `
    <section class="section">
      ${sectionHead('The gear')}
      <div class="rune-grid">
        ${gears.map((g, i) => gearCard(g, i, itemListPath(listPath, i))).join('')}
      </div>
    </section>`;
}

// ==== UPGRADES (slide bar: o visitante move o nivel e o card calcula) ====

const TEMPLATE_UPGRADES = [
  { name: 'Example Upgrade', cap: 100, price: '—', multi: '—' },
  { name: 'Another Upgrade', cap: 50, price: '—', multi: '—' },
  { name: 'Third Upgrade', cap: 25, price: '—', multi: '—' },
];

function upgradeCard(u, i, priceTable, itemPath = '') {
  const perkTier = String(u.multi || '').match(/MaxTier\s*=\s*min\([^,]+,\s*AbsoluteMax\s+(\d+)\)/i);
  const capMax = u.cap ?? 499;
  const n = u.n ?? i + 1;
  const rawMulti = !perkTier && u.multi && u.multi !== '-' && evalFormula(u.multi, { L: 0 }) == null ? u.multi : '';
  const priceAttr = priceTable ? '' : ` data-price="${esc(u.price || '')}"`;
  const tableAttr = priceTable ? ` data-price-table="${esc(priceTable)}" data-n="${n}"` : '';
  return `
        <article class="upgrade-card reveal" data-upgrade data-cap="${capMax}" data-multi="${esc(u.multi || '')}"${priceAttr}${tableAttr}${itemPath ? ed(itemPath, 'game:upgrade', esc(u.name)) : ''} style="--reveal-delay:${Math.min(i * 45, 400)}ms">
      <header class="upgrade-card__head">
        <b><span class="upgrade-card__n">${n}.</span> ${colorizeResources(esc(u.name))}</b>
        <span class="upgrade-card__val"><b data-lvl>0</b> / ${u.cap == null ? '—' : esc(fmtValue(u.cap))}</span>
      </header>
      <div class="upgrade-card__slider-row">
        <input class="upgrade-card__slider" type="range" min="0" max="${capMax}" step="1" value="0" data-upgrade-slider aria-label="Level of ${esc(u.name)}">
        <input class="upgrade-card__num" type="number" min="0" max="${capMax}" step="1" value="0" data-upgrade-num aria-label="Type the level of ${esc(u.name)}">
      </div>
      <div class="upgrade-card__rows">
        <div class="upgrade-card__row upgrade-card__row--price"><span class="upgrade-card__rowlabel">${icon('coins', 14)} Price (next lvl)</span><b data-price-out>—</b></div>
        <div class="upgrade-card__row upgrade-card__row--multi"><span class="upgrade-card__rowlabel">${icon('star', 14)} ${perkTier ? 'Max Tier' : 'Multi'}</span><b data-multi-out>—</b></div>
      </div>
    </article>`.replace('<article class="upgrade-card reveal', `<article data-perk-tiered="${perkTier ? 'true' : 'false'}" data-perk-abs-cap="${perkTier ? perkTier[1] : ''}" class="upgrade-card reveal`);
}

function wireUpgrades(root) {
  const treeUpgrade15 = qs('[data-tree-upgrade15]', root);
  const treeUpgrade51 = qs('[data-tree-upgrade51]', root);
  const cardUpdates = [];
  qsa('[data-upgrade-slider]', root).forEach((slider) => {
    const card = slider.closest('[data-upgrade]');
    if (!card) return;
    const num = card.querySelector('[data-upgrade-num]');
    const lvl = card.querySelector('[data-lvl]');
    const priceOut = card.querySelector('[data-price-out]');
    const multiOut = card.querySelector('[data-multi-out]');
    const update = (source) => {
      const isPerkTiered = card.dataset.perkTiered === 'true';
      const cap = Number(card.dataset.cap) || 0;
      let L = Math.round(Number(slider.value) || 0);
      if (source === 'num') L = Math.round(Number(num.value) || 0);
      L = Math.max(0, Math.min(cap, L));
      if (source !== 'slider') slider.value = L;
      if (source !== 'num' && num) num.value = L;
      slider.style.setProperty('--fill', `${cap ? (L / cap) * 100 : 0}%`);
      lvl.textContent = L;
      if (card.dataset.priceTable) {
        const entry = MINING_PRICES[Number(card.dataset.n)];
        const cost = entry && entry.costs[L + 1];
        if (L >= cap) {
          priceOut.innerHTML = '<small class="upgrade-card__raw">Maxed</small>';
          priceOut.classList.remove('has-res');
        } else if (cost) {
          priceOut.innerHTML = colorizeResources(esc(cost));
          priceOut.classList.add('has-res');
        } else {
          priceOut.innerHTML = '<small class="upgrade-card__raw">—</small>';
          priceOut.classList.remove('has-res');
        }
      } else {
        const rawPrice = card.dataset.price || '';
        const isList = /^[\d.e+-]+(\/[\d.e+-]+)+$/.test(rawPrice);
        if (isList) {
          const parts = rawPrice.split('/');
          const p = Number(parts[Math.min(L, parts.length - 1)]);
          priceOut.innerHTML = L >= cap ? '<small class="upgrade-card__raw">Maxed</small>' : esc(fmtSuffix(p));
          priceOut.classList.remove('has-res');
        } else {
          const p = evalFormula(rawPrice, {
            L,
            tier: isPerkTiered ? L + 1 : 0,
            TreeUpgrade15: Number(treeUpgrade15?.value) || 0,
          });
          priceOut.innerHTML = p != null ? esc(fmtSuffix(p)) : `<small class="upgrade-card__raw">${esc(rawPrice || '—')}</small>`;
          priceOut.classList.remove('has-res');
        }
      }
      const maxTier = Math.min(70 + 10 * Math.max(0, Math.floor(Number(treeUpgrade51?.value) || 0)), Number(card.dataset.perkAbsCap));
      const m = isPerkTiered ? maxTier : evalFormula(card.dataset.multi, { L });
      multiOut.innerHTML = m != null ? esc(fmtSuffix(m)) : `<small class="upgrade-card__raw">${esc(card.dataset.multi || '—')}</small>`;
    };
    slider.addEventListener('input', () => update('slider'));
    num.addEventListener('input', () => update('num'));
    update();
    if (card.dataset.perkTiered === 'true') cardUpdates.push(update);
  });
  [treeUpgrade15, treeUpgrade51].filter(Boolean).forEach((input) => {
    input.addEventListener('input', () => cardUpdates.forEach((update) => update()));
  });
}

function formulaSections(section, listPath = '') {
  const isLevelPerks = section.upgrades.some((upgrade) => /MaxTier\s*=\s*min\(/i.test(upgrade.multi || ''));
  return `
    <section class="section">
      ${sectionHead('The upgrades')}
      ${listPath ? `
      <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="${esc(listPath)}" data-edit-add-template="upgrade">${icon('plus', 13)} New upgrade</button>` : ''}
      ${isLevelPerks ? `
      <div class="perk-tree-controls">
        <label>Tree Upgrade 15<input class="input" type="number" min="0" step="1" value="0" data-tree-upgrade15></label>
        <label>Tree Upgrade 51<input class="input" type="number" min="0" max="3" step="1" value="0" data-tree-upgrade51></label>
      </div>` : ''}
      <div class="rune-grid">
        ${section.upgrades.map((u2, i) => upgradeCard(u2, i, section.priceTable, itemListPath(listPath, i))).join('')}
      </div>
    </section>`;
}

function resetCalcCard(bonus, requiredLabel, index, amountMode = false, accentColor = '', itemPath = '') {
  return `
    <article class="reset-calc-card${amountMode ? ' reset-calc-card--amount' : ''} reveal" ${amountMode ? 'data-resource-links' : ''} data-reset-calculator data-bonus-id="${esc(bonus.id)}" data-required-label="${esc(requiredLabel)}" style="--reveal-delay:${Math.min(index * 45, 360)}ms;${accentColor ? `--reset-bonus-color:${esc(accentColor)};` : ''}" ${itemPath ? ed(itemPath, 'game:bonus', esc(bonus.name)) : ''}>
      <header class="reset-calc-card__head">
        <span class="reset-calc-card__icon">${icon('target', 17)}</span>
        <b>${colorizeResources(esc(bonus.name))}</b>
        ${!amountMode && bonus.cap ? `<small>cap ${esc(fmtSuffix(bonus.cap))} ${esc(bonus.capUnit || 'x')}</small>` : ''}
        ${!amountMode && bonus.unlockAt ? `<small>unlocks at ${esc(fmtSuffix(bonus.unlockAt))} Fossils</small>` : ''}
      </header>
      ${amountMode ? `
      <div class="reset-calc-card__meta">
        ${bonus.cap ? `<small>Cap: ${esc(fmtSuffix(bonus.cap))} ${esc(bonus.capUnit || 'x')}</small>` : ''}
        ${bonus.unlockAt ? `<small>Unlocks at ${esc(fmtValue(bonus.unlockLabel || bonus.unlockAt))} Fossils</small>` : ''}
      </div>
      <div class="reset-calc-answer" data-reset-answer aria-live="polite"></div>` : `
      <label class="reset-calc-field">
        <span>Desired bonus</span>
        <span class="reset-calc-input-wrap">
          <input class="input reset-calc-input" type="number" min="1" step="0.01" value="1.5" data-reset-target aria-label="Desired ${esc(bonus.name)} bonus">
          <span>x</span>
        </span>
      </label>
      <div class="reset-calc-answer" data-reset-answer aria-live="polite"></div>`}
    </article>`;
}

function resetLayerSections(page, basePath = '') {
  const bonusAdd = (listPath) => listPath
    ? `<button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="${esc(listPath)}" data-edit-add-template="bonus">${icon('plus', 13)} New bonus</button>`
    : '';
  if (page.kind === 'amount-groups') {
    return `
      <section class="section reset-layer-page">
        ${sectionHead(page.title)}
        ${page.groups.map((group, gi) => `
          <section class="reset-layer-tier rare-sap-group" style="--rare-sap-color:${esc(group.color)}" ${basePath ? ed(`${basePath}.groups.${gi}`, 'game:bonus-group', esc(group.name)) : ''}>
            <h3 data-resource-links>${colorizeResources(esc(group.name))} <small>Drop chance: ${esc(group.dropChance)}</small></h3>
            <label class="reset-calc-power">
              <span>${esc(group.amountLabel)}</span>
              <input class="input reset-calc-input" type="text" inputmode="decimal" value="0" data-reset-amount data-group-id="${esc(group.id)}" aria-label="${esc(group.amountLabel)}">
            </label>
            ${bonusAdd(basePath ? `${basePath}.groups.${gi}.bonuses` : '')}
            <div class="reset-calc-grid">
              ${group.bonuses.map((bonus, i) => resetCalcCard(bonus, group.amountLabel, i, true, group.color, itemListPath(basePath ? `${basePath}.groups.${gi}.bonuses` : '', i))).join('')}
            </div>
          </section>`).join('')}
      </section>`;
  }

  if (page.kind === 'amount') {
    return `
      <section class="section reset-layer-page">
        ${sectionHead(page.title)}
        <label class="reset-calc-power">
          <span>${esc(page.amountLabel)}</span>
          <input class="input reset-calc-input" type="text" inputmode="decimal" value="0" data-reset-amount aria-label="${esc(page.amountLabel)}">
        </label>
        <div class="reset-calc-grid reset-calc-grid--amount">
          ${bonusAdd(basePath ? `${basePath}.bonuses` : '')}
          ${page.bonuses.map((bonus, i) => resetCalcCard(bonus, page.amountLabel, i, true, '', itemListPath(basePath ? `${basePath}.bonuses` : '', i))).join('')}
        </div>
      </section>`;
  }

  if (page.kind === 'gears') {
    return `
      <section class="section reset-layer-page">
        ${sectionHead(page.title)}
        ${page.tiers.map((tier, ti) => `
          <section class="reset-layer-tier" ${basePath ? ed(`${basePath}.tiers.${ti}`, 'game:tier', esc(tier.name)) : ''}>
            <h3>${esc(tier.name)}</h3>
            ${bonusAdd(basePath ? `${basePath}.tiers.${ti}.bonuses` : '')}
            <div class="reset-calc-grid">
              ${tier.bonuses.map((bonus, i) => resetCalcCard(bonus, tier.name, i, false, '', itemListPath(basePath ? `${basePath}.tiers.${ti}.bonuses` : '', i))).join('')}
            </div>
          </section>`).join('')}
      </section>`;
  }

  if (page.kind === 'bone-dust') {
    return `
      <section class="section reset-layer-page">
        ${sectionHead(page.title)}
        <label class="reset-calc-power">
          <span>Souls Upgrade 11 level</span>
          <input class="input reset-calc-input" type="number" min="0" max="${page.powerLevelMax}" step="1" value="0" data-dust-power-level>
        </label>
        ${bonusAdd(basePath ? `${basePath}.bonuses` : '')}
        <div class="reset-calc-grid">
          ${page.bonuses.map((bonus, i) => resetCalcCard(bonus, 'Bone Dust', i, false, '', itemListPath(basePath ? `${basePath}.bonuses` : '', i))).join('')}
        </div>
      </section>`;
  }

  return `
    <section class="section reset-layer-page">
      ${sectionHead(page.title)}
      ${bonusAdd(basePath ? `${basePath}.bonuses` : '')}
      <div class="reset-calc-grid">
        ${page.bonuses.map((bonus, i) => resetCalcCard(bonus, 'Dungeon Level', i, false, '', itemListPath(basePath ? `${basePath}.bonuses` : '', i))).join('')}
      </div>
    </section>`;
}

function wireResetCalculators(root, page) {
  if (!page) return;
  const cards = qsa('[data-reset-calculator]', root);
  const powerInput = qs('[data-dust-power-level]', root);

  if (page.kind === 'amount' || page.kind === 'amount-groups') {
    const updateAmounts = (amountInput, group) => {
      const inputValue = amountInput.value.trim();
      const amount = inputValue ? parseGameNumber(inputValue) : 0;
      const groupCards = group
        ? cards.filter((card) => card.dataset.requiredLabel === group.amountLabel)
        : cards;
      if (amount == null || !Number.isFinite(amount) || amount < 0) {
        groupCards.forEach((card) => {
          qs('[data-reset-answer]', card).innerHTML = '<span class="reset-calc-error">Enter a valid amount of 0 or more.</span>';
        });
        return;
      }

      groupCards.forEach((card) => {
        const answer = qs('[data-reset-answer]', card);
        const bonuses = group?.bonuses || page.bonuses;
        const bonus = bonuses.find((item) => item.id === card.dataset.bonusId);
        if (bonus.unlockAt && amount < bonus.unlockAt) {
          answer.innerHTML = `<span class="reset-calc-error">Locked — requires ${esc(fmtValue(bonus.unlockLabel || bonus.unlockAt))} Fossils.</span>`;
          return;
        }
        const value = bonus.value(amount);
        const display = bonus.unit === 'cap'
          ? `+${fmtSuffix(value)} CAP`
          : `${fmtSuffix(value)}${bonus.unit ? ` ${bonus.unit}` : ''}`;
        answer.innerHTML = `<div><span>Current bonus</span><b>${esc(display)}</b></div>`;
      });
    };

    if (page.kind === 'amount-groups') {
      page.groups.forEach((group) => {
        const amountInput = qs(`[data-reset-amount][data-group-id="${group.id}"]`, root);
        const updateGroup = () => updateAmounts(amountInput, group);
        amountInput.addEventListener('input', updateGroup);
        updateGroup();
      });
    } else {
      const amountInput = qs('[data-reset-amount]', root);
      const updatePage = () => updateAmounts(amountInput);
      amountInput.addEventListener('input', updatePage);
      updatePage();
    }
    return;
  }

  const updateCard = (card) => {
    const targetInput = qs('[data-reset-target]', card);
    const answer = qs('[data-reset-answer]', card);
    const target = Number(targetInput.value);
    const bonusId = card.dataset.bonusId;
    const tier = page.tiers?.find((item) => item.bonuses.some((bonus) => bonus.id === bonusId && item.name === card.dataset.requiredLabel));
    const bonus = (tier?.bonuses || page.bonuses).find((item) => item.id === bonusId);

    if (!Number.isFinite(target) || target < 1) {
      answer.innerHTML = '<span class="reset-calc-error">Enter a bonus of at least 1x.</span>';
      return;
    }

    if (page.kind === 'level') {
      const level = minimumForTarget(bonus.value, target, bonus.unlockLevel, null, page.maxLevel);
      if (level == null) {
        answer.innerHTML = `<span class="reset-calc-error">Target exceeds the level limit (${page.maxLevel.toLocaleString()}).</span>`;
        return;
      }
      let totalXp = 0;
      for (let current = 1; current < level; current++) totalXp += page.xpToNextLevel(current);
      answer.innerHTML = `
        <div><span>Level required</span><b>${level.toLocaleString()}</b></div>
        <div><span>Total XP to reach it</span><b>${esc(fmtSuffix(totalXp))}</b></div>
        <div><span>XP to next level</span><b>${esc(fmtSuffix(page.xpToNextLevel(level)))}</b></div>`;
      return;
    }

    if (page.kind === 'gears') {
      const amount = minimumForTarget(bonus.value, target, 0, bonus.cap);
      if (amount == null) {
        answer.innerHTML = `<span class="reset-calc-error">Target is above the ${esc(fmtSuffix(bonus.cap))}x cap.</span>`;
        return;
      }
      answer.innerHTML = `<div><span>${esc(card.dataset.requiredLabel)} required</span><b>${esc(fmtSuffix(amount))}</b></div>`;
      return;
    }

    const powerLevel = Math.min(page.powerLevelMax, Math.max(0, Math.floor(Number(powerInput.value) || 0)));
    const p = page.powerFromLevel(powerLevel);
    const dust = minimumForTarget((amount) => bonus.value(amount, p), target, 0, bonus.cap);
    if (dust == null) {
      answer.innerHTML = `<span class="reset-calc-error">Target is above the ${esc(fmtSuffix(bonus.cap))}x cap.</span>`;
      return;
    }
    answer.innerHTML = `
      <div><span>Bone Dust required</span><b>${esc(fmtSuffix(dust))}</b></div>`;
  };

  cards.forEach((card) => {
    qs('[data-reset-target]', card).addEventListener('input', () => updateCard(card));
    updateCard(card);
  });
  powerInput?.addEventListener('input', () => cards.forEach(updateCard));
}

function upgradeTemplateSections() {
  return `
    <section class="section">
      ${sectionHead('Upgrades')}
      <div class="rune-grid">
        ${TEMPLATE_UPGRADES.map((u2, i) => upgradeCard(u2, i)).join('')}
      </div>
    </section>`;
}

// ==== PAGINA DE STAGES (Main) ====

function stageCard(s, i, itemPath = '') {
  const unlocks = s.unlocks || {};
  const hasUnlocks = Boolean(unlocks.area || unlocks.places?.length || unlocks.features?.length);
  return `
    <article class="stage-card reveal" ${itemPath ? ed(itemPath, 'game:stage', esc(s.title || `Stage ${s.num}`)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <header class="stage-card__head">
        <span class="stage-card__num">${esc(s.num)}</span>
        <b class="stage-card__title">${esc(s.title || `Stage ${s.num}`)}</b>
      </header>
      <div class="stage-card__cols${hasUnlocks ? '' : ' stage-card__cols--two'}" data-resource-links>
        <div class="stage-card__col">
          <span class="stage-card__label">Requirements</span>
          <div class="stage-chips">
            ${s.requirements.map((r) => `<span class="stage-chip">${colorizeResources(esc(r))}</span>`).join('')}
          </div>
        </div>
        <div class="stage-card__col">
          <span class="stage-card__label">Boosts${s.boostsNote ? `<small class="stage-card__note">${esc(s.boostsNote)}</small>` : ''}</span>
          <div class="stage-chips">
            ${s.boosts.map((b) => `<span class="stage-chip">${colorizeResources(esc(b))}</span>`).join('')}
          </div>
        </div>
        ${hasUnlocks ? `
        <div class="stage-card__col stage-card__col--wide">
          <span class="stage-card__label">Unlocks</span>
          <div class="stage-unlocks">
            ${unlocks.area ? `<span class="stage-unlocks__area">${icon('map-pin', 12)} ${esc(unlocks.area)}</span>` : ''}
            <div class="stage-places">
              ${(unlocks.places || []).map((p) => `<span class="stage-place">${colorizeResources(esc(p))}</span>`).join('')}
            </div>
            <div class="stage-features">
              ${(unlocks.features || []).map((f) => `
                <span class="stage-feature">
                  <b>${colorizeResources(esc(f.name))}</b>
                  ${(f.subs || []).map((x) => `<span class="stage-feature__sub">${colorizeResources(esc(x))}</span>`).join('')}
                </span>`).join('')}
            </div>
          </div>
        </div>` : ''}
      </div>
    </article>`;
}

function stagePageSections(stages, title = 'Stages', twoCol = false, listPath = '') {
  const cards = stages.map((s, i) => stageCard(s, i, itemListPath(listPath, i))).join('');
  return `
    <section class="section">
      ${sectionHead(title)}
      ${twoCol ? `<div class="stage-grid-2">${cards}</div>` : cards}
    </section>`;
}

// ==== VIEWS: PAGINAS DO SITE ====

export const homeView = {
  title: () => 'Regrowth Incremental - WIKI',
  crumbs: () => [],
  nav: () => null,

  async render(root) {
    const [stats, cats, updates] = await Promise.all([
      dataProvider.getWikiStats(),
      dataProvider.getCategories(),
      dataProvider.getUpdateLog(),
    ]);
    const latest = updates[0];
    const CONTEXT_ICONS = { Feature: 'spark', UI: 'grid', Bugs: 'alert', Changes: 'refresh' };

    root.innerHTML = html`
      <!-- ============ Hero ============ -->
      <section class="hero">
        <div class="hero__hex hex-texture"></div>
        <div class="hero__inner">
          <div>
            <span class="hero__badge"><span class="hex-dot"></span> ${ed('game:uiCopy.heroBadge', 'text', 'Hero badge')}${esc(UI_COPY.heroBadge || `Regrowth Incremental · Community Wiki`)}</span>
            <h1 class="hero__title" ${ed('game:uiCopy.heroTitle', 'long', 'Hero title')}>${esc(UI_COPY.heroTitle || 'Grow your knowledge\nalongside your valley.').replace('\n', '<br />')}</h1>
            <p class="hero__sub" ${ed('game:uiCopy.heroSub', 'long', 'Hero description')}>
              ${esc(UI_COPY.heroSub || `Every ore, rune, boss and perk — documented, cross-linked and searchable. Built by the community, verified against v${latest.version}.`).replace('\n', '<br />')}
            </p>
            <form class="hero__search" id="hero-search">
              <div class="input-wrap">
                ${icon('search', 19)}
                <input class="input" type="search" placeholder="Search ores, bosses, runes…" aria-label="Search the wiki" />
              </div>
            </form>
            <div class="hero__chips">
              ${CATEGORIES.map((c, i) => `
                <a class="chip chip--accent" href="#/${c.id}" ${ed(`wiki:categories.${i}`, 'category-card', c.name)}>${icon(c.icon, 13)} ${c.name}</a>`).join('')}
            </div>
          </div>
          <div class="hero__art" aria-hidden="true">
            <div class="hero__art-rings"></div>
            <span class="hero__emblem">${emblem(132)}</span>
          </div>
        </div>
        <div class="hero__stats">
          <div class="hero__stat"><b data-count="${stats.pages}">0</b><span>Wiki pages</span></div>
          <div class="hero__stat"><b data-count="${stats.categories}">0</b><span>Categories</span></div>
          <div class="hero__stat"><b>v${stats.updateVersion}</b><span>Latest update</span></div>
          <div class="hero__stat"><b data-count="${stats.updateCount}">0</b><span>Logged changes</span></div>
        </div>
      </section>

      <!-- ============ Quick access ============ -->
      <section class="section">
        ${sectionHead('Explore the wiki')}
        <div class="grid grid--cards">
          ${cats.map((c, i) => categoryCard(c, i)).join('')}
          <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="wiki:categories" data-edit-add-template="category" style="align-self:center;justify-content:center;">
            ${icon('plus', 14)} New category
          </button>
        </div>
      </section>

      <!-- ============ Update log preview ============ -->
      <section class="section">
        ${sectionHead('Latest update', '#/updates', 'Full log')}
        <div class="panel" style="padding:22px 24px">
          <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px">
            <span class="upd-version__num">${latest.version}</span>
            <span class="upd-version__date">${icon('calendar', 13)} ${fmtDate(latest.date)}</span>
            <span class="chip chip--accent upd-version__latest">Newest</span>
          </div>
          <div class="upd-preview">
            ${latest.entries.slice(0, 4).map((e, i) => `
              <div class="upd-mini upd-mini--${e.context.toLowerCase()} reveal" ${ed(`updates:versions.0.entries.${i}`, 'entry', esc(e.title))} style="--reveal-delay:${i * 35}ms">
                ${icon(CONTEXT_ICONS[e.context], 17)}
                <span><b>${esc(e.title)}</b><span>${esc(e.description)}</span></span>
              </div>`).join('')}
          </div>
        </div>
      </section>
    `;

    root.querySelector('#hero-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.querySelector('input').value.trim();
      window.location.hash = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    });

    root.querySelectorAll('[data-count]').forEach((el, i) => {
      setTimeout(() => countUp(el, parseInt(el.dataset.count, 10)), 350 + i * 120);
    });

    initReveal(root);
  },
};

export const categoryView = {
  title: (p) => `${getCategory(p[0])?.name ?? 'Category'} — RI Gaming Wiki`,
  crumbs: (p) => (p[0] === 'main'
    ? [{ label: 'Main' }]
    : [{ label: 'Main', href: '#/', icon: 'compass' }, { label: getCategory(p[0])?.name ?? 'Category' }]),
  nav: (p) => p[0],

  async render(root, params) {
    const cat = getCategory(params[0]);
    if (!cat) throw new Error(`Unknown category: ${params[0]}`);
    const ci = CATEGORIES.findIndex((c) => c.id === cat.id);
    const catPath = `wiki:categories.${ci}`;
    const overview = cat.overview || {};
    const hasOverview = overview.desc || overview.highlights?.length || overview.facts?.length;

    root.innerHTML = html`
      <section class="cat-hero${cat.vitals?.length ? ' cat-hero--split' : ''}">
        <div class="cat-hero__main">
          <div class="cat-hero__crumbs crumbs">
            <a href="#/">Main</a> ${icon('chevron-right', 12)} <span class="crumbs__current">${colorizeResources(esc(cat.name))}</span>
          </div>
          <div class="cat-hero__title">
            <span class="cat-hero__icon">${icon(cat.icon, 30)}</span>
            <h1 class="cat-hero__name" ${ed(`${catPath}.name`, 'text', `${cat.name} · page title`)}>${colorizeResources(esc(cat.name))}</h1>
          </div>
          <p class="cat-hero__tagline" data-resource-links ${ed(`${catPath}.tagline`, 'long', `${cat.name} · tagline`)}>${colorizeResources(esc(cat.tagline))}</p>
          ${cat.desc ? `<p class="cat-hero__description" data-resource-links ${ed(`${catPath}.desc`, 'long', `${cat.name} · description`)}>${colorizeResources(esc(cat.desc))}</p>` : ''}
          <div class="cat-hero__facts">
            <span class="chip">${icon('layers', 13)} ${cat.subcategories.length} subsections</span>
          </div>
        </div>
        ${cat.vitals?.length ? `
        <aside class="vitals" aria-label="Key information">
          <span class="vitals__label">Key info</span>
          ${cat.vitals.map((v, vi) => `
            <div class="vitals__row" ${ed(`${catPath}.vitals.${vi}`, 'pair', `Key info · ${esc(v.label)}`)}>
              <span class="vitals__key">${esc(v.label)}</span>
              <span class="vitals__val">${colorizeResources(esc(v.value))}</span>
            </div>`).join('')}
        </aside>` : ''}
      </section>

      ${hasOverview ? `
      <section class="section category-overview">
        ${sectionHead('Overview')}
        ${overview.desc ? `<p class="category-overview__desc" data-resource-links ${ed(`${catPath}.overview.desc`, 'long', `${cat.name} · overview`)}>${colorizeResources(esc(overview.desc))}</p>` : ''}
        ${overview.facts?.length ? `<div class="cat-hero__facts">${overview.facts.map((fact, fi) => `<span class="chip" ${ed(`${catPath}.overview.facts.${fi}`, 'pair', `Overview fact · ${esc(fact.label)}`)}>${esc(fact.label)}: <b style="color:var(--c-text)">&nbsp;${colorizeResources(esc(fact.value))}</b></span>`).join('')}</div>` : ''}
        ${overview.highlights?.length ? `<div class="highlight-grid">${overview.highlights.map((highlight, index) => infoCard(highlight, index, `${catPath}.overview.highlights.${index}`)).join('')}</div>` : ''}
      </section>` : ''}

      <div class="sub-pills-wrap">
        <nav class="pill-nav" aria-label="Subsections of ${esc(cat.name)}">
          ${cat.subcategories.map((s, sIdx) => `
            <a class="pill" href="#/${cat.id}/${s.id}" ${ed(`${catPath}.subcategories.${sIdx}.name`, 'text', `${s.name} · sidebar name`)}><span class="pill__label">${colorizeResources(esc(s.name))}</span></a>`).join('')}
        </nav>
      </div>

      <section class="section">
        ${sectionHead('Subsections')}
        <div class="link-grid">
          ${cat.subcategories.map((s, i) => `
            <a ${`class="sub-link reveal" style="--reveal-delay:${i * 35}ms"`}${ed(`${catPath}.subcategories.${i}`, 'sub-card', s.name)} href="#/${cat.id}/${s.id}">
              ${icon(s.icon, 19)}
              <span style="min-width:0">
                <b>${esc(s.name)}</b>
                <small data-resource-links>${colorizeResources(esc(s.desc))}</small>
              </span>
              ${icon('arrow-right', 15, 'sub-link__go')}
            </a>`).join('')}
          <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="${catPath}.subcategories" data-edit-add-template="sub-card" style="align-self:center;justify-content:center;">
            ${icon('plus', 14)} New page
          </button>
        </div>
      </section>

    `;

    initReveal(root);
  },
};

function subCrumbParts(sub) {
  const cat = sub.category;
  const head = cat.id === 'main'
    ? [{ label: cat.name, href: `#/${cat.id}` }]
    : [{ label: 'Main', href: '#/', icon: 'compass' }, { label: cat.name, href: `#/${cat.id}` }];
  const mids = (sub.parentChain || []).map((pp) => ({ label: pp.name, href: `#/${cat.id}/${pp.id}` }));
  return [...head, ...mids, { label: sub.name }];
}

export const subcategoryView = {
  title: (p) => {
    const sub = getSubcategory(p[0], p[1]);
    return `${sub ? `${sub.name} — ${sub.category.name}` : 'Subsection'} — RI Gaming Wiki`;
  },
  crumbs: (p) => {
    const sub = getSubcategory(p[0], p[1]);
    if (!sub) return [{ label: 'Main', href: '#/' }, { label: 'Not found' }];
    return subCrumbParts(sub);
  },
  nav: (p) => [p[0], p[1]],

  async render(root, params) {
    const sub = getSubcategory(params[0], params[1]);
    if (!sub) throw new Error(`Unknown subcategory: ${params.join('/')}`);
    const inlineUpgradeParent = sub.parentId && getSubcategory(sub.category.id, sub.parentId);
    if (inlineUpgradeParent && getInlineUpgradePages(sub.category.id, inlineUpgradeParent).some(({ child }) => child.id === sub.id)) {
      window.location.hash = `#/${sub.category.id}/${inlineUpgradeParent.id}`;
      return;
    }
    const cat = sub.category;
    const gameKey = `${cat.id}/${sub.id}`;
    const ci = CATEGORIES.findIndex((c) => c.id === cat.id);
    const wikiPath = `wiki:${getSubcategoryDocPath(cat.id, sub.id)}`;
    const family = getRuneFamily(cat.id, sub.id);
    const orePage = getOrePage(cat.id, sub.id);
    const masteryPage = getMasteryPage(cat.id, sub.id);
    const layerPage = getLayerPage(cat.id, sub.id);
    const stagePage = getStagePage(cat.id, sub.id);
    const barnPage = getBarnPage(cat.id, sub.id);
    const trainingPage = getTrainingAreas(cat.id, sub.id);
    const gearPage = getGearPage(cat.id, sub.id);
    const inlineUpgradePages = getInlineUpgradePages(cat.id, sub);
    const inlineUpgradeIds = new Set(inlineUpgradePages.map(({ child }) => child.id));
    const visibleChildren = (sub.children || []).filter((child) => !inlineUpgradeIds.has(child.id));
    const formulaPage = getFormulaPage(cat.id, sub.id);
    const upgradesListPath = (pageId) => {
      const sectionKey = FORMULA_PAGE_MAP[`${cat.id}/${pageId}`];
      return sectionKey ? `game:upgrades.sections.${sectionKey}.upgrades` : '';
    };
    const inlineUpgradeSections = inlineUpgradePages
      .map(({ child, page }) => formulaSections(page, upgradesListPath(child.id)))
      .join('');
    const resetLayerPage = RESET_LAYER_PAGES[`${cat.id}/${sub.id}`];
    const resetLayerPath = resetLayerPage ? `game:calculators.pages.${cat.id}/${sub.id}` : '';
    const rankPage = getRankPage(cat.id, sub.id);
    const ascensionPage = getAscensionPage(cat.id, sub.id);
    const lifeRankPage = getLifeRankPage(cat.id, sub.id);
    const corePage = getCorePage(cat.id, sub.id);
    const isDustPage = sub.id === 'bone-dust';
    const familyBody = resetLayerPage
      ? `${resetLayerSections(resetLayerPage, resetLayerPath)}${resetLayerPage.kind === 'bone-dust' ? dustSections() : ''}`
      : family?.runes?.length
      ? runeFamilySections(family.runes, sub.id)
      : orePage?.ores?.length
        ? orePageSections(orePage.ores, `game:mining.ores.${gameKey}.ores`)
        : masteryPage?.ores?.length
          ? masteryPageSections(masteryPage.ores, `game:mining.mastery.${gameKey}.ores`)
          : layerPage?.layers?.length
            ? layerPageSections(layerPage.layers, `game:mining.layers.${gameKey}.layers`)
            : stagePage?.stages?.length
              ? stagePageSections(stagePage.stages, 'Stages', false, `game:progression.stages.${gameKey}.stages`)
              : barnPage?.stages?.length
                ? stagePageSections(barnPage.stages, 'Barns', true, `game:progression.barns.${gameKey}.stages`)
                : rankPage?.ranks?.length
                ? stagePageSections(rankPage.ranks, 'Ranks', true, `game:progression.ranks.${gameKey}.ranks`)
                : ascensionPage?.ranks?.length
                  ? stagePageSections(ascensionPage.ranks, 'Ascensions', true, `game:progression.ascensions.${gameKey}.ranks`)
                  : lifeRankPage?.ranks?.length
                    ? stagePageSections(lifeRankPage.ranks, 'Life Ranks', true, `game:progression.lifeRanks.${gameKey}.ranks`)
                    : corePage?.ranks?.length
                      ? stagePageSections(corePage.ranks, 'Core Ranks', true, `game:progression.cores.${gameKey}.ranks`)
                      : trainingPage?.groups?.length
                    ? trainingSections(trainingPage.groups, `game:dungeon.training.${gameKey}.groups`)
                    : gearPage?.gears?.length
                      ? gearSections(gearPage.gears, `game:dungeon.gear.${gameKey}.gears`)
                      : formulaPage
                              ? formulaSections(formulaPage, upgradesListPath(sub.id))
                        : sub.name === 'Upgrades' && !sub.children?.length
                          ? upgradeTemplateSections()
                          : isDustPage
                            ? dustSections()
                            : (cat.id === 'runes' ? runePlaceholderSection(sub) : '');
    const showChildrenSection = visibleChildren.length > 0
      || document.documentElement.classList.contains('ri-edit-bar');

    window.__riPageNames = [cat.name, sub.name, ...(sub.parentChain || []).map((p) => p.name)];

    root.innerHTML = html`
      <section class="cat-hero${sub.vitals?.length ? ' cat-hero--split' : ''}">
        <div class="cat-hero__main">
          <div class="cat-hero__crumbs crumbs">
            ${subCrumbParts(sub).slice(0, -1).map((c) => `
              <a href="${c.href}">${esc(c.label)}</a> ${icon('chevron-right', 12)}`).join('')}
            <span class="crumbs__current">${esc(sub.name)}</span>
          </div>
          <div class="cat-hero__title">
            <span class="cat-hero__icon">${icon(sub.icon, 30)}</span>
            <h1 class="cat-hero__name" ${ed(`${wikiPath}.name`, 'text', `${sub.name} · page title`)}>${colorizeResources(esc(sub.name))}</h1>
          </div>
          <p class="cat-hero__tagline" data-resource-links ${ed(`${wikiPath}.desc`, 'long', `${sub.name} · description`)}>${colorizeResources(esc(sub.desc))}</p>
          <div class="cat-hero__facts">
            ${sub.facts.map((f, fi) => `<span class="chip" ${ed(`${wikiPath}.facts.${fi}`, 'pair', `Fact · ${esc(f.label)}`)}>${esc(f.label)}: <b style="color:var(--c-text)">&nbsp;${esc(f.value)}</b></span>`).join('')}
          </div>
        </div>
        ${sub.vitals?.length ? `
        <aside class="vitals" aria-label="Key information">
          <span class="vitals__label">Key info</span>
          ${sub.vitals.map((v, vi) => `
            <div class="vitals__row" ${ed(`${wikiPath}.vitals.${vi}`, 'pair', `Key info · ${esc(v.label)}`)}>
              <span class="vitals__key">${esc(v.label)}</span>
              <span class="vitals__val">${colorizeResources(esc(v.value))}</span>
            </div>`).join('')}
        </aside>` : ''}
      </section>

      <div class="sub-pills-wrap">
        <nav class="pill-nav" aria-label="Subsections of ${esc(cat.name)}">
          ${cat.subcategories.map((s, sIdx) => `
            <a class="pill${s.id === sub.id || s.id === sub.parentId ? ' active' : ''}" href="#/${cat.id}/${s.id}" ${ed(`wiki:categories.${ci}.subcategories.${sIdx}.name`, 'text', `${s.name} · sidebar name`)}><span class="pill__label">${colorizeResources(esc(s.name))}</span></a>`).join('')}
        </nav>
      </div>

      ${showChildrenSection ? `
      <section class="section sub-children-section">
        ${sectionHead(familyBody ? `Inside ${sub.name}` : sub.name)}
        <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="${esc(`${wikiPath}.children`)}" data-edit-add-template="sub-card">${icon('plus', 13)} New page</button>
        <div class="link-grid">
          ${visibleChildren.map((ch, i) => `
            <a ${`class="sub-link reveal" style="--reveal-delay:${i * 35}ms"`}${ed(`wiki:${getSubcategoryDocPath(cat.id, ch.id)}`, 'sub-card', ch.name)} href="#/${cat.id}/${ch.id}">
              ${icon(ch.icon, 19)}
              <span style="min-width:0">
                <b>${colorizeResources(esc(ch.name))}</b>
                    <small data-resource-links>${colorizeResources(esc(ch.desc))}</small>
              </span>
              ${icon('arrow-right', 15, 'sub-link__go')}
            </a>`).join('')}
        </div>
      </section>` : ''}

      ${familyBody || ''}
      ${sub.highlights?.length ? `
      <section class="section">
        ${sectionHead('Highlights')}
        <div class="highlight-grid">
          ${sub.highlights.map((h, i) => infoCard(h, i, `${wikiPath}.highlights.${i}`)).join('')}
        </div>
      </section>` : ''}

      ${!familyBody && sub.id === 'overview' ? `
          <section class="section">
            ${sectionHead('Where to next')}
            <div class="link-grid">
              ${cat.subcategories.map((s, sIdx) => ({ s, sIdx })).filter(({ s }) => s.id !== 'overview').map(({ s, sIdx }, i) => `
                <a ${`class="sub-link reveal" style="--reveal-delay:${i * 35}ms"`}${ed(`wiki:${getSubcategoryDocPath(cat.id, s.id)}`, 'sub-card', s.name)} href="#/${cat.id}/${s.id}">
                  ${icon(s.icon, 19)}
                  <span style="min-width:0">
                    <b>${esc(s.name)}</b>
                    <small>${esc(s.desc)}</small>
                  </span>
                  ${icon('arrow-right', 15, 'sub-link__go')}
                </a>`).join('')}
            </div>
          </section>
      ` : ''}
      ${!familyBody && sub.id !== 'overview' && !sub.children?.length ? `
          <section class="section">
            <div class="empty-state">
              ${icon('info', 26)}
              <h3>More details coming soon</h3>
              <p style="max-width:42ch">This Wiki page is ready for more information. Its description and key details are available above.</p>
              <a class="btn btn--ghost" href="#/${cat.id}">${icon('arrow-right', 15)} Back to ${esc(cat.name)}</a>
            </div>
          </section>
      ` : ''}

  ${inlineUpgradeSections}

      ${(sub.prev || sub.next) ? `
      <nav class="sub-pager">
        ${sub.prev
          ? `<a href="#/${cat.id}/${sub.prev.id}"><small>Previous</small><b>${icon('arrow-right', 13)} ${esc(sub.prev.name)}</b></a>`
          : '<span></span>'}
        ${sub.next
          ? `<a href="#/${cat.id}/${sub.next.id}"><small>Next</small><b>${esc(sub.next.name)} ${icon('arrow-right', 13)}</b></a>`
          : '<span></span>'}
      </nav>` : ''}
    `;

    wireUpgrades(root);
    wireResetCalculators(root, resetLayerPage);
    initReveal(root);
  },
};

const SORTS = [
  { id: 'relevance', label: 'Best match' },
  { id: 'title', label: 'Title A–Z' },
];

export const searchView = {
  title: (p, q) => (q.get('q') ? `"${q.get('q')}" — Search — RI Gaming Wiki` : 'Search — RI Gaming Wiki'),
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Search', icon: 'search' }],
  nav: () => null,

  async render(root, params, query) {
    const state = {
      q: query.get('q') || '',
      cat: query.get('cat') || '',
      sort: query.get('sort') || 'relevance',
    };

    root.innerHTML = html`
      <div class="search-page__head">
        <h1>Search the wiki</h1>
        <p style="color:var(--c-text-2);margin-top:8px;max-width:60ch">
          Search across every Wiki category and page description.
        </p>
        <form class="search-page__input" id="search-page-form">
          <div class="input-wrap">
            ${icon('search', 19)}
            <input class="input" type="search" id="search-page-input" autocomplete="off"
                   placeholder="Try "voidstone", "respawn", "crit"…" aria-label="Search query"
                   value="${esc(state.q)}" />
          </div>
        </form>
      </div>

      <div class="filters-row">
        <nav class="pill-nav" id="search-cats" aria-label="Filter by category" style="flex:1 1 auto">
          <button class="pill${state.cat ? '' : ' active'}" data-cat="">${icon('grid', 14)} All</button>
          ${CATEGORIES.map((c) => `
            <button class="pill${state.cat === c.id ? ' active' : ''}" data-cat="${c.id}">${icon(c.icon, 14)} ${esc(c.name)}</button>`).join('')}
        </nav>
        <div style="position:relative">
          <button class="btn btn--ghost btn--sm" id="sort-btn" aria-haspopup="listbox" aria-expanded="false">
            ${icon('sort', 15)} <span id="sort-label">${esc(SORTS.find((s) => s.id === state.sort)?.label)}</span> ${icon('chevron-down', 14)}
          </button>
          <div class="dropdown" id="sort-menu" role="listbox" hidden
               style="right:0;top:calc(100% + 6px)">
            ${SORTS.map((s) => `
              <button class="dropdown__item${s.id === state.sort ? ' dropdown__item--focused' : ''}" role="option" data-sort="${s.id}">
                ${icon(s.id === state.sort ? 'check' : 'sort', 14)} ${esc(s.label)}
              </button>`).join('')}
          </div>
        </div>
      </div>

      <div id="search-results"><div class="searchbox__loading"><span class="spinner"></span> Searching…</div></div>
    `;

    const input = qs('#search-page-input', root);
    const resultsRoot = qs('#search-results', root);
    const sortBtn = qs('#sort-btn', root);
    const sortMenu = qs('#sort-menu', root);

    const commitToUrl = () => {
      const params = new URLSearchParams();
      if (state.q) params.set('q', state.q);
      if (state.cat) params.set('cat', state.cat);
      if (state.sort !== 'relevance') params.set('sort', state.sort);
      const qsStr = params.toString();
      window.location.hash = `/search${qsStr ? `?${qsStr}` : ''}`;
    };

    const runSearch = async () => {
      if (!state.q.trim()) {
        resultsRoot.innerHTML = `
          <div class="empty-state">
            ${icon('search', 26)}
            <h3>Type something to search</h3>
            <p>Every category and page description is indexed. Press <span class="kbd">Ctrl</span> <span class="kbd">K</span> anywhere for the quick search.</p>
          </div>`;
        return;
      }
      resultsRoot.innerHTML = `<div class="searchbox__loading"><span class="spinner"></span> Searching…</div>`;
      const results = await dataProvider.search(state.q, { category: state.cat || null, sort: state.sort });
      renderResults(resultsRoot, results, state);
    };

    function renderResults(target, results, st) {
      if (!results.length) {
        target.innerHTML = `
          <div class="empty-state">
            ${icon('info', 26)}
            <h3>No results for "${esc(st.q)}"</h3>
            <p>Check the spelling, try a broader term, or clear the category filter.</p>
          </div>`;
        return;
      }
      target.innerHTML = `
        <p class="result-count" style="margin-bottom:12px">${results.length} Wiki result${results.length === 1 ? '' : 's'}${st.cat ? ` in <b style="color:var(--c-accent)">${esc(CATEGORIES.find((c) => c.id === st.cat)?.name)}</b>` : ''} · sorted by "${esc(SORTS.find((s) => s.id === st.sort)?.label)}"</p>
        <div class="result-list">
          ${results.map((result, i) => `
            <a class="result-item reveal" style="--reveal-delay:${Math.min(i * 40, 320)}ms" href="${esc(result.href)}">
              <div class="result-item__top">${icon(result.cat.icon, 12)} ${esc(result.cat.name)} ${result.kind === 'category' ? 'category' : 'page'}</div>
              <div class="result-item__title">${colorizeResources(markMatches(result.sub.name, st.q))}</div>
              <div class="result-item__snippet">${colorizeResources(markMatches(result.sub.desc || result.sub.tagline || '', st.q))}</div>
            </a>`).join('')}
        </div>
      `;
      initReveal(target);
    }

    const liveSearch = debounce(runSearch, 220);
    input.addEventListener('input', () => { state.q = input.value; liveSearch(); });
    qs('#search-page-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      state.q = input.value;
      commitToUrl();
    });

    qsa('#search-cats .pill', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('#search-cats .pill', root).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.cat = btn.dataset.cat;
        commitToUrl();
      });
    });

    sortBtn.addEventListener('click', () => {
      const open = sortMenu.hidden;
      sortMenu.hidden = !open;
      sortBtn.setAttribute('aria-expanded', String(open));
    });

    sortMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-sort]');
      if (!item) return;
      state.sort = item.dataset.sort;
      qs('#sort-label', root).textContent = SORTS.find((s) => s.id === state.sort).label;
      sortMenu.hidden = true;
      commitToUrl();
    });

    document.addEventListener('click', (e) => {
      if (!sortBtn.contains(e.target) && !sortMenu.contains(e.target)) sortMenu.hidden = true;
    });

    await runSearch();
    input.focus({ preventScroll: true });
  },
};

const CONTEXTS = [
  { id: 'Feature', icon: 'spark', cls: 'feature', label: 'Features' },
  { id: 'Changes', icon: 'refresh', cls: 'changes', label: 'Changes' },
  { id: 'UI', icon: 'grid', cls: 'ui', label: 'UI' },
  { id: 'Bugs', icon: 'alert', cls: 'bug', label: 'Bugs' },
];

export const updatesView = {
  title: () => 'Update Log — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Update Log', icon: 'scroll' }],
  nav: () => null,

  async render(root) {
    const versions = await dataProvider.getUpdateLog();
    const displayVersions = versions
      .map((v, docIndex) => ({ v, docIndex }))
      .filter(({ v }) => v.entries.length);
    const totalEntries = displayVersions.reduce((total, { v }) => total + v.entries.length, 0);

    root.innerHTML = html`
      <header class="upd-hero">
        <div class="upd-hero__intro">
          <span class="upd-hero__eyebrow">${icon('spark', 14)} The valley keeps growing</span>
          <h1>Update Log</h1>
          <p>New features, improvements and fixes — all in one place. Select a category or follow a colored resource to explore the wiki.</p>
        </div>
        <div class="upd-hero__stats">
          <div><b>${displayVersions.length}</b><span>Versions</span></div>
          <div><b>${totalEntries}</b><span>Updates</span></div>
          <div><b>v${esc(displayVersions[0]?.v.version || '—')}</b><span>Latest</span></div>
        </div>
      </header>

      <nav class="upd-filters" aria-label="Filter update categories">
        <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="updates:versions" data-edit-add-template="version">${icon('plus', 13)} New release</button>
        <button class="upd-filter is-active" type="button" data-update-filter="all">All <b>${totalEntries}</b></button>
        ${CONTEXTS.map((ctx) => {
          const count = displayVersions.reduce((total, { v }) => total + v.entries.filter((entry) => entry.context === ctx.id).length, 0);
          return `<button class="upd-filter upd-filter--${ctx.cls}" type="button" data-update-filter="${ctx.id}">${icon(ctx.icon, 14)} ${ctx.label} <b>${count}</b></button>`;
        }).join('')}
      </nav>

      ${displayVersions.map(({ v, docIndex }, vi) => `
        <section class="upd-version reveal" ${ed(`updates:versions.${docIndex}`, 'version', `Release ${v.version}`)} data-update-version style="--reveal-delay:${Math.min(vi * 55, 400)}ms">
          <div class="upd-version__head">
            <div class="upd-version__identity">
              <span class="upd-version__eyebrow">Release</span>
              <span class="upd-version__num">${esc(v.version)}</span>
            </div>
            <span class="upd-version__date">${icon('calendar', 13)} ${fmtDate(v.date)}</span>
            <span class="upd-version__count">${v.entries.length} ${v.entries.length === 1 ? 'update' : 'updates'}</span>
            ${vi === 0 ? '<span class="chip chip--accent upd-version__latest">Latest</span>' : ''}
          </div>

          ${CONTEXTS.map((ctx) => {
            const entries = v.entries
              .map((e, entryIndex) => ({ e, entryIndex }))
              .filter(({ e }) => e.context === ctx.id);
            if (!entries.length) return '';
            return `
              <section class="upd-group upd-group--${ctx.cls}" data-update-group="${ctx.id}">
                <div class="upd-group__label">${icon(ctx.icon, 14)} ${ctx.label}</div>
                ${entries.map(({ e, entryIndex }) => `
                  <article class="upd-entry" ${ed(`updates:versions.${docIndex}.entries.${entryIndex}`, 'entry', esc(e.title))} data-resource-links>
                    ${icon(ctx.icon, 16)}
                    <div>
                      ${e.href
                        ? `<a class="upd-entry__title" href="${esc(e.href)}"><span class="upd-entry__title-text">${colorizeResources(esc(e.title))}</span>${icon('arrow-right', 13)}</a>`
                        : `<b class="upd-entry__title upd-entry__title-text">${colorizeResources(esc(e.title))}</b>`}
                      <p class="upd-entry__description">${colorizeResources(esc(e.description))}</p>
                    </div>
                  </article>`).join('')}
                <button type="button" class="btn btn--ghost btn--sm ri-edit-add" data-edit-add="updates:versions.${docIndex}.entries" data-edit-add-template="entry">${icon('plus', 12)} New update</button>
              </section>`;
          }).join('')}
        </section>`).join('')}
    `;

    qsa('[data-update-filter]', root).forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.updateFilter;
        qsa('[data-update-filter]', root).forEach((item) => item.classList.toggle('is-active', item === button));
        qsa('[data-update-group]', root).forEach((group) => {
          group.hidden = filter !== 'all' && group.dataset.updateGroup !== filter;
        });
      });
    });

    markUpdateSeen(LATEST_UPDATE_ID);
    initReveal(root);
  },
};

export const notFoundView = {
  title: () => 'Page not found — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Not found' }],
  nav: () => null,

  async render(root, params) {
    root.innerHTML = html`
      <div class="notfound">
        <div class="notfound__code">4<span>0</span>4</div>
        <h1>This page never bloomed</h1>
        <p style="color:var(--c-text-3);max-width:44ch">
          Nothing grows at <code style="color:var(--c-accent-light)">${esc('#/' + (params[0] || ''))}</code>.
          Try a search, or head back to the Main tab.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <a class="btn btn--primary" href="#/">${emblem(18)} Back to Main</a>
          <a class="btn btn--ghost" href="#/search">Search the wiki</a>
        </div>
      </div>
    `;
  },
};

// ==== CREDITS ====

function initials(name = '') {
  return name.split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function profileCard(p, i, featured = false, listPath = '') {
  return `
    <article class="credit-card${featured ? ' credit-card--featured' : ''} reveal" ${listPath ? ed(`${listPath}.${i}`, 'credit', esc(p.name)) : ''} style="--reveal-delay:${Math.min(i * 50, 400)}ms">
      <div class="credit-card__banner" style="--banner:${esc(p.banner || 'var(--c-accent)')}"></div>
      <div class="credit-card__avatar">
        <span class="credit-card__fallback">${initials(p.name)}</span>
        <img src="${esc(p.avatar)}" alt="" loading="lazy" onerror="this.remove()" />
      </div>
      <div class="credit-card__info">
        <b class="credit-card__name">${esc(p.name)}</b>
        ${p.handle ? `<span class="credit-card__handle">${esc(p.handle)}</span>` : ''}
        <span class="credit-card__role">${icon(featured ? 'star' : 'users', 12)} ${esc(p.role || 'Contributor')}</span>
      </div>
    </article>`;
}

export const creditsView = {
  title: () => 'Credits — RI Gaming Wiki',
  crumbs: () => [{ label: 'Main', href: '#/', icon: 'compass' }, { label: 'Credits', icon: 'star' }],
  nav: () => null,

  async render(root) {
    root.innerHTML = html`
      <div class="page-head credits-hero">
        <h1>Credits</h1>
        <p class="credits-hero__sub">The people behind this wiki.</p>
      </div>

      <section class="section credits-grid">
        ${CREDITS.staff.map((p, i) => profileCard(p, i, true, 'wiki:credits.staff')).join('')}
        ${CREDITS.contributors.map((p, i) => profileCard(p, i, false, 'wiki:credits.contributors')).join('')}
      </section>

      <div class="callout callout--tip credits-thanks reveal" style="--reveal-delay:160ms" ${ed('wiki:credits.thanks', 'long', 'Special thanks')}>
        ${icon('heart', 18)}
        <div>
          <span class="callout__title">Special thanks</span>
          ${CREDITS.thanks}
        </div>
      </div>
    `;

    initReveal(root);
  },
};
