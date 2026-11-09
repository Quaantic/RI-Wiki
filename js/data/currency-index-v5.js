// Currency Explorer v5: index only bonuses explicitly named in editable wiki data.
// No values/formulas are inferred; the underlying content remains the source of truth.
export const CURRENCY_INDEX_REVISION = 'currency-explorer-categories-v5';

const ALIASES = {
  energy: 'energy', gears: 'gears', crystals: 'crystals', crystal: 'crystals',
  jewels: 'jewels', 'crystal shards': 'crystal-shards', quartz: 'quartz',
  bluesteel: 'bluesteel', magnets: 'magnets', 'life shards': 'life-shards',
  'life gems': 'life-gems', 'life gem': 'life-gems', fossil: 'fossil', fossils: 'fossil',
  logs: 'logs', log: 'logs', sap: 'sap', roots: 'roots', 'tree roots': 'roots',
  apples: 'apples', research: 'research', 'research points': 'research',
  'golden points': 'golden-points', 'red liquid': 'red-liquid',
  'dark liquid': 'dark-liquid', frost: 'frost', 'tree essence': 'tree-essence',
  money: 'money', 'gold bars': 'gold-bars', emeralds: 'emeralds',
  'emerald coins': 'emeralds', 'golden diamond': 'golden-diamond',
  'golden diamonds': 'golden-diamond', 'gold energy': 'gold-energy',
  'golden energy': 'gold-energy', 'silver energy': 'silver-energy',
  'silver e.': 'silver-energy', 'ruby energy': 'ruby-energy',
  'ruby e.': 'ruby-energy', 'diamond energy': 'diamond-energy', ores: 'ores',
  stone: 'stone', cores: 'cores', 'dungeon coins': 'dungeon-coins',
  bones: 'bones', 'bone dust': 'bone-dust', souls: 'souls', soul: 'souls',
  'rune stone': 'rune-stone', 'rune luck': 'rune-luck', 'eternal shards': 'eternal-shards',
};
const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const targetId = (text, valid) => {
  const key = String(text || '').toLowerCase().trim().replace(/\s+gains?$/,'').replace(/^more\s+/,'');
  const id = ALIASES[key];
  return id && valid.has(id) ? id : null;
};
const boostTarget = (text, valid) => {
  const match = String(text).trim().match(/^(?:[\d.,]+\s*[x×]\s*|\+\s*\d+\s+)(.+)$/i);
  return match ? targetId(match[1],valid) : null;
};
const STAGE_SOURCE_LABELS = {
  'main/stages':'Main Stages', 'life/tree-tier':'Tree Tiers',
  'life/monster-evolution':'Monster Evolutions',
  'life/tree-essence-milestones':'Tree Essence Milestones',
  'life/golden-research-milestones':'Golden Research Milestones',
  'main/californium-milestones':'Californium Milestones',
  'main/astatine-power':'Astatine Milestones',
};
const icons = {bonus:'sparkles',milestone:'flag-triangle-right',stage:'layers',core:'hexagon',mastery:'medal',rune:'gem'};

export function augmentCurrencyExplorerSources(game) {
  if (!game?.currencies || !Array.isArray(game.currencies.sources) || !Array.isArray(game.currencies.entries)) return false;
  if (game.contentMigrations?.includes(CURRENCY_INDEX_REVISION)) return false;
  if (game.currencies.explorerDescription === 'Select a currency to explore its documented boosts from runes, upgrades, boards, masteries and more. Add missing sources through the inline editor.') {
    game.currencies.explorerDescription = 'Explore runes, bonuses, upgrades, masteries, milestones, perks, cores and stages. Open sources or edit their relationships in the existing wiki editor.';
  }
  const all = game.currencies.sources;
  const known = new Set(all.map(s => s.id));
  const valid = new Set(game.currencies.entries.map(e => e.id));
  const add = (type, id, name, currency, effect, route) => {
    if (!valid.has(currency) || !/^[-\w]+\/[-\w]+$/.test(route) || known.has(id)) return;
    known.add(id);
    all.push({ id, name, type, currencyIds:[currency], icon:icons[type] || 'sparkles', effect:String(effect), href:`#/${route}`, status:'documented' });
  };
  // Perks are a source type of their own, not ordinary upgrades.
  for (const source of all) {
    if (source.type === 'upgrade' && String(source.href).startsWith('#/perks/') && /\bPerks\s*·/i.test(source.name)) {
      source.type = 'perk';
    }
  }

  const progressions = [
    ['stages','stages','stage'], ['barns','stages','stage'],
    ['cores','ranks','core'], ['ranks','ranks','stage'],
    ['lifeRanks','ranks','stage'], ['ascensions','ranks','stage'],
  ];
  for (const [collection,field,defaultType] of progressions) {
    for (const [route,data] of Object.entries(game.progression?.[collection] || {})) {
      const isMilestone = /milestone|astatine-power/.test(route);
      const type = isMilestone ? 'milestone' : defaultType;
      const title = STAGE_SOURCE_LABELS[route] || data.title || route.split('/').at(-1).replaceAll('-',' ');
      for (const [index,item] of (data[field] || []).entries()) {
        const found = new Map();
        for (const boost of item.boosts || []) {
          const id = boostTarget(boost,valid);
          if (id) found.set(id,[...(found.get(id) || []),String(boost)]);
        }
        for (const [currency,boosts] of found) {
          const prefix = slug(`${collection}-${route}-${item.num ?? index}`);
          add(type,`v5-${prefix}-${currency}`,`${title} · ${item.title || `Stage ${item.num ?? index + 1}`}`,currency,boosts.join(' · '),route);
        }
      }
    }
  }

  // Existing number-of-resource calculators contain named, documented boosts.
  // Generic placeholders (Bonus 1), non-currency targets, and unverifiable names are skipped.
  for (const [route,page] of Object.entries(game.calculators?.pages || {})) {
    if (page.kind !== 'amount-groups') continue;
    if (!Array.isArray(page.groups)) continue;
    const category = route === 'life/golden-points' || route === 'main/astatine-power' ? 'milestone' : route.startsWith('runes/') ? 'rune' : 'bonus';
    for (const [groupIndex,group] of page.groups.entries()) {
      for (const [bonusIndex,bonus] of (group.bonuses || []).entries()) {
        const currency = targetId(bonus.name, valid);
        if (!currency) continue;
        const sourceName = `${page.title || group.name} · ${group.name}${bonus.name !== group.name ? ` · ${bonus.name}` : ''}`;
        const value = String(bonus.value || '').trim();
        if (!value) continue;
        const unlock = bonus.unlockAt != null ? ` · unlock: ${bonus.unlockAt}${bonus.unlockResource ? ` ${bonus.unlockResource}` : ''}` : '';
        add(category,`v5-calc-${slug(route)}-${slug(group.id || groupIndex)}-${slug(bonus.id || bonusIndex)}-${currency}`,
          sourceName, currency, `${value}${unlock}`,route);
      }
    }
  }

  for (const [route, data] of Object.entries(game.mining?.mastery || {})) {
    for (const ore of data.ores || []) {
      for (const [index,upgrade] of (ore.upgrades || []).entries()) {
        const currency = boostTarget(upgrade.effect,valid) || targetId(upgrade.effect, valid);
        if (!currency) continue;
        const req = upgrade.req != null ? `Requirement: ${upgrade.req} · ` : '';
        add('mastery',`v5-mastery-${slug(ore.id)}-${index}-${currency}`,
          `${ore.name} Mastery · ${upgrade.effect}`,currency,`${req}${upgrade.effect}`,route);
      }
    }
  }
  game.contentMigrations = [...(game.contentMigrations || []), CURRENCY_INDEX_REVISION];
  return true;
}
