// Core domain types for the KQMS team DPS calculator.

export type Element =
  | 'Pyro'
  | 'Hydro'
  | 'Electro'
  | 'Cryo'
  | 'Anemo'
  | 'Geo'
  | 'Dendro'
  | 'Physical';

export type AbilityCategory =
  | 'Normal'
  | 'Charged'
  | 'Plunge'
  | 'Skill'
  | 'Burst'
  | 'Reaction';

export type ScalingStat = 'ATK' | 'HP' | 'DEF' | 'EM';

export type CritMode = 'average' | 'onCrit' | 'nonCrit';

// ---------------------------------------------------------------------------
// §5 KQM artifact substats
// ---------------------------------------------------------------------------

export const SUBSTAT_TYPES = [
  'hpPercent',
  'flatHP',
  'atkPercent',
  'flatATK',
  'defPercent',
  'flatDEF',
  'em',
  'critRate',
  'critDMG',
  'er',
] as const;

export type SubstatType = (typeof SUBSTAT_TYPES)[number];

export const SUBSTAT_LABELS: Record<SubstatType, string> = {
  hpPercent: 'HP%',
  flatHP: 'Flat HP',
  atkPercent: 'ATK%',
  flatATK: 'Flat ATK',
  defPercent: 'DEF%',
  flatDEF: 'Flat DEF',
  em: 'Elemental Mastery',
  critRate: 'Crit Rate',
  critDMG: 'Crit DMG',
  er: 'Energy Recharge',
};

export type SandsMain = 'hpPercent' | 'atkPercent' | 'defPercent' | 'em' | 'er';
export type GobletMain =
  | 'hpPercent'
  | 'atkPercent'
  | 'defPercent'
  | 'em'
  | 'elementalDMG'
  | 'physicalDMG';
export type CircletMain =
  | 'hpPercent'
  | 'atkPercent'
  | 'defPercent'
  | 'em'
  | 'critRate'
  | 'critDMG'
  | 'healingBonus';

/** Maps a main-stat choice to the substat-type "slot" it occupies for cap purposes (null = no overlap with the 10 substat types). */
export function mainStatSubstatType(
  main: SandsMain | GobletMain | CircletMain
): SubstatType | null {
  switch (main) {
    case 'hpPercent':
    case 'atkPercent':
    case 'defPercent':
    case 'em':
    case 'er':
    case 'critRate':
    case 'critDMG':
      return main;
    default:
      return null; // elementalDMG, physicalDMG, healingBonus
  }
}

export interface ArtifactConfig {
  /** Real set, sourced from genshin-db. Cosmetic/reference only — KQMS treats set bonuses as manual buffs (§6), this doesn't feed the damage calc. */
  setName: string | null;
  sandsMain: SandsMain;
  gobletMain: GobletMain;
  circletMain: CircletMain;
  /** User-allocated distributed rolls per substat type; must sum to 20. */
  distributed: Record<SubstatType, number>;
  rarityMix: {
    enabled: boolean;
    /** Number of 4-star pieces out of 5 (0-5); rest are 5-star. */
    count4Star: number;
  };
}

export function defaultArtifactConfig(): ArtifactConfig {
  return {
    setName: null,
    sandsMain: 'atkPercent',
    gobletMain: 'elementalDMG',
    circletMain: 'critRate',
    distributed: {
      hpPercent: 0,
      flatHP: 0,
      atkPercent: 0,
      flatATK: 0,
      defPercent: 0,
      flatDEF: 0,
      em: 0,
      critRate: 0,
      critDMG: 0,
      er: 0,
    },
    rarityMix: { enabled: false, count4Star: 0 },
  };
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export interface TalentLevels {
  normal: number;
  skill: number;
  burst: number;
}

export interface Unit {
  id: string;
  characterName: string | null;
  weaponName: string | null;
  /** 1-5. Doesn't feed the KQMS damage calc (weapon passives are manual buffs) — tracked for reference/export. */
  weaponRefinement: number;
  characterLevel: number;
  constellation: number;
  talentLevels: TalentLevels;
  artifacts: ArtifactConfig;
  /** Elemental Burst energy cost. Auto-suggested from genshin-db, always editable. */
  burstEnergyCost: number;
}

export function createUnit(id: string): Unit {
  return {
    id,
    characterName: null,
    weaponName: null,
    weaponRefinement: 1,
    characterLevel: 90,
    constellation: 0,
    talentLevels: { normal: 9, skill: 9, burst: 9 },
    artifacts: defaultArtifactConfig(),
    burstEnergyCost: 60,
  };
}

// ---------------------------------------------------------------------------
// §6 Buffs
// ---------------------------------------------------------------------------

export type BuffEffectType =
  | 'atkPercent'
  | 'flatATK'
  | 'hpPercent'
  | 'flatHP'
  | 'defPercent'
  | 'flatDEF'
  | 'em'
  | 'critRate'
  | 'critDMG'
  | 'elementalDMG'
  | 'allDMG'
  | 'talentDMG'
  | 'reactionBonus'
  | 'resShred'
  | 'defReduction'
  | 'defIgnore'
  | 'flatAdditiveBase';

export const BUFF_EFFECT_LABELS: Record<BuffEffectType, string> = {
  atkPercent: 'ATK%',
  flatATK: 'Flat ATK',
  hpPercent: 'HP%',
  flatHP: 'Flat HP',
  defPercent: 'DEF%',
  flatDEF: 'Flat DEF',
  em: 'Elemental Mastery',
  critRate: 'Crit Rate',
  critDMG: 'Crit DMG',
  elementalDMG: 'Elemental/All DMG%',
  allDMG: 'Generic DMG%',
  talentDMG: 'Talent-specific DMG%',
  reactionBonus: 'Reaction Bonus%',
  resShred: 'RES Shred',
  defReduction: 'DEF Reduction',
  defIgnore: 'DEF Ignore',
  flatAdditiveBase: 'Flat Additive Base DMG',
};

/** Effects that fold into the unit's base stat sheet when uptime is "always". */
export const STAT_SHEET_EFFECT_TYPES: BuffEffectType[] = [
  'atkPercent',
  'flatATK',
  'hpPercent',
  'flatHP',
  'defPercent',
  'flatDEF',
  'em',
  'critRate',
  'critDMG',
];

/** Effects that apply per damage-instance (never fold into the base sheet, even if "always-on"). */
export const PER_HIT_ONLY_EFFECT_TYPES: BuffEffectType[] = [
  'elementalDMG',
  'allDMG',
  'talentDMG',
  'reactionBonus',
  'resShred',
  'defReduction',
  'defIgnore',
  'flatAdditiveBase',
];

export interface BuffEffect {
  type: BuffEffectType;
  value: number; // percent as a whole number (e.g. 46.6) for %-type effects; flat number otherwise
  element?: Element; // required for elementalDMG
}

export type UptimeMode = 'always' | 'perHit' | 'fractional';

export interface Buff {
  id: string;
  name: string;
  effects: BuffEffect[];
  /** Units this buff can apply to. */
  scopeUnitIds: string[] | 'all';
  /** Ability categories this buff can apply to (relevant for perHit/fractional scoping in the rotation). */
  scopeCategories: AbilityCategory[] | 'all';
  uptimeMode: UptimeMode;
  /** Only used when uptimeMode === 'fractional'. 0-1. */
  fraction?: number;
}

export function createBuff(id: string): Buff {
  return {
    id,
    name: 'New Buff',
    effects: [{ type: 'atkPercent', value: 0 }],
    scopeUnitIds: 'all',
    scopeCategories: 'all',
    uptimeMode: 'always',
  };
}

// ---------------------------------------------------------------------------
// §7 Rotation & damage instances
// ---------------------------------------------------------------------------

export type ReactionType = 'none' | 'vaporize' | 'melt' | 'aggravate' | 'spread';

export type AmpDirection =
  | 'vapeHydroOnPyro'
  | 'vapePyroOnHydro'
  | 'meltPyroOnCryo'
  | 'meltCryoOnPyro';

export type TransformativeType =
  | 'overload'
  | 'superconduct'
  | 'electrocharged'
  | 'swirl'
  | 'shatter'
  | 'bloom'
  | 'hyperbloom'
  | 'burgeon'
  | 'burning';

export const TRANSFORMATIVE_LABELS: Record<TransformativeType, string> = {
  overload: 'Overload',
  superconduct: 'Superconduct',
  electrocharged: 'Electro-Charged',
  swirl: 'Swirl',
  shatter: 'Shatter',
  bloom: 'Bloom',
  hyperbloom: 'Hyperbloom',
  burgeon: 'Burgeon',
  burning: 'Burning',
};

export interface DamageInstance {
  kind: 'damage';
  id: string;
  unitId: string | null;
  label: string;
  category: AbilityCategory;
  element: Element;
  scalingStat: ScalingStat;
  mv: number;
  mvSuggestion: number | null;
  hits: number;
  reaction: ReactionType;
  ampDirection: AmpDirection | null;
  /** buffId -> is this per-hit buff toggled on for this instance. */
  buffToggles: Record<string, boolean>;
}

export interface TransformativeInstance {
  kind: 'transformative';
  id: string;
  unitId: string | null; // EM source
  label: string;
  reactionType: TransformativeType;
  hits: number;
  allowCrit: boolean;
  buffToggles: Record<string, boolean>;
}

export type RotationInstance = DamageInstance | TransformativeInstance;

export function createDamageInstance(id: string): DamageInstance {
  return {
    kind: 'damage',
    id,
    unitId: null,
    label: 'New Hit',
    category: 'Skill',
    element: 'Pyro',
    scalingStat: 'ATK',
    mv: 1,
    mvSuggestion: null,
    hits: 1,
    reaction: 'none',
    ampDirection: null,
    buffToggles: {},
  };
}

export function createTransformativeInstance(id: string): TransformativeInstance {
  return {
    kind: 'transformative',
    id,
    unitId: null,
    label: 'New Reaction',
    reactionType: 'overload',
    hits: 1,
    allowCrit: false,
    buffToggles: {},
  };
}

// ---------------------------------------------------------------------------
// Energy / ER requirements (particle generation, user-supplied)
// ---------------------------------------------------------------------------

export type ParticleTier = 'particle' | 'orb';

export const PARTICLE_TIER_LABELS: Record<ParticleTier, string> = {
  particle: 'Particle (small)',
  orb: 'Orb (large)',
};

/**
 * One source generating particles/orbs for one rotation. Every particle/orb
 * feeds the WHOLE team at once, not just one catcher: `catcherUnitId` is
 * whoever was on-field (active) when these were absorbed, and gets the full
 * same/different/neutral-element value; every other unit automatically gets
 * the reduced off-field share (team-size-dependent) based on their own
 * element match — nobody is "not caught" outright.
 */
export interface ParticleBatch {
  id: string;
  /** Whose Skill/Burst/etc. produces these — also determines the element, unless `isWhite`. */
  sourceUnitId: string | null;
  /** "White"/clear particles: no element, fixed neutral value regardless of source. */
  isWhite: boolean;
  tier: ParticleTier;
  /** Total particles/orbs produced across one rotation. */
  count: number;
  /** Who was on-field (active) when these were absorbed; everyone else gets the off-field share. */
  catcherUnitId: string | null;
}

export function createParticleBatch(id: string): ParticleBatch {
  return {
    id,
    sourceUnitId: null,
    isWhite: false,
    tier: 'particle',
    count: 0,
    catcherUnitId: null,
  };
}

/**
 * A flat energy restoration (talent/constellation/weapon effects worded as
 * "restores N Energy") — per KQM's energy reference, Energy Recharge% does
 * NOT scale this, unlike particles/orbs. Added directly on top.
 */
export interface FlatEnergyGrant {
  id: string;
  unitId: string | null;
  /** Energy restored per occurrence. */
  amount: number;
  /** How many times this triggers across one rotation. */
  occurrences: number;
}

export function createFlatEnergyGrant(id: string): FlatEnergyGrant {
  return { id, unitId: null, amount: 0, occurrences: 1 };
}

// ---------------------------------------------------------------------------
// Enemy & app-level state
// ---------------------------------------------------------------------------

export interface EnemyConfig {
  level: number;
  baseRES: number;
}

export interface AppState {
  units: Unit[];
  buffs: Buff[];
  rotation: RotationInstance[];
  enemy: EnemyConfig;
  rotationDuration: number;
  critMode: CritMode;
  particleBatches: ParticleBatch[];
  flatEnergyGrants: FlatEnergyGrant[];
}
