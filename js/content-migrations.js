import { IMPORTED_NOTES } from './data/imported-notes.js';
import { refineImportedContent } from './content-presentation.js';

const clone = (value) => structuredClone(value);
const find = (nodes,id) => {
  for (const node of nodes || []) {
    if (node.id === id) return node;
    const match = find(node.children,id);
    if (match) return match;
  }
};
const mergeList = (existing = [], incoming = [], key = 'id') => {
  const result = clone(existing);
  for (const item of incoming) if (!result.some((old) => old[key] === item[key])) result.push(clone(item));
  return result;
};

const APPLE_BUFFS = [
  ['default', 'Red Apples', '#ff6569', [
    [1, '(amount/5+1)^0.365'], [5, '(amount/7+1)^0.25'], [10, '(amount/12+1)^0.2'],
    [50, '(amount/20+1)^0.125'], [250, '(amount/50+1)^0.1'],
  ]],
  ['golden', 'Golden Apples', '#e7b52a', [
    [1, '(amount/3+1)^0.425'], [3, '(amount/2+1)^0.27'], [10, '(amount/10+1)^0.235'],
    [50, '(amount/20+1)^0.15'], [1000, 'min(5,(amount/300+1)^0.15)', 5],
  ]],
  ['diamond', 'Diamond Apples', '#40bcff', [
    [1, '(amount/1.75+1)^0.4'], [15, 'min(5,(amount/5+1)^0.225)', 5],
    [100, 'min(3,(amount/35+1)^0.095)', 3], [250000, '(amount/100000+1)^0.1'],
  ]],
  ['void', 'Void Apples', '#b286ff', [
    [1, '(amount+1)^0.365'], [5, 'min(25,(amount/5+1)^0.2)', 25],
    [35, 'min(15,(amount/25+1)^0.125)', 15], [100, 'min(10,(amount/50+1)^0.11)', 10],
    [1000, 'min(25,(amount/500+1)^0.145)', 25],
  ]],
];

function consolidateApples(wiki, game) {
  const revision = 'apple-buffs-v1';
  const page = find(wiki.categories.find(cat => cat.id === 'life')?.subcategories, 'apples');
  if (!page) return false;
  const wikiDone = wiki.contentMigrations?.includes(revision);
  const gameDone = game.contentMigrations?.includes(revision);
  const route = page.contentKey || 'life/apples';
  const current = game.calculators.pages[route];
  if (wikiDone && gameDone) return false;
  // Leave a custom calculator of another kind intact.
  if (!gameDone && current && current.kind !== 'amount-groups' && current.kind !== 'amount') return false;

  if (!gameDone) {
    const groups = APPLE_BUFFS.map(([type, name, color, formulas]) => ({
      id: `apple-${type}`, name, color, amountLabel: `${name} owned`,
      bonuses: formulas.map(([unlockAt, formula, cap], index) => ({
        id: `apple-${type}-${index + 1}`, name: `Bonus ${index + 1}`,
        value: `formula: ${formula}`, unit: 'x', unlockAt,
        ...(cap === undefined ? {} : { cap, capUnit: 'x' }),
      })),
    }));
    const existingGroups = current?.kind === 'amount' ? [{
      id: 'existing-apple-bonuses', name: current.title || 'Apple bonuses',
      amountLabel: current.amountLabel || 'Apples owned',
      defaultAmount: current.defaultAmount, bonuses: current.bonuses,
    }] : current?.groups;
    game.calculators.pages[route] = {
      ...current, title: 'Apple Buffs', inputs: current?.inputs || [], kind: 'amount-groups',
      groups: mergeList(existingGroups, groups),
    };
    delete game.calculators.pages[route].bonuses;
    game.resources ||= {};
    game.resources.colors ||= {};
    game.resources.pageLinks ||= {};
    for (const [, name, color] of APPLE_BUFFS) {
      game.resources.colors[name] = color;
      game.resources.pageLinks[name.toLowerCase()] = '#/life/apples';
    }
    game.contentMigrations = [...(game.contentMigrations || []), revision];
  }

  if (!wikiDone) {
    const childIds = new Set(APPLE_BUFFS.map(([type]) => `apples-${type}`));
    wiki.redirects ||= {};
    page.children = (page.children || []).flatMap(child => {
      if (!childIds.has(child.id)) return [child];
      page.sections = mergeList(page.sections, child.sections);
      wiki.redirects[`life/${child.id}`] = '#/life/apples';
      return child.children || [];
    });
    page.desc = page.desc?.replace('across five milestones per type', 'at milestones for each type');
    wiki.contentMigrations = [...(wiki.contentMigrations || []), revision];
  }
  return true;
}

// A saved marker prevents this repair from undoing subsequent intentional edits
// or removals. An old shared draft without the marker receives the repair too.
export function installImportedNotes(wiki,game) {
  if (!wiki?.categories || !game?.calculators?.pages || !game?.progression?.stages) return false;
  const id = IMPORTED_NOTES.id;
  // The bundled compact revision already includes this import. Re-importing
  // reference sections here would dirty untouched documents and revive pages
  // that an editor intentionally removed after upgrading.
  const installed=doc=>(doc.contentMigrations||[]).some(revision=>revision===id||revision==='compact-game-content-v2');
  let changed = false;
  if (!installed(wiki)) {
    for (const {route,page:source} of IMPORTED_NOTES.pages) {
      const [catId,pageId] = route.split('/');
      const cat = wiki.categories.find((item) => item.id === catId);
      if (!cat) continue;
      let page = find(cat.subcategories,pageId);
      if (!page) {
        page = clone(source);
        cat.subcategories ||= [];
        cat.subcategories.push(page);
      } else {
        page.sections = mergeList(page.sections,source.sections);
        if (!page.desc || !page.sections.some(section => !section.id?.startsWith('notes-'))) page.desc = source.desc;
      }
      const obsolete = Object.entries(IMPORTED_NOTES.redirects || {}).filter(([,target]) => target === `#/${route}`).map(([old]) => old.split('/')[1]);
      for (const child of page.children || []) if (obsolete.includes(child.id)) page.sections = mergeList(page.sections,child.sections);
      page.children = (page.children || []).filter((child) => !obsolete.includes(child.id));
    }
    wiki.redirects = { ...wiki.redirects, ...IMPORTED_NOTES.redirects };
    wiki.contentMigrations = [...(wiki.contentMigrations || []),id];
    changed = true;
  }
  if (!installed(game)) {
    for (const [route,value] of Object.entries(IMPORTED_NOTES.calculators)) {
      const current = game.calculators.pages[route];
      if (!current) game.calculators.pages[route] = clone(value);
      else if (current.kind === value.kind) current.groups = mergeList(current.groups,value.groups);
    }
    for (const [route,value] of Object.entries(IMPORTED_NOTES.stages)) {
      const current = game.progression.stages[route];
      if (!current) game.progression.stages[route] = clone(value);
      else current.stages = mergeList(current.stages,value.stages,'num');
    }
    for (const [route,value] of Object.entries(IMPORTED_NOTES.upgrades)) {
      const key = game.upgrades.routes[route] || route.replace('/','-');
      const current = game.upgrades.sections[key];
      if (!current) game.upgrades.sections[key] = clone(value);
      else current.upgrades = mergeList(current.upgrades,value.upgrades,'n');
      game.upgrades.routes[route] = key;
    }
    game.contentMigrations = [...(game.contentMigrations || []),id];
    changed = true;
  }
  const applesChanged = consolidateApples(wiki, game);
  const nameRulesMissing = !Array.isArray(game.iconNameRules);
  if (nameRulesMissing) game.iconNameRules = [];
  const notesChanged = refineImportedContent(wiki,game);
  return notesChanged || applesChanged || changed || nameRulesMissing;
}
