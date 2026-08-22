import type { Element } from './types';

export type ParticleRngMode = 'average' | 'safe' | 'worst';
export type EnemyParticleMode = 'default' | 'none' | 'custom';

export interface EnergySourceOverride {
  averageParticles: number | null;
  variance: number | null;
  particlesPerSecond: number | null;
  duration: number | null;
  flatEnergyPerUse: number | null;
}

export interface EnergySkillConfig {
  variantLabel: string | null;
  usesPerRotation: number;
  funnelTargetUnitId: string | null;
  funnelFraction: number;
  overrides: EnergySourceOverride;
}

export interface UnitEnergyConfig {
  unitId: string;
  primary: EnergySkillConfig;
  secondary: EnergySkillConfig;
  timeOnField: number;
  burstEveryRotations: number;
  favoniusTriggersPerRotation: number;
  favoniusTargetUnitId: string | null;
  favoniusFeedFraction: number;
  /** Extra direct energy to this unit per base rotation. Not multiplied by ER. */
  manualFlatEnergyPerRotation: number;
  /** Extra burst cost reduction applied once per burst. */
  manualBurstCostDiscount: number;
  /** Extra effective ER in percentage points, e.g. an averaged temporary ER buff. */
  manualIntrinsicERBonus: number;
}

export interface EnemyParticleCounts {
  Clear: number;
  Anemo: number;
  Cryo: number;
  Dendro: number;
  Electro: number;
  Geo: number;
  Hydro: number;
  Pyro: number;
}

export interface EnergySettings {
  rngMode: ParticleRngMode;
  enemyParticleMode: EnemyParticleMode;
  clearTimeSeconds: number;
  customEnemyParticles: EnemyParticleCounts;
  electroReactionIntervalSeconds: number;
  autoReserveERRolls: boolean;
}

export interface EnergyStateSlice {
  energySettings: EnergySettings;
  unitEnergyConfigs: Record<string, UnitEnergyConfig>;
}

export function createEmptyEnergySourceOverride(): EnergySourceOverride {
  return {
    averageParticles: null,
    variance: null,
    particlesPerSecond: null,
    duration: null,
    flatEnergyPerUse: null,
  };
}

export function createDefaultEnergySkillConfig(usesPerRotation: number): EnergySkillConfig {
  return {
    variantLabel: null,
    usesPerRotation,
    funnelTargetUnitId: null,
    funnelFraction: 1,
    overrides: createEmptyEnergySourceOverride(),
  };
}

export function createDefaultUnitEnergyConfig(unitId: string): UnitEnergyConfig {
  return {
    unitId,
    primary: createDefaultEnergySkillConfig(1),
    secondary: createDefaultEnergySkillConfig(0),
    timeOnField: 0.25,
    burstEveryRotations: 1,
    favoniusTriggersPerRotation: 0,
    favoniusTargetUnitId: null,
    favoniusFeedFraction: 1,
    manualFlatEnergyPerRotation: 0,
    manualBurstCostDiscount: 0,
    manualIntrinsicERBonus: 0,
  };
}

export function createDefaultEnergySettings(): EnergySettings {
  return {
    rngMode: 'average',
    enemyParticleMode: 'default',
    clearTimeSeconds: 90,
    customEnemyParticles: {
      Clear: 9,
      Anemo: 0,
      Cryo: 0,
      Dendro: 0,
      Electro: 0,
      Geo: 0,
      Hydro: 0,
      Pyro: 0,
    },
    electroReactionIntervalSeconds: 5.5,
    autoReserveERRolls: true,
  };
}

export const ENERGY_ELEMENTS: Exclude<Element, 'Physical'>[] = [
  'Anemo',
  'Cryo',
  'Dendro',
  'Electro',
  'Geo',
  'Hydro',
  'Pyro',
];
