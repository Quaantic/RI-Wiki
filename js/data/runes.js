// ==== RUNAS - FAMILIAS (EDITE AQUI) ====

export const FAMILY_COLORS = {
  money: '#A8EF45',
  energetic: '#B04AFF',
  sky: '#6FC7FF',
  earth: '#9CCB3B',
  advanced: '#FF7AD9',
  bones: '#F0E6CB',
};

export const RUNE_FAMILIES = {
  'runes/money': {
    runes: [
      {
        id: 'coin', name: 'Coin', icon: 'coin', luck: '1',
        baseChance: '86%', basePct: 86, recChance: '86%', recPct: 86,
        boosts: [{ target: 'Money', mult: '×100', capsAt: '9,975,712' }],
      },
      {
        id: 'dollar', name: 'Dollar', icon: 'banknote', luck: '10',
        baseChance: '9.6%', basePct: 9.6, recChance: '63%', recPct: 63,
        boosts: [{ target: 'Money', mult: '×10', capsAt: '2,693' }],
      },
      {
        id: 'card', name: 'Card', icon: 'card', luck: '36',
        baseChance: '2.74%', basePct: 2.74, recChance: '58%', recPct: 58,
        boosts: [
          { target: 'Energy', mult: '×20', capsAt: '1,919,988' },
          { target: 'Energy Shards', mult: '×10', capsAt: '2,071,786' },
        ],
      },
      {
        id: 'contract', name: 'Contract', icon: 'scroll', luck: '115',
        baseChance: '0.87%', basePct: 0.87, recChance: '57%', recPct: 57,
        boosts: [
          { target: 'Life Shards', mult: '×5', capsAt: '639' },
          { target: 'Crystal', mult: '×5', capsAt: '1,064' },
          { target: 'Energy', mult: '×3', capsAt: '266' },
          { target: 'Money', mult: '×5', capsAt: '2,128' },
        ],
      },
      {
        id: 'gold', name: 'Gold', icon: 'ingot', luck: '385',
        baseChance: '0.26%', basePct: 0.26, recChance: '45%', recPct: 45,
        boosts: [
          { target: 'Golden Bars', mult: '×25', capsAt: '242,351' },
          { target: 'Sap', mult: '×2.5', capsAt: '15' },
        ],
      },
      {
        id: 'jewel', name: 'Jewel', icon: 'gem', luck: '825',
        baseChance: '0.12%', basePct: 0.12, recChance: '70%', recPct: 70,
        boosts: [
          { target: 'Emerald Coins', mult: '×25', capsAt: '762,023' },
          { target: 'Mining Damage', mult: '×2.5', capsAt: '23' },
        ],
      },
      {
        id: 'diamond', name: 'Diamond', icon: 'diamond', luck: '3150',
        baseChance: '0.03%', basePct: 0.03, recChance: '81%', recPct: 81,
        boosts: [
          { target: 'Money', mult: '×10', capsAt: '75' },
          { target: 'Rune Bulk', mult: '×1.4', capsAt: '4' },
          { target: 'Rune Luck', mult: '×1.75', capsAt: '15' },
        ],
      },
      {
        id: 'wealth', name: 'Wealth', icon: 'crown', luck: '18500',
        baseChance: '0.01%', basePct: 0.01, recChance: '90%', recPct: 90,
        boosts: [
          { target: 'Money', mult: '×5', capsAt: '5' },
          { target: 'Golden Bars', mult: '×10', capsAt: '137' },
          { target: 'Emerald Coins', mult: '×15', capsAt: '4,353' },
          { target: 'Energy', mult: '×3', capsAt: '131' },
        ],
      },
      {
        id: 'power', name: 'Power', icon: 'spark', luck: 'MAX',
        baseChance: '1/185K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Perks', mult: '×2', capsAt: '10' },
          { target: 'Log Perks', mult: '×2', capsAt: '10' },
          { target: 'Sap Perks', mult: '×2', capsAt: '10' },
          { target: 'Crystal Perks', mult: '×2', capsAt: '10' },
          { target: 'Mine Perks', mult: '×2', capsAt: '20' },
        ],
      },
    ],
  },

  'runes/energetic': {
    runes: [
      {
        id: 'basic', name: 'Basic', icon: 'spark', luck: '1',
        baseChance: '56%', basePct: 56, recChance: '56%', recPct: 56,
        boosts: [{ target: 'Energy', mult: 'Infinite', capsAt: 'No cap' }],
      },
      {
        id: 'charged', name: 'Charged', icon: 'zap', luck: '3',
        baseChance: '28%', basePct: 28, recChance: '58%', recPct: 58,
        boosts: [{ target: 'Crystal', mult: 'Infinite', capsAt: 'No cap' }],
      },
      {
        id: 'voltic', name: 'Voltic', icon: 'zap', luck: '9',
        baseChance: '10%', basePct: 10, recChance: '63%', recPct: 63,
        boosts: [
          { target: 'Perks', mult: '×3', capsAt: '24,200' },
          { target: 'Energy', mult: '×10', capsAt: '19,998' },
        ],
      },
      {
        id: 'special', name: 'Special', icon: 'star', luck: '30',
        baseChance: '3.3%', basePct: 3.3, recChance: '69%', recPct: 69,
        boosts: [
          { target: 'Jewels', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Platinum', mult: 'Infinite', capsAt: 'No cap' },
        ],
      },
      {
        id: 'hexa', name: 'Hexa', icon: 'hexagon', luck: '115',
        baseChance: '0.87%', basePct: 0.87, recChance: '78%', recPct: 78,
        boosts: [
          { target: 'Crystal Shards', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Quartz', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Energy', mult: '×5', capsAt: '10,829' },
        ],
      },
      {
        id: 'dark', name: 'Dark', icon: 'moon', luck: '625',
        baseChance: '0.16%', basePct: 0.16, recChance: '80%', recPct: 80,
        boosts: [
          { target: 'Adamantium', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Californium', mult: 'Infinite', capsAt: 'No cap' },
        ],
      },
      {
        id: 'omega', name: 'Omega', icon: 'orbit', luck: '3,500',
        baseChance: '0.03%', basePct: 0.03, recChance: '87%', recPct: 87,
        boosts: [
          { target: 'Perks', mult: '×2', capsAt: '64' },
          { target: 'Crystal Perks', mult: '×2.5', capsAt: '17' },
          { target: 'Life Gems', mult: '×10', capsAt: '11,579' },
        ],
      },
      {
        id: 'prismatic', name: 'Prismatic', icon: 'diamond', luck: "Player's max",
        baseChance: '1/27.5K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Energy', mult: '×5', capsAt: '18' },
          { target: 'Rune Bulk', mult: '×1.5', capsAt: '5' },
          { target: 'Rune Luck', mult: '×2', capsAt: '20' },
        ],
      },
    ],
  },

  'runes/sky': {
    runes: [
      {
        id: 'cloudy', name: 'Cloudy', icon: 'cloud', luck: '1',
        baseChance: '72%', basePct: 72, recChance: '72%', recPct: 72,
        boosts: [{ target: 'Life Shards', mult: 'Infinite', capsAt: 'No cap' }],
      },
      {
        id: 'rain', name: 'Rain', icon: 'cloud-rain', luck: '5',
        baseChance: '18%', basePct: 18, recChance: '59%', recPct: 59,
        boosts: [
          { target: 'Fossil', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Log', mult: 'Infinite', capsAt: 'No cap' },
        ],
      },
      {
        id: 'stormy', name: 'Stormy', icon: 'cloud-lightning', luck: '17',
        baseChance: '5.69%', basePct: 5.69, recChance: '51%', recPct: 51,
        boosts: [{ target: 'Research', mult: 'Infinite', capsAt: 'No cap' }],
      },
      {
        id: 'sandstorm', name: 'Sandstorm', icon: 'wind', luck: '45',
        baseChance: '2.2%', basePct: 2.2, recChance: '56%', recPct: 56,
        boosts: [
          { target: 'Sap', mult: 'Infinite', capsAt: 'No cap' },
          { target: 'Roots', mult: 'Infinite', capsAt: 'No cap' },
        ],
      },
      {
        id: 'hurricane', name: 'Hurricane', icon: 'tornado', luck: '125',
        baseChance: '0.8%', basePct: 0.8, recChance: '69%', recPct: 69,
        boosts: [{ target: 'Life Gems', mult: 'Infinite', capsAt: 'No cap' }],
      },
      {
        id: 'tornado', name: 'Tornado', icon: 'tornado', luck: '475',
        baseChance: '0.21%', basePct: 0.21, recChance: '80%', recPct: 80,
        boosts: [
          { target: 'Life Shards', mult: '×4', capsAt: '236' },
          { target: 'Log', mult: '×4', capsAt: '118' },
          { target: 'Research', mult: '×2', capsAt: '375' },
        ],
      },
      {
        id: 'inferno', name: 'Inferno', icon: 'flame', luck: '2,750',
        baseChance: '0.04%', basePct: 0.04, recChance: '87%', recPct: 87,
        boosts: [
          { target: 'Sap', mult: '×4', capsAt: '3' },
          { target: 'Life Shards', mult: '×3', capsAt: '21' },
          { target: 'Red Liquid', mult: 'Infinite', capsAt: 'No cap' },
        ],
      },
      {
        id: 'darkness', name: 'Darkness', icon: 'moon', luck: "Player's max",
        baseChance: '1/21.5K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Log Perks', mult: '×3', capsAt: '10' },
          { target: 'Sap Perks', mult: '×3', capsAt: '20' },
          { target: 'Red Perks', mult: '×3', capsAt: '40' },
        ],
      },
    ],
  },

  'runes/earth': {
    runes: [
      {
        id: 'dirt', name: 'Dirt', icon: 'sprout', luck: '1',
        baseChance: '93%', basePct: 93, recChance: '93%', recPct: 93,
        boosts: [{ target: 'Mining Damage', mult: '×20', capsAt: '376,798' }],
      },
      {
        id: 'stone', name: 'Stone', icon: 'mountain', luck: '22',
        baseChance: '4.46%', basePct: 4.46, recChance: '60%', recPct: 60,
        boosts: [{ target: 'Ores', mult: '×4', capsAt: '53,449' }],
      },
      {
        id: 'granite', name: 'Granite', icon: 'mountain', luck: '65',
        baseChance: '1.53%', basePct: 1.53, recChance: '75%', recPct: 75,
        boosts: [{ target: 'Mining Damage', mult: '×5', capsAt: '1,248' }],
      },
      {
        id: 'basalt', name: 'Basalt', icon: 'hexagon', luck: '325',
        baseChance: '0.31%', basePct: 0.31, recChance: '72%', recPct: 72,
        boosts: [{ target: 'Mine Perks', mult: '×3', capsAt: '19,680' }],
      },
      {
        id: 'magma', name: 'Magma', icon: 'flame', luck: '1,550',
        baseChance: '0.06%', basePct: 0.06, recChance: '63%', recPct: 63,
        boosts: [{ target: 'Mastery', mult: '×2', capsAt: '322' }],
      },
      {
        id: 'bedrock', name: 'Bedrock', icon: 'layers', luck: '4,750',
        baseChance: '0.02%', basePct: 0.02, recChance: '80%', recPct: 80,
        boosts: [
          { target: 'Depth', mult: '×3', capsAt: '2,274' },
          { target: 'Mining Damage', mult: '×3', capsAt: '1,168' },
          { target: 'Ores', mult: '×2', capsAt: '1,023' },
        ],
      },
      {
        id: 'ultradense', name: 'Ultradense', icon: 'gem', luck: '27,500',
        baseChance: '1/27.5K', basePct: null, recChance: '83%', recPct: 83,
        boosts: [
          { target: 'Forge Time', mult: '×3', capsAt: '15' },
          { target: 'Spawn Time', mult: '×2', capsAt: '85' },
        ],
      },
      {
        id: 'strange', name: 'Strange', icon: 'atom', luck: "Player's max",
        baseChance: '1/185K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Mine Perks', mult: '×2', capsAt: '10,230' },
          { target: 'Depth', mult: '×1.5', capsAt: '5' },
          { target: 'Mining Damage', mult: '×5', capsAt: '3,124' },
        ],
      },
    ],
  },

  'runes/advanced': {
    runes: [
      {
        id: 'plasma', name: 'Plasma', icon: 'zap', luck: '1',
        baseChance: '98%', basePct: 98, recChance: '98%', recPct: 98,
        boosts: [
          { target: 'Energy', mult: '×15', capsAt: '132,365' },
          { target: 'Life Gems', mult: '×10', capsAt: '699,993' },
          { target: 'Money', mult: '×5', capsAt: '2,430' },
        ],
      },
      {
        id: 'hydra', name: 'Hydra', icon: 'droplets', luck: '75',
        baseChance: '1.33%', basePct: 1.33, recChance: '78%', recPct: 78,
        boosts: [
          { target: 'Adamantium', mult: '×10', capsAt: '699,993' },
          { target: 'Californium', mult: '×5', capsAt: '319,808' },
          { target: 'Quartz', mult: '×10', capsAt: '699,993' },
        ],
      },
      {
        id: 'omega', name: 'Omega', icon: 'orbit', luck: '425',
        baseChance: '0.24%', basePct: 0.24, recChance: '77%', recPct: 77,
        boosts: [
          { target: 'Perks', mult: '×2.5', capsAt: '145' },
          { target: 'Crystal Perks', mult: '×2.5', capsAt: '674' },
          { target: 'Mine Perks', mult: '×2', capsAt: '10,230' },
        ],
      },
      {
        id: 'quantic', name: 'Quantic', icon: 'atom', luck: '2,150',
        baseChance: '0.05%', basePct: 0.05, recChance: '80%', recPct: 80,
        boosts: [
          { target: 'Research', mult: '×3', capsAt: '10,608' },
          { target: 'Golden Research', mult: '×2', capsAt: '7,161' },
          { target: 'Dark Crystals', mult: '×25', capsAt: '848,229' },
        ],
      },
      {
        id: 'omni', name: 'Omni', icon: 'sparkles', luck: '12,500',
        baseChance: '0.01%', basePct: 0.01, recChance: '81%', recPct: 81,
        boosts: [
          { target: 'Energy', mult: '×5', capsAt: '18' },
          { target: 'Rune Bulk', mult: '×1.5', capsAt: '5' },
          { target: 'Rune Luck', mult: '×2', capsAt: '20' },
        ],
      },
      {
        id: 'transcend', name: 'Transcend', icon: 'crown', luck: '76,500',
        baseChance: '1/76.5K', basePct: null, recChance: '87%', recPct: 87,
        boosts: [
          { target: 'Ores', mult: '×2', capsAt: '31' },
          { target: 'Mastery', mult: '×1.5', capsAt: '222' },
          { target: 'Depth', mult: '×3', capsAt: '59,048' },
        ],
      },
      {
        id: 'neutron', name: 'Neutron', icon: 'atom', luck: "Player's max",
        baseChance: '1/575K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Adamantium', mult: '×5', capsAt: '35' },
          { target: 'Californium', mult: '×3', capsAt: '32' },
          { target: 'Research', mult: '×2.5', capsAt: '49' },
          { target: 'Golden Research', mult: '×2', capsAt: '51' },
        ],
      },
    ],
  },

  'runes/bones': {
    runes: [
      {
        id: 'basic', name: 'Basic', icon: 'bone', luck: '1',
        baseChance: '99%', basePct: 99, recChance: '99%', recPct: 99,
        boosts: [
          { target: 'Health', mult: '×10', capsAt: '1,414,668,093' },
          { target: 'Strength', mult: '×10', capsAt: '1,414,668,093' },
        ],
      },
      {
        id: 'shiny', name: 'Shiny', icon: 'sparkles', luck: '2,500',
        baseChance: '0.04%', basePct: 0.04, recChance: '57%', recPct: 57,
        boosts: [
          { target: 'Bones', mult: '—', capsAt: '5,315,618' },
          { target: 'Bluesteel', mult: '—', capsAt: '189,232' },
          { target: 'Californium', mult: '—', capsAt: '7,005,081' },
        ],
      },
      {
        id: 'metallic', name: 'Metallic', icon: 'medal', luck: '7,000',
        baseChance: '0.01%', basePct: 0.01, recChance: '71%', recPct: 71,
        boosts: [
          { target: 'Drop Luck', mult: '×3', capsAt: '177,144' },
          { target: 'Gears', mult: '×2.5', capsAt: '3,050' },
          { target: 'Dust', mult: '—', capsAt: '6,962,382' },
        ],
      },
      {
        id: 'golden', name: 'Golden', icon: 'coins', luck: '27,500',
        baseChance: '1/27.5K', basePct: null, recChance: '85%', recPct: 85,
        boosts: [
          { target: 'Ores', mult: '—', capsAt: '3,002,178' },
          { target: 'Coins', mult: '—', capsAt: '2,288,093' },
          { target: 'Rune Luck', mult: '×2.5', capsAt: '47,679' },
        ],
      },
      {
        id: 'platinum', name: 'Platinum', icon: 'gem', luck: "Player's max",
        baseChance: '1/215K', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Souls', mult: '×2', capsAt: '75,000,000' },
          { target: 'Health', mult: '×2', capsAt: '20' },
          { target: 'Strength', mult: '×2', capsAt: '20' },
        ],
      },
      {
        id: 'diamond', name: 'Diamond', icon: 'diamond', luck: "Player's max",
        baseChance: '1/1.5M', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Souls', mult: '—', capsAt: '200,146' },
          { target: 'Coins', mult: '—', capsAt: '2,299,411' },
          { target: 'Bones', mult: '×3', capsAt: '3,421' },
        ],
      },
      {
        id: 'shadow', name: 'Shadow', icon: 'moon', luck: "Player's max",
        baseChance: '1/17.5M', basePct: null, recChance: '∆', recPct: null,
        special: true,
        boosts: [
          { target: 'Rune Bulk', mult: '—', capsAt: '104,031' },
          { target: 'Californium', mult: '×1.5', capsAt: '56' },
          { target: 'Bones', mult: '×2.5', capsAt: '49' },
          { target: 'Golden Diamond', mult: '×5', capsAt: '639' },
          { target: 'Dust', mult: '×2', capsAt: '11' },
        ],
      },
    ],
  },
};

export function getRuneFamily(catId, subId) {
  return RUNE_FAMILIES[`${catId}/${subId}`] || null;
}
