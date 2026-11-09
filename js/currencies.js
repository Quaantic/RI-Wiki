// Currencies and Currency Explorer — content comes from game-data.json.
// All edits go through the existing inline editor: no parallel admin state.
import { esc, fmtCalculatorNumber } from './utils.js';
import { FORMULA_SECTIONS } from './data/formulas.js';
import { calculateUpgrade, findTargetEffectLevel } from './calculator.js';
import { icon, namedIcon } from './ui.js';
import { mergeCurrencySources } from './data/currency-auto.js';
import { FORMULA_PAGE_MAP } from './data/formulas.js';
import { ed } from './edit/ed-attr.js';
import { resourceColor } from './data/resource-colors.js';

const EMPTY = { title: 'Currencies', description: '', explorerTitle: 'Currency Explorer', explorerDescription: '', groups: [], entries: [], sources: [] };
export const CURRENCY_DATA = structuredClone(EMPTY);
let currentSources = [];
let latestGame = null;
export function setCurrencyData(data) {
  const next = data && typeof data === 'object' ? data : EMPTY;
  Object.assign(CURRENCY_DATA, structuredClone(EMPTY));
  for (const key of Object.keys(EMPTY)) {
    CURRENCY_DATA[key] = Array.isArray(EMPTY[key]) ? (Array.isArray(next[key]) ? next[key] : []) : String(next[key] ?? EMPTY[key]);
  }
  currentSources = mergeCurrencySources(latestGame, CURRENCY_DATA.entries, CURRENCY_DATA.sources);
}

export function setCurrencySourceGame(game) {
 latestGame = game;
 currentSources = mergeCurrencySources(game, CURRENCY_DATA.entries, CURRENCY_DATA.sources);
}
// Source categories are editorial and reusable across the same draft / publish system.
const TYPES = [
  ['rune', 'Runes', 'gem'],
  ['bonus', 'Bonuses', 'sparkles'],
  ['upgrade', 'Upgrades', 'trending-up'],
  ['mastery', 'Masteries', 'medal'],
  ['milestone', 'Milestones', 'flag-triangle-right'],
  ['perk', 'Perks', 'zap'],
  ['core', 'Cores', 'hexagon'],
  ['stage', 'Stages & Ranks', 'layers'],
  ['board', 'Boards', 'layout-grid'],
  ['other', 'Other sources', 'more-horizontal'],
];
const label = (s) => esc(String(s || ''));
const href = (s) => /^#\/[\w-]+(?:\/[\w-]+)*(?:\?[\w%=&+().-]*)?$/.test(String(s || '')) ? String(s) : '';
const svg = (name, size = 34, labelText = '') => `<span class="cur-icon">${labelText ? namedIcon(labelText,name || 'coins',size) : icon(name || 'coins', size)}</span>`;
const groups = () => CURRENCY_DATA.groups || [];
const entries = () => CURRENCY_DATA.entries || [];
const sources = () => currentSources;
const activeCurrency = (id) => entries().find((e) => e.id === id) || entries()[0];
const color = (entry) => (entry?.color && /^#[0-9a-fA-F]{3,8}$/.test(entry.color) ? entry.color : resourceColor(entry?.name)) || '#b2c992';
const related = (links) => (Array.isArray(links) ? links : []).filter((x) => href(x.href)).map((x) => `<a href="${esc(href(x.href))}" class="cur-link">${icon('book-open',13)} ${label(x.label || 'Article')}</a>`).join('');
const tabs = (active) => `<nav class="cur-switch" aria-label="Explorer sections"><a href="#/explorer?tab=catalog" ${active==='list'?'aria-current="page"':''}>${icon('coins',17)} Currencies</a><a href="#/explorer?tab=sources" ${active==='explore'?'aria-current="page"':''}>${icon('sliders-horizontal',17)} Bonus Explorer</a></nav>`;
const add = (path, template, text) => `<button class="cur-edit cur-add" type="button" data-edit-add="game:${path}" data-edit-add-template="${template}">${icon('plus',14)} ${text}</button>`;
const edit = (path, kind, text) => `<button type="button" class="cur-edit" ${ed(`game:${path}`,kind,text)}>${icon('pencil',13)} ${text}</button>`;
const entryIndex = (entry) => entries().indexOf(entry);
const groupsIndex = (group) => groups().indexOf(group);
const sourceIndex = (source) => CURRENCY_DATA.sources.findIndex(x => x.id === source.id);
const path = (entry) => `currencies.entries.${entryIndex(entry)}`;

function header(title, desc, which, titlePath, descPath) {
 return `<header class="cur-hero"><div><span class="cur-eyebrow">Regrowth Incremental • Field guide</span><h1>${icon('compass',36)} Explorer</h1><h2 class="cur-hero-subtitle">${label(title)}</h2><p>${label(desc)}</p></div><div class="cur-hero-tools">${edit(titlePath,'text','Edit title')}${edit(descPath,'long','Edit introduction')}</div></header>${tabs(which)}`;
}

function iconRulesManager() {
 const rules = Array.isArray(latestGame?.iconNameRules) ? latestGame.iconNameRules : [];
 return `<details class="cur-named-icons"><summary>${icon('image',17)} Icons by name <span>${rules.length} custom rules</span></summary>
   <p>Icons with matching filenames inside <code>images/icons/custom</code> are detected automatically. Add a rule for names without a matching file, or to override one.</p>
   <div class="cur-icon-rules">${rules.map((rule,i)=>`<div class="cur-icon-rule">${namedIcon(rule.name,rule.icon,25)}<b>${label(rule.name)}</b>${edit(`iconNameRules.${i}`,'game:icon-name-rule','Change icon')}</div>`).join('')}</div>
   <div class="cur-page-actions">${add('iconNameRules','icon-name-rule','Configure name icon')}</div></details>`;
}

function card(entry) {
 const idx = entryIndex(entry);
 return `<article class="cur-card" style="--cur-color:${esc(color(entry))}" ${ed(`game:currencies.entries.${idx}`,'game:currency-entry', entry.name)}>
   <a href="#/explorer?tab=sources&currency=${encodeURIComponent(entry.id)}" class="cur-card-main" aria-label="Explore ${label(entry.name)}">
      ${svg(entry.icon, 62, entry.name)}<span><strong>${label(entry.name)}</strong><small>${label(entry.description)}</small></span>${icon('arrow-up-right',16)}
   </a><div class="cur-card-bottom">${entry.primaryUse ? `<span class="cur-tag">${label(entry.primaryUse)}</span>` : ''}${related(entry.relatedLinks)}${edit(`currencies.entries.${idx}`,'game:currency-entry','Edit currency')}</div>
 </article>`;
}

export const currenciesView = {
 title: () => 'Explorer — Currencies',
 nav: () => null,
 crumbs: () => [{ label:'Explorer',href:'#/explorer' },{label:'Currencies'}],
 async render(root) {
  root.innerHTML = `<section class="cur-page">${header(CURRENCY_DATA.title,CURRENCY_DATA.description,'list','currencies.title','currencies.description')}
   <nav class="cur-filters" aria-label="Filter currency groups"><button class="is-active" data-cur-filter="all">All</button>${groups().map(g=>`<button data-cur-filter="${label(g.id)}">${svg(g.icon,20,g.name)} ${label(g.name)}</button>`).join('')}</nav>
   <div class="cur-groups">${groups().map(g=>`<section class="cur-group" data-cur-group="${label(g.id)}" style="--cur-color:#b5c995"><header>${svg(g.icon,30,g.name)}<h2>${label(g.name)}</h2>${edit(`currencies.groups.${groupsIndex(g)}`,'game:currency-group','Edit section')}</header><div class="cur-grid">${entries().filter(e=>e.group===g.id).map(card).join('')}${entries().some(e=>e.group===g.id) ? '' : '<p class="cur-muted">No currencies listed in this section yet.</p>'}</div></section>`).join('')}
   ${entries().filter(e => !groups().some(g=>g.id===e.group)).length ? `<section class="cur-group"><h2>Other currencies</h2><div class="cur-grid">${entries().filter(e=>!groups().some(g=>g.id===e.group)).map(card).join('')}</div></section>` : ''}</div>
   <div class="cur-page-actions">${add('currencies.entries','currency-entry','Add currency')}${add('currencies.groups','currency-group','Add section')}</div>${iconRulesManager()}
  </section>`;
  root.querySelector('.cur-filters')?.addEventListener('click',(event)=>{
   const btn=event.target.closest('[data-cur-filter]');if(!btn)return;
   root.querySelectorAll('[data-cur-filter]').forEach(b=>b.classList.toggle('is-active',b===btn));
   root.querySelectorAll('[data-cur-group]').forEach(section=>section.hidden=btn.dataset.curFilter!=='all'&&section.dataset.curGroup!==btn.dataset.curFilter);
  });
 }
};

function sourceJump(s) {
 const link=href(s.href);
 if (!link) return '';
 const [pathname,query=''] = link.split('?');
 const params = new URLSearchParams(query);
 const shortName = String(s.name || '').split(' · ').at(-1).trim();
 params.set('focus',shortName);
 params.set('focusKind',s.type || 'source');
 return `${pathname}?${params.toString()}`;
}

function sourceCard(s, hidden = false) {
 const i = sourceIndex(s);
 const group = TYPES.find(([type]) => type === s.type) || TYPES.at(-1);
 const link = sourceJump(s);
 // One quick link per source; descriptions and verification statuses stay in the editor.
 return `<article class="cur-source" ${hidden ? 'hidden data-cur-overflow' : ''} ${i>=0 ? ed(`game:currencies.sources.${i}`,'game:currency-source',s.name) : ''}>
  ${link ? `<a class="cur-source-link" href="${esc(link)}" title="${label(s.name)}" aria-label="Open article: ${label(s.name)}">` : '<span class="cur-source-link">'}
    <span class="cur-source-icon">${namedIcon(String(s.name||'').split(' · ').at(-1),s.icon || group[2],18)}</span><strong>${label(s.name)}</strong>${link ? icon('arrow-up-right',14) : ''}
  ${link ? '</a>' : '</span>'}
  ${s._upgradePath ? edit(s._upgradePath,'game:upgrade','Edit upgrade') : i>=0 ? edit(`currencies.sources.${i}`,'game:currency-source','Edit') : ''}
 </article>`;
}

export const explorerView = {
 title: () => 'Explorer — Bonus sources', nav: () => null,
 crumbs: () => [{label:'Explorer',href:'#/explorer'},{label:'Bonus Explorer'}],
 async render(root, _params, query) {
  const start = activeCurrency(query?.get('currency'));
  root.innerHTML = `<section class="cur-page cur-explorer">${header(CURRENCY_DATA.explorerTitle,CURRENCY_DATA.explorerDescription,'explore','currencies.explorerTitle','currencies.explorerDescription')}
   <div class="cur-controls"><label>Currency<select class="cur-select" id="cur-choice">${entries().map(e=>`<option value="${label(e.id)}" ${e===start?'selected':''}>${label(e.name)}</option>`).join('')}</select></label><label>Source type<select class="cur-select" id="cur-type"><option value="all">All sources</option>${TYPES.map(([id,text])=>`<option value="${id}">${text}</option>`).join('')}</select></label><label>Find source<input type="search" id="cur-search" placeholder="Search sources…"></label></div>
   <div id="cur-overview"></div><div class="cur-main-grid"><div id="cur-source-sections"></div><aside id="cur-calculator-panel" aria-label="Compact upgrade calculator"></aside></div>
   <div class="cur-page-actions">${add('currencies.sources','currency-source','Add exceptional source')}${add('currencies.entries','currency-entry','Add currency')}</div>${iconRulesManager()}
  </section>`;
  const choice=root.querySelector('#cur-choice'),type=root.querySelector('#cur-type'),search=root.querySelector('#cur-search');
  const expandedTypes = new Set();
  const foldedTypes = new Set();
  function paint() {
   const current=activeCurrency(choice.value);
   if (!current) {root.querySelector('#cur-overview').textContent='No currencies yet. Use Add currency in the editor.';return;}
   const matches=sources().filter(s=>Array.isArray(s.currencyIds)&&s.currencyIds.includes(current.id) && (type.value==='all'||s.type===type.value) && (!search.value||(`${s.name} ${s.effect} ${s.type}`).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
   root.querySelector('#cur-overview').innerHTML=`<section class="cur-overview" style="--cur-color:${esc(color(current))}">${svg(current.icon,74,current.name)}<div><h2>${label(current.name)}</h2><p>${label(current.description)}</p>${current.primaryUse?`<span class="cur-tag">${label(current.primaryUse)}</span>`:''}<div class="cur-links">${related(current.relatedLinks)}</div></div><div class="cur-overview-edit">${edit(path(current),'game:currency-entry','Edit currency')}</div></section>`;
   const types=(type.value==='all'?TYPES:TYPES.filter(([id])=>id===type.value))
      .filter(([id]) => type.value!=='all' || matches.some(s=>s.type===id));
   const expandResults = Boolean(search.value.trim());
   root.querySelector('#cur-source-sections').innerHTML=`<div class="cur-source-summary"><strong>${matches.length}</strong> ${matches.length===1?'source':'sources'} found</div>${!types.length ? '<p class="cur-muted">No sources match your filters. Add a bonus source from the editor if you have a documented effect.</p>' : ''}${types.map(([id,text,ic])=>{
    const collection=matches.filter(s=>s.type===id);
    const showAll = expandResults || expandedTypes.has(id);
    const visibleCount=24;
    const overflow=collection.length>visibleCount;
    const cards=collection.map((source,index)=>sourceCard(source, overflow && !showAll && index>=visibleCount)).join('');
    return `<details class="cur-source-group" data-cur-section="${id}" ${!foldedTypes.has(id) || expandResults?'open':''}><summary class="cur-source-heading">${icon(ic,20)}<h2>${text}</h2><span class="cur-source-count">${collection.length}</span>${icon('chevron-down',17)}</summary><div class="cur-source-body">${collection.length?`<div class="cur-source-list">${cards}</div>${overflow && !expandResults ? `<button type="button" class="cur-show-more" data-cur-expand="${id}" aria-expanded="${showAll}">${icon(showAll?'chevron-up':'chevrons-down',15)} ${showAll?'Show fewer':`Show all ${collection.length}`}</button>` : ''}`:'<p class="cur-muted">No sources in this category for this currency.</p>'}</div></details>`;
   }).join('')}`;
   root.querySelectorAll('[data-cur-section]').forEach(section=>section.addEventListener('toggle',()=>{
     if (section.open) foldedTypes.delete(section.dataset.curSection);
     else foldedTypes.add(section.dataset.curSection);
   }));
   root.querySelectorAll('[data-cur-expand]').forEach(button=>button.addEventListener('click',()=>{
     const id=button.dataset.curExpand;
     if (expandedTypes.has(id)) expandedTypes.delete(id); else expandedTypes.add(id);
     paint();
   }));
   renderMiniCalculator(root, current);
  }
  choice?.addEventListener('change',()=>{
   const qs=new URLSearchParams(location.hash.split('?')[1]||'');qs.set('currency',choice.value);
   history.replaceState(history.state,'',`#/explorer?tab=sources&${qs.toString()}`);
   paint();
  });
  type?.addEventListener('change',paint);
  search?.addEventListener('input',paint);
  paint();
 }
};


function renderMiniCalculator(root, current) {
  const panel = root.querySelector('#cur-calculator-panel');
  if (!panel) return;
  const candidates = sources().filter(s => ['upgrade','perk'].includes(s.type) && (s.currencyIds || []).includes(current.id)).flatMap(source => {
    const match = String(source.id).match(/^upgrade-(.+)-(\d+)$/);
    if (!match) return [];
    const section = FORMULA_SECTIONS[match[1]];
    const upgrade = (section?.upgrades || []).find(item => Number(item.n) === Number(match[2]));
    return upgrade ? [{ id: source.id, source, upgrade }] : [];
  });
  panel.innerHTML = `<div class="cur-calc"><div class="cur-calc-head">${icon('calculator',24)}<div><h2>Upgrade Calculator</h2><p>Use real formulas from the wiki.</p></div><a href="#/calculator">Full calculator ${icon('arrow-up-right',14)}</a></div>
   ${candidates.length ? `<label class="cur-calc-field">Upgrade<select class="cur-select" data-cur-calc-select>${candidates.map((item,index) => `<option value="${index}">${label(item.source.name)}</option>`).join('')}</select></label>
   <div class="cur-calc-row"><label class="cur-calc-field">Current level<input type="number" min="0" step="1" value="0" data-cur-level-from></label><label class="cur-calc-field">Target level<input type="number" min="0" step="1" value="10" data-cur-level-to></label></div>
   <div class="cur-calc-cap" data-cur-cap></div><div class="cur-calc-results" data-cur-results></div>
   <label class="cur-calc-field cur-calc-target">Find level for target effect<input type="number" min="0" step="any" placeholder="Enter desired multiplier or value" data-cur-effect-target></label><div class="cur-calc-target-result" data-cur-effect-result>Enter a target effect to estimate the required level.</div>
   <details class="cur-calc-breakdown"><summary>Upgrade Level Breakdown</summary><div data-cur-breakdown></div></details>` : `<p class="cur-muted">No upgrade formula has been indexed for this currency yet. Add a source in Edit mode or use the full calculator.</p>`}
  </div>`;
  if (!candidates.length) return;
  const select=panel.querySelector('[data-cur-calc-select]');
  const fromInput=panel.querySelector('[data-cur-level-from]');
  const toInput=panel.querySelector('[data-cur-level-to]');
  const effectInput=panel.querySelector('[data-cur-effect-target]');
  const number=(v) => v==null || !Number.isFinite(v) ? 'Not available' : fmtCalculatorNumber(v);
  const selected=()=>candidates[Number(select.value)]?.upgrade || candidates[0].upgrade;
  const clamp=(n,max) => Math.max(0,Math.min(max,Number.isFinite(n) ? Math.floor(n) : 0));
  function update(){
    const upgrade=selected();
    const cap=calculateUpgrade(upgrade,0,0).cap;
    fromInput.max=String(cap);toInput.max=String(cap);
    const from=clamp(Number(fromInput.value),cap); const to=Math.max(from,clamp(Number(toInput.value),cap));
    fromInput.value=String(from);toInput.value=String(to);
    panel.querySelector('[data-cur-cap]').textContent = `Upgrade cap: ${cap === 100000 ? 'Not documented (calculator limit: 100,000)' : cap}`;
    const result=calculateUpgrade(upgrade,from,to);
    const cells=[['Levels to buy',to-from],['Total cost',number(result.total)],['Effect at target',number(result.effect)],['Cost of next level',number(result.next)]];
    panel.querySelector('[data-cur-results]').innerHTML=cells.map(([title,value])=>`<div><small>${label(title)}</small><strong>${label(String(value))}</strong></div>`).join('');
    const effectResult=panel.querySelector('[data-cur-effect-result]');
    const targetValue=effectInput.value.trim();
    if (targetValue) {
      const target=Number(targetValue);
      const targetLevel=findTargetEffectLevel(upgrade,from,target);
      effectResult.textContent=targetLevel.error || `Level ${targetLevel.level} · ${targetLevel.levels} levels needed${targetLevel.cost != null ? ` · estimated cost: ${number(targetLevel.cost)}` : ''}`;
    } else effectResult.textContent='Enter a target effect to estimate the required level.';
    const breakdown=panel.querySelector('[data-cur-breakdown]');
    if(to<=from) {breakdown.textContent='Increase target level to display individual costs.';return;}
    if(to-from>500) {breakdown.textContent='Use the full calculator to split this range into 500-level batches.';return;}
    const rows=[];const length=Math.min(to-from,25);
    for(let level=from;level<from+length;level++){
      const step=calculateUpgrade(upgrade,level,level+1);
      rows.push(`<tr><td>${level+1}</td><td>${label(number(step.total))}</td><td>${label(number(step.effect))}</td></tr>`);
    }
    breakdown.innerHTML=`<table><thead><tr><th>Level</th><th>Cost</th><th>Effect</th></tr></thead><tbody>${rows.join('')}</tbody></table>${to-from>25?`<p class="cur-muted">Showing first 25 levels of ${to-from}; use the full calculator for the rest.</p>`:''}`;
  }
  select.addEventListener('change',()=>{fromInput.value='0';toInput.value='10';update();});
  fromInput.addEventListener('change',update);
  toInput.addEventListener('change',update);
  effectInput.addEventListener('input',update);
  update();
}

// Unified topbar entry. The older URLs remain readable for saved links.
export const explorerHubView = {
 title: () => 'Explorer', nav:()=>null,
 crumbs: () => [{label:'Explorer'}],
 async render(root, params, query) {
   const tab = query?.get('tab') === 'sources' || query?.has('currency') ? 'sources' : 'catalog';
   return (tab === 'sources' ? explorerView : currenciesView).render(root,params,query);
 }
};
