// ==== PROGRESS: RANKS E ASCENSIONS (EDITE AQUI) ====
// Paginas que usam o mesmo visual dos Stages (requirements / boosts / unlocks).
//   num    -> numero mostrado no hexagono
//   title  -> titulo do card
//   requirements -> lista de requisitos
//   boosts       -> lista de boosts ('2x Strength')
//   unlocks      -> { features: [{ name, subs: [...] }] }

export const RANK_DATA = {
  'dungeon/ranks': {
    ranks: [
      {
        num: '1', title: 'Rank 1 — Noob',
        requirements: ['5k Strength', '5k Health', 'No Reset: 49 Eternal Shards'],
        boosts: ['2x Strength', '2x Health'],
        unlocks: { places: [], features: [{ name: 'Boosts Multiplier' }] },
      },
      {
        num: '2', title: 'Rank 2 — Weak',
        requirements: ['125k Strength', '125k Health', 'No Reset: 69 Eternal Shards'],
        boosts: ['3.5x Strength', '3.5x Health', '2x Energy', '1.5x Money'],
        unlocks: { places: [], features: [{ name: '2 New Training Upgrades' }, { name: '50% Faster Train' }] },
      },
      {
        num: '3', title: 'Rank 3 — Trainer',
        requirements: ['25m Strength', '25m Health', 'No Reset: 79 Eternal Shards'],
        boosts: ['5x Strength', '5x Health', '4x Energy', '2.25x Money', '1.5x Mining Damage'],
        unlocks: { places: [], features: [{ name: 'Dungeon' }] },
      },
      {
        num: '4', title: 'Rank 4 — Hunter',
        requirements: ['1B Strength', '1B Health', 'No Reset: 99 Eternal Shards'],
        boosts: ['7.5x Strength', '7.5x Health', '7.5x Energy', '3.5x Money', '2.25x Mining Damage', '2x Coins'],
        unlocks: { places: [], features: [{ name: 'Bones Drops' }] },
      },
      {
        num: '5', title: 'Rank 5 — Master',
        requirements: ['250T Strength', '250T Health', 'No Reset: 119 Eternal Shards'],
        boosts: ['10x Strength', '10x Health', '10x Energy', '4.5x Money', '3x Mining Damage', '4x Coins', '1.5x Bones'],
        unlocks: { places: [], features: [{ name: 'Souls' }] },
      },
    ],
  },
};

export const ASCENSION_DATA = {
  'money-island/ascensions': {
    ranks: [
      {
        num: '1', title: 'Ascension 1',
        requirements: ['Maxed Upgrade Tree', 'No Reset: 99 Eternal Shards'],
        boosts: ['3x Money', '3x Energy', '2.25x Prestiges', '1.5x Gold Bars', '1.5x Emeralds', '1.25x Ores'],
        unlocks: { places: [], features: [{ name: 'Golden Diamonds' }, { name: '5 New Upgrades in Upgrade Tree' }] },
      },
      {
        num: '2', title: 'Ascension 2',
        requirements: ['No Reset: 149 Eternal Shards'],
        boosts: ['7x Money', '7x Energy', '3.5x Prestiges', '2x Gold Bars', '2x Emeralds', '2x Golden Diamonds', '1.6x Ores'],
        unlocks: { places: [], features: [{ name: 'Ruby Energy' }, { name: '7 New Upgrades in Upgrade Tree' }] },
      },
    ],
  },
};

export function getRankPage(catId, subId) {
  return RANK_DATA[`${catId}/${subId}`] || null;
}

export function getAscensionPage(catId, subId) {
  return ASCENSION_DATA[`${catId}/${subId}`] || null;
}

export const LIFE_RANK_DATA = {
  'life/terra-life': {
    ranks: [
      {
        num: '1', title: 'Life 1',
        requirements: ['10K Life Gems', 'No Reset: 49 Eternal Shards'],
        boosts: ['1.5x Faster Life', '5x Life Shards', '3x Research', '10x Energy'],
        unlocks: { features: [{ name: '+4 Life Gem Upgrades' }, { name: 'Unlock Roots' }, { name: 'New Life Shard Upgrade' }] },
      },
      {
        num: '2', title: 'Life 2',
        requirements: ['15M Life Gems', 'No Reset: 69 Eternal Shards'],
        boosts: ['10x Energy', '1.25x Faster Life', '4x Research'],
        unlocks: { features: [{ name: 'Passive Fossils' }, { name: 'New Sap Upgrade' }, { name: 'Unlock Monster' }, { name: 'New Life Shard Upgrade' }] },
      },
      {
        num: '3', title: 'Life 3',
        requirements: ['1Qa Life Gems', 'No Reset: 79 Eternal Shards'],
        boosts: ['10x Energy', '5x Money', '5x Prestige Points', '1.5x Gemstones', '3x Research'],
        unlocks: { features: [{ name: 'New Sap Upgrade' }, { name: '+1 Monster Evolution' }, { name: '1% Passive Sap Gain' }, { name: 'New Fossil Upgrade' }, { name: '+10 Research Upgrades' }] },
      },
      {
        num: '4', title: 'Life 4',
        requirements: ['100Qi Life Gems', 'No Reset: 99 Eternal Shards'],
        boosts: ['10x Energy', '5x Money', '1.5x Ores', '2x Gemstones', '3x Research'],
        unlocks: { features: [{ name: '100% Passive Sap' }, { name: '+1 Monster Evolution' }, { name: 'New Fossil Upgrade' }] },
      },
      {
        num: '5', title: 'Life 5',
        requirements: ['10Oc Life Gems', 'No Reset: 119 Eternal Shards'],
        boosts: ['10x Energy', '5x Money', '1.75x Ores', '2x Golden Research', '2x Rune Bulk & Luck'],
        unlocks: { features: [{ name: '+2 Monster Evolutions' }, { name: 'Tree Essence (Coming Soon)' }, { name: 'New Fossil Upgrade' }] },
      },
    ],
  },
};

export function getLifeRankPage(catId, subId) {
  return LIFE_RANK_DATA[`${catId}/${subId}`] || null;
}