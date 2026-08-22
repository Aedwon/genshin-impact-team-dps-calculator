// KQMS artifact substat model (§5): fixed + distributed roll pool, per-substat
// caps, and 4-star rarity-mix averaging. All allocator math lives here so the
// UI stepper and the stat-sheet computation share one source of truth.
import {
  FIXED_ROLLS_PER_SUBSTAT,
  MAIN_STAT_VALUES_5STAR,
  RARITY_MIX,
  SUBSTAT_ROLL_VALUES,
  TOTAL_DISTRIBUTED_ROLLS,
} from '../constants';
import {
  SUBSTAT_TYPES,
  mainStatSubstatType,
  type ArtifactConfig,
  type Element,
  type SubstatType,
} from '../types';

export interface StatContribution {
  field:
    | SubstatType
    | 'elementalDMG'
    | 'physicalDMG'
    | 'healingBonus';
  value: number;
  element?: Element;
}

/** Total distributed rolls the user must allocate; shrinks by 2 per 4-star piece (§5 rarity mix). */
export function distributedRollBudget(artifacts: ArtifactConfig): number {
  if (!artifacts.rarityMix.enabled) return TOTAL_DISTRIBUTED_ROLLS;
  return Math.max(
    0,
    TOTAL_DISTRIBUTED_ROLLS - artifacts.rarityMix.count4Star * RARITY_MIX.distributedRollPenaltyPer4Star
  );
}

/** How many of the 5 pieces (Flower/Feather/Sands/Goblet/Circlet) have this substat type as their main stat. */
export function piecesWithMainStat(artifacts: ArtifactConfig, type: SubstatType): number {
  let count = 0;
  if (type === 'flatHP') count++; // Flower
  if (type === 'flatATK') count++; // Feather
  if (mainStatSubstatType(artifacts.sandsMain) === type) count++;
  if (mainStatSubstatType(artifacts.gobletMain) === type) count++;
  if (mainStatSubstatType(artifacts.circletMain) === type) count++;
  return count;
}

/** Per-substat cap = 2 x (pieces whose main stat != that type) (§5). */
export function perSubstatCap(artifacts: ArtifactConfig, type: SubstatType): number {
  return FIXED_ROLLS_PER_SUBSTAT * (5 - piecesWithMainStat(artifacts, type));
}

export function totalDistributed(artifacts: ArtifactConfig): number {
  return SUBSTAT_TYPES.reduce((sum, t) => sum + artifacts.distributed[t], 0);
}

export interface AllocatorValidation {
  valid: boolean;
  totalDistributed: number;
  budget: number;
  remaining: number;
  overCapTypes: SubstatType[];
  errors: string[];
}

export function validateAllocator(artifacts: ArtifactConfig): AllocatorValidation {
  const budget = distributedRollBudget(artifacts);
  const total = totalDistributed(artifacts);
  const overCapTypes = SUBSTAT_TYPES.filter(
    (t) => artifacts.distributed[t] > perSubstatCap(artifacts, t)
  );
  const errors: string[] = [];
  if (total !== budget) {
    errors.push(
      total > budget
        ? `Distributed rolls exceed the budget by ${total - budget} (allocated ${total}, budget ${budget}).`
        : `${budget - total} distributed roll(s) remaining (allocated ${total} of ${budget}).`
    );
  }
  for (const t of overCapTypes) {
    errors.push(`${t} exceeds its cap of ${perSubstatCap(artifacts, t)} distributed rolls.`);
  }
  return { valid: errors.length === 0, totalDistributed: total, budget, remaining: budget - total, overCapTypes, errors };
}

/** Effective per-roll scalar multiplier from the 5-star/4-star rarity mix (1.0 when disabled). */
export function raritySubstatScalar(artifacts: ArtifactConfig): number {
  if (!artifacts.rarityMix.enabled) return 1;
  const count4 = Math.min(5, Math.max(0, artifacts.rarityMix.count4Star));
  const count5 = 5 - count4;
  return (count5 * 1 + count4 * RARITY_MIX.statModifier4Star) / 5;
}

export function mainStatValue(
  main: ArtifactConfig['sandsMain'] | ArtifactConfig['gobletMain'] | ArtifactConfig['circletMain']
): number {
  switch (main) {
    case 'hpPercent':
      return MAIN_STAT_VALUES_5STAR.hpPercent;
    case 'atkPercent':
      return MAIN_STAT_VALUES_5STAR.atkPercent;
    case 'defPercent':
      return MAIN_STAT_VALUES_5STAR.defPercent;
    case 'em':
      return MAIN_STAT_VALUES_5STAR.em;
    case 'er':
      return MAIN_STAT_VALUES_5STAR.er;
    case 'critRate':
      return MAIN_STAT_VALUES_5STAR.critRate;
    case 'critDMG':
      return MAIN_STAT_VALUES_5STAR.critDMG;
    case 'elementalDMG':
      return MAIN_STAT_VALUES_5STAR.elementalDMG;
    case 'physicalDMG':
      return MAIN_STAT_VALUES_5STAR.physicalDMG;
    case 'healingBonus':
      return MAIN_STAT_VALUES_5STAR.healingBonus;
    default:
      return 0;
  }
}

/**
 * Full list of stat contributions from this unit's artifacts: fixed main
 * stats (Flower/Feather + chosen Sands/Goblet/Circlet) and the substat roll
 * pool (fixed 2/type + user-distributed, scaled by rarity mix).
 * `wielderElement` resolves the Goblet's elemental-DMG% main stat, which
 * always matches the equipping character's element.
 */
export function artifactContributions(
  artifacts: ArtifactConfig,
  wielderElement: Element
): StatContribution[] {
  const out: StatContribution[] = [
    { field: 'flatHP', value: MAIN_STAT_VALUES_5STAR.flowerFlatHP },
    { field: 'flatATK', value: MAIN_STAT_VALUES_5STAR.featherFlatATK },
  ];

  const sandsField = mainStatSubstatType(artifacts.sandsMain);
  out.push({
    field: sandsField ?? 'healingBonus',
    value: mainStatValue(artifacts.sandsMain),
  });

  const gobletField = mainStatSubstatType(artifacts.gobletMain);
  out.push({
    field: gobletField ?? (artifacts.gobletMain as 'elementalDMG' | 'physicalDMG'),
    value: mainStatValue(artifacts.gobletMain),
    element: artifacts.gobletMain === 'elementalDMG' ? wielderElement : undefined,
  });

  const circletField = mainStatSubstatType(artifacts.circletMain);
  out.push({
    field: circletField ?? 'healingBonus',
    value: mainStatValue(artifacts.circletMain),
  });

  const scalar = raritySubstatScalar(artifacts);
  for (const type of SUBSTAT_TYPES) {
    const rolls = FIXED_ROLLS_PER_SUBSTAT + artifacts.distributed[type];
    out.push({ field: type, value: rolls * SUBSTAT_ROLL_VALUES[type] * scalar });
  }

  return out;
}

export type ArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet';

export interface PseudoArtifactPiece {
  slot: ArtifactSlot;
  mainStat: {
    field: SubstatType | 'elementalDMG' | 'physicalDMG' | 'healingBonus';
    value: number;
    element?: Element;
  };
  substats: { type: SubstatType; value: number }[];
}

/**
 * Fabricates a real-looking 5-piece breakdown (Flower/Feather/Sands/Goblet/
 * Circlet) whose substats sum back to the pooled KQM totals exactly. Our
 * model doesn't track real per-piece rolls, so each of the 10 substat totals
 * is placed whole onto one piece — the least-loaded piece whose main stat
 * doesn't conflict with that type — rather than split across several. Which
 * piece a given substat lands on isn't meaningful; only the totals are real.
 */
export function distributeSubstatsToPieces(artifacts: ArtifactConfig, wielderElement: Element): PseudoArtifactPiece[] {
  const pieces: Array<PseudoArtifactPiece & { excludeSubstat: SubstatType | null }> = [
    {
      slot: 'flower',
      mainStat: { field: 'flatHP', value: MAIN_STAT_VALUES_5STAR.flowerFlatHP },
      substats: [],
      excludeSubstat: 'flatHP',
    },
    {
      slot: 'plume',
      mainStat: { field: 'flatATK', value: MAIN_STAT_VALUES_5STAR.featherFlatATK },
      substats: [],
      excludeSubstat: 'flatATK',
    },
    {
      slot: 'sands',
      mainStat: { field: mainStatSubstatType(artifacts.sandsMain) ?? 'healingBonus', value: mainStatValue(artifacts.sandsMain) },
      substats: [],
      excludeSubstat: mainStatSubstatType(artifacts.sandsMain),
    },
    {
      slot: 'goblet',
      mainStat: {
        field: mainStatSubstatType(artifacts.gobletMain) ?? (artifacts.gobletMain as 'elementalDMG' | 'physicalDMG'),
        value: mainStatValue(artifacts.gobletMain),
        element: artifacts.gobletMain === 'elementalDMG' ? wielderElement : undefined,
      },
      substats: [],
      excludeSubstat: mainStatSubstatType(artifacts.gobletMain),
    },
    {
      slot: 'circlet',
      mainStat: { field: mainStatSubstatType(artifacts.circletMain) ?? 'healingBonus', value: mainStatValue(artifacts.circletMain) },
      substats: [],
      excludeSubstat: mainStatSubstatType(artifacts.circletMain),
    },
  ];

  const scalar = raritySubstatScalar(artifacts);
  for (const type of SUBSTAT_TYPES) {
    const rolls = FIXED_ROLLS_PER_SUBSTAT + artifacts.distributed[type];
    const value = Math.round(rolls * SUBSTAT_ROLL_VALUES[type] * scalar * 10) / 10;
    if (value <= 0) continue;
    const eligible = pieces.filter((p) => p.excludeSubstat !== type && p.substats.length < 4);
    eligible.sort((a, b) => a.substats.length - b.substats.length);
    eligible[0]?.substats.push({ type, value });
  }

  return pieces.map(({ excludeSubstat: _excludeSubstat, ...rest }) => rest);
}
