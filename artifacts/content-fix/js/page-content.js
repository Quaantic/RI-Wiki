import { CATEGORIES } from './data/wiki-data.js';

let contentKeys = new Set();
export function setContentKeys(game) {
  const keys = new Set(Object.keys(game.upgrades?.routes || {}));
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/^[\w-]+\/[\w-]+$/.test(key)) keys.add(key);
      else if (!Array.isArray(child)) walk(child);
    }
  };
  walk(game);
  contentKeys = keys;
}

export function resolveContentKey(catId, pageId) {
  const find = (nodes) => {
    for (const node of nodes || []) {
      if (node.id === pageId) return node;
      const found = find(node.children);
      if (found) return found;
    }
  };
  const page = find(CATEGORIES.find((cat) => cat.id === catId)?.subcategories);
  if (page?.contentKey) return page.contentKey;
  const route = `${catId}/${pageId}`;
  if (contentKeys.has(route)) return route;
  const candidates = [...contentKeys].filter((key) => key.endsWith(`/${pageId}`));
  return candidates.length === 1 ? candidates[0] : route;
}

// Pin the data identity before changing a page URL or moving its parent.
export function pinContentKeys(wiki) {
  for (const category of wiki.categories || []) {
    const walk = (nodes) => {
      for (const page of nodes || []) {
        const key = resolveContentKey(category.id, page.id);
        if (contentKeys.has(key)) page.contentKey ||= key;
        walk(page.children);
      }
    };
    walk(category.subcategories);
  }
}
