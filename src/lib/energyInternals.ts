import { PARTICLE_BASE_VALUES } from '../constants';
import { getCharacterEnergyData, type EnergySkillVariantData } from '../data/energyData';
import { createDefaultUnitEnergyConfig, type EnergySkillConfig, type UnitEnergyConfig } from '../energyTypes';
import type { Element, Unit } from '../types';
import { getCharacterBaseData } from './genshinData';

export interface ParticleRateSource {
  id: string;
  label: string;
  sourceUnitId: string | null;
  element: Exclude<Element, 'Physical'> | 'Clear';
  tier: 'particle' | 'orb';
  ratePerSecond: number;
  onFieldFractions: Record<string, number>;
}

export interface FlatRateSource {
  id: string;
  label: string;
  targetUnitId: string;
  ratePerSecond: number;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function elementForUnit(unit: Unit): Exclude<Element, 'Physical'> | null {
  if (!unit.characterName) return null;
  const data = getCharacterBaseData(unit.characterName, unit.characterLevel);
  return data && data.elementType !== 'Physical' ? data.elementType : null;
}

export function configFor(unit: Unit, configs: Record<string, UnitEnergyConfig>): UnitEnergyConfig {
  return configs[unit.id] ?? createDefaultUnitEnergyConfig(unit.id);
}

export function skillValue(
  variant: EnergySkillVariantData | null,
  config: EnergySkillConfig,
  field: 'averageParticles' | 'variance' | 'particlesPerSecond' | 'duration' | 'flatEnergyPerUse'
): number {
  const override = config.overrides[field];
  if (override != null && Number.isFinite(override)) return nonNegative(override);
  return nonNegative(variant?.[field] ?? 0);
}

export function simpleCatchFractions(
  sourceUnitId: string,
  targetUnitId: string | null,
  feedFraction: number
): Record<string, number> {
  const p = clamp01(feedFraction);
  if (!targetUnitId || targetUnitId === sourceUnitId) return { [sourceUnitId]: 1 };
  return { [sourceUnitId]: 1 - p, [targetUnitId]: p };
}

export function fieldTimeFractions(
  units: Unit[],
  configs: Record<string, UnitEnergyConfig>
): Record<string, number> {
  const fractions: Record<string, number> = {};
  for (const unit of units) fractions[unit.id] = clamp01(configFor(unit, configs).timeOnField);
  return fractions;
}

export function particleBaseValue(
  source: ParticleRateSource,
  recipientElement: Exclude<Element, 'Physical'> | null
): number {
  const values = PARTICLE_BASE_VALUES[source.tier];
  if (source.element === 'Clear' || !recipientElement) return values.neutral;
  return source.element === recipientElement ? values.same : values.different;
}

export function spreadsheetName(unit: Unit): string {
  return getCharacterEnergyData(unit.characterName)?.name ?? unit.characterName ?? '';
}
