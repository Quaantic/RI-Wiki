// ==== PROGRESSO: STAGES, BARN, RANKS, ASCENSIONS, LIFE RANKS (EDITE AQUI) ====
// Todas essas paginas usam o mesmo visual de card (requirements / boosts / unlocks).
//   num          -> numero/romano mostrado no hexagono
//   title        -> titulo do card (opcional; padrao "Stage II" etc)
//   requirements -> lista de requisitos ('200T Energy')
//   boosts       -> lista de boosts ('3x Energy')
//   boostsNote   -> texto pequeno ao lado de Boosts (opcional)
//   unlocks      -> { area, places: [...], features: [{ name, subs: [...] }] }
// Cada bloco e chaveado por 'categoria/subcategoria' (igual as rotas do site).

export const STAGE_DATA = {
  'main/stages': {
    stages: [
      {
        num: 'II',
        requirements: ['200T Energy', '250 Jewels'],
        boosts: [
          '3x Energy',
          '2x Perks',
          '2x Crystals',
          '1.5x Jewels',
          '1.25x Platinum',
        ],
        unlocks: {
          area: 'Island',
          places: ['Life Island'],
          features: [
            { name: 'Life Creation', subs: ['Cells', 'Life Shards'] },
            { name: 'Fossils' },
            { name: 'Research' },
            { name: 'New Rune' },
            { name: 'Log', subs: ['Log Perks'] },
            { name: 'SAP', subs: ['SAP Perks'] },
            { name: 'Terraform' },
            { name: 'Gears' },
            { name: 'Automations' },
          ],
        },
      },
      {
        num: 'III',
        requirements: ['500Oc Energy', '5M SAP'],
        boostsNote: 'added with previous stage boosts',
        boosts: [
          '7x Energy',
          '3x Perks',
          '4x Crystals',
          '2x Jewels',
          '1.5x Platinum',
          '2x Life Shards',
          '1.35x Fossils',
          '2x Log',
          '1.4x SAP',
          '1.5x Research',
          '1.5x Gears',
        ],
        unlocks: {
          area: 'Island',
          places: ['Money Island'],
          features: [
            { name: 'Upgrade Tree' },
            { name: 'Ascensions', subs: ['Ruby Energy', 'Golden Diamond'] },
            { name: 'Money' },
            { name: 'Gold Bars' },
            { name: 'Emerald Coins' },
            { name: 'Prestige' },
            { name: 'Energy Shard' },
            { name: 'Specials Energy', subs: ['Silver Energy', 'Golden Energy', 'Diamond Energy'] },
            { name: 'New Rune' },
          ],
        },
      },
      {
        num: 'IV',
        requirements: ['250QaDe Energy', '5M Golden Bars'],
        boostsNote: 'added with previous stage boosts',
        boosts: [
          '15x Energy',
          '4x Perks',
          '7x Crystals',
          '2.5x Jewels',
          '2x Platinum',
          '4x Life Shards',
          '1.75x Fossils',
          '3.5x Log',
          '2x SAP',
          '2x Red Liquid',
          '2.25x Research',
          '2x Gears',
          '2x Money',
          '2x Energy Shards',
          '1.5x Gold Bars',
          '1.5x Silver Energy',
          '1.3x Golden Energy',
          '1.2x Emerald',
        ],
        unlocks: {
          area: 'Area',
          places: ['Crystal Barn'],
          features: [
            { name: 'Crystal Shards', subs: ['Crystal Perks'] },
            { name: 'Opal' },
            { name: 'Special Crystals', subs: ['Adamantium', 'Californium'] },
          ],
        },
      },
      {
        num: 'V',
        requirements: ['100UVg Energy', '500 Bluesteel'],
        boosts: [
          '30x Energy',
          '6x Perks',
          '10x Crystals',
          '3x Jewels',
          '2.75x Platinum',
          '6x Life Shards',
          '2.45x Fossils',
          '5x Logs',
          '3x Red Liquid',
          '3.15x Research',
          '4x Money',
          '4x Energy Shards',
          '2.25x Gold Bars',
          '1.5x Opal',
          '2x Silver Energy',
          '1.6x Golden Energy',
          '1.4x Emerald',
          '3x Gears',
        ],
        unlocks: {
          area: 'Island',
          places: ['Mining Island'],
          features: [
            { name: 'Mining', subs: ['Mining Perks'] },
            { name: 'Pickaxes' },
            { name: 'Core Breaking' },
            { name: 'Forge' },
            { name: 'Mining Upgrades' },
            { name: 'Ores' },
            { name: 'Ores Mastery' },
            { name: 'New Rune' },
          ],
        },
      },
      {
        num: 'VI',
        requirements: ['25qg Energy', '1M Uranium'],
        boosts: [
          '50x Energy',
          '8x Perks',
          '15x Crystals',
          '4x Jewels',
          '3.5x Platinum',
          '8x Life Shards',
          '3.25x Fossils',
          '7.5x Log',
          '4.5x SAP',
          '5x Red Liquid',
          '4.5x Research',
          '7x Money',
          '7x Energy Shards',
          '3x Gold Bars',
          '2x Opal',
          '3x Silver Energy',
          '2x Golden Energy',
          '1.7x Emerald',
          '4x Gears',
        ],
        unlocks: {
          area: 'Island',
          places: ['Training Island'],
          features: [
            { name: 'Training', subs: ['Health', 'Strength'] },
            { name: 'Ranks' },
            { name: 'Dungeon', subs: ['Coins', 'Bones', 'Drops', 'Dust', 'Souls'] },
            { name: 'Dungeon Level' },
            { name: 'New Rune' },
          ],
        },
      },
    ],
  },
};

export const BARN_DATA = {
  'main/barn': {
    stages: [
      {
        num: 'I',
        title: 'Barn I',
        requirements: ['1Qa Crystals', 'XX Eternal Shards (No Reset)'],
        boosts: [
          '2x Crystals',
          '2x Jewels',
          '3x Platinum',
          '7x Energy',
          '2x Crystal Shards',
          '1.2x Perks',
        ],
        unlocks: {
          features: [{ name: 'Crystal Shards' }],
        },
      },
      {
        num: 'II',
        title: 'Barn II',
        requirements: ['100Qi Crystals', '69 Eternal Shards (No Reset)'],
        boosts: [
          '7x Crystals',
          '3x Jewels',
          '4x Platinum',
          '15x Energy',
          '4x Energy Shards',
          '1.4x Perks',
          '1.5x Crystal Perks',
        ],
        unlocks: {
          features: [{ name: 'Crystal Level' }, { name: 'New Jewel Upgrade' }],
        },
      },
      {
        num: 'III',
        title: 'Barn III',
        requirements: ['10B Crystal Shards', '89 Eternal Shards (No Reset)'],
        boosts: [
          '10x Crystal',
          '4x Jewels',
          '6x Platinum',
          '30x Energy',
          '6x Crystal Shards',
          '1.6x Perks',
          '2x Crystal Perks',
          '1.25x Life Gems',
          '1.5x Money',
        ],
        unlocks: {
          features: [{ name: 'Opal' }, { name: 'More Jewels Upgrades' }],
        },
      },
      {
        num: 'IV',
        title: 'Barn IV',
        requirements: ['50M Opal', '109 Eternal Shards (No Reset)'],
        boosts: [
          '15x Crystals',
          '6x Jewels',
          '8x Platinum',
          '50x Energy',
          '9x Crystal Shards',
          '1.8x Perks',
          '2.5x Crystal Perks',
          '1.6x Life Gems',
          '2.25x Money',
        ],
        unlocks: {
          features: [{ name: 'More Opal Upgrades' }],
        },
      },
      {
        num: 'V',
        title: 'Barn V',
        requirements: ['50B Opal', '129 Eternal Shards (No Reset)'],
        boosts: [
          '20x Crystal',
          '10x Jewels',
          '10x Platinum',
          '2x Perks',
          '3x Crystal Perks',
          '100x Energy',
          '12x Crystal Shards',
          '1.5x Adamantium',
          '2x Life Gems',
          '3x Money',
          '1.5x Mining Damage',
          '1.1x Ores',
        ],
        unlocks: {
          features: [{ name: 'Adamantium' }, { name: 'More Opal Upgrades' }],
        },
      },
    ],
  },
};

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

export const CORE_DATA = {
  'mining/cores': {
    ranks: [
      {
        num: '2', title: 'Core Layer 2 — Core Crust',
        requirements: ['Core Layer 3: 5K'],
        boosts: ['1.32x Energy', '1.26x Money', '1.26x Ores', '1.15x Training', '1.2x Ruby E.'],
      },
      {
        num: '3', title: 'Core Layer 3 — Exposed Core',
        requirements: ['Core Layer 4: 20K'],
        boosts: ['1.72x Energy', '1.57x Money', '1.53x Ores', '1.32x Training', '1.4x Ruby E.'],
      },
      {
        num: '4', title: 'Core Layer 4 — Pure Core',
        requirements: ['Core Layer 5: 100K'],
        boosts: ['2.21x Energy', '1.93x Money', '1.81x Ores', '1.5x Training', '1.6x Ruby E.'],
      },
      {
        num: '5', title: 'Core Layer 5 — Central Core',
        requirements: ['Core Layer 6: 300K'],
        boosts: ['2.8x Energy', '2.34x Money', '2.12x Ores', '1.68x Training', '1.8x Ruby E.'],
      },
      {
        num: '6', title: 'Core Layer 6 — Final Core',
        requirements: ['Core Layer 7: 1.25M'],
        boosts: ['3.52x Energy', '2.82x Money', '2.43x Ores', '1.89x Training', '2x Ruby E.'],
      },
      {
        num: '7', title: 'Core Layer 7 — Super Core',
        requirements: ['Core Layer 8: 7M'],
        boosts: ['4.39x Energy', '3.37x Money', '2.77x Ores', '2.1x Training', '2.2x Ruby E.'],
      },
      {
        num: '8', title: 'Core Layer 8 — Dwarf Core',
        requirements: ['Core Layer 9: 50M'],
        boosts: ['5.45x Energy', '3.99x Money', '3.12x Ores', '2.33x Training', '2.4x Ruby E.'],
      },
      {
        num: '9', title: 'Core Layer 9 — Strange Core',
        requirements: ['Core Layer 10: 500M'],
        boosts: ['6.73x Energy', '4.72x Money', '3.5x Ores', '2.57x Training', '2.6x Ruby E.'],
      },
      {
        num: '10', title: 'Core Layer 10 — Exotic Core',
        requirements: ['Core Layer 11: 5B'],
        boosts: ['8.27x Energy', '5.54x Money', '3.89x Ores', '2.83x Training', '2.8x Ruby E.'],
      },
      {
        num: '11', title: 'Core Layer 11 — Neutron Core',
        requirements: ['Core Layer 12: 75B'],
        boosts: ['10.11x Energy', '6.48x Money', '4.3x Ores', '3.11x Training', '3x Ruby E.'],
      },
      {
        num: '12', title: 'Core Layer 12 — Quasar Core',
        requirements: ['Core Layer 13: 1T'],
        boosts: ['12.33x Energy', '7.56x Money', '4.73x Ores', '3.4x Training', '3.2x Ruby E.'],
      },
      {
        num: '13', title: 'Core Layer 13 — More Cores Soon',
        requirements: ['9DTg'],
        boosts: ['14.98x Energy', '8.79x Money', '5.19x Ores', '3.71x Training', '3.4x Ruby E.'],
      },
    ],
  },
};

function pick(DATA, catId, subId, key) {
  const page = DATA[`${catId}/${subId}`];
  return page && page[key]?.length ? page : null;
}

export const getStagePage = (catId, subId) => pick(STAGE_DATA, catId, subId, 'stages');
export const getBarnPage = (catId, subId) => pick(BARN_DATA, catId, subId, 'stages');
export const getRankPage = (catId, subId) => pick(RANK_DATA, catId, subId, 'ranks');
export const getAscensionPage = (catId, subId) => pick(ASCENSION_DATA, catId, subId, 'ranks');
export const getLifeRankPage = (catId, subId) => pick(LIFE_RANK_DATA, catId, subId, 'ranks');
export const getCorePage = (catId, subId) => pick(CORE_DATA, catId, subId, 'ranks');
