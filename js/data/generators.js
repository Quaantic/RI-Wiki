export function calculateGenerator(machine,values={}) {
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(value)||0)));
  const level=clamp(values.level,0,machine.maxLevel),speed=clamp(values.speed,0,machine.maxSpeed),tier=clamp(values.tier||1,1,machine.maxTier);
  const more=clamp(values.moreFrost,0,99),faster=clamp(values.fasterMachines,0,30);
  const tierMultiplier=Math.max(0,Number(values.tierMultiplier??1)||0);
  const baseIncome=machine.startIncome*(1+level*.4)*1.1**level*tierMultiplier;
  const income=baseIncome*(1+more/20)*1.05**more;
  const seconds=machine.startTime/1.1**speed/(1+faster/10);
  return {income,baseIncome,seconds,perSecond:income/seconds,
    tierCost:tier>=machine.maxTier?null:machine.tierPrice*(10*machine.scale+tier/2)**(tier-1),
    levelCost:level>=machine.maxLevel?null:machine.levelPrice*(1.35*machine.scale+level/85)**level,
    speedCost:speed>=machine.maxSpeed?null:machine.speedPrice*(1.65*machine.scale+speed/35)**speed};
}
