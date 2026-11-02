// ==== DUNGEONS: TRAINING, GEARS E DUST (EDITE AQUI) ====

export const TRAINING_AREAS = {
  'dungeon/training-areas': {
    groups: [
      {
        name: 'Strength Areas',
        areas: [
          { name: 'Dummy', reqT1: 0, reqT2: 1e17, multiT1: 1, multiT2: 4000 },
          { name: 'Soft Bag', reqT1: 40, reqT2: 2e15, multiT1: 2.5, multiT2: 7000 },
          { name: 'Hard Bag', reqT1: 300, reqT2: 5e16, multiT1: 6, multiT2: 12000 },
          { name: 'Bench', reqT1: 1150, reqT2: 7e17, multiT1: 12, multiT2: 20000 },
          { name: 'Rock', reqT1: 17500, reqT2: 1e19, multiT1: 25, multiT2: 32500 },
          { name: 'Solid Box', reqT1: 72500, reqT2: 1e20, multiT1: 40, multiT2: 50000 },
          { name: 'Iron Box', reqT1: 300000, reqT2: 1e21, multiT1: 65, multiT2: 100000 },
          { name: 'Anvil', reqT1: 1500000, reqT2: 1e22, multiT1: 90, multiT2: 200000 },
          { name: 'Broken Wall', reqT1: 12000000, reqT2: 1e23, multiT1: 145, multiT2: 400000 },
          { name: 'Car', reqT1: 130000000, reqT2: 1e24, multiT1: 300, multiT2: 700000 },
          { name: 'SUV', reqT1: 2e9, reqT2: 1e25, multiT1: 550, multiT2: 1200000 },
          { name: 'Truck', reqT1: 3e10, reqT2: null, multiT1: 950, multiT2: null },
          { name: 'Solid Gold', reqT1: 7e11, reqT2: null, multiT1: 1400, multiT2: null },
          { name: 'Jet', reqT1: 1e13, reqT2: null, multiT1: 2500, multiT2: null },
        ],
      },
      {
        name: 'Life Areas',
        areas: [
          { name: 'Ice Bath', reqT1: 0, reqT2: 1e17, multiT1: 1, multiT2: 4000 },
          { name: 'Vent', reqT1: 50, reqT2: 2e15, multiT1: 3, multiT2: 7000 },
          { name: 'Hot Coal', reqT1: 350, reqT2: 5e16, multiT1: 6, multiT2: 12000 },
          { name: 'Acid', reqT1: 1250, reqT2: 7e17, multiT1: 10, multiT2: 20000 },
          { name: 'Fire', reqT1: 20000, reqT2: 1e19, multiT1: 22, multiT2: 32500 },
          { name: 'Poison', reqT1: 75000, reqT2: 1e20, multiT1: 40, multiT2: 50000 },
          { name: 'Furnace', reqT1: 325000, reqT2: 1e21, multiT1: 65, multiT2: 100000 },
          { name: 'Electric Box', reqT1: 1650000, reqT2: 1e22, multiT1: 90, multiT2: 200000 },
          { name: 'Grinder', reqT1: 13500000, reqT2: 1e23, multiT1: 145, multiT2: 500000 },
          { name: 'Deadly Laser', reqT1: 125000000, reqT2: 1e24, multiT1: 300, multiT2: 700000 },
          { name: 'Deadly Gas', reqT1: 1.75e9, reqT2: 1e25, multiT1: 550, multiT2: 1200000 },
          { name: 'Blast Furnace', reqT1: 3.25e10, reqT2: null, multiT1: 950, multiT2: null },
          { name: 'Lava', reqT1: 6.5e11, reqT2: null, multiT1: 1400, multiT2: null },
          { name: 'Souls', reqT1: 9e12, reqT2: null, multiT1: 2500, multiT2: null },
        ],
      },
    ],
  },
};

export const DUST_UNLOCK = [
  2000,
  7500,
  27500,
  90000,
  325000,
  2100000,
  9000000,
  60000000,
  350000000,
  2500000000,
];

export const GEARS = {
  'dungeon/swords': {
    gears: [
      { name: 'Wooden Sword', rarity: 5, stats: { Power: 1.25, Strength: 1.05 } },
      { name: 'Steel Sword', rarity: 25, stats: { Power: 1.6, Strength: 1.12 } },
      { name: 'Iron Sword', rarity: 85, stats: { Power: 2.5, Strength: 1.3 } },
      { name: 'Titanium Sword', rarity: 325, stats: { Power: 4.25, Strength: 1.35 } },
      { name: 'Silver Sword', rarity: 1250, stats: { Power: 7, Strength: 1.6 } },
      { name: 'Golden Sword', rarity: 6250, stats: { Power: 11, Strength: 2 } },
      { name: 'Platinum Sword', rarity: 25000, stats: { Power: 25, Strength: 2.5 } },
      { name: 'Cobalt Sword', rarity: 100000, stats: { Power: 75, Strength: 3.25 } },
    ],
  },
  'dungeon/shield': {
    gears: [
      { name: 'Weak Wood Shield', rarity: 6, stats: { Defense: 1.25, Health: 1.05 } },
      { name: 'Wooden Shield', rarity: 25, stats: { Defense: 1.65, Health: 1.12 } },
      { name: 'Hard Wood Shield', rarity: 85, stats: { Defense: 2.5, Health: 1.2 } },
      { name: 'Copper Shield', rarity: 325, stats: { Defense: 4.25, Health: 1.35 } },
      { name: 'Stone Shield', rarity: 1250, stats: { Defense: 7, Health: 1.6 } },
      { name: 'Metal Shield', rarity: 6250, stats: { Defense: 11, Health: 2 } },
      { name: 'Iron Shield', rarity: 25000, stats: { Defense: 25, Health: 2.5 } },
      { name: 'Titanium Shield', rarity: 100000, stats: { Defense: 75, Health: 3.25 } },
    ],
  },
  'dungeon/items': {
    gears: [
      { name: 'Bandages', rarity: 35, stats: { Bones: 1.1, 'Dungeon Coins': 1.1 } },
      { name: 'Kit', rarity: 65, stats: { Strength: 1.05, Health: 1.05 } },
      { name: 'Orb', rarity: 125, stats: { Money: 1.2, Energy: 1.2 } },
      { name: 'Wand', rarity: 200, stats: { Energy: 1.3, Souls: 1.1, Bones: 1.1 } },
      { name: 'Suit', rarity: 300, stats: { Defense: 4, Power: 4 } },
      { name: 'Basic Necklace', rarity: 550, stats: { Bones: 1.5, Iron: 1.2 } },
      { name: 'Vibranium', rarity: 900, stats: { Californium: 1.35, Bluesteel: 1.4 } },
      { name: 'Shiny Crystal', rarity: 1850, stats: { Money: 1.6, Energy: 1.6 } },
      { name: 'Healing Stone', rarity: 3000, stats: { Defense: 1.5, Health: 1.5 } },
      { name: 'Silver Necklace', rarity: 4750, stats: { 'Dungeon Coins': 1.4, Bones: 1.5 } },
      { name: 'Pheonix Tooth', rarity: 7950, stats: { Power: 1.75, Strength: 1.75 } },
      { name: 'Golden Necklace', rarity: 15000, stats: { Iron: 1.35, 'Dungeon Coins': 1.75 } },
      { name: 'Talisman', rarity: 30500, stats: { 'Dungeon Coins': 1.75, Souls: 1.55 } },
      { name: 'Ruby Necklace', rarity: 57500, stats: { 'Ruby Energy': 1.35, Energy: 2.25 } },
      { name: 'Broken Combine', rarity: 107500, stats: { Iron: 1.45, Souls: 1.75, Energy: 2.5 } },
      { name: 'Super Bandages', rarity: 225000, stats: { Bones: 2, 'Dungeon Coins': 2 } },
      { name: 'Diamond Necklace', rarity: 375000, stats: { 'Dungeon Coins': 2.35, Bones: 2 } },
      { name: 'Lunar Stone', rarity: 500000, stats: { Souls: 2, Californium: 1.85, Bluesteel: 1.75 } },
      { name: 'Radioactive Barrel', rarity: 1000000, stats: { Strength: 2.5, Health: 2.5 } },
      { name: 'Combine', rarity: 2150000, stats: { Iron: 1.9, Souls: 2.5, Energy: 4 } },
    ],
  },
};

export function getTrainingAreas(catId, subId) {
  return TRAINING_AREAS[`${catId}/${subId}`] || null;
}

export function getGearPage(catId, subId) {
  return GEARS[`${catId}/${subId}`] || null;
}
