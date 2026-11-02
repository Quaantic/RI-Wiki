// ==== SERVICES: DATA PROVIDER (fonte unica de dados) + EXCEL (futuro) ====

import { ARTICLES, ARTICLE_INDEX } from './data/articles.js';
import { UPDATE_LOG, LATEST_UPDATE } from './data/update-log.js';
import { CATEGORIES, getCategory, getSubcategory } from './data/wiki-data.js';
import { searchArticles } from './utils.js';

export const DATA_SOURCES = { MOCK: 'mock', EXCEL: 'excel' };

let activeSource = DATA_SOURCES.MOCK;

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
