// Pure damage-formula functions (§3). Nothing here reads from the store —
// callers pass in already-resolved numbers so these stay unit-testable and
// the per-instance breakdown stays traceable to its inputs.
//
// Convention: all "percent" values are whole numbers (46.6 means 46.6%), and
// are converted to fractions internally. Motion values (`mv`) are raw
// fractions matching genshin-db's talent parameter arrays (e.g. 4.666 means
// 466.6% of the scaling stat), so BaseDMG = mv * scalingStatValue with no
// extra scaling.

import { EM_BONUS } from '../constants';
import type { CritMode } from '../types';

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Total ATK/HP/DEF = Base × (1 + %sum) + flatSum. */
export function totalStatValue(base: number, percentSum: number, flatSum: number): number {
  return base * (1 + percentSum / 100) + flatSum;
}

export function critMultiplier(mode: CritMode, critRatePercent: number, critDmgPercent: number): number {
  const cr = clamp(critRatePercent / 100, 0, 1);
  const cd = critDmgPercent / 100;
  switch (mode) {
    case 'average':
      return 1 + cr * cd;
    case 'onCrit':
      return 1 + cd;
    case 'nonCrit':
      return 1;
  }
}

/** DEFMultiplier = (CharLvl+100) / ((CharLvl+100) + (EnemyLvl+100)(1-defRed)(1-defIgnore)). */
export function defMultiplier(
  charLvl: number,
  enemyLvl: number,
  defReductionPercent: number,
  defIgnorePercent: number
): number {
  const defRed = clamp(defReductionPercent / 100, 0, 1);
  const defIgn = clamp(defIgnorePercent / 100, 0, 1);
  const attacker = charLvl + 100;
  const defender = (enemyLvl + 100) * (1 - defRed) * (1 - defIgn);
  return attacker / (attacker + defender);
}

export function effectiveRES(enemyBaseRESPercent: number, resShredPercent: number): number {
  return enemyBaseRESPercent / 100 - resShredPercent / 100;
}

export function resMultiplier(res: number): number {
  if (res < 0) return 1 - res / 2;
  if (res < 0.75) return 1 - res;
  return 1 / (1 + 4 * res);
}

export function amplifyingEMBonus(em: number): number {
  return (EM_BONUS.amplifying.coef * em) / (em + EM_BONUS.amplifying.add);
}

export function additiveEMBonus(em: number): number {
  return (EM_BONUS.additive.coef * em) / (em + EM_BONUS.additive.add);
}

export function transformativeEMBonus(em: number): number {
  return (EM_BONUS.transformative.coef * em) / (em + EM_BONUS.transformative.add);
}

/** AmplifyingMultiplier = AmpBase × (1 + AmpEMBonus + ReactionBonus%). */
export function amplifyingMultiplier(ampBase: number, em: number, reactionBonusPercent: number): number {
  return ampBase * (1 + amplifyingEMBonus(em) + reactionBonusPercent / 100);
}

/** AdditiveReactionBase = ReactionCoef × LevelMultiplier × (1 + AddEMBonus + ReactionBonus%). */
export function additiveReactionBase(
  reactionCoef: number,
  levelMultiplier: number,
  em: number,
  reactionBonusPercent: number
): number {
  return reactionCoef * levelMultiplier * (1 + additiveEMBonus(em) + reactionBonusPercent / 100);
}

/** TransDMG = ReactionCoef × LevelMultiplier × (1 + TransEMBonus + ReactionBonus%) × RESMultiplier. */
export function transformativeDamage(
  reactionCoef: number,
  levelMultiplier: number,
  em: number,
  reactionBonusPercent: number,
  res: number
): number {
  return (
    reactionCoef * levelMultiplier * (1 + transformativeEMBonus(em) + reactionBonusPercent / 100) * resMultiplier(res)
  );
}

/** BaseDMG = TalentMV × ScalingStat + FlatBaseAdd + AdditiveReactionBase. */
export function baseDamage(
  mv: number,
  scalingStatValue: number,
  flatBaseAdd: number,
  additiveReactionBaseValue: number
): number {
  return mv * scalingStatValue + flatBaseAdd + additiveReactionBaseValue;
}

export interface HitMultipliers {
  baseDMG: number;
  totalDmgBonusPercent: number;
  defMult: number;
  resMult: number;
  amplifyingMult: number;
}

/** Hit = BaseDMG × (1+TotalDMGBonus%) × CritMultiplier × DEFMultiplier × RESMultiplier × AmplifyingMultiplier. */
export function hitDamage(inputs: HitMultipliers, critMult: number): number {
  return (
    inputs.baseDMG *
    (1 + inputs.totalDmgBonusPercent / 100) *
    critMult *
    inputs.defMult *
    inputs.resMult *
    inputs.amplifyingMult
  );
}
