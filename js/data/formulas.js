// Upgrade data is loaded from content/game-data.json before routes render.

export const FORMULA_SECTIONS = {};

export const FORMULA_PAGE_MAP = {};

export function getFormulaPage(catId, subId) {
  const slug = FORMULA_PAGE_MAP[`${catId}/${subId}`];
  return slug ? FORMULA_SECTIONS[slug] || null : null;
}

export function getInlineUpgradePages(catId, sub) {
  return (sub?.children || []).flatMap((child) => {
    if (!/upgrades?$/i.test(child.name)) return [];
    const page = getFormulaPage(catId, child.id);
    return page ? [{ child, page }] : [];
  });
}