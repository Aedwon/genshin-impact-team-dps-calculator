import { getCharacterEnergyData, type EnergySkillVariantData } from '../data/energyData';
import type { EnergySettings, EnergySkillConfig, UnitEnergyConfig } from '../energyTypes';
import type { Element, ParticleBatch, Unit } from '../types';
import {
  configFor,
  elementForUnit,
  fieldTimeFractions,
  nonNegative,
  simpleCatchFractions,
  skillValue,
  spreadsheetName,
  type ParticleRateSource,
} from './energyInternals';
import { getEnergyVariant } from './energyVariants';

const RNG_MULTIPLIER = { average: 0, safe: 0.5, worst: 1 } as const;

function adjustedParticleScalar(variance: number, settings: EnergySettings): number {
  return Math.max(0, 1 - nonNegative(variance) * RNG_MULTIPLIER[settings.rngMode]);
}

function extraTurretDeployments(unit: Unit, variant: EnergySkillVariantData | null, slot: 'primary' | 'secondary', primaryUsesPerBurst: number): number {
  const name = spreadsheetName(unit);
  if (name === 'Fischl') return slot === 'primary' ? 1 : primaryUsesPerBurst <= 0 ? 1 : 0;
  if (name === 'Kokomi' && variant?.label === 'Refresh') return 1;
  if (name === 'Ineffa' && slot === 'primary') return 1;
  return 0;
}

export function buildAutomaticParticleSources(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, settings: EnergySettings, rotationDuration: number
): ParticleRateSource[] {
  if (rotationDuration <= 0) return [];
  const out: ParticleRateSource[] = [];
  const turretCatch = fieldTimeFractions(units, configs);

  for (const unit of units) {
    const sourceElement = elementForUnit(unit);
    const data = getCharacterEnergyData(unit.characterName);
    if (!sourceElement || !data) continue;
    const cfg = configFor(unit, configs);
    const burstEvery = Math.max(1, cfg.burstEveryRotations || 1);
    const burstInterval = rotationDuration * burstEvery;
    const primaryVariant = getEnergyVariant(data, cfg.primary.variantLabel, unit.constellation);
    const secondaryVariant = cfg.secondary.usesPerRotation > 0 || cfg.secondary.variantLabel
      ? getEnergyVariant(data, cfg.secondary.variantLabel, unit.constellation)
      : null;
    const primaryUses = nonNegative(cfg.primary.usesPerRotation) * burstEvery;
    const secondaryUses = nonNegative(cfg.secondary.usesPerRotation) * burstEvery;
    let usedTurretUptime = 0;

    const slots: Array<{ slot: 'primary' | 'secondary'; config: EnergySkillConfig; variant: EnergySkillVariantData | null; uses: number }> = [
      { slot: 'primary', config: cfg.primary, variant: primaryVariant, uses: primaryUses },
      { slot: 'secondary', config: cfg.secondary, variant: secondaryVariant, uses: secondaryUses },
    ];

    for (const entry of slots) {
      if (!entry.variant || (entry.slot === 'secondary' && entry.uses <= 0)) continue;
      const scalar = adjustedParticleScalar(skillValue(entry.variant, entry.config, 'variance'), settings);
      const pps = skillValue(entry.variant, entry.config, 'particlesPerSecond');
      const duration = skillValue(entry.variant, entry.config, 'duration');
      const isTurret = pps > 0 && duration > 0;
      let ratePerSecond = 0;
      let catches: Record<string, number>;

      if (isTurret) {
        const uptime = Math.min(
          Math.max(0, burstInterval - usedTurretUptime),
          duration * Math.max(0, entry.uses + extraTurretDeployments(unit, entry.variant, entry.slot, primaryUses))
        );
        usedTurretUptime += uptime;
        ratePerSecond = pps * scalar * uptime / burstInterval;
        catches = turretCatch;
      } else {
        ratePerSecond = skillValue(entry.variant, entry.config, 'averageParticles') * scalar * Math.max(0, entry.uses) / burstInterval;
        catches = simpleCatchFractions(unit.id, entry.config.funnelTargetUnitId, entry.config.funnelFraction);
      }

      if (ratePerSecond > 0) out.push({
        id: `skill:${unit.id}:${entry.slot}`,
        label: `${unit.characterName ?? 'Unit'} ${entry.variant.label}`,
        sourceUnitId: unit.id,
        element: sourceElement,
        tier: 'particle',
        ratePerSecond,
        onFieldFractions: catches,
      });
    }

    const favTriggers = nonNegative(cfg.favoniusTriggersPerRotation);
    if (favTriggers > 0) out.push({
      id: `favonius:${unit.id}`,
      label: `${unit.characterName ?? 'Unit'} Favonius`,
      sourceUnitId: unit.id,
      element: 'Clear',
      tier: 'particle',
      ratePerSecond: 3 * favTriggers / rotationDuration,
      onFieldFractions: simpleCatchFractions(unit.id, cfg.favoniusTargetUnitId, cfg.favoniusFeedFraction),
    });
  }
  return out;
}

export function manualParticleSources(units: Unit[], batches: ParticleBatch[], rotationDuration: number): ParticleRateSource[] {
  if (rotationDuration <= 0) return [];
  const elementByUnit = new Map(units.map((unit) => [unit.id, elementForUnit(unit)]));
  return batches.filter((batch) => batch.count > 0).map((batch) => ({
    id: `manual:${batch.id}`,
    label: 'Manual particle source',
    sourceUnitId: batch.sourceUnitId,
    element: batch.isWhite ? 'Clear' : elementByUnit.get(batch.sourceUnitId ?? '') ?? 'Clear',
    tier: batch.tier,
    ratePerSecond: nonNegative(batch.count) / rotationDuration,
    onFieldFractions: batch.catcherUnitId ? { [batch.catcherUnitId]: 1 } : {},
  }));
}

export function enemyParticleSources(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, settings: EnergySettings
): ParticleRateSource[] {
  if (settings.enemyParticleMode === 'none' || settings.clearTimeSeconds <= 0) return [];
  const counts = settings.enemyParticleMode === 'default'
    ? { Clear: 9, Anemo: 0, Cryo: 0, Dendro: 0, Electro: 0, Geo: 0, Hydro: 0, Pyro: 0 }
    : settings.customEnemyParticles;
  const catches = fieldTimeFractions(units, configs);
  return Object.entries(counts).filter(([, count]) => count > 0).map(([element, count]) => ({
    id: `enemy:${element}`,
    label: `Enemy HP particles (${element})`,
    sourceUnitId: null,
    element: element as ParticleRateSource['element'],
    tier: 'particle',
    ratePerSecond: count / settings.clearTimeSeconds,
    onFieldFractions: catches,
  }));
}

export function electroResonanceSource(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, settings: EnergySettings
): ParticleRateSource | null {
  const elements = units.map(elementForUnit).filter(Boolean) as Exclude<Element, 'Physical'>[];
  const hasTwoElectro = elements.filter((element) => element === 'Electro').length >= 2;
  const hasPartner = elements.some((element) => ['Pyro', 'Hydro', 'Cryo', 'Dendro'].includes(element));
  if (!hasTwoElectro || !hasPartner) return null;
  return {
    id: 'resonance:electro',
    label: 'High Voltage (Electro Resonance)',
    sourceUnitId: null,
    element: 'Electro',
    tier: 'particle',
    ratePerSecond: 1 / Math.max(5, settings.electroReactionIntervalSeconds || 5),
    onFieldFractions: fieldTimeFractions(units, configs),
  };
}
