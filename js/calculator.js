// Public calculator: existing wiki formulas only. No eval(), no external dependencies.
import { esc, qs, evalFormula, fmtCalculatorNumber } from './utils.js';
import { FORMULA_SECTIONS } from './data/formulas.js';
import { icon } from './ui.js';

const integer = (value, fallback=0) => Number.isFinite(Number(value)) ? Math.max(0,Math.min(100000,Math.floor(Number(value)))) : fallback;
const show = (n) => n == null ? 'Formula not supported' : Number.isFinite(n) ? fmtCalculatorNumber(n) : n===Infinity ? '∞' : 'Formula not supported';
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
  const next=to<cap ? evalFormula(upgrade.price,{L:to}) : null;
  return {from,to,cap,total:missing||overflow?null:total,effect,next,missing,overflow};
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
        <label>Upgrade group <select class="input" id="ri-calc-section">${sections.map(([id,data])=>`<option value="${esc(id)}" ${id===initialSection?'selected':''}>${esc(data.name||id)}</option>`).join('')}</select></label>
        <label>Upgrade <select class="input" id="ri-calc-upgrade"></select></label>
        <div class="ri-calc__levels"><label>Current level <input id="ri-calc-from" class="input" type="number" min="0" max="100000" step="1" value="0"></label><label>Target level <input id="ri-calc-to" class="input" type="number" min="0" max="100000" step="1" value="10"></label></div>
      </div>
      <div class="ri-calc__results" aria-live="polite" id="ri-calc-results"></div>
      <div class="ri-calc__formulas" id="ri-calc-formulas"></div>
      <p class="ri-calc__hint">Results use up to two decimal places (comma separator). Total cost sums the prices at your current level through the level before the target. Values are estimates from documented formulas, not your in-game modifiers.</p>
    </section>`;
    const sec=qs('#ri-calc-section',root),upgradeEl=qs('#ri-calc-upgrade',root),fromEl=qs('#ri-calc-from',root),toEl=qs('#ri-calc-to',root),results=qs('#ri-calc-results',root),formulas=qs('#ri-calc-formulas',root);
    const upgrades=()=>FORMULA_SECTIONS[sec.value]?.upgrades||[];
    const selected=()=>upgrades().find(u=>String(u.n)===upgradeEl.value)||upgrades()[0];
    const update=()=>{
      const u=selected();if(!u){results.textContent='No upgrades in this group.';return;}
      const calc=calculateUpgrade(u,fromEl.value,toEl.value);
      fromEl.max=toEl.max=String(calc.cap??100000);
      results.innerHTML=calc.invalid?`<p>${esc(calc.invalid)}</p>`:`
        <div class="ri-calc__result"><small>Levels to buy</small><strong>${calc.to-calc.from}</strong></div>
        <div class="ri-calc__result"><small>Total cost</small><strong>${show(calc.total)}</strong></div>
        <div class="ri-calc__result"><small>Effect at level ${calc.to}</small><strong>${show(calc.effect)}</strong></div>
        <div class="ri-calc__result"><small>Cost of next level</small><strong>${calc.to>=calc.cap?'Max level':show(calc.next)}</strong></div>`;
      formulas.innerHTML=`<div><b>Price formula</b><code>${esc(u.price||'—')}</code></div><div><b>Effect formula</b><code>${esc(u.multi||'—')}</code></div>${u.requirement?`<p>Requirement: ${esc(u.requirement)}</p>`:''}`;
    };
    const populate=()=>{
      const arr=upgrades();upgradeEl.innerHTML=arr.map((u,i)=>`<option value="${esc(String(u.n??i+1))}">${esc(`${u.n??i+1}. ${u.name}`)}</option>`).join('');
      if(sec.value===initialSection&&query.get('upgrade')&&arr.some(u=>String(u.n)===query.get('upgrade')))upgradeEl.value=query.get('upgrade');
      update();
    };
    sec.addEventListener('change',populate);
    upgradeEl.addEventListener('change',update);
    [fromEl,toEl].forEach(input=>input.addEventListener('input',update));
    populate();
  }
};
