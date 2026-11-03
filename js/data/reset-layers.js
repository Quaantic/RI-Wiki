export const RESET_LAYER_PAGES = {
  'dungeon/dungeon-level': {
    kind: 'level',
    title: 'Dungeon Level Bonuses',
    maxLevel: 10000,
    xpToNextLevel: (level) => Math.floor(20 * (level / 2 + 1) ** 1.5 * 1.04 ** level),
    bonuses: [
      { id: 'souls', name: 'Souls', unlockLevel: 1, value: (level) => Math.max(1, (1 + (level / 15) ** 1.2) * 1.01 ** level) },
      { id: 'bones', name: 'Bones', unlockLevel: 6, value: (level) => Math.max(1, (1 + ((level - 4) / 10) ** 1.1) * 1.01 ** (level - 4)) },
      { id: 'strength', name: 'Strength', unlockLevel: 11, value: (level) => Math.max(1, (1 + ((level - 9) / 25) ** 1.15) * 1.005 ** (level - 9)) },
      { id: 'health', name: 'Health', unlockLevel: 11, value: (level) => Math.max(1, (1 + ((level - 9) / 25) ** 1.15) * 1.005 ** (level - 9)) },
      { id: 'bone-dust', name: 'Bone Dust', unlockLevel: 21, value: (level) => Math.max(1, (1 + ((level - 19) / 20) ** 1.2) * 1.005 ** (level - 19)) },
      { id: 'energy', name: 'Energy', unlockLevel: 31, value: (level) => Math.max(1, (1 + ((level - 29) / 20) ** 1.2) * 1.005 ** (level - 29)) },
      { id: 'ores', name: 'Ores', unlockLevel: 51, value: (level) => Math.max(1, 1 + (level - 49) / 50) },
      { id: 'ruby-energy', name: 'Ruby Energy', unlockLevel: 101, value: (level) => Math.max(1, (1 + ((level - 99) / 35) ** 1.1) * 1.005 ** (level - 99)) },
    ],
  },
  'main/special-gears': {
    kind: 'gears',
    title: 'Special Gears Bonus Calculator',
    tiers: [
      {
        id: 'shiny',
        name: 'Shiny Gears',
        bonuses: [
          { id: 'gears', name: 'Gears', cap: 15, value: (G) => Math.min(15, (Math.log10(G / 5 + 1) / 3 + 1) * (G + 1) ** 0.08) },
          { id: 'energy', name: 'Energy', value: (G) => (Math.log10(G / 15 + 1) / 2.5 + 1) * (G + 1) ** 0.065 },
          { id: 'crystal', name: 'Crystal', value: (G) => (Math.log10(G / 55 + 1) / 3 + 1) * (G + 1) ** 0.05 },
        ],
      },
      {
        id: 'life',
        name: 'Life Gears',
        bonuses: [
          { id: 'gears', name: 'Gears', cap: 50, value: (G) => Math.min(50, (Math.log10(G / 0.5 + 1) / 2.5 + 1) * (G + 1) ** 0.085) },
          { id: 'life-gems', name: 'Life Gems', value: (G) => (Math.log10(G / 1 + 1) / 2.5 + 1) * (G + 1) ** 0.06 },
          { id: 'research', name: 'Research', value: (G) => (Math.log10(G / 5 + 1) / 1.75 + 1) * (G + 1) ** 0.03 },
          { id: 'money', name: 'Money', value: (G) => (Math.log10(G / 25 + 1) / 3 + 1) * (G + 1) ** 0.06 },
        ],
      },
      {
        id: 'titanic',
        name: 'Titanic Gears',
        bonuses: [
          { id: 'gears', name: 'Gears', value: (G) => (Math.log10(G / 0.5 + 1) / 2 + 1) * (G + 1) ** 0.1 },
          { id: 'bluesteel', name: 'Bluesteel', value: (G) => (Math.log10(G / 1 + 1) / 2.5 + 1) * (G + 1) ** 0.06 },
          { id: 'mining-damage', name: 'Mining Damage', value: (G) => (Math.log10(G / 5 + 1) / 2 + 1) * (G + 1) ** 0.06 },
          { id: 'californium', name: 'Californium', value: (G) => (Math.log10(G / 10 + 1) / 2.75 + 1) * (G + 1) ** 0.065 },
          { id: 'training', name: 'Training', value: (G) => (Math.log10(G / 40 + 1) / 2.5 + 1) * (G + 1) ** 0.07 },
        ],
      },
    ],
  },
  'dungeon/bone-dust': {
    kind: 'bone-dust',
    title: 'Bone Dust Bonus Calculator',
    powerLevelMax: 6,
    powerFromLevel: (level) => 1 + level / 10,
    bonuses: [
      { id: 'bones', name: 'Bones', cap: 50, value: (dust, p) => Math.min(50, (dust / 1e6 + 1) ** (0.175 * p)) },
      { id: 'coins', name: 'Coins', cap: 10, value: (dust, p) => Math.min(10, (dust / 3e6 + 1) ** (0.15 * p)) },
      { id: 'strength', name: 'Strength', cap: 15, value: (dust, p) => Math.min(15, (dust / 1e7 + 1) ** (0.14 * p)) },
      { id: 'health', name: 'Health', cap: 15, value: (dust, p) => Math.min(15, (dust / 1e7 + 1) ** (0.14 * p)) },
      { id: 'souls', name: 'Souls', cap: 5, value: (dust, p) => Math.min(5, (dust / 1e8 + 1) ** (0.12 * p)) },
    ],
  },
  'life/rare-saps': {
    kind: 'amount-groups',
    title: 'Rare Saps',
    groups: [
      {
        id: 'silver-sap',
        name: 'Silver Sap',
        color: '#C0C0C0',
        dropChance: '1 / 100',
        amountLabel: 'Silver Sap owned',
        bonuses: [
          { id: 'b1', name: 'More Logs', cap: 25, unit: 'x', value: (amount) => Math.min(25, Math.floor(amount / 2 + 1) ** 0.25) },
          { id: 'b2', name: 'Axe Damage', cap: 7, unit: 'x', value: (amount) => Math.min(7, Math.floor(amount / 5 + 1) ** 0.135) },
          { id: 'b3', name: 'More Energy', cap: 15, unit: 'x', value: (amount) => Math.min(15, Math.floor(amount / 7 + 1) ** 0.175) },
        ],
      },
      {
        id: 'golden-sap',
        name: 'Golden Sap',
        color: '#FFD700',
        dropChance: '1 / 500',
        amountLabel: 'Golden Sap owned',
        bonuses: [
          { id: 'b1', name: 'More Sap', cap: 25, unit: 'x', value: (amount) => Math.min(25, Math.floor(amount / 1 + 1) ** 0.225) },
          { id: 'b2', name: 'More Life Gem', cap: 10, unit: 'x', value: (amount) => Math.min(10, Math.floor(amount / 3 + 1) ** 0.14) },
          { id: 'b3', name: 'More Fossils', cap: 10, unit: 'x', value: (amount) => Math.min(10, Math.floor(amount / 4 + 1) ** 0.175) },
        ],
      },
      {
        id: 'diamond-sap',
        name: 'Diamond Sap',
        color: '#4F9DFF',
        dropChance: '1 / 1,500',
        amountLabel: 'Diamond Sap owned',
        bonuses: [
          { id: 'b1', name: 'More Roots', cap: 25, unit: 'x', value: (amount) => Math.min(25, Math.floor(amount / 0.75 + 1) ** 0.235) },
          { id: 'b2', name: 'Mining Damage', cap: 10, unit: 'x', value: (amount) => Math.min(10, Math.floor(amount / 3 + 1) ** 0.13) },
          { id: 'b3', name: 'More Tree Tier XP', cap: 15, unit: 'x', value: (amount) => Math.min(15, Math.floor(amount / 3 + 1) ** 0.175) },
        ],
      },
      {
        id: 'amethyst-sap',
        name: 'Amethyst Sap',
        color: '#A855F7',
        dropChance: '1 / 5,000',
        amountLabel: 'Amethyst Sap owned',
        bonuses: [
          { id: 'b1', name: 'More Void Apples', cap: 15, unit: 'x', value: (amount) => Math.min(15, Math.floor(amount / 0.5 + 1) ** 0.2) },
          { id: 'b2', name: 'More Astatine', cap: 3, unit: 'x', value: (amount) => Math.min(3, Math.floor(amount / 2 + 1) ** 0.135) },
          { id: 'b3', name: 'Mastery', cap: 2, unit: 'x', value: (amount) => Math.min(2, Math.floor(amount / 3 + 1) ** 0.125) },
        ],
      },
    ],
  },
  'life/power-of-fossils': {
    kind: 'amount',
    title: 'Power of Fossils',
    amountLabel: 'Total Fossils owned',
    bonuses: [
      { id: 'b1', name: 'More Life Gems', unlockAt: 1e38, unlockLabel: '1e38', unit: 'x', value: (amount) => (amount / 1e37 + 1) ** 0.115 },
      { id: 'b2', name: 'More Tree Tier XP', unlockAt: 1e40, unlockLabel: '1e40', unit: 'x', value: (amount) => (amount / 1e39 + 1) ** 0.12 },
      { id: 'b3', name: 'Better Sap Chance', unlockAt: 1e41, unlockLabel: '1e41', cap: 5, capUnit: '%', unit: '%', value: (amount) => Math.min(5, (amount / 1e39 + 1) ** 0.07) },
      { id: 'b4', name: 'More Research Cap', unlockAt: 1e43, unlockLabel: '1e43', cap: 25, capUnit: 'CAP', unit: 'cap', value: (amount) => Math.min(25, Math.floor(Math.log10(amount / 1e40 + 1))) },
      { id: 'b5', name: 'More Fossils', unlockAt: 1e44, unlockLabel: '1e44', cap: 25, unit: 'x', value: (amount) => Math.min(25, (amount / 5e42 + 1) ** 0.135) },
      { id: 'b6', name: 'Better Sap Chance', unlockAt: 1e46, unlockLabel: '1e46', cap: 5, capUnit: '%', unit: '%', value: (amount) => Math.min(5, (amount / 1e44 + 1) ** 0.07) },
      { id: 'b7', name: 'More Void Apples', unlockAt: 1e47, unlockLabel: '1e47', unit: 'x', value: (amount) => (amount / 1e46 + 1) ** 0.11 },
    ],
  },
};

export function minimumForTarget(valueAt, target, min = 0, cap = null, maxInput = 1e300) {
  if (!Number.isFinite(target) || target <= 0) return null;
  if (cap != null && target > cap) return null;
  if (target <= valueAt(min)) return min;

  let low = min;
  let high = Math.max(1, min);
  while (!(valueAt(high) >= target) && high < maxInput) {
    low = high;
    high = Math.min(high * 2, maxInput);
  }
  if (!(valueAt(high) >= target)) return null;

  for (let i = 0; i < 100; i++) {
    const mid = low + (high - low) / 2;
    if (valueAt(mid) >= target) high = mid;
    else low = mid;
  }
  const result = Math.ceil(high);
  return valueAt(result) >= target ? result : result + 1;
}