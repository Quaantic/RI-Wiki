// Wiki content is loaded from content/wiki-data.json during application boot.

export const CATEGORIES = [];

// Creditos da comunidade (content/wiki-data.json -> "credits").
// Mutado no lugar por services.applyWikiContent para a views renderizarem
// sempre a versao vigente (site publico ou rascunho do editor inline).
export const CREDITS = { staff: [], contributors: [], thanks: '' };

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

// Caminho (documento wiki) de uma pagina na arvore, p.ex.
// "categories.2.subcategories.4.children.0" — usado pelo editor inline.
export function getSubcategoryDocPath(categoryId, subId) {
  const categoryIndex = CATEGORIES.findIndex((category) => category.id === categoryId);
  if (categoryIndex === -1) return null;
  const walk = (nodes, prefix) => {
    for (let index = 0; index < nodes.length; index++) {
      const path = `${prefix}${index}`;
      if (nodes[index].id === subId) return path;
      const nested = walk(nodes[index].children || [], `${path}.children.`);
      if (nested) return nested;
    }
    return null;
  };
  return walk(CATEGORIES[categoryIndex].subcategories || [], `categories.${categoryIndex}.subcategories.`);
}

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
