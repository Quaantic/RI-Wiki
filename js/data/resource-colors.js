// ==== CORES DOS RECURSOS (EDITE AQUI) ====

export const RESOURCE_COLORS = {
  'Diamond Apples': '#00A9FF',
  'Prestige': '#42C5FF',
  'Magnets': '#D71920',
  'Golden Apples': '#E7B52A',
  'Dark Crystals': '#8D258F',
  'Silver Energy': '#D9D9D9',
  'Crystal Shards': '#D58BFF',
  'Ruby Energy': '#FF4B1C',
  'Diamond Energy': '#00CFFF',
  'Eternal Shards': '#A34BFF',
  'Roots': '#8499A9',
  'Dust': '#B69A72',
  'Bone Dust': '#B69A72',
  'Coins': '#FFD91A',
  'Mining Damage': '#B0B0B0',
  'Health': '#64D75B',
  'Quartz': '#B8D6E8',
  'Gears': '#B7B7B7',
  'Automation': '#84ffa3',
  'Life Island': '#27e70e',
  'Life Generation': '#f70606',  
  'Money': '#5CCB65',
  'Sap': '#F4A51C',
  'Energy': '#B04AFF',
  'Stone': '#A8A8A8',
  'Emerald Coins': '#26D86B',
  'Tree': '#f7750b',  
  'Bluesteel': '#78B8FF',
  'Jewels': '#A64BFF',
  'Void Apples': '#8A00FF',
  'Adamantium': '#D9D9D9',
  'Frost': '#8BEFFF',
  'Strength': '#D52B1E',
  'Platinum': '#D0D0D0',
  'Golden Research': '#FFD34D',
  'Crystal': '#C69AFF',
  'Energy Shard': '#C69AFF',
  'Souls': '#A347D9',
  'Golden Diamond': '#FFD84A',
  'Ores': '#F2D3A0',
  'Life Shards': '#39D878',
  'Life': '#54f708',  
  'Terraform': '#08f586',  
  'Gold Bars': '#FFD34D',
  'Log': '#A9825A',
  'Apples': '#F51F24',
  'Level Perks': '#4DAAFF',
  'Gemstone': '#36CFFF',
  'Dark Liquid': '#353535',
  'Californium': '#FF9B16',
  'Crystal Perks': '#B94DFF',
  'Life Gems': '#71E8C2',
  'Opal': '#E8C8F5',
  'Barn': '#ff03ff',
  'Fossil': '#C6B58B',
  'Bones': '#F0E6CB',
  'Research': '#8BC5E8',
  'Gold Energy': '#FF8A00',
  'Red Liquid': '#E52A20',
  'Perks': '#40A8F5',
  'Log Perks': '#D18864',
  'Sap Perks': '#F7932F',
  'Crystal Perks': '#A33CF0',
  'Mine Perks': '#D0D0D0',
  'Rune Bulk': '#56A0B8',
  'Rune Luck': '#7A63A2',
  'Perks': '#6CA4FF',
  'Cells': '#CB3838',
  'Glacier': '#BDEDFF',
  'Magma': '#BE2525',
  'Plasma': '#B479F8',
  'Elementium': '#F8D4FF',
  'Coal': '#4F4F4F',
  'Tin': '#E3E3E3',
  'Copper': '#FFCA94',
  'Iron': '#F8E3C8',
  'Silver': '#DEDEDE',
  'Gold': '#FFD581',
  'Topaz': '#FFDE8A',
  'Sapphire': '#81B1DF',
  'Ruby': '#D34141',
  'Emerald': '#60B85B',
  'Azurite': '#6F92D4',
  'Drop Luck': '#6F92D4',
  'Diamond': '#8FDDFF',
  'Tanzanite': '#897CC6',
  'Uranium': '#78B16F',
  'Plutonium': '#9DDFCF',
  'Onyx': '#A53A3A',
  'Garnet': '#CB3131',
  'Neptunium': '#D5FEFF',
  'Osmium': '#C3C3C3',
  'Rune Stone': '#CCB8FF',
  'Energy Shards': '#CF99FF',
  'Mastery': '#45A1F1',
  'Depth': '#DADADA',
  'Time': '#D9EFFC',
  'Log Perks': '#A6936E',
  'Sap Perks': '#FFCD93',
  'Red Perks': '#B64242',
  'Monster Perks': '#B64242',
  'Mine Perks': '#B3B3B3',
  'Merge Perks': '#2BACFD',
  'Mithril': '#3666B4',
  'Painite': '#D762FE',
  'Spent': '#FFFAC5',
  'Runes': '#e3194b',
'Energetic': '#b103fc',
'Sky': '#75edff',
'Riches': '#ffe100',
'Earth': '#626363',
'Advanced': '#440069',
'Monster': '#85000d',
'Mining': '#dedede',
'Merge': '#0000ff',
'Stages': '#0fbd63',
'Upgrade Tree': '#0dff00',
'Main': '#7400a6',
'Layers (Depth)': '#c5c7d1',
'Upgrades': '#2bde07',
'Dungeons': '#994cfd',
'Training': '#870404',
'Enemy': '#dba9eb',
'Sword': '#968d99',
'Shield': '#9db0a0',
'Item': '#2f8099',
'Dungeon Level': '#490382',
'Neptunium': '#D5FEFF',
};

const VARIANTS = new Map();
for (const [name, color] of Object.entries(RESOURCE_COLORS)) {
  const add = (v) => {
    if (v && v.length >= 2 && !VARIANTS.has(v)) VARIANTS.set(v, color);
  };
  add(name);
  add(`${name}s`);
  add(`${name}es`);
  if (name.endsWith('es')) add(name.slice(0, -2));
  if (name.endsWith('s')) add(name.slice(0, -1));
}

const VARIANTS_PATTERN = [...VARIANTS.keys()]
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RE = new RegExp(`(?<![A-Za-z0-9])(${VARIANTS_PATTERN.join('|')})(?![A-Za-z0-9])`, 'gi');

// ==== SMART REFERENCES (EDITE AQUI) ====
// Todo texto colorido cujo nome estiver nesta tabela vira um LINK para a pagina.
// Chave = nome do recurso/pagina (minusculo, sem acento). Valor = rota do site.
const PAGE_LINKS = {
  'main': '#/main',
  'stages': '#/main/stages',
  'energy': '#/main/energy',
  'gears': '#/main/gears',
  'crystals': '#/main/crystals',
  'barn': '#/main/barn',
  'merge': '#/main/merge',
  'machines': '#/main/machines',
  'factory': '#/main/factory',
  'crystal': '#/main/crystal',
  'jewels': '#/main/jewels',
  'platinum': '#/main/platinum',
  'adamantium': '#/main/adamantium',
  'californium': '#/main/californium',
  'crystal shards': '#/main/crystal-shards',
  'crystal perks': '#/main/crystal-perks',
  'opal': '#/main/opal',
  'quartz': '#/main/quartz',
  'bluesteel': '#/main/bluesteel',
  'magnets': '#/main/magnets',
  'life island': '#/life',
  'life shards': '#/life/life-shards',
  'fossils': '#/life/fossil',
  'research': '#/life/research',
  'golden research': '#/life/golden-research',
  'logs': '#/life/logs',
  'sap': '#/life/sap',
  'roots': '#/life/roots',
  'apples': '#/life/apples',
  'life gems': '#/life/life-gems',
  'terraform': '#/life/terraforming',
  'monster': '#/life/monster',
  'red liquid': '#/life/red-liquid',
  'sacrifice': '#/life/sacrifice',
  'dark liquid': '#/life/dark-liquid',
  'frost': '#/life/frost',
  'mining': '#/mining/ores',
  'ores': '#/mining/ores',
  'mastery': '#/mining/mastery',
  'layers': '#/mining/layers',
  'training': '#/dungeon/training',
  'ranks': '#/dungeon/ranks',
  'bones': '#/dungeon/bones',
  'coins': '#/dungeon/coins',
  'bone dust': '#/dungeon/bone-dust',
  'items': '#/dungeon/items',
  'swords': '#/dungeon/swords',
  'sword': '#/dungeon/swords',
  'shield': '#/dungeon/shield',
  'souls': '#/dungeon/souls',
  'dungeon level': '#/dungeon/dungeon-level',
  'gold bars': '#/money-island/gold-bars',
  'emeralds': '#/money-island/emeralds',
  'emerald coins': '#/money-island/emeralds',
  'golden diamond': '#/money-island/golden-diamond',
  'golden diamond': '#/money-island/golden-diamond',
  'ascensions': '#/money-island/ascensions',
  'money island': '#/money-island',
  'perks': '#/perks/perk',
  'runes': '#/runes/money',
  'log perks': '#/perks/log',
  'sap perks': '#/perks/sap',
  'monster perks': '#/perks/monster',
  'mine perks': '#/perks/mining',
  'merge perks': '#/perks/merge',
  'gold upgrades': '#/money-island/gold-upgrades',
  'terraforming': '#/life/terraforming',
  'life': '#/life',
  'money': '#/money-island',
};

const PAGE_LINKS_LOWER = new Map(Object.entries(PAGE_LINKS).map(([k, v]) => [k.toLowerCase(), v]));

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
  return currentPageNames().some((n) => n === matchLower || n.includes(matchLower) || matchLower.includes(n));
}
const VARIANTS_LOWER = new Map([...VARIANTS].map(([k, v]) => [k.toLowerCase(), v]));

export function colorizeResources(escapedText = '') {
  if (!escapedText) return '';
  return escapedText.replace(RE, (m) => {
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
