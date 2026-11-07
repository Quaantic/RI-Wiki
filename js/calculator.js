// Public calculator: existing wiki formulas only. No eval(), no external dependencies.
import { esc, qs, evalFormula, fmtCalculatorNumber, parseGameNumber } from './utils.js';
import { FORMULA_SECTIONS } from './data/formulas.js';
import { icon } from './ui.js';

const groupDisplayName = (name) => String(name ?? '').replace(/\s*\([^)]*\)/g, '').trim();
const integer = (value, fallback=0) => Number.isFinite(Number(value)) ? Math.max(0,Math.min(100000,Math.floor(Number(value)))) : fallback;
const show = (n) => n == null ? 'Formula not supported' : Number.isFinite(n) ? fmtCalculatorNumber(n) : n===Infinity ? '∞' : 'Formula not supported';
// The source field is named "multi". It represents a multiplier for most
// upgrades, but some unlock/count effects have different semantics.
const effectKind = (upgrade) => {
  const name = String(upgrade?.name || '').toLowerCase();
  if (/unlock|slot|level perk|auto cut|bulk|count|capacity|maximum|limit/.test(name)) return 'value';
  return 'multiplier';
};
const effectLabel = (upgrade, value) => value == null || !Number.isFinite(value)
  ? show(value) : `${effectKind(upgrade)==='multiplier'?'× ':''}${show(value)}`;
const effectExplanation = (upgrade, calc) => {
  if(!Number.isFinite(calc.effect)||!Number.isFinite(calc.previousEffect)) return 'This effect cannot be compared using the available formula.';
  const delta=calc.effect-calc.previousEffect;
  if(calc.to===calc.from) return 'Choose a higher target level to see what changes.';
  if(effectKind(upgrade)!=='multiplier') return `This upgrade changes the calculated effect by ${delta>=0?'+':''}${show(delta)} (${effectLabel(upgrade,calc.previousEffect)} → ${effectLabel(upgrade,calc.effect)}).`;
  if(calc.previousEffect<=0) return `Calculated multiplier: ${effectLabel(upgrade,calc.previousEffect)} → ${effectLabel(upgrade,calc.effect)}. A percentage increase cannot be calculated from zero.`;
  const percent=(calc.effect/calc.previousEffect-1)*100;
  return `Your calculated gain multiplier increases by ${percent>=0?'+':''}${show(percent)}% (${effectLabel(upgrade,calc.previousEffect)} → ${effectLabel(upgrade,calc.effect)}). This is the change in the upgrade effect, not your total in-game gains.`;
};
export function calculateUpgrade(upgrade, from, to) {
  const cap = Number.isFinite(Number(upgrade.cap)) ? Math.min(100000,Math.floor(Number(upgrade.cap))) : 100000;
  from = Math.min(integer(from), cap);
  to = Math.min(Math.max(from, integer(to,from)),cap);
  let total=0, missing=false, overflow=false;
  if(to-from>500) return {from,to,invalid:'Limit: calculate up to 500 levels at a time.'};
  for(let level=from;level<to;level++) {
    const price=evalFormula(upgrade.price,{L:level});
    if(price===null || !Number.isFinite(price) || price<0) { missing=true; break; }
    total+=price;
    if(!Number.isFinite(total)) {overflow=true;break;}
  }
  const effect=evalFormula(upgrade.multi,{L:to});
  const previousEffect=evalFormula(upgrade.multi,{L:from});
  const next=to<cap ? evalFormula(upgrade.price,{L:to}) : null;
  return {from,to,cap,total:missing||overflow?null:total,effect,previousEffect,next,missing,overflow};
}

// Find the first reachable level whose effect meets the requested target.
// Only use a monotonic numeric formula; never guess for unsupported formulas.
export function findTargetEffectLevel(upgrade, from, target) {
  const cap = Number.isFinite(Number(upgrade.cap)) ? Math.max(0, Math.min(100000, Math.floor(Number(upgrade.cap)))) : 100000;
  from = Math.min(integer(from), cap);
  if (!Number.isFinite(target) || target < 0) return { error: 'Enter a valid non-negative target effect.' };
  const start = evalFormula(upgrade.multi, { L: from });
  if (start == null || !Number.isFinite(start)) return { error: 'The effect formula cannot be evaluated for this upgrade.' };
  if (start >= target) return { level: from, levels: 0, effect: start, reached: true };
  // Expand outward until the target is crossed. Evaluating directly at level
  // 100000 often overflows exponential formulas even for modest targets.
  let low = from, high = from, last = start, step = 1;
  while (high < cap && last < target) {
    const nextLevel = Math.min(cap, high + step);
    const value = evalFormula(upgrade.multi, { L: nextLevel });
    if (value == null || !Number.isFinite(value)) {
      // Formula overflow: locate the last finite interval; do not invent a value.
      let left = high, right = nextLevel;
      while (left + 1 < right) {
        const middle = Math.floor((left + right) / 2);
        const middleValue = evalFormula(upgrade.multi, { L: middle });
        if (middleValue != null && Number.isFinite(middleValue)) left = middle;
        else right = middle;
      }
      const maxFinite = evalFormula(upgrade.multi, { L: left });
      if (maxFinite == null || maxFinite < target) return { error: 'The documented effect formula overflows before reaching the requested target.' };
      low = high; high = left; last = maxFinite;
      break;
    }
    if (value < last) return { error: 'The effect formula decreases between levels and cannot be searched safely.' };
    low = high;
    high = nextLevel;
    last = value;
    step = Math.min(step * 2, 100000);
  }
  if (last < target) return { error: `Target not reachable by the documented maximum level (${cap}).`, maxEffect: last };
  // Verify monotonicity over the bounded search interval.
  let previous = evalFormula(upgrade.multi, { L: low });
  for (let i = 1; i <= 8; i++) {
    const level = low + Math.floor((high - low) * i / 8);
    const value = evalFormula(upgrade.multi, { L: level });
    if (value == null || !Number.isFinite(value) || value < previous) return { error: 'The effect formula is not consistently increasing, so the target cannot be estimated safely.' };
    previous = value;
  }
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const value = evalFormula(upgrade.multi, { L: mid });
    if (value == null || !Number.isFinite(value)) return { error: 'Effect formula unavailable at an intermediate level.' };
    if (value >= target) high = mid;
    else low = mid + 1;
  }
  const effect = evalFormula(upgrade.multi, { L: low });
  if (effect == null || !Number.isFinite(effect)) return { error: 'Could not evaluate the target level.' };
  const count = low - from;
  const cost = count <= 500 ? calculateUpgrade(upgrade, from, low).total : null;
  return { level: low, levels: count, effect, cost, costLimited: count > 500, reached: true };
}

export const calculatorView = {
  title:()=> 'Upgrade Calculator — RI Gaming Wiki',
  crumbs:()=>[{label:'Main',href:'#/',icon:'compass'},{label:'Upgrade Calculator',icon:'calculator'}],
  nav:()=>null,
  render(root,params,query){
    const sections=Object.entries(FORMULA_SECTIONS).filter(([,data])=>Array.isArray(data?.upgrades)&&data.upgrades.length);
    const initialSection=sections.some(([id])=>id===query.get('section'))?query.get('section'):(sections[0]?.[0]||'');
    root.innerHTML=`<section class="section ri-calc">
      <div class="ri-calc__intro">${icon('calculator',24)} <div><h1>Upgrade Calculator</h1><p>Plan upgrade costs and effects directly from the Wiki formulas. Results may be unavailable for game-dependent formulas.</p></div></div>
      <div class="ri-calc__form">
        <label>Upgrade group <select class="input" id="ri-calc-section">${sections.map(([id,data])=>`<option value="${esc(id)}" ${id===initialSection?'selected':''}>${esc(groupDisplayName(data.name||id))}</option>`).join('')}</select></label>
        <label>Upgrade <select class="input" id="ri-calc-upgrade"></select></label>
        <label>Current level <input id="ri-calc-from" class="input" type="number" min="0" max="100000" step="1" value="0"></label>
        <label>Target level <input id="ri-calc-to" class="input" type="number" min="0" max="100000" step="1" value="10"></label>
      </div>
      <div class="ri-calc__results" aria-live="polite" id="ri-calc-results"></div>
      <section class="ri-calc__panel" aria-labelledby="ri-calc-breakdown-title">
        <div class="ri-calc__panel-heading"><div><h2 id="ri-calc-breakdown-title">Upgrade Level Breakdown</h2><p>Cost and effect of each level purchased, based on documented formulas.</p></div></div>
        <div id="ri-calc-breakdown"></div>
        <button type="button" class="ri-calc__more" id="ri-calc-more" hidden>Show more levels</button>
      </section>
      <section class="ri-calc__panel" aria-labelledby="ri-calc-target-title">
        <div class="ri-calc__panel-heading"><div><h2 id="ri-calc-target-title">Target Effect Calculator</h2><p>Find the minimum level needed to reach a desired effect value.</p></div></div>
        <div class="ri-calc__target-input"><label for="ri-calc-target-effect">Desired effect</label><div class="ri-calc__target-row"><input id="ri-calc-target-effect" class="input" type="text" inputmode="decimal" placeholder="e.g. 100, 1K, 1.5M" autocomplete="off"><button type="button" id="ri-calc-target-find" class="ri-calc__more">Find level</button></div></div>
        <div id="ri-calc-target-results" aria-live="polite"></div>
      </section>
      <div class="ri-calc__formulas" id="ri-calc-formulas"></div>
      <p class="ri-calc__hint">Multiplier effects are marked with ×; unlocks and counts display their raw effect value. Results use up to two decimal places (comma separator). Total cost sums the prices at your current level through the level before the target. Values are estimates from documented formulas, not your in-game modifiers.</p>
    </section>`;
    const sec=qs('#ri-calc-section',root),upgradeEl=qs('#ri-calc-upgrade',root),fromEl=qs('#ri-calc-from',root),toEl=qs('#ri-calc-to',root),results=qs('#ri-calc-results',root),formulas=qs('#ri-calc-formulas',root),breakdown=qs('#ri-calc-breakdown',root),more=qs('#ri-calc-more',root),targetInput=qs('#ri-calc-target-effect',root),targetButton=qs('#ri-calc-target-find',root),targetResults=qs('#ri-calc-target-results',root);
    const upgrades=()=>FORMULA_SECTIONS[sec.value]?.upgrades||[];
    const selected=()=>upgrades().find(u=>String(u.n)===upgradeEl.value)||upgrades()[0];
    let visibleRows=12;
    let currentCalc=null;
    const renderBreakdown=()=>{
      const u=selected(),calc=currentCalc;
      if(!u||!calc||calc.invalid){breakdown.innerHTML='<p class="ri-calc__empty">Select a supported level range to see the breakdown.</p>';more.hidden=true;return;}
      const levels=calc.to-calc.from;
      if(!levels){breakdown.innerHTML='<p class="ri-calc__empty">Increase the target level to view individual upgrades.</p>';more.hidden=true;return;}
      const count=Math.min(levels,visibleRows);
      let runningTotal=0;
      const rows=[];
      for(let level=calc.from;level<calc.from+count;level++){
        const price=evalFormula(u.price,{L:level});
        const before=evalFormula(u.multi,{L:level});
        const after=evalFormula(u.multi,{L:level+1});
        const validPrice=price!=null&&Number.isFinite(price)&&price>=0;
        if(validPrice&&runningTotal!==null) runningTotal+=price;
        else runningTotal=null;
        const difference=before!=null&&after!=null&&Number.isFinite(before)&&Number.isFinite(after) ? `${after-before>=0?'+':''}${show(after-before)}`:'—';
        rows.push(`<tr><td>${level+1}</td><td>${validPrice?show(price):'—'}</td><td>${after!=null?esc(effectLabel(u,after)):'—'}</td><td>${difference}</td><td>${runningTotal!=null?show(runningTotal):'—'}</td></tr>`);
      }
      breakdown.innerHTML=`<div class="ri-calc__table-scroll"><table class="ri-calc__table"><thead><tr><th>Level</th><th>Level cost</th><th>Effect</th><th>Effect change</th><th>Running cost</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
      more.hidden=count>=levels;
      more.textContent=`Show ${Math.min(20,levels-count)} more levels (${count}/${levels})`;
    };
    const findTarget=()=>{
      const raw=targetInput.value.trim();
      if(!raw){targetResults.innerHTML='<p class="ri-calc__empty">Enter an effect to calculate the required level.</p>';return;}
      const normalized=raw.replace(/^[×x*]\s*/i,'').replace(/\s/g,'').replace(/,(?=\d{1,2}(?:[a-z]+)?$)/i,'.');
      const target=parseGameNumber(normalized);
      const u=selected();
      if(!u){targetResults.textContent='Select an upgrade first.';return;}
      const found=findTargetEffectLevel(u,fromEl.value,target);
      if(found.error){targetResults.innerHTML=`<p class="ri-calc__empty">${esc(found.error)}${found.maxEffect!=null?` Highest calculated effect: ${esc(effectLabel(u,found.maxEffect))}.`:''}</p>`;return;}
      targetResults.innerHTML=`<div class="ri-calc__target-result"><div><small>Required level</small><strong>${found.level}</strong></div><div><small>Levels to buy</small><strong>${found.levels}</strong></div><div><small>Achieved effect</small><strong>${esc(effectLabel(u,found.effect))}</strong></div><div><small>Estimated total cost</small><strong>${found.costLimited?'Over 500 levels — calculate in shorter ranges':found.cost==null?'Formula unavailable':show(found.cost)}</strong></div></div><button type="button" class="ri-calc__more ri-calc__target-apply" data-target-level="${found.level}">Use level ${found.level} as target</button>`;
    };
    const update=()=>{
      const u=selected();if(!u){results.textContent='No upgrades in this group.';return;}
      const calc=calculateUpgrade(u,fromEl.value,toEl.value);
      currentCalc=calc;
      fromEl.max=toEl.max=String(calc.cap??100000);
      results.innerHTML=calc.invalid?`<p>${esc(calc.invalid)}</p>`:`
        <div class="ri-calc__result"><small>Levels to buy</small><strong>${calc.to-calc.from}</strong></div>
        <div class="ri-calc__result"><small>Total cost</small><strong>${show(calc.total)}</strong></div>
        <div class="ri-calc__result"><small>Effect at level ${calc.to}</small><strong>${effectLabel(u,calc.effect)}</strong></div>
        <div class="ri-calc__result"><small>Cost of next level</small><strong>${calc.to>=calc.cap?'Max level':show(calc.next)}</strong></div>
        <div class="ri-calc__insight">${icon('trending-up',17)} <span>${esc(effectExplanation(u,calc))}</span></div>`;
      renderBreakdown();
      // Recalculate the target only when one has been entered; do not replace typed input.
      findTarget();
      formulas.innerHTML=`<div><b>Price formula</b><code>${esc(u.price||'—')}</code></div><div><b>Effect formula</b><code>${esc(u.multi||'—')}</code></div>${u.requirement?`<p>Requirement: ${esc(u.requirement)}</p>`:''}`;
    };
    const populate=()=>{
      const arr=upgrades();upgradeEl.innerHTML=arr.map((u,i)=>`<option value="${esc(String(u.n??i+1))}">${esc(`${u.n??i+1}. ${u.name}`)}</option>`).join('');
      if(sec.value===initialSection&&query.get('upgrade')&&arr.some(u=>String(u.n)===query.get('upgrade')))upgradeEl.value=query.get('upgrade');
      update();
    };
    more.addEventListener('click',()=>{visibleRows+=20;renderBreakdown();});
    targetButton.addEventListener('click',findTarget);
    targetInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findTarget();}});
    targetResults.addEventListener('click',event=>{const button=event.target.closest('[data-target-level]');if(!button)return;toEl.value=button.dataset.targetLevel;visibleRows=12;update();});
    sec.addEventListener('change',()=>{visibleRows=12;populate();});
    upgradeEl.addEventListener('change',()=>{visibleRows=12;update();});
    [fromEl,toEl].forEach(input=>input.addEventListener('input',()=>{visibleRows=12;update();}));
    populate();
  }
};
