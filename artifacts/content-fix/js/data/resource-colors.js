// Resource names and their colors are loaded from content/game-data.json.

import { formatNumericText } from '../utils.js';

export const RESOURCE_COLORS = {};
export const PAGE_LINKS = {};
let VARIANTS_LOWER = new Map();
let resourcePattern = /$^/;
let PAGE_LINKS_LOWER = new Map();

export function setResourceColors(colors, links) {
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  if (!isRecord(colors) || !isRecord(links)) {
    throw new Error('[content] Resource colors and page links must be objects.');
  }
  for (const [name, color] of Object.entries(colors)) {
    if (!name.trim() || ['__proto__', 'constructor', 'prototype'].includes(name)
      || typeof color !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) {
      throw new Error(`[content] Resource color "${name}" has an invalid name or color.`);
    }
  }
  for (const [name, route] of Object.entries(links)) {
    if (!name.trim() || ['__proto__', 'constructor', 'prototype'].includes(name)
      || typeof route !== 'string' || !/^#\/[\w-]+(?:\/[\w-]+)*$/.test(route)) {
      throw new Error(`[content] Resource page link "${name}" has an invalid name or route.`);
    }
  }
  for (const key of Object.keys(RESOURCE_COLORS)) delete RESOURCE_COLORS[key];
  for (const key of Object.keys(PAGE_LINKS)) delete PAGE_LINKS[key];
  for (const [name, color] of Object.entries(colors)) RESOURCE_COLORS[name] = color;
  for (const [name, route] of Object.entries(links)) PAGE_LINKS[name] = route;
  PAGE_LINKS_LOWER = new Map(Object.entries(PAGE_LINKS).map(([key, route]) => [key.toLowerCase(), route]));
  const variants = new Map();
  for (const [name, color] of Object.entries(RESOURCE_COLORS)) {
    const add = (variant) => {
      const lower = variant.toLowerCase();
      if (variant.length >= 2 && !variants.has(lower)) variants.set(lower, color);
    };
    add(name);
    add(`${name}s`);
    add(`${name}es`);
    if (name.endsWith('es')) add(name.slice(0, -2));
    if (name.endsWith('s')) add(name.slice(0, -1));
  }
  VARIANTS_LOWER = variants;
  const pattern = [...variants.keys()]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  resourcePattern = pattern.length ? new RegExp(`(?<![A-Za-z0-9])(${pattern.join('|')})(?![A-Za-z0-9])`, 'gi') : /$^/;
}

function pageHrefFor(matchLower) {
  if (PAGE_LINKS_LOWER.has(matchLower)) return PAGE_LINKS_LOWER.get(matchLower);
  const alt = [matchLower + 's', matchLower + 'es', matchLower.endsWith('s') ? matchLower.slice(0, -1) : '', matchLower.endsWith('es') ? matchLower.slice(0, -2) : ''].filter(Boolean);
  for (const a of alt) if (PAGE_LINKS_LOWER.has(a)) return PAGE_LINKS_LOWER.get(a);
  return null;
}

// Nomes da pagina atual: o guard evita link para a propria pagina
function currentPageNames() {
  return (globalThis.__riPageNames || []).map((n) => n.toLowerCase());
}

function isCurrentPage(matchLower) {
  const href = pageHrefFor(matchLower);
  const currentRoute = globalThis.location?.hash;
  if (href && currentRoute) return currentRoute === href;
  return currentPageNames().some((name) => name === matchLower);
}
export function colorizeResources(escapedText = '') {
  if (!escapedText) return '';
  return formatNumericText(escapedText).replace(resourcePattern, (m) => {
  const lower = m.toLowerCase();
  const color = VARIANTS_LOWER.get(lower) || '#fff';
  if (!isCurrentPage(lower)) {
    const href = pageHrefFor(lower);
    if (href) return `<span class="res res--link" data-href="${href}" style="color:${color}">${m}</span>`;
  }
  return `<span class="res" style="color:${color}">${m}</span>`;
});
}

// Cor direta de um nome (para icones, pontos do sidebar, etc). Null se nao tem.
export function resourceColor(name = '') {
  return VARIANTS_LOWER.get(String(name).trim().toLowerCase()) || null;
}
