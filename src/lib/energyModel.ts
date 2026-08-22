import { getOffFieldMultiplier } from '../constants';
import { getCharacterEnergyData } from '../data/energyData';
import type { EnergySettings, UnitEnergyConfig } from '../energyTypes';
import type { Buff, FlatEnergyGrant, ParticleBatch, Unit } from '../types';
import { reservationFor, type ERReservationResult } from './energyArtifacts';
import {
  automaticSkillFlatRates,
  burstDiscountFor,
  characterFlatRateSources,
  erScaledDirectEnergyAt100,
  intrinsicERBonusFor,
  manualFlatRates,
  weaponFlatRateSources,
} from './energyFlatSources';
import { clamp01, configFor, elementForUnit, nonNegative, particleBaseValue } from './energyInternals';
import {
  buildAutomaticParticleSources,
  electroResonanceSource,
  enemyParticleSources,
  manualParticleSources,
} from './energyParticleSources';
import { computeBaseStatSheet } from './statSheet';

export interface EnergySourceBreakdown {
  id: string;
  label: string;
  energyAt100ER: number;
}

export interface UnitEnergyPlanResult {
  unitId: string;
  burstEnergyCost: number;
  burstCostDiscount: number;
  effectiveBurstCost: number;
  burstIntervalSeconds: number;
  particleEnergyAt100ER: number;
  erScaledDirectEnergyAt100ER: number;
  erScaledEnergyAt100ER: number;
  flatEnergyPerBurst: number;
  intrinsicERBonus: number;
  requiredER: number | null;
  attainedStaticER: number;
  effectiveERForEnergy: number;
  energyReceived: number;
  ready: boolean;
  energyShortfall: number;
  reservation: ERReservationResult;
  particleBreakdown: EnergySourceBreakdown[];
  flatBreakdown: { label: string; amount: number }[];
  warnings: string[];
}

export interface TeamEnergyPlanResult {
  units: UnitEnergyPlanResult[];
  iterations: number;
  converged: boolean;
  warnings: string[];
}

function computeOnce(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, settings: EnergySettings, rotationDuration: number,
  batches: ParticleBatch[], grants: FlatEnergyGrant[], buffs: Buff[], sourceER: Record<string, number>
): UnitEnergyPlanResult[] {
  const offField = getOffFieldMultiplier(units.length);
  const particleSources = [
    ...buildAutomaticParticleSources(units, configs, settings, rotationDuration),
    ...manualParticleSources(units, batches, rotationDuration),
    ...enemyParticleSources(units, configs, settings),
  ];
  const resonance = electroResonanceSource(units, configs, settings);
  if (resonance) particleSources.push(resonance);
  const flatSources = [
    ...automaticSkillFlatRates(units, configs, rotationDuration),
    ...weaponFlatRateSources(units, configs, rotationDuration),
    ...characterFlatRateSources(units, configs, rotationDuration, sourceER),
    ...manualFlatRates(grants, rotationDuration),
  ];

  return units.map((unit) => {
    const cfg = configFor(unit, configs);
    const data = getCharacterEnergyData(unit.characterName);
    const recipientElement = elementForUnit(unit);
    const burstIntervalSeconds = rotationDuration * Math.max(1, cfg.burstEveryRotations || 1);
    const particleBreakdown: EnergySourceBreakdown[] = [];
    let particleEnergyAt100ER = 0;

    for (const source of particleSources) {
      const count = source.ratePerSecond * burstIntervalSeconds;
      if (count <= 0) continue;
      const onFieldFraction = clamp01(source.onFieldFractions[unit.id] ?? 0);
      const catchMultiplier = onFieldFraction + (1 - onFieldFraction) * offField;
      const energy = count * particleBaseValue(source, recipientElement) * catchMultiplier;
      if (energy <= 0) continue;
      particleEnergyAt100ER += energy;
      particleBreakdown.push({ id: source.id, label: source.label, energyAt100ER: energy });
    }

    const erScaledDirect = erScaledDirectEnergyAt100(unit, cfg, burstIntervalSeconds, rotationDuration);
    const erScaledEnergyAt100ER = particleEnergyAt100ER + erScaledDirect;
    const flatBreakdown: { label: string; amount: number }[] = [];
    let flatEnergyPerBurst = 0;
    for (const source of flatSources) {
      if (source.targetUnitId !== unit.id) continue;
      const amount = source.ratePerSecond * burstIntervalSeconds;
      if (amount <= 0) continue;
      flatEnergyPerBurst += amount;
      flatBreakdown.push({ label: source.label, amount });
    }

    const burstEnergyCost = nonNegative(unit.burstEnergyCost ?? data?.burstEnergy ?? 0);
    const burstCostDiscount = burstDiscountFor(unit, cfg, data);
    const effectiveBurstCost = Math.max(0, burstEnergyCost - burstCostDiscount);
    const intrinsicERBonus = intrinsicERBonusFor(cfg, data);
    const remainingNeed = Math.max(0, effectiveBurstCost - flatEnergyPerBurst);
    const requiredER = remainingNeed <= 0 ? 100 : erScaledEnergyAt100ER > 0
      ? Math.max(100, remainingNeed / erScaledEnergyAt100ER * 100 - intrinsicERBonus)
      : null;
    const reservation = reservationFor(unit, buffs, requiredER, settings.autoReserveERRolls);
    const attainedStaticER = reservation.attainableER;
    const effectiveERForEnergy = attainedStaticER + intrinsicERBonus;
    const energyReceived = erScaledEnergyAt100ER * effectiveERForEnergy / 100 + flatEnergyPerBurst;
    const energyShortfall = Math.max(0, effectiveBurstCost - energyReceived);
    const warnings: string[] = [];
    if (!data && unit.characterName) warnings.push('No spreadsheet energy data found; use manual sources/overrides.');
    if (requiredER == null) warnings.push('No ER-scaled energy source reaches this character.');
    if (reservation.erShortfall > 0) warnings.push(`ER artifacts are short by ${reservation.erShortfall.toFixed(1)} percentage points.`);
    if (data?.help) warnings.push(data.help);

    return {
      unitId: unit.id, burstEnergyCost, burstCostDiscount, effectiveBurstCost, burstIntervalSeconds,
      particleEnergyAt100ER, erScaledDirectEnergyAt100ER: erScaledDirect, erScaledEnergyAt100ER,
      flatEnergyPerBurst, intrinsicERBonus, requiredER, attainedStaticER, effectiveERForEnergy,
      energyReceived, ready: effectiveBurstCost === 0 || energyReceived + 1e-9 >= effectiveBurstCost,
      energyShortfall, reservation, particleBreakdown, flatBreakdown, warnings,
    };
  });
}

export function computeTeamEnergyPlan(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, settings: EnergySettings, rotationDuration: number,
  batches: ParticleBatch[], grants: FlatEnergyGrant[], buffs: Buff[]
): TeamEnergyPlanResult {
  if (units.length === 0) return { units: [], iterations: 0, converged: true, warnings: [] };
  let sourceER: Record<string, number> = {};
  for (const unit of units) sourceER[unit.id] = computeBaseStatSheet(unit, buffs).er;

  let results: UnitEnergyPlanResult[] = [];
  let converged = false;
  let iterations = 0;
  for (let i = 0; i < 12; i++) {
    iterations = i + 1;
    results = computeOnce(units, configs, settings, rotationDuration, batches, grants, buffs, sourceER);
    const nextER: Record<string, number> = {};
    let changed = false;
    for (const result of results) {
      nextER[result.unitId] = result.effectiveERForEnergy;
      if (Math.abs((sourceER[result.unitId] ?? 0) - nextER[result.unitId]) > 0.01) changed = true;
    }
    sourceER = nextER;
    if (!changed) { converged = true; break; }
  }

  results = computeOnce(units, configs, settings, rotationDuration, batches, grants, buffs, sourceER);
  const warnings: string[] = [];
  if (!converged) warnings.push('ER-dependent energy effects did not fully converge after 12 iterations.');
  const fieldTimeTotal = units.reduce((sum, unit) => sum + clamp01(configFor(unit, configs).timeOnField), 0);
  if (Math.abs(fieldTimeTotal - 1) > 0.02) warnings.push(`Team field-time shares total ${(fieldTimeTotal * 100).toFixed(0)}%; 100% is recommended.`);
  return { units: results, iterations, converged, warnings };
}

export function buildAutoReservedArtifacts(unit: Unit, result: UnitEnergyPlanResult) {
  return { ...unit.artifacts, distributed: { ...unit.artifacts.distributed, er: result.reservation.reservedRolls } };
}
