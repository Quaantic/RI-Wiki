// ==== CONTENT SCHEMA: repositorio, validacao e codificacao compartilhados ====
// Usado pelo Editor inline (js/edit/*) e pelos testes.

import { evaluateExpression } from './utils.js';
import { normalizeReleases } from './releases.js';
import { validateBenefitNames } from './data/currency-benefits.js';

export const REPOSITORY = 'Quaantic/RI-Wiki';
export const BRANCH = 'main';
export const FILES = {
  wiki: 'content/wiki-data.json',
  updates: 'content/update-log.json',
  game: 'content/game-data.json',
};
export const BACKUP_DIRECTORY = 'content/backups';

// Rascunho de edicao inline: persistido no repositorio, mas nunca carregado
// pelo site publico (services.js busca apenas os tres FILES acima).
export const DRAFT_FILE = 'content/drafts/inline-draft.json';

export const CONTEXTS = ['Feature', 'Changes', 'UI', 'Bugs'];

export const GAME_GROUPS = [
  { id: 'formula-sections', label: 'Upgrade sections', path: 'upgrades.sections', mode: 'map' },
  { id: 'formula-routes', label: 'Upgrade page links', path: 'upgrades.routes', mode: 'map' },
  { id: 'stages', label: 'Stages', path: 'progression.stages', mode: 'map' },
  { id: 'barns', label: 'Barns', path: 'progression.barns', mode: 'map' },
  { id: 'ranks', label: 'Ranks', path: 'progression.ranks', mode: 'map' },
  { id: 'ascensions', label: 'Ascensions', path: 'progression.ascensions', mode: 'map' },
  { id: 'life-ranks', label: 'Life ranks', path: 'progression.lifeRanks', mode: 'map' },
  { id: 'cores', label: 'Core ranks', path: 'progression.cores', mode: 'map' },
  { id: 'ores', label: 'Ores', path: 'mining.ores', mode: 'map' },
  { id: 'mastery', label: 'Mining mastery', path: 'mining.mastery', mode: 'map' },
  { id: 'layers', label: 'Mining layers', path: 'mining.layers', mode: 'map' },
  { id: 'mining-prices', label: 'Mining upgrade prices', path: 'mining.prices', mode: 'map' },
  { id: 'rune-families', label: 'Rune families', path: 'runes.families', mode: 'map' },
  { id: 'rune-colors', label: 'Rune family colors', path: 'runes.colors', mode: 'single' },
  { id: 'training', label: 'Training areas', path: 'dungeon.training', mode: 'map' },
  { id: 'dust-unlock', label: 'Bone dust unlock levels', path: 'dungeon.dustUnlock', mode: 'single' },
  { id: 'gear', label: 'Dungeon gear', path: 'dungeon.gear', mode: 'map' },
  { id: 'calculators', label: 'Bonus calculators', path: 'calculators.pages', mode: 'map' },
  { id: 'resource-colors', label: 'Resource colors', path: 'resources.colors', mode: 'single' },
  { id: 'resource-links', label: 'Resource page links', path: 'resources.pageLinks', mode: 'single' },
];

function docPath(documents, path) {
  const [root, ...rest] = String(path).split('.');
  const bases = {
    categories: documents?.wiki?.categories,
    versions: documents?.updates?.versions,
    game: documents?.game,
  };
  return rest.reduce((value, key) => value?.[key], bases[root]);
}

function flattenPageIds(category) {
  const ids = new Set();
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (!node || !/^[\w-]+$/.test(node.id || '')) throw new Error(`Page "${node?.name || 'Untitled'}" needs a URL ID using letters, numbers, underscores, or hyphens.`);
      if (ids.has(node.id)) throw new Error(`The page ID "${node.id}" appears more than once in category ${category.name}.`);
      ids.add(node.id);
      if (!node.name?.trim() || typeof node.desc !== 'string') throw new Error(`Page "${node.id}" needs a name and a description.`);
      walk(node.children);
    }
  };
  walk(category.subcategories);
  return ids;
}

export function validateDocuments(documents) {
  if (documents?.updates) documents.updates.versions = normalizeReleases(documents.updates.versions);
  const categories = documents?.wiki?.categories;
  const versions = documents?.updates?.versions;
  const game = documents?.game;
  if (!Array.isArray(categories) || !Array.isArray(versions)) throw new Error('A content file is missing its expected list.');
  validateGameData(game);
  validateBenefitNames(game, documents?.wiki);
  const categoryIds = new Set();
  for (const category of categories) {
    if (!/^[\w-]+$/.test(category.id || '') || !category.name?.trim() || typeof category.desc !== 'string' || typeof category.tagline !== 'string') {
      throw new Error(`Category "${category.name || 'Untitled'}" needs a valid URL ID, name, description, and tagline.`);
    }
    if (categoryIds.has(category.id)) throw new Error(`The category ID "${category.id}" is used more than once.`);
    categoryIds.add(category.id);
    flattenPageIds(category);
  }
  if (!versions.length) throw new Error('The update log must contain at least one release.');
  const releaseIds = new Set();
  for (const version of versions) {
    if (!version.version?.trim() || !Array.isArray(version.entries)) throw new Error('Each release needs a version and an update list.');
    if (releaseIds.has(version.version)) throw new Error(`Release version "${version.version}" appears more than once.`);
    releaseIds.add(version.version);
    for (const entry of version.entries) {
      if (!CONTEXTS.includes(entry.context) || !entry.title?.trim() || typeof entry.description !== 'string') throw new Error(`An update in release ${version.version} needs a category, title, and description.`);
      if (entry.href && !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(entry.href)) throw new Error(`The Wiki link "${entry.href}" is invalid; use a route like #/life/power-of-fossils.`);
    }
  }
}

function validateGameData(game) {
  if (!game || typeof game !== 'object') throw new Error('Game data is missing or invalid.');
  for (const group of GAME_GROUPS) {
    const value = docPath({ game }, `game.${group.path}`);
    if (group.mode === 'map' && (!value || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error(`${group.label} must be a collection of named entries.`);
    }
    if (group.mode === 'single' && (!value || typeof value !== 'object')) {
      throw new Error(`${group.label} is missing or invalid.`);
    }
  }
  if (game.iconNameRules != null) {
    if (!Array.isArray(game.iconNameRules)) throw new Error('Named icons must be a list.');
    const names = new Set();
    for (const rule of game.iconNameRules) {
      const key = String(rule?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key || names.has(key) || !String(rule?.icon || '').trim()) throw new Error('Each named icon needs a unique name and an icon.');
      names.add(key);
    }
  }
  // Additional currency pages are stored in the same game document and
  // validated before the existing Save/Publish flow accepts them.
  if (game.currencies != null) {
    const currencies = game.currencies;
    if (!Array.isArray(currencies.groups) || !Array.isArray(currencies.entries) || !Array.isArray(currencies.sources)) {
      throw new Error('Currencies must include groups, entries and bonus sources.');
    }
    for (const field of ['title','description','explorerTitle','explorerDescription']) {
      if (typeof currencies[field] !== 'string') throw new Error(`Currencies ${field} must be text.`);
    }
    const groupIds = new Set(), currencyIds = new Set(), sourceIds = new Set();
    const validId = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id);
    const unique = (list, id, what) => {
      if (!validId(id) || list.has(id)) throw new Error(`${what} has a missing or repeated ID: ${id}`);
      list.add(id);
    };
    const validLink = (route) => /^#\/[\w-]+(?:\/[\w-]+)*(?:\?[\w%=&+().-]*)?$/.test(route);
    for (const group of currencies.groups) {
      unique(groupIds, group?.id, 'Currency group');
      if (!group.name?.trim() || typeof group.icon !== 'string') throw new Error('A currency group needs a name and icon.');
    }
    for (const entry of currencies.entries) {
      unique(currencyIds,entry?.id,'Currency');
      if (!groupIds.has(entry.group)) throw new Error(`Currency ${entry.name} has an unknown group.`);
      if (!entry.name?.trim() || typeof entry.description !== 'string' || typeof entry.icon !== 'string'
        || !Array.isArray(entry.relatedLinks || [])) throw new Error('Currency must have a name, description, icon and article links.');
      if (entry.color && !/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(entry.color)) throw new Error(`Invalid currency color for ${entry.name}.`);
      for (const link of entry.relatedLinks || []) {
        if (!link.label?.trim() || !validLink(link.href)) throw new Error(`Invalid article link for ${entry.name}.`);
      }
    }
    for (const source of currencies.sources) {
      unique(sourceIds,source?.id,'Currency source');
      if (!source.name?.trim() || !['rune','bonus','upgrade','mastery','milestone','perk','core','stage','board','other'].includes(source.type)
        || typeof source.effect !== 'string' || !Array.isArray(source.currencyIds) || !source.currencyIds.length
        || source.currencyIds.some(id => !currencyIds.has(id)) || (source.href && !validLink(source.href))) {
        throw new Error(`Invalid currency source: ${source?.name || source?.id}. Check affected currency IDs and link.`);
      }
    }
  }
  // Manual Explorer lists must reference real, explicitly named currencies.
  validateBenefitNames(game);
  const sections = game.upgrades?.sections;
  for (const [sectionId, section] of Object.entries(sections || {})) {
    if (!section.name?.trim() || !Array.isArray(section.upgrades)) throw new Error(`Upgrade section "${sectionId}" needs a name and upgrades list.`);
    const { treeUpgrade15 = {}, treeUpgrade51 = {} } = section.perkControls || {};
    const start15 = treeUpgrade15.defaultLevel ?? 0;
    const start51 = treeUpgrade51.defaultLevel ?? 0;
    const max51 = treeUpgrade51.maxLevel ?? 3;
    if ([start15, start51, max51].some((level) => !Number.isSafeInteger(level) || level < 0)) {
      throw new Error('Tree Upgrade levels must be whole numbers of 0 or more.');
    }
    if (start51 > max51) throw new Error('Tree Upgrade 51 starting level must be within its maximum.');
    const upgradeNumbers = new Set();
    for (const upgrade of section.upgrades) {
      if (!Number.isInteger(Number(upgrade.n)) || !upgrade.name?.trim() || !String(upgrade.price ?? '').trim() || !String(upgrade.multi ?? '').trim()) {
        throw new Error(`Every upgrade in "${section.name}" needs a number, name, price formula, and effect formula.`);
      }
      if (upgradeNumbers.has(Number(upgrade.n))) throw new Error(`Upgrade number ${upgrade.n} is repeated in "${section.name}".`);
      upgradeNumbers.add(Number(upgrade.n));
    }
  }
  for (const [route, sectionId] of Object.entries(game.upgrades?.routes || {})) {
    if (!/^[\w-]+\/[\w-]+$/.test(route) || !sections[sectionId]) {
      throw new Error(`Upgrade page link "${route}" must point to an existing upgrade section.`);
    }
  }
  for (const [name, color] of Object.entries(game.resources?.colors || {})) {
    if (!name.trim() || typeof color !== 'string'
      || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) {
      throw new Error(`Resource "${name}" needs a valid hex color.`);
    }
  }
  for (const [name, route] of Object.entries(game.resources?.pageLinks || {})) {
    if (!name.trim() || typeof route !== 'string' || !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(route)) {
      throw new Error(`Resource page link "${name}" needs a valid Wiki route.`);
    }
  }
  const variables = { L: 1, S:1,T:1,scale:1,baseIncome:1,baseTime:1,tierPrice:1,levelPrice:1,speedPrice:1,tier: 1, N: 1, level: 1, G: 1, dust: 1, p: 1, amount: 1 };
  const validateFormulas = (value, path = 'game') => {
    if (typeof value === 'string' && value.startsWith('formula: ')) {
      try {
        evaluateExpression(value.slice('formula: '.length), variables);
      } catch (error) {
        throw new Error(`Invalid formula at ${path}: ${error.message}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => validateFormulas(item, `${path}.${index}`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) validateFormulas(child, `${path}.${key}`);
    }
  };
  for (const [key, page] of Object.entries(game.calculators?.pages || {})) {
    const extra = [...(page.groups || []).map((group) => group.id).filter((id) => /^[A-Za-z][A-Za-z0-9]*$/.test(id)), ...(page.inputs || []).map((input) => input.id)];
    for (const name of extra) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) throw new Error(`Calculator input "${name}" must use letters and numbers, starting with a letter.`);
      variables[name] = 1;
    }
    validateFormulas(page, `calculators.pages.${key}`);
    for (const name of extra) delete variables[name];
  }
}

export function decodeBase64Content(content) {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBase64Content(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}
