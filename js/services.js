// ==== SERVICES: DATA PROVIDER (fonte unica de dados) + EXCEL (futuro) ====

import { UPDATE_LOG, LATEST_UPDATE, setUpdateLog } from './data/update-log.js';
import { CATEGORIES, CATEGORY_IDS, CREDITS, getCategory, getSubcategory } from './data/wiki-data.js';
import { FORMULA_SECTIONS, FORMULA_PAGE_MAP } from './data/formulas.js';
import { STAGE_DATA, BARN_DATA, RANK_DATA, ASCENSION_DATA, LIFE_RANK_DATA, CORE_DATA } from './data/progress.js';
import { ORE_DATA, MASTERY_DATA, LAYER_DATA } from './data/ores.js';
import { RUNE_FAMILIES, FAMILY_COLORS } from './data/runes.js';
import { TRAINING_AREAS, DUST_UNLOCK, GEARS } from './data/dungeon.js';
import { RESET_LAYER_PAGES, setResetLayerPages } from './data/reset-layers.js';
import { MINING_PRICES } from './data/mining-prices.js';
import { setResourceColors } from './data/resource-colors.js';
import { setUiCopy } from './data/ui-copy.js';
import { searchPages } from './utils.js';

export const DATA_SOURCES = { MOCK: 'mock', EXCEL: 'excel' };

let activeSource = DATA_SOURCES.MOCK;

async function fetchContent(path) {
  const response = await fetch(new URL(path, import.meta.url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`[content] Failed to load ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

function assertUniqueIds(items, label) {
  if (!Array.isArray(items) || items.some((item) => !item || typeof item.id !== 'string' || !item.id.trim())) {
    throw new Error(`[content] ${label} must be a list of items with IDs.`);
  }
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`[content] ${label} contains duplicate IDs.`);
  }
}

function validatePageTree(items, categoryId, routes) {
  if (!Array.isArray(items)) {
    throw new Error(`[content] Sections in ${categoryId} must be a list.`);
  }
  for (const item of items) {
    if (!item || !/^[\w-]+$/.test(item.id || '') || typeof item.name !== 'string' || typeof item.desc !== 'string') {
      throw new Error(`[content] A section in ${categoryId} is missing a valid ID, name, or description.`);
    }
    if (routes.has(item.id)) {
      throw new Error(`[content] Section ID "${item.id}" is repeated in ${categoryId}.`);
    }
    routes.add(item.id);
    if (item.children != null) validatePageTree(item.children, categoryId, routes);
  }
}

function replaceObject(target, source, label) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`[content] ${label} must be an object.`);
  }
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
}

export function applyGameData(data) {
  if (!data || typeof data !== 'object') throw new Error('[content] Game data is missing or invalid.');
  replaceObject(FORMULA_SECTIONS, data.upgrades?.sections, 'Upgrade sections');
  replaceObject(FORMULA_PAGE_MAP, data.upgrades?.routes, 'Upgrade page routes');
  replaceObject(STAGE_DATA, data.progression?.stages, 'Stages');
  replaceObject(BARN_DATA, data.progression?.barns, 'Barns');
  replaceObject(RANK_DATA, data.progression?.ranks, 'Ranks');
  replaceObject(ASCENSION_DATA, data.progression?.ascensions, 'Ascensions');
  replaceObject(LIFE_RANK_DATA, data.progression?.lifeRanks, 'Life ranks');
  replaceObject(CORE_DATA, data.progression?.cores, 'Core ranks');
  replaceObject(ORE_DATA, data.mining?.ores, 'Ores');
  replaceObject(MASTERY_DATA, data.mining?.mastery, 'Mining mastery');
  replaceObject(LAYER_DATA, data.mining?.layers, 'Mining layers');
  replaceObject(MINING_PRICES, data.mining?.prices, 'Mining upgrade prices');
  replaceObject(RUNE_FAMILIES, data.runes?.families, 'Rune families');
  replaceObject(FAMILY_COLORS, data.runes?.colors, 'Rune colors');
  replaceObject(TRAINING_AREAS, data.dungeon?.training, 'Training areas');
  if (!Array.isArray(data.dungeon?.dustUnlock)) throw new Error('[content] Bone dust unlock levels must be a list.');
  DUST_UNLOCK.splice(0, DUST_UNLOCK.length, ...data.dungeon.dustUnlock);
  replaceObject(GEARS, data.dungeon?.gear, 'Dungeon gear');
  setResetLayerPages(data.calculators?.pages);
  setResourceColors(data.resources?.colors, data.resources?.pageLinks);
  setUiCopy(data.uiCopy);
}

function applyCredits(content) {
  const credits = content?.credits || {};
  const staff = Array.isArray(credits.staff) ? credits.staff : [];
  const contributors = Array.isArray(credits.contributors) ? credits.contributors : [];
  CREDITS.staff.splice(0, CREDITS.staff.length, ...staff);
  CREDITS.contributors.splice(0, CREDITS.contributors.length, ...contributors);
  CREDITS.thanks = typeof credits.thanks === 'string' ? credits.thanks : '';
}

export function applyWikiContent(wikiContent) {
  const categories = wikiContent?.categories;
  assertUniqueIds(categories, 'Wiki categories');
  for (const category of categories) {
    if (!/^[\w-]+$/.test(category.id) || typeof category.name !== 'string'
      || typeof category.desc !== 'string' || typeof category.tagline !== 'string') {
      throw new Error('[content] Each wiki category needs a valid ID, name, description, and tagline.');
    }
    const routes = new Set();
    validatePageTree(category.subcategories, category.id, routes);
  }
  CATEGORIES.splice(0, CATEGORIES.length, ...categories);
  CATEGORY_IDS.splice(0, CATEGORY_IDS.length, ...categories.map((category) => category.id));
  applyCredits(wikiContent);
}

export function applyUpdateContent(versions) {
  if (!Array.isArray(versions) || !versions.length || versions.some((version) =>
    !version || typeof version.version !== 'string' || !Array.isArray(version.entries))) {
    throw new Error('[content] Update log must contain releases with a version and entries list.');
  }
  if (new Set(versions.map((version) => version.version)).size !== versions.length) {
    throw new Error('[content] Update log contains duplicate release versions.');
  }
  for (const version of versions) {
    for (const entry of version.entries) {
      if (!entry || !['Feature', 'Changes', 'UI', 'Bugs'].includes(entry.context)
        || typeof entry.title !== 'string' || typeof entry.description !== 'string'
        || (entry.href && !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(entry.href))) {
        throw new Error(`[content] Release ${version.version} has an invalid update entry.`);
      }
    }
  }
  setUpdateLog(versions);
}

export async function loadEditableContent() {
  const [wikiContent, updateContent, gameData] = await Promise.all([
    fetchContent('../content/wiki-data.json'),
    fetchContent('../content/update-log.json'),
    fetchContent('../content/game-data.json'),
  ]);

  applyWikiContent(wikiContent);
  applyUpdateContent(updateContent.versions);
  applyGameData(gameData);
}

export function setDataSource(source) {
  if (!Object.values(DATA_SOURCES).includes(source)) {
    throw new Error(`[dataProvider] Unknown data source: ${source}`);
  }
  activeSource = source;
}

export function getDataSource() {
  return activeSource;
}

function backend() {
  return activeSource === DATA_SOURCES.EXCEL ? excelProvider : mockBackend;
}

const MOCK_LATENCY = 120;
const delay = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY));

const mockBackend = {
  async getCategories() {
    return delay(CATEGORIES);
  },

  async getWikiStats() {
    return delay({
      categories: CATEGORIES.length,
      pages: CATEGORIES.reduce((total, category) => {
        const countPages = (pages) => pages.reduce((count, page) => count + 1 + countPages(page.children || []), 0);
        return total + countPages(category.subcategories || []);
      }, 0),
      updateVersion: LATEST_UPDATE.version,
      updateCount: UPDATE_LOG.reduce((n, v) => n + v.entries.length, 0),
    });
  },

  async search(query, opts) {
    return delay(searchPages(query, opts));
  },

  async getUpdateLog() {
    return delay(UPDATE_LOG);
  },
};

export const dataProvider = {
  sourceId: 'data',
  setDataSource,
  getDataSource,

  getCategories: (...args) => backend().getCategories(...args),
  getWikiStats: (...args) => backend().getWikiStats(...args),
  search: (...args) => backend().search(...args),
  getUpdateLog: (...args) => backend().getUpdateLog(...args),
};

/* EXCEL INTEGRATION — PLACEHOLDER (fase futura, nao implementar ainda).
   Quando a planilha existir: dataProvider.setDataSource('excel') ativa
   este modulo, que tera a mesma interface do mockBackend. */
const NOT_IMPLEMENTED = (fn) => async () => {
  throw new Error(
    `[excelProvider] ${fn}() e um placeholder da futura integracao com Excel.`
  );
};

export const excelProvider = {
  sourceId: 'excel',
  isConfigured: () => false,
  endpoint: null,
  getCategories: NOT_IMPLEMENTED('getCategories'),
  getWikiStats: NOT_IMPLEMENTED('getWikiStats'),
  search: NOT_IMPLEMENTED('search'),
};

export { getCategory, getSubcategory, CATEGORIES };
