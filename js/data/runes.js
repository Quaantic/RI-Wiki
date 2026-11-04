// Rune data is loaded from content/game-data.json before routes render.

export const FAMILY_COLORS = {};

export const RUNE_FAMILIES = {};

export function getRuneFamily(catId, subId) {
  return RUNE_FAMILIES[resolveContentKey(catId, subId)] || null;
}
import { resolveContentKey } from '../page-content.js';
