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
const SUFFIX_INDEX = new Map(SUFFIXES.flatMap((suffix, index) => suffix ? [[suffix.toLowerCase(), index]] : []));

function scientificNotationEnabled() {
  try {
    return localStorage.getItem('ri-scientific') === '1';
  } catch {
    return false;
  }
}

function formatScientific(n) {
  return n.toExponential(2)
    .replace(/(\.\d*?[1-9])0+e/, '$1e')
    .replace(/\.0+e/, 'e')
    .replace(/e([+-])0+(\d+)/, 'e$1$2')
    .replace(/e\+/, 'e');
}

function formatPlainDecimal(n, fractionDigits) {
  if (Math.abs(n) >= 1e21) {
    return new Intl.NumberFormat('en-US', {
      notation: 'standard',
      useGrouping: false,
      maximumFractionDigits: fractionDigits,
    }).format(n);
  }
  return n.toFixed(fractionDigits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function expandScientificNotation(text) {
  const match = String(text).match(/^([+-]?)(\d*\.?\d+)e([+-]?\d+)$/i);
  if (!match) return text;
  const [, sign, coefficient, exponentText] = match;
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return text;

  const point = coefficient.indexOf('.') < 0 ? coefficient.length : coefficient.indexOf('.');
  const digits = coefficient.replace('.', '');
  const shiftedPoint = point + exponent;
  if (shiftedPoint <= 0) return `${sign}0.${'0'.repeat(-shiftedPoint)}${digits}`;
  if (shiftedPoint >= digits.length) return `${sign}${digits}${'0'.repeat(shiftedPoint - digits.length)}`;
  return `${sign}${digits.slice(0, shiftedPoint)}.${digits.slice(shiftedPoint)}`;
}

export function parseGameNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim().replace(/,/g, '');
  if (!text) return null;
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return numeric;
  const match = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([a-z]+)$/i);
  if (!match) return null;
  const tier = SUFFIX_INDEX.get(match[2].toLowerCase());
  return tier == null ? null : Number(match[1]) * 1000 ** tier;
}

export function formatNumericText(text = '') {
  return String(text).replace(/(?<![A-Za-z0-9_.])[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+|[a-z]+)?(?![A-Za-z0-9_.])/gi, (token) => {
    const value = parseGameNumber(token);
    if (value == null) return token;
    if (/e/i.test(token) && Math.abs(value) < 1000) {
      return scientificNotationEnabled() ? token : expandScientificNotation(token);
    }
    return fmtSuffix(value);
  });
}

export function fmtSuffix(n) {
  if (!Number.isFinite(n)) return String(n);
  if (scientificNotationEnabled() && Math.abs(n) >= 1000) return formatScientific(n);
  if (Math.abs(n) < 1000) {
    if (Number.isInteger(n)) return String(n);
    return String(parseFloat(n.toFixed(3)));
  }
  const tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), SUFFIXES.length - 1);
  const scaled = n / Math.pow(1000, tier);
  const str = formatPlainDecimal(scaled, 2);
  return str + SUFFIXES[tier];
}

// Formata valores que podem vir crus do data ("9,975,712" | 9975712) ou ja
// textuais ("No cap", "—", "Player's max", "∆", "1/185K"), que passam direto.
export function fmtValue(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return fmtSuffix(v);
  const s = String(v).trim();
  const number = parseGameNumber(s);
  if (number != null) {
    if (/e/i.test(s) && Math.abs(number) < 1000) {
      return scientificNotationEnabled() ? s : expandScientificNotation(s);
    }
    return fmtSuffix(number);
  }
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
  s = s.replace(/(?<![A-Za-z0-9_.])([+-]?(?:\d+(?:\.\d*)?|\.\d+))([a-z]+)(?![A-Za-z0-9_.])/gi, (token, amount, suffix) => {
    const value = parseGameNumber(`${amount}${suffix}`);
    return value == null ? token : `(${value})`;
  });
  const js = s
    .replace(/\^/g, '**')
    .replace(/\bmath\.(floor|ceil|min|max|round|abs|pow)\b/gi, (m, f) => `Math.${f.toLowerCase()}`)
    .replace(/(?<![\w.])(floor|ceil|min|max|round|abs)\(/g, (m, f) => `Math.${f}(`)
    .replace(/\b(TreeUpgrade\d+)\b/g, (name) => String(Number(vars[name]) || 0))
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
import { getInlineUpgradePages } from './data/formulas.js';

export function searchPages(query, { limit = 0, category = null } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = [];
  const scoreItem = (name, description, categoryName = '') => {
    const title = String(name || '').toLowerCase();
    const content = String(description || '').toLowerCase();
    let score = title === q ? 100 : title.includes(q) ? 50 : 0;
    for (const token of tokens) {
      if (title.includes(token)) score += 12;
      if (content.includes(token)) score += 4;
    }
    if (content.includes(q)) score += 15;
    if (categoryName.toLowerCase().includes(q)) score += 3;
    return score;
  };
  const searchableText = (item) => [
    item.desc,
    item.tagline,
    item.overview?.desc,
    ...(item.highlights || []).flatMap((highlight) => [highlight.title, highlight.text]),
    ...(item.facts || []).flatMap((fact) => [fact.label, fact.value]),
    ...(item.vitals || []).flatMap((vital) => [vital.label, vital.value]),
  ].filter(Boolean).join(' ');

  for (const c of CATEGORIES) {
    if (category && c.id !== category) continue;
    const categoryScore = scoreItem(c.name, searchableText(c));
    if (categoryScore) results.push({ cat: c, sub: c, score: categoryScore, href: `#/${c.id}`, kind: 'category' });
    const visit = (pages) => {
      for (const sub of pages || []) {
        const score = scoreItem(sub.name, searchableText(sub), c.name);
        if (score) results.push({ cat: c, sub, score, href: `#/${c.id}/${sub.id}`, kind: 'page' });
        const inlineIds = new Set(getInlineUpgradePages(c.id, sub).map(({ child }) => child.id));
        visit((sub.children || []).filter((child) => !inlineIds.has(child.id)));
      }
    };
    visit(c.subcategories);
  }
  results.sort((a, b) => b.score - a.score || a.sub.name.localeCompare(b.sub.name));
  return limit ? results.slice(0, limit) : results;
}
