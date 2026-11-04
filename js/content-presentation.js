// Replace the old reference-note dump with purpose-built game components.
export function refineImportedContent(wiki,game) {
  const revision='compact-game-content-v2';
  let changed=false;
  if (!(wiki.contentMigrations || []).includes(revision)) {
    const descriptions={
      'californium-milestones':'Sixteen permanent rewards from total Californium. Reach 100T to unlock Astatine.',
      'golden-research-milestones':'Seven rewards from total Golden Research, including research caps, automation and passive income.',
      'astatine-power':'Calculate Astatine Power and Californium Buffs below. Power unlocks at milestone 7; its cap bonuses unlock at milestone 8.',
      'frost-generators':'Adjust generator levels and speed to calculate Frost output and the next upgrade costs.',
      'frost-conversion':'All four Frost conversions and their current bonuses. Enter your owned amounts below.',
      'energies':'Enter your Silver, Golden, Diamond and Ruby Energy amounts to calculate bonuses and caps.',
      'golden-points':'Invest Golden Points into six targets. Each bonus starts at its required investment.',
    };
    const walk=(nodes)=>{for(const page of nodes||[]){
      page.sections=(page.sections||[]).filter(section=>!/^notes-(energies|golden|generators|conversion|californium|astatine)/.test(section.id||''));
      if(descriptions[page.id])page.desc=descriptions[page.id];
      walk(page.children);walk(page.subcategories);
    }};
    walk(wiki.categories);
    wiki.contentMigrations=[...(wiki.contentMigrations||[]),revision];changed=true;
  }
  if (!(game.contentMigrations || []).includes(revision)) {
    for (const page of Object.values(game.progression.stages || {})) if(page.itemLabel==='Milestone'||/milestones/i.test(page.title||'')) page.layout='compact';
    for (const page of Object.values(game.calculators.pages)) for(const group of page.groups||[]) {
      for(const bonus of group.bonuses||[]) bonus.name=bonus.name.replace(/ \(icon unconfirmed\)/g,'').replace(/Power bonus (\d) \(stat not identified in source\)/,'Astatine bonus $1');
      if(group.description?.startsWith('Visible lines: min(6, 2 + TU80)'))group.description='Additional bonuses unlock with Ruby Bonuses.';
      if(group.description?.includes('A third board slot has no known client formula'))group.description='1M Frost4 per conversion; 70% conversion yield.';
      if(group.description?.includes('Visible lines: min(6, 3 + Astatine Upgrade 10)'))group.description='Unlocks at Astatine milestone 4. Californium Bonuses unlocks additional boosts.';
    }
    const rubyInput=game.calculators.pages['money-island/energies']?.inputs?.find(input=>input.id==='tu80');
    if(rubyInput)rubyInput.label='Ruby Bonuses level';
    game.calculators.pages['life/frost-generators'] ||= {
      kind:'generators',title:'Frost Generators',machines:[
        {id:'frost1',name:'Generator 1',unlockCost:0,startIncome:1,startTime:5,scale:1,maxLevel:50,maxSpeed:10,maxTier:3,tierPrice:50,levelPrice:5,speedPrice:10},
        {id:'frost2',name:'Generator 2',unlockCost:10000,startIncome:100,startTime:10,scale:1.1,maxLevel:60,maxSpeed:20,maxTier:3,tierPrice:50000,levelPrice:2500,speedPrice:7500},
        {id:'frost3',name:'Generator 3',unlockCost:10000000,startIncome:25000,startTime:15,scale:1.2,maxLevel:75,maxSpeed:30,maxTier:3,tierPrice:1e8,levelPrice:1.5e6,speedPrice:7.5e6},
      ]
    };
    game.contentMigrations=[...(game.contentMigrations||[]),revision];changed=true;
  }
  return changed;
}
