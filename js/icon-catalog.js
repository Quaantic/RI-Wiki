import { LUCIDE_ICONS } from './lib/lucide-data.js';
import { GAME_ICON_NAMES, FEATURED_GAME_COUNT } from './lib/game-icon-names.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_:]+/g, ' ').trim();
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
const catalog=[...GAME_ICON_NAMES.map(name=>({id:`game-icons:${name}`,name,source:'game'})),...orderedLucide.map(name=>({id:name,name,source:'lucide'}))]
  .map(entry=>({...entry,words:normalize(entry.name)}));

export function searchIcons(query='', source='all') {
  const text=normalize(query), terms=text.split(/\s+/).filter(Boolean);
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
