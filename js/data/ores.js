// Mining data is loaded from content/game-data.json before routes render.

export const ORE_DATA = {};

export const MASTERY_DATA = {};

export const LAYER_DATA = {};

export function getOrePage(catId, subId) {
  return ORE_DATA[resolveContentKey(catId, subId)] || null;
}

export function getMasteryPage(catId, subId) {
  return MASTERY_DATA[resolveContentKey(catId, subId)] || null;
}

export function getLayerPage(catId, subId) {
  return LAYER_DATA[resolveContentKey(catId, subId)] || null;
}
import { resolveContentKey } from '../page-content.js';
