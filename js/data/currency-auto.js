// Auto-index bonus sources from the REAL, editable upgrade records.
// No bonus amounts or target currencies are invented. A target inferred from
// the upgrade's name is stored as 'related', not a verified game mechanic.
const normalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const meaningfulFormula = value => String(value || '').trim() && !['-', '—','none','n/a'].includes(normalize(value));

export function guessUpgradeCurrencies(name, entries) {
  const raw = normalize(name);
  // Bracketed resource tags in upgrade names are explicit targets documented
  // by the wiki: e.g. "Automator [GEARS]". Ignore [SOON] and unknown tags.
  const normalizeTag = value => normalize(value).replace(/\s+/g, ' ');
  const tagged = [...String(name || '').matchAll(/\[([^\]]+)\]/g)].map(match => normalizeTag(match[1]));
  const keysByName = new Map((entries || []).map(entry => [normalizeTag(entry.name), entry.id]));
  if (tagged.length) {
    const ids = [...new Set(tagged.map(tag => keysByName.get(tag)).filter(Boolean))];
    if (ids.length) return ids;
  }
  // Only unambiguous patterns such as 'Energy', 'More Energy', 'Energy Gain'.
  // General words in an effect formula do NOT identify the affected currency.
  const candidate = raw.replace(/^(?:more|extra|better|boosted|increased|infinite|greater|improved)\s+/, '')
    .replace(/\s+(?:gain|gains|income|boost|boosts|multiplier|production|power)$/, '')
    .trim();
  const keys = new Map();
  for (const entry of entries || []) {
    const key = normalize(entry.name);
    keys.set(key, entry.id);
    if (key.endsWith('s')) keys.set(key.slice(0, -1), entry.id);
  }
  return keys.has(candidate) ? [keys.get(candidate)] : [];
}

export function buildAutomaticUpgradeSources(game, entries) {
  const result = [];
  const routes = game?.upgrades?.routes || {};
  const sections = game?.upgrades?.sections || {};
  const firstRoute = new Map();
  for (const [route, sectionId] of Object.entries(routes)) {
    if (/^[\w-]+\/[\w-]+$/.test(route) && !firstRoute.has(sectionId)) firstRoute.set(sectionId, route);
  }
  for (const [sectionId, section] of Object.entries(sections)) {
    const route = firstRoute.get(sectionId);
    if (!route) continue;
    for (const [index, upgrade] of (section.upgrades || []).entries()) {
      if (!meaningfulFormula(upgrade.multi)) continue;
      const currencyIds = guessUpgradeCurrencies(upgrade.name, entries);
      const hasExplicitTag = [...String(upgrade.name || '').matchAll(/\[([^\]]+)\]/g)]
        .some(match => currencyIds.some(id => (entries || []).some(entry => entry.id === id && normalize(entry.name) === normalize(match[1]))));
      if (!currencyIds.length) continue;
      const n = Number(upgrade.n ?? index + 1);
      const params = new URLSearchParams({upgrade:String(n), upgradeName:upgrade.name});
      result.push({
        id:`upgrade-${sectionId}-${n}`, name:`${section.name} · ${upgrade.name}`,
        type:route.startsWith('perks/') ? 'perk' : 'upgrade',
        currencyIds, icon:upgrade.icon || 'arrow-up-right',
        effect:`Formula from wiki: ${upgrade.multi}`, status:hasExplicitTag ? 'documented' : 'related',
        href:`#/${route}?${params.toString()}`,
        _upgradePath:`upgrades.sections.${sectionId}.upgrades.${index}`,
        _auto:true,
      });
    }
  }
  return result;
}

export function mergeCurrencySources(game, entries, authoredSources) {
  const authored = Array.isArray(authoredSources) ? authoredSources : [];
  const auto = buildAutomaticUpgradeSources(game, entries);
  const merged = [...authored];
  const positions = new Map(authored.map((item,index) => [item.id,index]));
  for (const generated of auto) {
    const index = positions.get(generated.id);
    if (index == null) {
      merged.push(generated); // newly created upgrades appear without extra entry forms
    } else {
      const existing = authored[index];
      // Explicit corrections made in the Explorer retain priority; the legacy
      // name-inferred index follows the latest wiki upgrade name/formula.
      if (existing.status !== 'documented' || (generated.status === 'documented' && !existing.manualTarget)) {
        merged[index] = {...existing,...generated,
          currencyIds: existing.manualTarget ? existing.currencyIds : generated.currencyIds,
          _upgradePath:generated._upgradePath};
      } else merged[index] = {...existing,_upgradePath:generated._upgradePath};
    }
  }
  return merged;
}
