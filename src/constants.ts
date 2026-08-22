/**
 * All numeric constants for the KQMS damage model live here (per spec §9).
 * Nothing in the calculation code should hardcode a coefficient — read it from
 * this file so a single number can be corrected in one place.
 *
 * VERIFY-BEFORE-TRUSTING: values below are standard, widely-published
 * theorycrafting constants (KQM / genshin-optimizer / Honey Hunter World era
 * values circa Elemental Mastery formula rework). Sanity-check against a
 * current theorycrafting reference before using outputs for anything public.
 */

import type { SubstatType } from './types';

// ---------------------------------------------------------------------------
// §5 KQM artifact substats
// ---------------------------------------------------------------------------

/** Per-roll value of each substat type at 5-star rarity. VERIFY. */
export const SUBSTAT_ROLL_VALUES: Record<SubstatType, number> = {
  hpPercent: 4.96,
  flatHP: 253.94,
  atkPercent: 4.96,
  flatATK: 16.54,
  defPercent: 6.2,
  flatDEF: 19.68,
  em: 19.82,
  critRate: 3.31,
  critDMG: 6.62,
  er: 5.51,
};

/** Fixed rolls every substat type receives automatically (§5). */
export const FIXED_ROLLS_PER_SUBSTAT = 2;

/** Total rolls the user must distribute across the 10 substat types (§5). */
export const TOTAL_DISTRIBUTED_ROLLS = 20;

/** 4-star piece stat modifier + distributed-roll penalty (§5, advanced). */
export const RARITY_MIX = {
  statModifier4Star: 0.8,
  distributedRollPenaltyPer4Star: 2,
};

/**
 * Max-level (5-star, +20) main-stat values, standard theorycrafting table.
 * VERIFY. Flower/Feather have a single fixed main stat; Sands/Goblet/Circlet
 * are user-selectable among the options below.
 */
export const MAIN_STAT_VALUES_5STAR = {
  flowerFlatHP: 4780,
  featherFlatATK: 311,
  hpPercent: 46.6,
  atkPercent: 46.6,
  defPercent: 58.3,
  em: 187,
  er: 51.8,
  elementalDMG: 46.6,
  physicalDMG: 58.3,
  critRate: 31.1,
  critDMG: 62.2,
  healingBonus: 35.9,
} as const;

// ---------------------------------------------------------------------------
// Character base stats (well-known Genshin constants, not KQM-specific)
// ---------------------------------------------------------------------------

export const BASE_CRIT_RATE = 5; // %
export const BASE_CRIT_DMG = 50; // %
export const BASE_ENERGY_RECHARGE = 100; // %

// ---------------------------------------------------------------------------
// §3 Reaction coefficients
// ---------------------------------------------------------------------------

/** Amplifying (vaporize/melt) base multipliers by direction. VERIFY. */
export const AMPLIFYING_BASE = {
  vapeHydroOnPyro: 2.0,
  vapePyroOnHydro: 1.5,
  meltPyroOnCryo: 2.0,
  meltCryoOnPyro: 1.5,
};

/** Additive (aggravate/spread) reaction coefficients. VERIFY. */
export const ADDITIVE_COEF = {
  aggravate: 1.15,
  spread: 1.25,
};

/** Transformative reaction coefficients. VERIFY. */
export const TRANSFORMATIVE_COEF = {
  overload: 2.0,
  superconduct: 0.5,
  electrocharged: 1.2,
  swirl: 0.6,
  shatter: 1.5,
  bloom: 2.0,
  hyperbloom: 3.0,
  burgeon: 3.0,
  burning: 0.25,
};

/** EM formula constants (§3/§9). VERIFY. */
export const EM_BONUS = {
  amplifying: { coef: 2.78, add: 1400 },
  additive: { coef: 5, add: 1200 },
  transformative: { coef: 16, add: 2000 },
};

/**
 * Reaction Level-Multiplier table, indexed by character level (1-90).
 * Only the level-90 value is guaranteed accurate here; intermediate levels
 * are linearly interpolated as a placeholder and should be replaced with the
 * exact table from a current theorycrafting reference if non-lvl90 rotations
 * are needed. VERIFY, especially any non-90 lookups.
 */
export const LEVEL_MULTIPLIER_LVL90 = 1446.85;

export const LEVEL_MULTIPLIER_TABLE: Record<number, number> = {
  1: 4.16,
  10: 15.36,
  20: 39.14,
  30: 74.99,
  40: 121.72,
  50: 205.51,
  60: 296.72,
  70: 471.34,
  80: 738.9,
  90: LEVEL_MULTIPLIER_LVL90,
};

export function getLevelMultiplier(level: number): number {
  const table = LEVEL_MULTIPLIER_TABLE;
  const levels = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  if (level <= levels[0]) return table[levels[0]];
  if (level >= levels[levels.length - 1]) return table[levels[levels.length - 1]];
  for (let i = 0; i < levels.length - 1; i++) {
    const lo = levels[i];
    const hi = levels[i + 1];
    if (level >= lo && level <= hi) {
      const t = (level - lo) / (hi - lo);
      return table[lo] + t * (table[hi] - table[lo]);
    }
  }
  return LEVEL_MULTIPLIER_LVL90;
}

// ---------------------------------------------------------------------------
// §9 Default enemy
// ---------------------------------------------------------------------------

/** baseRES is a whole-number percent (10 means 10%), matching this app's percent convention. */
export const DEFAULT_ENEMY = {
  level: 100,
  baseRES: 10,
};

export const DEFAULT_CHARACTER_LEVEL = 90;

// ---------------------------------------------------------------------------
// Energy / ER requirements (not part of the original KQMS damage spec — added
// as a supplementary feasibility check). Sourced from KQM's own energy
// mechanics reference (library.keqingmains.com/combat-mechanics/energy).
// VERIFY against a current reference before trusting for a public guide.
// ---------------------------------------------------------------------------

/** Base energy value per particle/orb at 100% Energy Recharge, on-field. */
export const PARTICLE_BASE_VALUES = {
  particle: { same: 3, neutral: 2, different: 1 },
  orb: { same: 9, neutral: 6, different: 3 },
} as const;

/**
 * Off-field characters receive a reduced share of particle/orb energy,
 * depending on total party size (the on-field character always gets 100%).
 * Solo (1-unit) teams have no off-field concept, so the multiplier is 1.
 */
export function getOffFieldMultiplier(teamSize: number): number {
  if (teamSize <= 1) return 1;
  if (teamSize === 2) return 0.8;
  if (teamSize === 3) return 0.7;
  return 0.6; // 4-member team
}
