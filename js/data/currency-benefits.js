// Explorer Sources: only explicit, manually written currency names count.
// No matching against upgrade titles, formula text, boost labels or page names.
export const normalizeCurrencyName = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export function resolveBenefitNames(names, entries) {
  if (!Array.isArray(names) || !names.length) return [];
  const exact = new Map((entries || []).map(entry => [normalizeCurrencyName(entry.name), entry.id]));
  const result = new Set();
  for (const name of names) {
    const id = exact.get(normalizeCurrencyName(name));
    if (id) result.add(id);
  }
  return [...result];
}

export function validateBenefitNames(game, wiki = null) {
  const entries = game?.currencies?.entries || [];
  const exact = new Set(entries.map(entry => normalizeCurrencyName(entry.name)));
  const walk = (item, path) => {
    if (!item || typeof item !== 'object') return;
    if (Object.hasOwn(item, 'whatItBenefits')) {
      if (!Array.isArray(item.whatItBenefits)) throw new Error(`What It Benefits at ${path} must be a list (one currency name per line).`);
      for (const name of item.whatItBenefits) {
        if (typeof name !== 'string' || !exact.has(normalizeCurrencyName(name))) {
          throw new Error(`Unknown currency in What It Benefits at ${path}: "${String(name)}". Use an exact currency name from Explorer → Currencies.`);
        }
      }
    }
    if (Array.isArray(item)) item.forEach((child,i) => walk(child, `${path}.${i}`));
    else for (const [key,child] of Object.entries(item)) if (key !== 'whatItBenefits') walk(child,`${path}.${key}`);
  };
  // Limit validation to the game content containing manual benefit labels.
  for (const key of ['upgrades','runes','calculators','progression','mining','dungeon']) walk(game?.[key],key);
  if (wiki) walk(wiki.categories,'wiki.categories');
}

export function buildManualCurrencySources(game, entries, authoredSources = [], wikiCategories = []) {
  const result=[];
  const add = (object, id, name, type, href, editPath, icon='sparkles', effect='') => {
    const currencyIds=resolveBenefitNames(object?.whatItBenefits,entries);
    if (!currencyIds.length) return;
    const _editKind = editPath.startsWith('wiki:') ? (editPath.includes('.subcategories.') ? 'sub-card' : 'category-card')
      : editPath.startsWith('upgrades.') ? 'game:upgrade'
      : editPath.startsWith('runes.') ? 'game:rune'
      : editPath.startsWith('progression.') ? 'game:progression-page'
      : editPath.startsWith('mining.mastery.') ? 'game:mastery'
      : editPath.startsWith('dungeon.training.') ? (editPath.includes('.areas.') ? 'game:area' : 'game:training-group')
      : editPath.startsWith('dungeon.gear.') ? 'game:gear'
      : editPath.includes('.machines.') ? 'game:generator'
      : editPath.includes('.tiers.') ? 'game:tier'
      : editPath.includes('.groups.') ? 'game:bonus-group' : 'game:calculator-settings';
    result.push({id,name,type,currencyIds,href:`#/${href}`,icon,effect,
      _manual:true,_editPath:editPath,_editKind});
  };

  // Each upgrade owns one benefit list; no title/effect guessing.
  const firstRoute = new Map();
  for (const [route,sectionId] of Object.entries(game?.upgrades?.routes || {}))
    if (/^[\w-]+\/[\w-]+$/.test(route) && !firstRoute.has(sectionId)) firstRoute.set(sectionId,route);
  for (const [sectionId,section] of Object.entries(game?.upgrades?.sections || {})) {
    const route=firstRoute.get(sectionId);
    if (!route) continue;
    for (const [i,upgrade] of (section.upgrades||[]).entries()) {
      const n=Number(upgrade.n ?? i+1);
      const params=new URLSearchParams({upgrade:String(n),upgradeName:upgrade.name||''});
      add(upgrade,`manual-upgrade-${sectionId}-${n}`,`${section.name} · ${upgrade.name}`,
        route.startsWith('perks/') ? 'perk' : 'upgrade',`${route}?${params}`,
        `upgrades.sections.${sectionId}.upgrades.${i}`,upgrade.icon||'trending-up',String(upgrade.multi||''));
    }
  }
  // Each rune is one source, even when it provides several different boosts.
  for (const [route,family] of Object.entries(game?.runes?.families || {}))
    for (const [i,rune] of (family.runes||[]).entries())
      add(rune,`manual-rune-${route}-${rune.id||i}`,rune.name,'rune',route,
        `runes.families.${route}.runes.${i}`,rune.icon||'gem');

  // Bonuses belong to their GROUP, never to each individual formula/bonus.
  for (const [route,page] of Object.entries(game?.calculators?.pages || {})) {
    if (page.kind==='amount-groups') {
      for (const [i,group] of (page.groups||[]).entries()) {
        const type=route.startsWith('runes/') ? 'rune' : /milestone|golden-points|astatine-power/.test(route) ? 'milestone' : 'bonus';
        add(group,`manual-group-${route}-${group.id||i}`,`${page.title||route} · ${group.name}`,type,route,
          `calculators.pages.${route}.groups.${i}`,group.icon||'sparkles');
      }
    } else {
      add(page,`manual-calculator-${route}`,page.title||route,'bonus',route,
        `calculators.pages.${route}`);
      for (const [i,tier] of (page.tiers||[]).entries())
        add(tier,`manual-tier-${route}-${tier.id||i}`,`${page.title||route} · ${tier.name}`,'bonus',route,
          `calculators.pages.${route}.tiers.${i}`,tier.icon||'sparkles');
      for (const [i,machine] of (page.machines||[]).entries())
        add(machine,`manual-machine-${route}-${machine.id||i}`,`${page.title||route} · ${machine.name}`,'bonus',route,
          `calculators.pages.${route}.machines.${i}`,machine.icon||'settings');
    }
  }

  // Whole milestone/stage/rank board owns its targets, NOT individual levels.
  const collectionTypes={stages:'stage',barns:'stage',cores:'core',ranks:'stage',lifeRanks:'stage',ascensions:'stage'};
  for (const [collection,type] of Object.entries(collectionTypes))
    for (const [route,page] of Object.entries(game?.progression?.[collection]||{})) {
      const isMilestone=/milestone|astatine-power/.test(route) || /milestone/i.test(page.title||'');
      add(page,`manual-progress-${collection}-${route}`,page.title||route,
        isMilestone?'milestone':type,route,`progression.${collection}.${route}`,isMilestone?'flag-triangle-right':'layers');
    }

  // Each ore mastery has a board of multiple upgrades: one group-level entry.
  for (const [route,page] of Object.entries(game?.mining?.mastery||{}))
    for (const [i,ore] of (page.ores||[]).entries())
      add(ore,`manual-mastery-${route}-${ore.id||i}`,`${ore.name} Mastery`,'mastery',route,
        `mining.mastery.${route}.ores.${i}`,ore.icon||'medal');

  // Other existing multi-bonus content: training groups and gear/stat cards.
  for (const [route,page] of Object.entries(game?.dungeon?.training||{}))
    for (const [i,group] of (page.groups||[]).entries()) {
      add(group,`manual-training-${route}-${group.id||i}`,group.name,'bonus',route,
        `dungeon.training.${route}.groups.${i}`);
      for (const [j,area] of (group.areas||[]).entries())
        add(area,`manual-area-${route}-${i}-${j}`,`${group.name} · ${area.name}`,'bonus',route,
          `dungeon.training.${route}.groups.${i}.areas.${j}`);
    }
  for (const [route,page] of Object.entries(game?.dungeon?.gear||{}))
    for (const [i,gear] of (page.gears||[]).entries())
      add(gear,`manual-gear-${route}-${gear.id||i}`,gear.name,'other',route,
        `dungeon.gear.${route}.gears.${i}`);

  // Generic wiki pages can document boards, perks and other bonus sources
  // without adding a duplicate special-purpose record to game data.
  for (const [ci,category] of (wikiCategories||[]).entries()) {
    add(category,`manual-wiki-category-${category.id}`,category.name,
      category.explorerSourceType||'other',category.id,`wiki:categories.${ci}`,category.icon||'book-open');
    const walk = (nodes,prefix) => {
      for (const [i,page] of (nodes||[]).entries()) {
        const itemPath=`${prefix}.${i}`;
        add(page,`manual-wiki-page-${category.id}-${page.id}`,page.name,
          page.explorerSourceType||'other',`${category.id}/${page.id}`,`wiki:${itemPath}`,page.icon||'book-open');
        walk(page.children,`${itemPath}.children`);
      }
    };
    walk(category.subcategories,`categories.${ci}.subcategories`);
  }

  // Legacy source records are not used. Sources come exclusively from What It Benefits.\n  return result;\n}\n