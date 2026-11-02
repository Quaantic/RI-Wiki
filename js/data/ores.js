// ==== MINING: ORES, MASTERY E LAYERS (EDITE AQUI) ====
// Tudo da categoria Mining fica neste arquivo:
//
//   ORE_DATA     -> aba "Ores":    cada ore com depth, luck (onde pegar)
//   MASTERY_DATA -> aba "Mastery": upgrades de cada ore
//                   { effect: '25x Coal', cap: 124800 }   -> cap = valor onde o upgrade capa
//                   { effect: 'Uncapped Energy', req: 15 } -> req = quando deixa de ser 1x
//   LAYER_DATA   -> aba "Layers":  as camadas da mina e os ores de cada uma
//
// Numeros crus (o site formata com sufixos K/M/B/T/Qa sozinho).
// As cores dos ores sao usadas nos chips da aba Layers e nos cards.

export const ORE_DATA = {
  'mining/ores': {
    ores: [
      { id: 'coal', name: 'Coal', icon: 'ingot', color: '#8D8D8D', depth: 0, luck: 1 },
      { id: 'tin', name: 'Tin', icon: 'ingot', color: '#B8C4CE', depth: 0, luck: 4 },
      { id: 'copper', name: 'Copper', icon: 'ingot', color: '#E08D57', depth: 0, luck: 'max' },
      { id: 'iron', name: 'Iron', icon: 'ingot', color: '#D8A890', depth: 325, luck: 1 },
      { id: 'silver', name: 'Silver', icon: 'ingot', color: '#E6E6E6', depth: 20, luck: 60 },
      { id: 'gold', name: 'Gold', icon: 'ingot', color: '#FFD34D', depth: 20, luck: 'max' },
      { id: 'topaz', name: 'Topaz', icon: 'gem', color: '#E8B84A', depth: 125, luck: 180 },
      { id: 'sapphire', name: 'Sapphire', icon: 'gem', color: '#4A90E2', depth: 125, luck: 'max' },
      { id: 'ruby', name: 'Ruby', icon: 'gem', color: '#FF4B4B', depth: 5000, luck: 32 },
      { id: 'emerald', name: 'Emerald', icon: 'gem', color: '#26D86B', depth: 600, luck: 'max' },
      { id: 'azurite', name: 'Azurite', icon: 'gem', color: '#4A7FE0', depth: 5000, luck: 145 },
      { id: 'diamond', name: 'Diamond', icon: 'diamond', color: '#7DE8FF', depth: 5000, luck: 550 },
      { id: 'tanzanite', name: 'Tanzanite', icon: 'gem', color: '#9A5CE0', depth: 7500, luck: 'max' },
      { id: 'plutonium', name: 'Plutonium', icon: 'hexagon', color: '#7DFF4A', depth: 7500, luck: 205 },
      { id: 'uranium', name: 'Uranium', icon: 'hexagon', color: '#5CE87D', depth: 27500, luck: 1 },
      { id: 'onyx', name: 'Onyx', icon: 'gem', color: '#6E6E8A', depth: 52500, luck: 30 },
      { id: 'garnet', name: 'Garnet', icon: 'gem', color: '#C43A4A', depth: 27500, luck: 'max' },
      { id: 'neptunium', name: 'Neptunium', icon: 'hexagon', color: '#4AE0C4', depth: 150000, luck: 'max' },
      { id: 'osmium', name: 'Osmium', icon: 'ingot', color: '#9AA8C4', depth: 4500000, luck: 'max' },
      { id: 'mithril', name: 'Mithril', icon: 'ingot', color: '#7DD4E8', depth: 6250000, luck: 'max' },
      { id: 'painite', name: 'Painite', icon: 'gem', color: '#E84A7D', depth: 6250000, luck: 'max' },
      { id: 'asteroid', name: 'Asteroid', icon: 'spark', color: '#B8926A', depth: 50000000, luck: 1 },
      { id: 'meteorite', name: 'Meteorite', icon: 'spark', color: '#A0A0B0', depth: 250000000, luck: 1 },
      { id: 'cobalt', name: 'Cobalt', icon: 'ingot', color: '#4A6FE8', depth: 250000000, luck: 'max' },
      { id: 'amber', name: 'Amber', icon: 'gem', color: '#E8A02A', depth: 250000000, luck: 'max' },
      { id: 'amethyst', name: 'Amethyst', icon: 'gem', color: '#B04AE8', depth: 250000000, luck: 'max' },
    ],
  },
};

export const MASTERY_DATA = {
  'mining/mastery': {
    ores: [
      { id: 'coal', name: 'Coal', icon: 'ingot', color: '#8D8D8D',
        upgrades: [
          { effect: '25x Coal', cap: 124800 },
          { effect: 'Energy', req: 15 },
          { effect: 'Prestige', req: 75 },
        ] },
      { id: 'tin', name: 'Tin', icon: 'ingot', color: '#B8C4CE',
        upgrades: [
          { effect: '25x Tin', cap: 124800 },
          { effect: 'Damage', req: 10 },
          { effect: 'Stone', req: 100 },
        ] },
      { id: 'copper', name: 'Copper', icon: 'ingot', color: '#E08D57',
        upgrades: [
          { effect: '25x Copper', cap: 124800 },
          { effect: '1.5x Ores', req: 25 },
          { effect: 'Mastery', req: 65 },
        ] },
      { id: 'iron', name: 'Iron', icon: 'ingot', color: '#D8A890',
        upgrades: [
          { effect: '25x Iron', cap: 124800 },
          { effect: 'Damage', req: 35 },
          { effect: 'Depth', req: 75 },
        ] },
      { id: 'silver', name: 'Silver', icon: 'ingot', color: '#E6E6E6',
        upgrades: [
          { effect: '25x Silver', cap: 124800 },
          { effect: 'Forge Quality', req: 20 },
          { effect: 'Silver E.', req: 50 },
        ] },
      { id: 'gold', name: 'Gold', icon: 'ingot', color: '#FFD34D',
        upgrades: [
          { effect: '25x Gold', cap: 124800 },
          { effect: '1.75x Ores', req: 15 },
          { effect: 'Gold Bars', req: 60 },
        ] },
      { id: 'sapphire', name: 'Sapphire', icon: 'gem', color: '#4A90E2',
        upgrades: [
          { effect: '25x Sapphire', cap: 124800 },
          { effect: 'Mine XP', req: 5 },
          { effect: 'Mine Perks', req: 35 },
        ] },
      { id: 'ruby', name: 'Ruby', icon: 'gem', color: '#FF4B4B',
        upgrades: [
          { effect: '25x Ruby', cap: 124800 },
          { effect: '100x Crit%', cap: 5000 },
          { effect: 'Crit Dmg', req: 45, note: 'mult base 5x' },
        ] },
      { id: 'emerald', name: 'Emerald', icon: 'gem', color: '#26D86B',
        upgrades: [
          { effect: '25x Emerald', cap: 124800 },
          { effect: 'Money', req: 5 },
          { effect: 'Emerald Coins', req: 25 },
        ] },
      { id: 'azurite', name: 'Azurite', icon: 'gem', color: '#4A7FE0',
        upgrades: [
          { effect: '25x Azurite', cap: 124800 },
          { effect: 'Crystal Shards', req: 15 },
          { effect: '10x Ore Luck', cap: 87100 },
        ] },
      { id: 'diamond', name: 'Diamond', icon: 'diamond', color: '#7DE8FF',
        upgrades: [
          { effect: '25x Diamond', cap: 124800 },
          { effect: '1.5x Ores', req: 5 },
          { effect: 'Energy Shard', req: 50 },
        ] },
      { id: 'tanzanite', name: 'Tanzanite', icon: 'gem', color: '#9A5CE0',
        upgrades: [
          { effect: '25x Tanzanite', cap: 124800 },
          { effect: '2x Rune Luck', req: 15 },
          { effect: '3x Rune Bulk', cap: 1600 },
        ] },
      { id: 'plutonium', name: 'Plutonium', icon: 'hexagon', color: '#7DFF4A',
        upgrades: [
          { effect: '25x Plutonium', cap: 124800 },
          { effect: '2x Damage', req: 30 },
          { effect: '5x Forge Quality', cap: 5100 },
        ] },
      { id: 'uranium', name: 'Uranium', icon: 'hexagon', color: '#5CE87D',
        upgrades: [
          { effect: '25x Uranium', cap: 124800 },
          { effect: '10x Depth', cap: 4327 },
          { effect: '5x Forge Time', cap: 1200 },
        ] },
      { id: 'onyx', name: 'Onyx', icon: 'gem', color: '#6E6E8A',
        upgrades: [
          { effect: '25x Onyx', cap: 124800 },
          { effect: '4x Tier Speed', cap: 413353 },
          { effect: 'Mine Perks', req: 100 },
        ] },
      { id: 'garnet', name: 'Garnet', icon: 'gem', color: '#C43A4A',
        upgrades: [
          { effect: '25x Garnet', cap: 124800 },
          { effect: 'Research', req: 5 },
          { effect: 'Quartz', req: 40 },
        ] },
      { id: 'neptunium', name: 'Neptunium', icon: 'hexagon', color: '#4AE0C4',
        upgrades: [
          { effect: '25x Neptunium', cap: 124800 },
          { effect: '10x Life Gem', cap: 1737 },
          { effect: 'Uncapped Golden R.', req: 100 },
        ] },
      { id: 'osmium', name: 'Osmium', icon: 'ingot', color: '#9AA8C4',
        upgrades: [
          { effect: '25x Osmium', cap: 124800 },
          { effect: '2x Ores', cap: 4 },
          { effect: '1.35x Eternal Shards', req: 100 },
        ] },
      { id: 'topaz', name: 'Topaz', icon: 'gem', color: '#E8B84A',
        upgrades: [
          { effect: '25x Topaz', cap: 124800 },
          { effect: '2x Gemstones', req: 15 },
          { effect: 'Life Shards', req: 55 },
        ] },
      { id: 'mithril', name: 'Mithril', icon: 'ingot', color: '#7DD4E8',
        upgrades: [
          { effect: '25x Mithril', cap: 124800 },
          { effect: '2x Ore Spawn Speed', req: 45 },
          { effect: '15x Mining Damage', cap: 2110000 },
        ] },
      { id: 'painite', name: 'Painite', icon: 'gem', color: '#E84A7D',
        upgrades: [
          { effect: '25x Painite', cap: 124800 },
          { effect: '2x Ore Luck', cap: 31 },
          { effect: '5x Gemstones', cap: 670900 },
        ] },
      { id: 'asteroid', name: 'Asteroid', icon: 'spark', color: '#B8926A',
        upgrades: [
          { effect: '25x Asteroid', cap: 124800 },
          { effect: '999x Core Damage', cap: 34651397202798881 },
          { effect: '10x Mining Damage', cap: 147600 },
        ] },
      { id: 'meteorite', name: 'Meteorite', icon: 'spark', color: '#A0A0B0',
        upgrades: [
          { effect: '25x Meteorite', cap: 124800 },
          { effect: '3x More Ores', cap: 11521 },
          { effect: '5x Depth', cap: 1500000 },
        ] },
      { id: 'cobalt', name: 'Cobalt', icon: 'ingot', color: '#4A6FE8',
        upgrades: [
          { effect: '25x Cobalt', cap: 124800 },
          { effect: '10x Bones', cap: 287441 },
          { effect: '5x Forge Quality', cap: 361200 },
        ] },
      { id: 'amber', name: 'Amber', icon: 'gem', color: '#E8A02A',
        upgrades: [
          { effect: '25x Amber', cap: 124800 },
          { effect: '3x Souls', cap: 1485 },
          { effect: '4x Ruby Energy', cap: 76800 },
        ] },
      { id: 'amethyst', name: 'Amethyst', icon: 'gem', color: '#B04AE8',
        upgrades: [
          { effect: '25x Amethyst', cap: 124800 },
          { effect: '2x Rune Luck', cap: 51 },
          { effect: '3x Rare Diamonds', cap: 76800 },
        ] },
    ],
  },
};

export const LAYER_DATA = {
  'mining/layers': {
    layers: [
      { num: 1, name: 'Soil', depth: 0, ores: ['Coal', 'Tin', 'Copper'] },
      { num: 2, name: 'Mud', depth: 20, ores: ['Coal', 'Tin', 'Copper', 'Iron', 'Silver', 'Gold'] },
      { num: 3, name: 'Clay', depth: 125, ores: ['Tin', 'Copper', 'Coal', 'Iron', 'Silver', 'Gold', 'Topaz', 'Sapphire'] },
      { num: 4, name: 'Rock', depth: 325, ores: ['Iron', 'Copper', 'Tin', 'Silver', 'Coal', 'Gold', 'Topaz', 'Sapphire'] },
      { num: 5, name: 'Stone', depth: 600, ores: ['Iron', 'Silver', 'Copper', 'Gold', 'Tin', 'Topaz', 'Sapphire', 'Ruby', 'Emerald'] },
      { num: 6, name: 'Hardstone', depth: 1250, ores: ['Iron', 'Silver', 'Gold', 'Topaz', 'Sapphire', 'Ruby', 'Emerald', 'Azurite', 'Diamond'] },
      { num: 7, name: 'Marble', depth: 2750, ores: ['Iron', 'Silver', 'Gold', 'Topaz', 'Sapphire', 'Ruby', 'Emerald', 'Azurite', 'Diamond'] },
      { num: 8, name: 'Granite', depth: 5000, ores: ['Iron', 'Silver', 'Gold', 'Topaz', 'Sapphire', 'Ruby', 'Emerald', 'Azurite', 'Diamond', 'Tanzanite'] },
      { num: 9, name: 'Basalt', depth: 7500, ores: ['Sapphire', 'Ruby', 'Emerald', 'Azurite', 'Diamond', 'Uranium', 'Plutonium', 'Tanzanite'] },
      { num: 10, name: 'Obsidian', depth: 12500, ores: ['Sapphire', 'Ruby', 'Emerald', 'Azurite', 'Diamond', 'Uranium', 'Plutonium', 'Tanzanite', 'Onyx', 'Garnet'] },
      { num: 11, name: 'Darkstone', depth: 27500, ores: ['Uranium', 'Plutonium', 'Tanzanite', 'Onyx', 'Garnet'] },
      { num: 12, name: 'Magma', depth: 52500, ores: ['Uranium', 'Plutonium', 'Tanzanite', 'Onyx', 'Garnet', 'Neptunium'] },
      { num: 13, name: 'Mantle', depth: 150000, ores: ['Uranium', 'Plutonium', 'Onyx', 'Garnet', 'Neptunium'] },
      { num: 14, name: 'Deep Mantle', depth: 750000, ores: ['Uranium', 'Plutonium', 'Onyx', 'Neptunium', 'Osmium'] },
      { num: 15, name: 'Bedrock', depth: 4500000, ores: ['Uranium', 'Plutonium', 'Neptunium', 'Osmium'] },
      { num: 16, name: 'Hard Bedrock', depth: 5250000, ores: ['Uranium', 'Plutonium', 'Neptunium', 'Osmium', 'Mithril'] },
      { num: 17, name: 'Ironized Bedrock', depth: 6250000, ores: ['Uranium', 'Plutonium', 'Neptunium', 'Osmium', 'Mithril', 'Painite'] },
      { num: 18, name: 'Space', depth: '12.5M - 50M', ores: ['Asteroid', 'Meteorite'] },
      { num: 19, name: 'Deep Space', depth: '50M - 250M', ores: ['Asteroid', 'Meteorite', 'Cobalt'] },
      { num: 20, name: 'Deep Space II', depth: 250000000, ores: ['Asteroid', 'Meteorite', 'Cobalt', 'Amber', 'Amethyst'] },
    ],
  },
};

export function getOrePage(catId, subId) {
  return ORE_DATA[`${catId}/${subId}`] || null;
}

export function getMasteryPage(catId, subId) {
  return MASTERY_DATA[`${catId}/${subId}`] || null;
}

export function getLayerPage(catId, subId) {
  return LAYER_DATA[`${catId}/${subId}`] || null;
}
