// ==== UTILS: DOM, FORMATACAO E BUSCA ====


export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

export const raw = (s) => ({ v: String(s), __raw: true });

export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += values[i] ?? '';
  });
  return out;
}

export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function onClick(selector, handler, root = document) {
  root.addEventListener('click', (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}

export function countUp(el, target, { duration = 900, prefix = '', suffix = '' } = {}) {
  if (!el) return;
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = `${prefix}${Math.round(ease(p) * target).toLocaleString()}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}, ${y}`;
}

export function fmtDateShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}`;
}

export function fmtNum(n) {
  if (n == null) return '';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// ==== SUFFIXES DO JOGO (K, M, B, T, Qa, Qi, ...) ====
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De',
  'UDe', 'DDe', 'TDe', 'QaDe', 'QiDe', 'SxDe', 'SpDe', 'OcDe', 'NoDe',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
  'Tg', 'UTg', 'DTg', 'TTg', 'QaTg', 'QiTg', 'SxTg', 'SpTg', 'OcTg', 'NoTg',
  'qg', 'Uqg', 'Dqg', 'Tqg', 'Qaqg', 'Qiqg', 'Sxqg', 'Spqg', 'Ocqg', 'Noqg',
  'Qg', 'UQg', 'DQg', 'TQg', 'QaQg', 'QiQg', 'SxQg', 'SpQg', 'OcQg', 'NoQg',
  'sg', 'Usg', 'Dsg', 'Tsg', 'Qasg', 'Qisg', 'Sxsg', 'Spsg', 'Ocsg', 'Nosg',
  'Sg', 'USg', 'DSg', 'TSg', 'QaSg', 'QiSg', 'SxSg', 'SpSg', 'OcSg', 'NoSg',
  'Og', 'UOg', 'DOg', 'TOg', 'QaOg', 'QiOg', 'SxOg', 'SpOg', 'OcOg', 'NoOg',
  'Ng', 'UNg', 'DNg', 'TNg', 'QaNg', 'QiNg', 'SxNg', 'SpNg', 'OcNg', 'NoNg',
  'Ce', 'UCe',
];

export function fmtSuffix(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < 1000) {
    if (Number.isInteger(n)) return String(n);
    return String(parseFloat(n.toFixed(3)));
  }
  const tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  const str = scaled.toFixed(2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return str + SUFFIXES[tier];
}

// Formata valores que podem vir crus do data ("9,975,712" | 9975712) ou ja
// textuais ("No cap", "—", "Player's max", "∆", "1/185K"), que passam direto.
export function fmtValue(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return fmtSuffix(v);
  const s = String(v).trim();
  const bare = s.replace(/[ ,]/g, '');
  if (bare && /^-?\d+(\.\d+)?$/.test(bare)) return fmtSuffix(Number(bare));
  return s;
}

const LIVE_RE = /\b(?:Stats\.[\w.]+|TreeUpgrade\d+|ShardUpgrade\d+|LifeUpgrade\d+|FossilUpgrade\d+|OpalUpgrade\d+|CaliforniumUpgrade\d+|MiningUpgrade\d+|ResearchesUnlocked|TreeAscension|MonsterEvolution|DungeonRank|TerraformLevel|TreeTier|CaliforniumMilestone|GoldenMilestone|Barn|NeedToUnlock|Energy|Fossils|GoldBars|EmeraldCoins|SilverEnergy|GoldEnergy|DiamondEnergy|GoldenDiamond)\b/g;

function evalCondition(cond, vars) {
  try {
    return !!new Function('L', 'tier', 'N', `"use strict"; return (${cond});`)(vars.L, vars.tier, vars.N);
  } catch {
    return false;
  }
}

export function evalFormula(expr, vars = {}) {
  if (expr == null) return null;
  let s = String(expr).trim();
  if (!s || s === '-') return null;
  s = s.replace(/\(fixo\)/gi, '');
  s = s.replace(/\s*\(\+\s*\d+\s*maq\b[\s\S]*\)\s*$/i, '');
  const se = s.match(/^(.+?)\s+se\s+L\s*=\s*(-?\d+)\s*;\s*senao\s+([\s\S]+)$/i);
  if (se) return vars.L === Number(se[2]) ? evalFormula(se[1], vars) : evalFormula(se[3], vars);
  if (s.includes('|')) {
    const parts = s.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length && parts.every((p) => /^[^:]+:/.test(p))) {
      for (const part of parts) {
        const m = part.match(/^([^:]+):\s*([\s\S]+)$/);
        if (m && evalCondition(m[1], vars)) return evalFormula(m[2], vars);
      }
      return null;
    }
  }
  s = s.replace(/\s*\((?:unidade:[^)]*|segundos|cooldown|click power|auto power|unlocks)\)/gi, '');
  if (!s) return null;
  const js = s
    .replace(/\^/g, '**')
    .replace(/\bmath\.(floor|ceil|min|max|round|abs|pow)\b/gi, (m, f) => `Math.${f.toLowerCase()}`)
    .replace(/\b(floor|ceil|min|max|round|abs)\(/g, (m, f) => `Math.${f}(`)
    .replace(LIVE_RE, '0')
    .replace(/(\d+(?:\.\d+)?)e([+-]?\d+)/gi, '$1__SCI__$2')
    .replace(/(\d)\s*([A-Za-z(])/g, '$1*$2')
    .replace(/__SCI__/g, 'e');
  try {
    const v = new Function('L', 'tier', 'N', `"use strict"; return (${js});`)(vars.L || 0, vars.tier || 0, vars.N || 0);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function readMinutes(article) {
  let words = 0;
  const countText = (t) => { if (typeof t === 'string') words += t.split(/\s+/).length; };
  countText(article.description);
  (article.sections || []).forEach((s) => {
    (s.blocks || []).forEach((b) => {
      countText(b.text);
      (b.items || []).forEach((it) => countText(typeof it === 'string' ? it : it.text));
    });
  });
  return Math.max(2, Math.round(words / 180) || 2);
}

export function markMatches(text = '', query = '') {
  const safe = String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const tokens = String(query).trim().split(/\s+/).filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!tokens.length) return safe;
  const re = new RegExp(`(${tokens.join('|')})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}


import { CATEGORIES } from './data/wiki-data.js';

const CAT_NAME = new Map(CATEGORIES.flatMap((c) => [
  [c.id, c.name.toLowerCase()],
  ...c.subcategories.map((s) => [`${c.id}/${s.id}`, s.name.toLowerCase()]),
]));

function contentText(article) {
  if (article._contentText) return article._contentText;
  const parts = [];
  (article.sections || []).forEach((s) => {
    parts.push(s.title);
    (s.blocks || []).forEach((b) => {
      if (b.text) parts.push(b.text);
      (b.items || []).forEach((it) => parts.push(typeof it === 'string' ? it : it.text || ''));
      (b.rows || []).forEach((r) => parts.push(Object.values(r).filter((v) => typeof v === 'string').join(' ')));
      (b.pairs || []).forEach((pr) => parts.push(`${pr.key} ${pr.value}`));
    });
  });
  article._contentText = parts.join(' ').toLowerCase();
  return article._contentText;
}

function bestSnippet(article, tokens) {
  const text = contentText(article);
  const sentences = text.split(/(?<=[.!?])\s+/);
  let best = '', bestScore = 0;
  for (const s of sentences) {
    let score = 0;
    for (const t of tokens) if (s.includes(t)) score += 1;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (!best) best = sentences[0] || article.description || '';

  const idx = best.length && tokens.length
    ? Math.max(0, best.search(new RegExp(tokens.filter(Boolean).slice(0, 2).join('|'), 'i')))
    : 0;
  let out = best.slice(Math.max(0, idx - 40), idx + 160).trim();
  if (idx > 40) out = '…' + out;
  if (idx + 160 < best.length) out += '…';
  return out;
}

export function searchArticles(articles, query, { category = null, subcategory = null, sort = 'relevance', limit = 0 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  let results = [];
  for (const a of articles) {
    if (category && a.category !== category) continue;
    if (subcategory && a.subcategory !== subcategory) continue;

    const title = a.title.toLowerCase();
    const desc = (a.description || '').toLowerCase();
    const keywords = (a.keywords || []).join(' ').toLowerCase();
    const content = contentText(a);
    const catName = CAT_NAME.get(a.category) || '';
    const subName = CAT_NAME.get(`${a.category}/${a.subcategory}`) || '';

    let score = 0;

    if (title === q) score += 120;
    else if (title.includes(q)) score += 60;
    for (const t of tokens) if (title.includes(t)) score += 14;

    if (keywords.includes(q)) score += 30;
    for (const t of tokens) if (keywords.includes(t)) score += 9;

    if (desc.includes(q)) score += 22;
    for (const t of tokens) if (desc.includes(t)) score += 6;

    if (catName.includes(q)) score += 8;
    if (subName.includes(q)) score += 10;

    let contentHits = 0;
    for (const t of tokens) if (content.includes(t)) contentHits += 1;
    score += Math.min(contentHits, 4) * 2;
    if (content.includes(q)) score += 4;

    if (score > 0) {
      results.push({ article: a, score, snippet: bestSnippet(a, tokens) });
    }
  }

  results.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    return y.article.views - x.article.views;
  });

  if (sort === 'updated') {
    results.sort((x, y) => y.score - x.score);
    results.sort((x, y) => y.article.updated.localeCompare(x.article.updated));
  } else if (sort === 'title') {
    results.sort((x, y) => y.score - x.score);
    results.sort((x, y) => x.article.title.localeCompare(y.article.title));
  }

  return limit ? results.slice(0, limit) : results;
}

export function groupByCategory(results) {
  const groups = new Map();
  for (const r of results) {
    const id = r.article.category;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  }
  return groups;
}

// Busca tambem nas PAGINAS (categorias, subsecoes e sub-subs), nao so artigos
export function searchPages(query, { limit = 0 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = [];
  for (const c of CATEGORIES) {
    for (const s of c.subcategories) {
      for (const sub of [s, ...(s.children || [])]) {
        const name = sub.name.toLowerCase();
        const blurb = (sub.desc || '').toLowerCase();
        let score = 0;
        if (name === q) score += 100;
        else if (name.includes(q)) score += 50;
        for (const t of tokens) if (name.includes(t)) score += 12;
        if (blurb.includes(q)) score += 15;
        for (const t of tokens) if (blurb.includes(t)) score += 4;
        if (c.name.toLowerCase().includes(q)) score += 3;
        if (score > 0) results.push({ cat: c, sub, score });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  return limit ? results.slice(0, limit) : results;
}
