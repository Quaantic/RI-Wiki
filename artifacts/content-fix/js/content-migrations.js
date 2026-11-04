import { IMPORTED_NOTES } from './data/imported-notes.js';

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

// A saved marker prevents this repair from undoing subsequent intentional edits
// or removals. An old shared draft without the marker receives the repair too.
export function installImportedNotes(wiki,game) {
  if (!wiki?.categories || !game?.calculators?.pages || !game?.progression?.stages) return false;
  const id = IMPORTED_NOTES.id;
  let changed = false;
  if (!(wiki.contentMigrations || []).includes(id)) {
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
  if (!(game.contentMigrations || []).includes(id)) {
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
  return changed;
}
