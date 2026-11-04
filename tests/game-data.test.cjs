const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { fileURLToPath } = require('node:url');
const { test } = require('node:test');

test('editable game data hydrates all page modules and calculator expressions safely', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const text = await readFile(fileURLToPath(url), 'utf8');
    return { ok: true, json: async () => JSON.parse(text) };
  };
  try {
    const [{ loadEditableContent }, formulas, progress, ores, runes, dungeon, calculators, resources, utils] = await Promise.all([
      import('../js/services.js'),
      import('../js/data/formulas.js'),
      import('../js/data/progress.js'),
      import('../js/data/ores.js'),
      import('../js/data/runes.js'),
      import('../js/data/dungeon.js'),
      import('../js/data/reset-layers.js'),
      import('../js/data/resource-colors.js'),
      import('../js/utils.js'),
    ]);
    await loadEditableContent();

    assert.equal(Object.keys(formulas.FORMULA_SECTIONS).length, 45);
    assert.equal(formulas.FORMULA_SECTIONS.crystal.upgrades.length, 13);
    assert.equal(formulas.FORMULA_PAGE_MAP['main/crystal-upgrades'], 'crystal');
    assert.equal(progress.STAGE_DATA['main/stages'].stages.length > 0, true);
    assert.equal(progress.STAGE_DATA['main/californium-milestones'].stages.length, 16);
    assert.equal(ores.ORE_DATA['mining/ores'].ores.length, 26);
    assert.equal(Object.keys(runes.RUNE_FAMILIES).length, 6);
    assert.equal(Object.keys(dungeon.GEARS).length, 3);
    assert.equal(calculators.RESET_LAYER_PAGES['dungeon/dungeon-level'].xpToNextLevel(1), 38);
    assert.equal(resources.resourceColor('Energy'), '#B04AFF');
    assert.match(resources.colorizeResources('Energy'), /data-href="#\/main\/energy"/);
    assert.throws(() => resources.setResourceColors({ Energy: 'red' }, {}), /invalid name or color/);
    assert.throws(() => resources.setResourceColors({}, { Energy: 'javascript:alert(1)' }), /invalid name or route/);
    assert.equal(resources.resourceColor('Energy'), '#B04AFF');
    assert.equal(utils.evaluateExpression('Math.max(1, amount / 10)', { amount: 25 }), 2.5);
    assert.equal(utils.evalFormula('math.floor(0.5*2^L)/10', { L: 3 }), 0.4);
    assert.equal(utils.evalFormula('1 se L=0; senao min(50, ((Energy+1e27)/1e27)^(0.03+L*0.02))', { L: 0 }), 1);
    assert.equal(utils.evalFormula('globalThis.alert(1)', {}), null);
    assert.throws(() => utils.evaluateExpression('globalThis.alert(1)', {}), /unsupported syntax|Unknown formula variable/);
  } finally {
    global.fetch = originalFetch;
  }
});
