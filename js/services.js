// ==== SERVICES: DATA PROVIDER (fonte unica de dados) + EXCEL (futuro) ====

import { ARTICLES, ARTICLE_INDEX } from './data/articles.js';
import { UPDATE_LOG, LATEST_UPDATE, setUpdateLog } from './data/update-log.js';
import { CATEGORIES, CATEGORY_IDS, getCategory, getSubcategory } from './data/wiki-data.js';
import { searchArticles } from './utils.js';

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

export async function loadEditableContent() {
  const [wikiContent, articleContent, updateContent] = await Promise.all([
    fetchContent('../content/wiki-data.json'),
    fetchContent('../content/articles.json'),
    fetchContent('../content/update-log.json'),
  ]);
  const categories = wikiContent?.categories;
  const articles = articleContent?.articles;
  const versions = updateContent?.versions;

  assertUniqueIds(categories, 'Wiki categories');
  assertUniqueIds(articles, 'Articles');
  const categoryIds = new Set(categories.map((category) => category.id));
  const routesByCategory = new Map();
  for (const category of categories) {
    if (!/^[\w-]+$/.test(category.id) || typeof category.name !== 'string'
      || typeof category.desc !== 'string' || typeof category.tagline !== 'string') {
      throw new Error('[content] Each wiki category needs a valid ID, name, description, and tagline.');
    }
    const routes = new Set();
    validatePageTree(category.subcategories, category.id, routes);
    routesByCategory.set(category.id, routes);
  }
  for (const article of articles) {
    if (!/^[\w-]+$/.test(article.id) || typeof article.title !== 'string'
      || !categoryIds.has(article.category)
      || !routesByCategory.get(article.category)?.has(article.subcategory)
      || !Array.isArray(article.sections)) {
      throw new Error(`[content] Article "${article.id}" needs a valid ID, title, category, section, and sections list.`);
    }
  }
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

  CATEGORIES.splice(0, CATEGORIES.length, ...categories);
  CATEGORY_IDS.splice(0, CATEGORY_IDS.length, ...categories.map((category) => category.id));
  ARTICLES.splice(0, ARTICLES.length, ...articles.map((article) => ({
    keywords: [],
    stats: [],
    sections: [],
    related: [],
    views: 0,
    featured: false,
    updated: '',
    ...article,
  })));
  ARTICLE_INDEX.clear();
  ARTICLES.forEach((article) => ARTICLE_INDEX.set(article.id, article));
  setUpdateLog(versions);
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

const byUpdatedDesc = (a, b) => b.updated.localeCompare(a.updated);
const byViewsDesc = (a, b) => b.views - a.views;

const mockBackend = {
  async getCategories() {
    return delay(CATEGORIES.map((c) => ({
      ...c,
      articleCount: ARTICLES.filter((a) => a.category === c.id).length,
    })));
  },

  async getArticles({ category, subcategory } = {}) {
    let list = ARTICLES;
    if (category) list = list.filter((a) => a.category === category);
    if (subcategory) list = list.filter((a) => a.subcategory === subcategory);
    return delay([...list].sort(byUpdatedDesc));
  },

  async getArticle(id) {
    return delay(ARTICLE_INDEX.get(id) || null);
  },

  async getRelated(article) {
    const related = (article?.related || [])
      .map((id) => ARTICLE_INDEX.get(id))
      .filter(Boolean);
    return delay(related);
  },

  async getFeaturedArticles(limit = 3) {
    return delay(ARTICLES.filter((a) => a.featured).sort(byUpdatedDesc).slice(0, limit));
  },

  async getPopularArticles(limit = 6) {
    return delay([...ARTICLES].sort(byViewsDesc).slice(0, limit));
  },

  async getRecentlyUpdated(limit = 6) {
    return delay([...ARTICLES].sort(byUpdatedDesc).slice(0, limit));
  },

  async getWikiStats() {
    return delay({
      articles: ARTICLES.length,
      categories: CATEGORIES.length,
      updateVersion: LATEST_UPDATE.version,
      updateCount: UPDATE_LOG.reduce((n, v) => n + v.entries.length, 0),
    });
  },

  async search(query, opts) {
    return delay(searchArticles(ARTICLES, query, opts));
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
  getArticles: (...args) => backend().getArticles(...args),
  getArticle: (...args) => backend().getArticle(...args),
  getRelated: (...args) => backend().getRelated(...args),
  getFeaturedArticles: (...args) => backend().getFeaturedArticles(...args),
  getPopularArticles: (...args) => backend().getPopularArticles(...args),
  getRecentlyUpdated: (...args) => backend().getRecentlyUpdated(...args),
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
  getArticles: NOT_IMPLEMENTED('getArticles'),
  getArticle: NOT_IMPLEMENTED('getArticle'),
  getFeaturedArticles: NOT_IMPLEMENTED('getFeaturedArticles'),
  getPopularArticles: NOT_IMPLEMENTED('getPopularArticles'),
  getRecentlyUpdated: NOT_IMPLEMENTED('getRecentlyUpdated'),
  getWikiStats: NOT_IMPLEMENTED('getWikiStats'),
  search: NOT_IMPLEMENTED('search'),
};

export { getCategory, getSubcategory, CATEGORIES };
