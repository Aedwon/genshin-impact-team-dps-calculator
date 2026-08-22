// Per-instance damage computation (§3, §7): resolves every eligible buff
// (any uptime mode, weighted appropriately) against a single rotation
// instance, then runs the pure formulas in formulas.ts. This is the
// authoritative calculation backing the per-instance breakdown table.
import {
  ADDITIVE_COEF,
  AMPLIFYING_BASE,
  BASE_CRIT_DMG,
  BASE_CRIT_RATE,
  BASE_ENERGY_RECHARGE,
  DEFAULT_CHARACTER_LEVEL,
  TRANSFORMATIVE_COEF,
  getLevelMultiplier,
} from '../constants';
import {
  additiveReactionBase,
  amplifyingMultiplier,
  baseDamage,
  clamp,
  critMultiplier,
  defMultiplier,
  effectiveRES,
  hitDamage,
  resMultiplier,
  transformativeDamage,
} from './formulas';
import { addContribution, emptyAccumulator, staticContributions, unitIsEligibleForBuff } from './statSheet';
import { getCharacterBaseData, getWeaponBaseData } from './genshinData';
import type {
  AbilityCategory,
  Buff,
  DamageInstance,
  Element,
  EnemyConfig,
  RotationInstance,
  TransformativeInstance,
  Unit,
} from '../types';

function categoryOf(instance: RotationInstance): AbilityCategory {
  return instance.kind === 'damage' ? instance.category : 'Reaction';
}

function elementOf(instance: RotationInstance): Element | null {
  return instance.kind === 'damage' ? instance.element : null;
}

function isEligible(buff: Buff, unitId: string | null, category: AbilityCategory): boolean {
  const unitOk = unitIsEligibleForBuff(buff, unitId);
  const catOk = buff.scopeCategories === 'all' || buff.scopeCategories.includes(category);
  return unitOk && catOk;
}

function buffWeight(buff: Buff, instance: RotationInstance): number {
  if (!isEligible(buff, instance.unitId, categoryOf(instance))) return 0;
  switch (buff.uptimeMode) {
    case 'always':
      return 1;
    case 'perHit':
      return instance.buffToggles[buff.id] ? 1 : 0;
    case 'fractional':
      return clamp(buff.fraction ?? 0, 0, 1);
    default:
      return 0;
  }
}

export interface InstanceStatContext {
  atk: number;
  hp: number;
  def: number;
  em: number;
  critRate: number;
  critDMG: number;
  er: number;
  totalDmgBonusPercent: number;
  reactionBonusPercent: number;
  resShredPercent: number;
  defReductionPercent: number;
  defIgnorePercent: number;
  flatAdditiveBase: number;
  charLevel: number;
}

/** Resolves every buff (regardless of uptime mode) against this specific instance. */
export function computeInstanceContext(
  instance: RotationInstance,
  unit: Unit | undefined,
  buffs: Buff[]
): InstanceStatContext {
  const acc = emptyAccumulator();
  acc.critRate = BASE_CRIT_RATE;
  acc.critDMG = BASE_CRIT_DMG;
  acc.er = BASE_ENERGY_RECHARGE;

  const charData = unit?.characterName ? getCharacterBaseData(unit.characterName, unit.characterLevel) : null;
  const charAtk = charData?.atk ?? 0;
  const charHp = charData?.hp ?? 0;
  const charDef = charData?.def ?? 0;

  if (unit) {
    for (const c of staticContributions(unit)) addContribution(acc, c);
  }

  const element = elementOf(instance);
  let totalDmgBonusPercent = 0;
  let reactionBonusPercent = 0;
  let resShredPercent = 0;
  let defReductionPercent = 0;
  let defIgnorePercent = 0;
  let flatAdditiveBase = 0;

  for (const buff of buffs) {
    const weight = buffWeight(buff, instance);
    if (weight <= 0) continue;
    for (const effect of buff.effects) {
      const val = effect.value * weight;
      switch (effect.type) {
        case 'atkPercent':
          acc.atkPercent += val;
          break;
        case 'flatATK':
          acc.flatATK += val;
          break;
        case 'hpPercent':
          acc.hpPercent += val;
          break;
        case 'flatHP':
          acc.flatHP += val;
          break;
        case 'defPercent':
          acc.defPercent += val;
          break;
        case 'flatDEF':
          acc.flatDEF += val;
          break;
        case 'em':
          acc.em += val;
          break;
        case 'critRate':
          acc.critRate += val;
          break;
        case 'critDMG':
          acc.critDMG += val;
          break;
        case 'elementalDMG':
          if (element && effect.element === element) totalDmgBonusPercent += val;
          break;
        case 'allDMG':
          totalDmgBonusPercent += val;
          break;
        case 'talentDMG':
          totalDmgBonusPercent += val;
          break;
        case 'reactionBonus':
          reactionBonusPercent += val;
          break;
        case 'resShred':
          resShredPercent += val;
          break;
        case 'defReduction':
          defReductionPercent += val;
          break;
        case 'defIgnore':
          defIgnorePercent += val;
          break;
        case 'flatAdditiveBase':
          flatAdditiveBase += val;
          break;
      }
    }
  }

  return {
    atk: (charAtk + (unit ? staticWeaponAtk(unit) : 0)) * (1 + acc.atkPercent / 100) + acc.flatATK,
    hp: charHp * (1 + acc.hpPercent / 100) + acc.flatHP,
    def: charDef * (1 + acc.defPercent / 100) + acc.flatDEF,
    em: acc.em,
    critRate: acc.critRate,
    critDMG: acc.critDMG,
    er: acc.er,
    totalDmgBonusPercent,
    reactionBonusPercent,
    resShredPercent,
    defReductionPercent,
    defIgnorePercent,
    flatAdditiveBase,
    charLevel: unit?.characterLevel ?? DEFAULT_CHARACTER_LEVEL,
  };
}

function staticWeaponAtk(unit: Unit): number {
  if (!unit.weaponName) return 0;
  return getWeaponBaseData(unit.weaponName, unit.characterLevel)?.atk ?? 0;
}

function scalingStatValue(ctx: InstanceStatContext, stat: DamageInstance['scalingStat']): number {
  switch (stat) {
    case 'ATK':
      return ctx.atk;
    case 'HP':
      return ctx.hp;
    case 'DEF':
      return ctx.def;
    case 'EM':
      return ctx.em;
  }
}

export interface CritTriad {
  average: number;
  onCrit: number;
  nonCrit: number;
}

export interface DamageInstanceBreakdown {
  kind: 'damage';
  scalingStatValue: number;
  additiveReactionBaseValue: number;
  baseDMG: number;
  totalDmgBonusPercent: number;
  defMultiplier: number;
  res: number;
  resMultiplier: number;
  amplifyingMultiplier: number;
  critMultiplier: CritTriad;
  hit: CritTriad;
  total: CritTriad; // hit x hits
  hits: number;
}

export function computeDamageInstance(
  instance: DamageInstance,
  unit: Unit | undefined,
  buffs: Buff[],
  enemy: EnemyConfig
): DamageInstanceBreakdown {
  const ctx = computeInstanceContext(instance, unit, buffs);
  const levelMultiplier = getLevelMultiplier(ctx.charLevel);

  let additiveReactionBaseValue = 0;
  if (instance.reaction === 'aggravate') {
    additiveReactionBaseValue = additiveReactionBase(
      ADDITIVE_COEF.aggravate,
      levelMultiplier,
      ctx.em,
      ctx.reactionBonusPercent
    );
  } else if (instance.reaction === 'spread') {
    additiveReactionBaseValue = additiveReactionBase(
      ADDITIVE_COEF.spread,
      levelMultiplier,
      ctx.em,
      ctx.reactionBonusPercent
    );
  }

  const statValue = scalingStatValue(ctx, instance.scalingStat);
  const baseDMG = baseDamage(instance.mv, statValue, ctx.flatAdditiveBase, additiveReactionBaseValue);

  const res = effectiveRES(enemy.baseRES, ctx.resShredPercent);
  const resMult = resMultiplier(res);
  const defMult = defMultiplier(ctx.charLevel, enemy.level, ctx.defReductionPercent, ctx.defIgnorePercent);

  let ampMult = 1;
  if (instance.reaction === 'vaporize' || instance.reaction === 'melt') {
    const ampBase = instance.ampDirection ? AMPLIFYING_BASE[instance.ampDirection] : 1;
    ampMult = amplifyingMultiplier(ampBase, ctx.em, ctx.reactionBonusPercent);
  }

  const critMult: CritTriad = {
    average: critMultiplier('average', ctx.critRate, ctx.critDMG),
    onCrit: critMultiplier('onCrit', ctx.critRate, ctx.critDMG),
    nonCrit: critMultiplier('nonCrit', ctx.critRate, ctx.critDMG),
  };

  const hitInputs = { baseDMG, totalDmgBonusPercent: ctx.totalDmgBonusPercent, defMult, resMult, amplifyingMult: ampMult };
  const hit: CritTriad = {
    average: hitDamage(hitInputs, critMult.average),
    onCrit: hitDamage(hitInputs, critMult.onCrit),
    nonCrit: hitDamage(hitInputs, critMult.nonCrit),
  };

  const total: CritTriad = {
    average: hit.average * instance.hits,
    onCrit: hit.onCrit * instance.hits,
    nonCrit: hit.nonCrit * instance.hits,
  };

  return {
    kind: 'damage',
    scalingStatValue: statValue,
    additiveReactionBaseValue,
    baseDMG,
    totalDmgBonusPercent: ctx.totalDmgBonusPercent,
    defMultiplier: defMult,
    res,
    resMultiplier: resMult,
    amplifyingMultiplier: ampMult,
    critMultiplier: critMult,
    hit,
    total,
    hits: instance.hits,
  };
}

export interface TransformativeInstanceBreakdown {
  kind: 'transformative';
  reactionCoef: number;
  levelMultiplier: number;
  em: number;
  reactionBonusPercent: number;
  res: number;
  resMultiplier: number;
  critMultiplier: CritTriad | null;
  hit: CritTriad;
  total: CritTriad;
  hits: number;
}

export function computeTransformativeInstance(
  instance: TransformativeInstance,
  unit: Unit | undefined,
  buffs: Buff[],
  enemy: EnemyConfig
): TransformativeInstanceBreakdown {
  const ctx = computeInstanceContext(instance, unit, buffs);
  const levelMultiplier = getLevelMultiplier(ctx.charLevel);
  const reactionCoef = TRANSFORMATIVE_COEF[instance.reactionType];

  const res = effectiveRES(enemy.baseRES, ctx.resShredPercent);
  const resMult = resMultiplier(res);

  const base = transformativeDamage(reactionCoef, levelMultiplier, ctx.em, ctx.reactionBonusPercent, res);

  let critMult: CritTriad | null = null;
  let hit: CritTriad;
  if (instance.allowCrit) {
    critMult = {
      average: critMultiplier('average', ctx.critRate, ctx.critDMG),
      onCrit: critMultiplier('onCrit', ctx.critRate, ctx.critDMG),
      nonCrit: critMultiplier('nonCrit', ctx.critRate, ctx.critDMG),
    };
    hit = { average: base * critMult.average, onCrit: base * critMult.onCrit, nonCrit: base * critMult.nonCrit };
  } else {
    hit = { average: base, onCrit: base, nonCrit: base };
  }

  const total: CritTriad = {
    average: hit.average * instance.hits,
    onCrit: hit.onCrit * instance.hits,
    nonCrit: hit.nonCrit * instance.hits,
  };

  return {
    kind: 'transformative',
    reactionCoef,
    levelMultiplier,
    em: ctx.em,
    reactionBonusPercent: ctx.reactionBonusPercent,
    res,
    resMultiplier: resMult,
    critMultiplier: critMult,
    hit,
    total,
    hits: instance.hits,
  };
}

export type InstanceBreakdown = DamageInstanceBreakdown | TransformativeInstanceBreakdown;

export function computeInstance(
  instance: RotationInstance,
  units: Unit[],
  buffs: Buff[],
  enemy: EnemyConfig
): InstanceBreakdown {
  const unit = units.find((u) => u.id === instance.unitId);
  if (instance.kind === 'damage') return computeDamageInstance(instance, unit, buffs, enemy);
  return computeTransformativeInstance(instance, unit, buffs, enemy);
}
