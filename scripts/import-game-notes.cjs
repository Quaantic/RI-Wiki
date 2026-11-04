// Import the supplied notes without writing content/update-log.json.
// Usage: node scripts/import-game-notes.cjs [directory containing the five notes]
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceDir = process.argv[2] || path.resolve(root, '../..');
const wikiPath = path.join(root, 'content/wiki-data.json');
const gamePath = path.join(root, 'content/game-data.json');
const wiki = JSON.parse(fs.readFileSync(wikiPath));
const game = JSON.parse(fs.readFileSync(gamePath));
const find = (nodes, id) => { for (const node of nodes || []) { if (node.id === id) return node; const child = find(node.children, id); if (child) return child; } };
const page = (cat, id) => {
  const category = wiki.categories.find((item) => item.id === cat);
  if (!category) throw new Error(`Missing category ${cat}`);
  let result = find(category.subcategories, id);
  if (!result) { result = { id, name: id.replace(/-/g, ' '), icon: 'sparkles', desc: '', facts: [], highlights: [], children: [] }; category.subcategories.push(result); }
  return result;
};
const clean = (text) => text.replace(/`|\*\*/g, '').replace(/^>\s?/gm, '').replace(/\(arquivo\s*\d+\)/gi,'').trim();
const slug = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function parseNotes(markdown, prefix) {
  const sections = []; let title = 'Overview', lines = [], index = 0;
  const flush = () => {
    const text = clean(lines.filter((line) => !/^Fonte:|^Comprados em|^```|Events\./.test(line)).join('\n'));
    if (text) {
      if (sections.at(-1)?.title === clean(title)) sections.at(-1).text = [sections.at(-1).text,text].filter(Boolean).join('\n\n');
      else sections.push({ id: `${prefix}-${++index}`, title: clean(title), text });
    }
    lines = [];
  };
  const all = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < all.length; i++) {
    const line = all[i];
    if (/^#{1,3} /.test(line)) { flush(); title = line.replace(/^#+\s*/, '').replace(/\s*(?:\(|—).*Events\..*$/, ''); continue; }
    if (line.startsWith('|') && /^\|[\s:|-]+\|$/.test(all[i + 1] || '')) {
      flush();
      const cells = (value) => value.trim().replace(/^\||\|$/g, '').split('|').map(clean);
      const columns = cells(line), rows = []; i += 2;
      while (i < all.length && all[i].startsWith('|')) { rows.push({ id: `row-${rows.length + 1}`, cells: cells(all[i]) }); i++; }
      i--;
      const previous = sections.at(-1)?.title === clean(title) && !sections.at(-1).columns ? sections.pop() : null;
      sections.push({ id: `${prefix}-${++index}`, title: clean(title), columns, rows, text: previous?.text || '' });
    } else lines.push(line);
  }
  flush(); return sections;
}
function notes(cat, id, markdown, prefix) {
  const target = page(cat, id);
  target.sections = [...(target.sections || []).filter((section) => !section.id.startsWith(prefix + '-')), ...parseNotes(markdown, prefix)];
}
const read = (name) => fs.readFileSync(path.join(sourceDir, name), 'utf8');
notes('money-island', 'energies', read('01-energias-e-caps.md'), 'notes-energies');
notes('life', 'golden-points', read('02-golden-points.md'), 'notes-golden');
notes('life', 'frost-generators', read('04-frost-generators.md'), 'notes-generators');
notes('life', 'frost-conversion', read('05-frost-conversion.md'), 'notes-conversion');
const milestones = read('03-milestones.md');
notes('life', 'golden-research-milestones', milestones.slice(milestones.indexOf('## A)'), milestones.indexOf('## B)')), 'notes-golden-milestones');
notes('main', 'californium-milestones', milestones.slice(milestones.indexOf('## B)'), milestones.indexOf('## C)')), 'notes-californium');
notes('main', 'astatine-power', milestones.slice(milestones.indexOf('## C)')), 'notes-astatine');
page('money-island','energies').desc = 'Silver, Golden, Diamond and Ruby Energy drop from the Upgrade Tree. Each has its own bonuses while held. Ruby Energy can raise Silver, Golden and Diamond bonus caps; compare all four energies below.';
page('life','frost-conversion').desc = 'Convert Frost into Packed, Dense, Compact and Neutron Frost on one page. Each tier boosts specific stats while held. Conversion costs, formulas and the Frost3-dependent Compact Frost bonus are listed below.';
page('life','frost-generators').desc = 'Three Frost machines have separate purchase costs, income and cycle times. Upgrade their Tier, Level and Speed using the tables and formulas below; Frost Upgrades provide additional multipliers.';
page('life','golden-points').desc = 'Create Golden Research using Research Points, then invest Golden Points into six targets. Each target has a minimum investment; Life Gem, Mining Damage and Glacier also need Unlocker levels.';

// Consolidated pages retain redirects for old bookmarks, without separate tabs.
wiki.redirects ||= {};
for (const [cat, parent, ids] of [
  ['money-island', 'energies', ['silver-energy', 'gold-energy', 'diamond-energy', 'ruby-energy']],
  ['life', 'frost-conversion', ['packed-frost', 'dense-frost', 'compact-frost', 'neutron-frost']],
]) {
  const target = page(cat, parent);
  for (const id of ids) {
    const old = find(target.children, id);
    if (old?.sections?.length) target.sections.push(...old.sections);
    wiki.redirects[`${cat}/${id}`] = `#/${cat}/${parent}`;
  }
  target.children = (target.children || []).filter((child) => !ids.includes(child.id));
}

const bonus = (id, name, formula, cap = null, extra = {}) => ({ id, name, value: `formula: ${cap === null ? formula : `min(${cap}, ${formula})`}`, ...(cap === null ? {} : { cap }), unit: 'x', ...extra });
const group = (id, name, bonuses, description = '') => ({ id, name, amountLabel: `${name} owned`, description, bonuses });
const calc = (key, value) => { game.calculators.pages[key] = value; };

// Ruby affects the other groups' caps live; the fixed Diamond B5 is excluded.
const capBoost = (divisor, exponent, level) => `(1 + min(1,max(0,tu80-${level - 1})) * (min(2.5,(ruby/${divisor}+1)^${exponent})-1))`;
const energyBonus = (id, name, divisor, exponent, cap, boost) => bonus(id, name, `min(${cap}*${boost},(amount/${divisor}+1)^${exponent})`);
calc('money-island/energies', {
  kind: 'amount-groups', title: 'Energy bonuses and caps', inputs: [{ id: 'tu80', label: 'Ruby Bonuses (TU80) level', default: 0 }],
  groups: [
    group('silver', 'Silver Energy', [['money','Money',10,.26,100],['energy','Energy',15,.265,10000],['crystals','Crystals',25,.2,100],['shards','Crystal Shards',50,.15,25]].map((args) => energyBonus(...args, capBoost(100,.05,1))), 'Extra bonus lines unlock with TU39. Ruby raises these caps when TU80 ≥ 1.'),
    group('golden', 'Golden Energy', [['money','Money',5,.245,1000],['bars','Golden Bars',7,.3,250],['prestige','Prestige Points',12,.16,100],['sap','Sap',25,.275,50],['research','Research Points',100,.125,2.5]].map((args) => energyBonus(...args, capBoost(1500,.0425,2))), 'Extra bonus lines unlock with TU47. Ruby raises these caps when TU80 ≥ 2.'),
    group('diamond', 'Diamond Energy', [...[['money','Money',1,.25,1000],['emerald','Emerald Coins',4,.345,10000],['iron','Iron',10,.1,4],['gems','Life Gem',25,.15,5]].map((args) => energyBonus(...args, capBoost(20000,.035,3))), bonus('runes','Rune Stone','(amount/200+1)^0.09',2.5)], 'Extra bonus lines unlock with TU58. Rune Stone stays capped at 2.5×.'),
    group('ruby', 'Ruby Energy', [bonus('money','Money','(amount/0.5+1)^0.365',250),bonus('diamonds','Golden Diamonds','(amount/10+1)^0.315',10000),bonus('gears','Gears (icon unconfirmed)','(amount/30+1)^0.225',10),bonus('silvercap','Silver bonus caps','(amount/100+1)^0.05',2.5,{unit:'x CAP'}),bonus('goldcap','Golden bonus caps','(amount/1500+1)^0.0425',2.5,{unit:'x CAP'}),bonus('diamondcap','Diamond bonus caps','(amount/20000+1)^0.035',2.5,{unit:'x CAP'})], 'Visible lines: min(6, 2 + TU80). The board also labels TU80 as 3 + L; the source contains this discrepancy.'),
  ],
});
calc('life/frost-conversion', { kind: 'amount-groups', title: 'All Frost conversions', groups: [
  group('frost2','Packed Frost (Frost2)',[bonus('frost','Frost','(amount/10+1)^0.2',50)], '10,000,000 Frost → 1 Frost2.'),
  group('frost3','Dense Frost (Frost3)',[bonus('frost','Frost','(amount+1)^0.135',500),bonus('gems','Life Gem','log10(amount/5+10)^0.675*(amount+1)^0.03')], '10,000 Frost2 → 1 Frost3.'),
  group('frost4','Compact Frost (Frost4)',[bonus('frost','Frost (uses Frost3 owned)','min(250,(frost3+1)^0.115)'),bonus('energy','Energy','log10(amount/100+10)^1.35*(amount+1)^0.0425'),bonus('tree','Tree','log10(amount/1000+10)*(amount+1)^0.035')], '25,000 Frost3 → 1 Frost4. Its Frost boost uses your Frost3 balance, not Frost4.'),
  group('frost5','Neutron Frost (Frost5)',[bonus('frost','Frost','(amount+1)^0.1',100),bonus('research','Golden Research','log10(amount/100+10)^0.9*(amount+1)^0.025')], '1,000,000 Frost4 per conversion; server yield ×0.7. A third board slot has no known client formula.'),
] });
calc('life/golden-points', { kind: 'amount-groups', title: 'Golden Point investments', groups: [
  ['u1','Energy',1,.425,1000],['u2','Research Points',10,.3,null],['u3','Money',25,.285,250],['u4','Life Gem',50,.235,null],['u5','Mining Damage',100,.175,50],['u6','Glacier',250,.2,50],
].map(([id,name,req,exponent,cap],i) => group(id, name, [bonus(id, name, `amount^${exponent}`, cap, { unlockAt:req, unlockResource:'invested Golden Points' })], `Invest at least ${req} Golden Points.${i>=3 ? ` Requires Unlocker level ${i-1}.` : ''}`)) });

const progression = (key, title, unit, rows) => { game.progression.stages[key] = { title, itemLabel:'Milestone', stages:rows.map(([requirement, ...boosts],i) => ({ num:String(i+1), title:`Milestone ${i+1}`, requirements:[`${requirement} ${unit}`], boosts, unlocks:{area:'',places:[],features:[]} })) }; };
progression('life/golden-research-milestones','Golden Research Milestones','total Golden Research', [
  ['10','3× RP cost; 2× Golden RP','2.5× Research Points'],['50','2× RP cost; 1.5× Golden RP','2.5× Research Points'],['250','+5 level cap for Research Upgrades with cap ≥25','4 new Research Upgrades'],['1.5K','2× auto Golden RP power','2× Life Gems and Frost'],['12.5K','Unlock Auto Speed','Progress bar: 10 → 100 clicks; 12× Golden RP'],['175K','5× RP cost; 2× Golden RP','2.5× Californium'],['5M','Gain 0.1% Life Gems per second'],
]);
progression('main/californium-milestones','Californium Milestones','Californium', [
 ['10','1.5× Adamantium and Platinum','1.5× Crystal Perks'],['25','2× Adamantium Chance','1.5× Californium Chance'],['100','2× Platinum','5% passive Adamantium'],['250','15% passive Adamantium','2× Californium'],['600','Platinum bonus exponent ×1.15','Californium’s Adamantium boost exponent: 0.2 → 0.25'],['2,500','50% passive Adamantium','10% passive Californium'],['7,000','Adamantium bonus exponent ×1.15','2× Crystal Perks'],['250K','100% passive Adamantium','+15 Adamantium Upgrade caps'],['1.5M','20% passive Californium','+10 Californium Upgrade caps'],['15M','+3 Crystal Shard tiers','2.5× Bluesteel'],['225M','New Platinum stat boost','Expand First Merge Upgrade'],['2.5B','New Adamantium stat boost','10× Crystal Compaction'],['15B','2.5% passive Opal','Unlock Opal Upgrades 15 and 16'],['175B','+0.1% passive Bluesteel','35% passive Californium'],['2T','2× Golden Research','1.5× Rune Bulk'],['100T','Unlock Astatine'],
]);
progression('main/astatine-power','Astatine Milestones','Astatine', [
 ['5','1.5× Astatine','Unlock 4 Astatine Upgrades'],['20','5× stronger passive','+1 Astatine Upgrade'],['40','3× Adamantium and Californium','+1 Astatine Upgrade'],['75','2.5× Crystal Spawn Speed','Unlock Californium Buffs'],['150','1.25× Astatine','+2 Astatine Upgrades'],['300','2× Mining Depth','+2 Astatine Upgrades'],['750','2× Astatine Chance','Unlock Astatine Power'],['2,500','3× Californium','Expand Astatine Power: Platinum and Adamantium caps'],
]);
calc('main/astatine-power',{kind:'amount-groups',title:'Astatine Power and Californium Buffs',inputs:[{id:'gdu13',label:'Golden Diamond Upgrade 13 level',default:0},{id:'magnet8',label:'Magnet Upgrade 8 level',default:0}],groups:[
 group('astatine','Astatine',[bonus('power1','Power bonus 1 (stat not identified in source)','(amount/50+1)^0.375'),bonus('power2','Power bonus 2 (stat not identified in source)','(amount/100+1)^0.275'),bonus('platinumcap','Platinum bonus caps','(amount/500+1)^0.115',7,{unit:'x CAP'}),bonus('adamantiumcap','Adamantium bonus caps','(amount/1000+1)^0.085',5,{unit:'x CAP'})],'Power unlocks at Astatine Milestone 7. Cap multipliers unlock at Milestone 8.'),
 group('californium','Californium',[['shards','Crystal Shards',1e13,.325,100],['gears','Gears (icon unconfirmed)',2e13,.225,25],['diamonds','Golden Diamonds',4e13,.235,25],['magnets','Magnets',7e13,.15,25],['dark','Dark Crystal',2e14,.125,5],['astatine','Astatine',5e14,.0775,5]].map(([id,name,d,e,c])=>bonus(id,name,`min(${c}*(1+gdu13/10)*(1+magnet8/10),(amount/${d}+1)^${e})`)), 'Californium Buffs unlock at Astatine Milestone 4. Visible lines: min(6, 3 + Astatine Upgrade 10).'),
]});

function importUpgrades(route, fallback, text, milestoneColumn = false) {
  const key = game.upgrades.routes[route] || fallback;
  const section = game.upgrades.sections[key] || { name: fallback.replace(/-/g,' '), upgrades: [] };
  const rows = text.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line));
  for (const line of rows) {
    const cells = line.trim().replace(/^\||\|$/g,'').split('|').map((cell) => cell.trim());
    const formula = (cell) => cell.match(/`([^`]+)`/)?.[1] || clean(cell);
    const offset = milestoneColumn ? 1 : 0;
    const upgrade = { n:Number(cells[0]), name:clean(cells[1]), cap:Number(cells[2]), price:formula(cells[3+offset]), multi:formula(cells[4+offset]), ...(milestoneColumn ? { requirement:`Astatine Milestone ${cells[3]}` } : {}) };
    const index = section.upgrades.findIndex((entry) => Number(entry.n) === upgrade.n);
    if (index < 0) section.upgrades.push(upgrade); else section.upgrades[index] = { ...section.upgrades[index], ...upgrade };
  }
  game.upgrades.sections[key] = section;
  game.upgrades.routes[route] = key;
}
importUpgrades('life/golden-research-upgrades','golden-research',read('02-golden-points.md').split('## Golden Upgrades')[1]);
importUpgrades('life/frost-upgrades','frost',read('04-frost-generators.md').split('## Frost Upgrades')[1]);
importUpgrades('main/astatine-upgrades','astatine',milestones.split('### 10 Astatine Upgrades')[1].split('### Californium Buffs')[0],true);

async function finish() {
  const { validateDocuments } = await import('../js/content-schema.js');
  const { setResetLayerPages } = await import('../js/data/reset-layers.js');
  const updates = JSON.parse(fs.readFileSync(path.join(root,'content/update-log.json')));
  validateDocuments({wiki,game,updates});
  setResetLayerPages(game.calculators.pages);
  fs.writeFileSync(wikiPath, JSON.stringify(wiki,null,2)+'\n');
  fs.writeFileSync(gamePath, JSON.stringify(game,null,2)+'\n');
  console.log('Imported five source notes into seven pages. Update log untouched.');
}
finish().catch((error)=>{ console.error(error); process.exitCode=1; });
