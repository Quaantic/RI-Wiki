import { evaluateExpression } from '../utils.js';

export const RESET_LAYER_PAGES = {};

export function setResetLayerPages(pages) {
  const formula = (value, names, defaults = {}) => {
    if (typeof value !== 'string' || !value.startsWith('formula: ')) {
      throw new Error('Calculator formulas must be saved as formula expressions.');
    }
    const expression = value.slice('formula: '.length);
    const calculate = (...args) => {
      const context = typeof args.at(-1) === 'object' ? args.at(-1) : {};
      return evaluateExpression(expression, { ...defaults, ...context, ...Object.fromEntries(names.map((name, index) => [name, args[index] ?? 0])) });
    };
    calculate(...names.map(() => 1));
    return calculate;
  };

  const hydrated = JSON.parse(JSON.stringify(pages));
  for (const [path, page] of Object.entries(hydrated)) {
    const defaults = Object.fromEntries([...(page.groups || []).map((group) => [group.id, 0]), ...(page.inputs || []).map((input) => [input.id, input.default ?? 0])]);
    if (page.xpToNextLevel) page.xpToNextLevel = formula(page.xpToNextLevel, ['level']);
    if (page.powerFromLevel) page.powerFromLevel = formula(page.powerFromLevel, ['level']);
    for (const bonus of page.bonuses || []) {
      if (bonus.value) bonus.value = formula(bonus.value, page.kind === 'level' ? ['level'] : page.kind === 'bone-dust' ? ['dust', 'p'] : ['amount'], defaults);
    }
    for (const group of page.groups || []) {
      for (const bonus of group.bonuses || []) {
        if (bonus.value) bonus.value = formula(bonus.value, ['amount'], defaults);
      }
    }
    for (const tier of page.tiers || []) {
      for (const bonus of tier.bonuses || []) {
        if (bonus.value) bonus.value = formula(bonus.value, ['G']);
      }
    }
    if (!page.kind || !path.includes('/')) throw new Error(`Calculator "${path}" is missing a valid kind.`);
  }
  for (const key of Object.keys(RESET_LAYER_PAGES)) delete RESET_LAYER_PAGES[key];
  Object.assign(RESET_LAYER_PAGES, hydrated);
}

export function minimumForTarget(valueAt, target, min = 0, cap = null, maxInput = 1e300) {
  if (!Number.isFinite(target) || target <= 0) return null;
  if (cap != null && target > cap) return null;
  if (target <= valueAt(min)) return min;

  let low = min;
  let high = Math.max(1, min);
  while (!(valueAt(high) >= target) && high < maxInput) {
    low = high;
    high = Math.min(high * 2, maxInput);
  }
  if (!(valueAt(high) >= target)) return null;

  for (let i = 0; i < 100; i++) {
    const mid = low + (high - low) / 2;
    if (valueAt(mid) >= target) high = mid;
    else low = mid;
  }
  const result = Math.ceil(high);
  return valueAt(result) >= target ? result : result + 1;
}
