// Progression data is loaded from content/game-data.json before routes render.

export const STAGE_DATA = {};

export const BARN_DATA = {};

export const RANK_DATA = {};

export const ASCENSION_DATA = {};

export const LIFE_RANK_DATA = {};

export const CORE_DATA = {};

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
