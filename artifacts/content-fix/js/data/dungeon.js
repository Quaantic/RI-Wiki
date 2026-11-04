// Dungeon data is loaded from content/game-data.json before routes render.

export const TRAINING_AREAS = {};

export const DUST_UNLOCK = [];

export const GEARS = {};

export function getTrainingAreas(catId, subId) {
  return TRAINING_AREAS[resolveContentKey(catId, subId)] || null;
}

export function getGearPage(catId, subId) {
  return GEARS[resolveContentKey(catId, subId)] || null;
}
import { resolveContentKey } from '../page-content.js';
