// Wiki content is loaded from content/wiki-data.json during application boot.

export const CATEGORIES = [];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) || null;
}

export function getSubcategory(categoryId, subId) {
  const cat = getCategory(categoryId);
  if (!cat) return null;
  const flat = [];
  const walk = (items, chain) => {
    for (const s of items) {
      flat.push({ ...s, parentId: chain.length ? chain[chain.length - 1].id : null, parentChain: chain });
      if (s.children?.length) walk(s.children, [...chain, { id: s.id, name: s.name }]);
    }
  };
  walk(cat.subcategories, []);
  const idx = flat.findIndex((s) => s.id === subId);
  if (idx === -1) return null;
  return {
    ...flat[idx],
    category: cat,
    index: idx,
    prev: flat[idx - 1] || null,
    next: flat[idx + 1] || null,
  };
}

export function isValidRoute(categoryId, subId) {
  if (!subId) return !!getCategory(categoryId);
  return !!getSubcategory(categoryId, subId);
}
