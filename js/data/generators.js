import {evaluateExpression} from '../utils.js';

export function calculateGenerator(machine,values={}) {
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(value)||0)));
  const level=clamp(values.level,0,machine.maxLevel),speed=clamp(values.speed,0,machine.maxSpeed),tier=clamp(values.tier||1,1,machine.maxTier);
  const more=clamp(values.moreFrost,0,99),faster=clamp(values.fasterMachines,0,30);
  const tierMultiplier=Math.max(0,Number(values.tierMultiplier??1)||0);
  const variables={L:level,S:speed,T:tier,scale:machine.scale,baseIncome:machine.startIncome,baseTime:machine.startTime,tierPrice:machine.tierPrice,levelPrice:machine.levelPrice,speedPrice:machine.speedPrice};
  const formula=key=>evaluateExpression((machine[key]||GENERATOR_FORMULAS[key]).replace(/^formula:\s*/,''),variables);
  const baseIncome=formula('incomeFormula')*tierMultiplier;
  const income=baseIncome*(1+more/20)*1.05**more;
  const seconds=formula('cycleFormula')/(1+faster/10);
  return {income,baseIncome,seconds,perSecond:income/seconds,
    tierCost:tier>=machine.maxTier?null:formula('tierCostFormula'),
    levelCost:level>=machine.maxLevel?null:formula('levelCostFormula'),
    speedCost:speed>=machine.maxSpeed?null:formula('speedCostFormula')};
}
export const GENERATOR_FORMULAS={
  incomeFormula:'formula: baseIncome * (1 + L * 0.4) * 1.1^L',
  cycleFormula:'formula: baseTime / 1.1^S',
  tierCostFormula:'formula: tierPrice * (10 * scale + T/2)^(T-1)',
  levelCostFormula:'formula: levelPrice * (1.35 * scale + L/85)^L',
  speedCostFormula:'formula: speedPrice * (1.65 * scale + S/35)^S',
};
export function seedGeneratorFormulas(game){for(const page of Object.values(game?.calculators?.pages||{}))if(page.kind==='generators')for(const machine of page.machines||[])for(const[key,value]of Object.entries(GENERATOR_FORMULAS))machine[key]??=value;}
