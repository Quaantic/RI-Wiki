import { LUCIDE_ICONS } from './lib/lucide-data.js';
import { GAME_ICON_NAMES, FEATURED_GAME_COUNT } from './lib/game-icon-names.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_:]+/g, ' ').trim();
let localPaths = new Set();
const iconNameKey = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
let automaticNames = new Map();
let localEntries = [];
let pendingLoad = null;
let lastLoadSucceeded = false;
const validPath = path => /^images\/icons\/custom\/(?:[\w .-]+\/)*[\w .-]+\.(?:svg|png|webp)$/i.test(path)
  && !path.split('/').includes('..');
function applyIcons(files) {
  const paths = [...new Set(files.filter(value => typeof value === 'string' && validPath(value)))].sort();
  localPaths = new Set(paths);
  automaticNames = new Map();
  const readable = value => value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  localEntries = paths.map(id => {
    const parts = id.split('/').slice(3);
    const basename = parts.at(-1).replace(/\.(svg|png|webp)$/i, '');
    const key = iconNameKey(basename);
    if (key) automaticNames.set(key, automaticNames.has(key) ? null : id);
    const name = readable(basename), group = parts.slice(0,-1).map(readable).join(' / ');
    return { id, name, group, source:'local', words:normalize(name+' '+group) };
  });
}
// The source of truth is always images/icons/custom. No hand-maintained list.
// On Vercel / local Node preview, /api/icons reads that directory on request.
// Plain static hosts need the bundled Node preview or the Vercel API.
export async function refreshLocalIcons() {
  if (pendingLoad) return pendingLoad;
  pendingLoad = (async () => {
    for (const path of ['api/icons','content/custom-icon-index.json']) {
      try {
        const url = new URL('../' + path, import.meta.url);
        url.searchParams.set('_', String(Date.now()));
        const response = await fetch(url, { cache:'no-store', headers:{ Accept:'application/json' }, signal:AbortSignal.timeout(3500) });
        if (!response.ok || !response.headers.get('content-type')?.includes('json')) continue;
        const files = await response.json();
        if (!Array.isArray(files)) continue;
        applyIcons(files);
        lastLoadSucceeded = true;
        return localPaths.size;
      } catch { /* static-only preview or network unavailable */ }
    }
    lastLoadSucceeded = false;
    return localPaths.size;
  })();
  try { return await pendingLoad; } finally { pendingLoad = null; }
}
let nameRules = new Map();
export function setIconNameRules(rules) {
  nameRules = new Map((Array.isArray(rules) ? rules : [])
    .filter(rule => rule && rule.name?.trim() && rule.icon?.trim())
    .map(rule => [iconNameKey(rule.name), rule.icon]));
}
export function namedIconReference(name, fallback = '') {
  const key = iconNameKey(name);
  if (nameRules.has(key)) return nameRules.get(key);
  // 'Life Shards' can use the 'LifeShard.svg' source without a manually
  // entered mapping; explicit plural filenames always take precedence.
  const auto = automaticNames.get(key);
  if (auto) return auto;
  if (!automaticNames.has(key) && key.endsWith('s')) {
    const singular = automaticNames.get(key.slice(0, -1));
    if (singular) return singular;
  }
  return fallback || '';
}
export function namedIconRuleCount() { return nameRules.size; }

export function localIconReference(value) {
  const id = String(value || '').trim();
  return (localPaths.has(id) || validPath(id)) ? id : null;
}
export function iconAssetURL(path) {
  return new URL(`../${validPath(path) ? path.split('/').map(encodeURIComponent).join('/') : path}`, import.meta.url).href;
}

const gameIndex = new Map(GAME_ICON_NAMES.map((name,index)=>[name,index]));
export function gameIconReference(value) {
  const name = String(value || '').trim().toLowerCase().replace(/^game-icons:/,'');
  const index = gameIndex.get(name);
  if (index === undefined || !String(value).trim().toLowerCase().startsWith('game-icons:')) return null;
  const bucket = index < FEATURED_GAME_COUNT ? 0 : 1 + Math.floor((index-FEATURED_GAME_COUNT)/128);
  return `images/icons/game-icons/${bucket}.svg#${name}`;
}

// Search vocabulary only. All artwork comes from the original libraries.
const groups = [
  'fire flame burning burn flames fogo chama incendio',
  'ice snow frost frozen cold gelo neve frio',
  'water drop droplet agua gota',
  'lightning bolt zap thunder electric energy raio relampago eletrico energia',
  'gem crystal diamond emerald ruby gemstone pedra cristal diamante esmeralda rubi',
  'coin coins money gold cash currency moeda moedas dinheiro ouro',
  'mining miner pickaxe ore mineral minerio mineracao picareta',
  'wood log logs tree forest madeira tronco arvore floresta',
  'leaf leaves plant sprout seed nature folha folhas planta semente natureza',
  'apple fruit maca fruta', 'potion flask bottle elixir pocao frasco garrafa',
  'sword blade weapon dagger espada lamina arma adaga',
  'shield armor defence defense escudo armadura defesa',
  'monster creature beast demon monstro criatura besta demonio',
  'dragon drake dragao', 'heart health life heal coracao vida cura',
  'skull death bone caveira morte osso', 'magic spell wizard wand magia feitico mago varinha',
  'book books research science livro livros pesquisa ciencia',
  'gear gears cog settings engrenagem engrenagens configuracao',
  'upgrade level rank arrow up melhoria nivel subir',
  'chest treasure loot bau tesouro recompensa', 'star stars estrela estrelas',
  'rune runes runa runas', 'magnet magnets ima imas',
];
const synonyms = new Map();
for (const group of groups) {
  const words=group.split(' ');
  for (const word of words) synonyms.set(word,words);
}
const lucideFeatured=['flame','snowflake','gem','coins','pickaxe','trees','sprout','apple','sword','shield','heart','flask-conical','sparkles','book-open','settings','trophy'];
const lucideNames=Object.keys(LUCIDE_ICONS);
const orderedLucide=[...lucideFeatured.filter(name=>LUCIDE_ICONS[name]),...lucideNames.filter(name=>!lucideFeatured.includes(name))];
const legacyEntries=[...GAME_ICON_NAMES.map(name=>({id:`game-icons:${name}`,name,source:'game'})),
  ...orderedLucide.map(name=>({id:name,name,source:'lucide'}))].map(entry=>({...entry,words:normalize(entry.name)}));
export function customIconEntries() { return localEntries; }
export function customIconsAvailable() { return lastLoadSucceeded; }
export function searchIcons(query='', source='all') {
  const text=normalize(query), terms=text.split(/\s+/).filter(Boolean);
  const catalog = source==='local' ? localEntries : source==='game' ? legacyEntries.filter(entry=>entry.source==='game')
    : source==='lucide' ? legacyEntries.filter(entry=>entry.source==='lucide') : [...localEntries,...legacyEntries];
  return catalog.filter(entry=>source==='all'||entry.source===source)
    .map((entry,index)=>{
      if(!terms.length) return {entry,score:0,index};
      // Partial typing matches the query itself. Synonyms match whole words so
      // Portuguese "arma" doesn't accidentally return "armadillo".
      if(!terms.every(term=>entry.words.includes(term) || (synonyms.get(term)||[]).some(word=>entry.words.split(' ').includes(word)))) return null;
      const score=entry.words===text?100:entry.words.startsWith(text)?80:entry.words.includes(text)?60:20;
      return {entry,score,index};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(({entry})=>entry);
}
