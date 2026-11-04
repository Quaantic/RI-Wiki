// ==== UI COPY: textos fixos da interface que o editor inline pode mexer ====
// Guardados em game-data.json (chave "uiCopy"); vazios usam o texto default.

export const UI_COPY = {
  heroBadge: '',
  heroTitle: '',
  heroSub: '',
};

export function setUiCopy(copy = {}) {
  if (typeof copy !== 'object' || copy === null || Array.isArray(copy)) {
    throw new Error('[content] uiCopy must be an object.');
  }
  UI_COPY.heroBadge = typeof copy.heroBadge === 'string' ? copy.heroBadge : '';
  UI_COPY.heroTitle = typeof copy.heroTitle === 'string' ? copy.heroTitle : '';
  UI_COPY.heroSub = typeof copy.heroSub === 'string' ? copy.heroSub : '';
}
