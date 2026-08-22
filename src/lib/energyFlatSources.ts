import { getCharacterEnergyData, getEnergyVariant, type CharacterEnergyData } from '../data/energyData';
import type { UnitEnergyConfig } from '../energyTypes';
import type { FlatEnergyGrant, Unit } from '../types';
import { configFor, nonNegative, skillValue, spreadsheetName, type FlatRateSource } from './energyInternals';

export function automaticSkillFlatRates(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, rotationDuration: number
): FlatRateSource[] {
  if (rotationDuration <= 0) return [];
  const out: FlatRateSource[] = [];
  for (const unit of units) {
    const data = getCharacterEnergyData(unit.characterName);
    if (!data) continue;
    const cfg = configFor(unit, configs);
    for (const [slot, skill] of [['primary', cfg.primary], ['secondary', cfg.secondary]] as const) {
      if (skill.usesPerRotation <= 0) continue;
      const variant = getEnergyVariant(data, skill.variantLabel, unit.constellation);
      const flat = skillValue(variant, skill, 'flatEnergyPerUse');
      if (flat > 0) out.push({
        id: `skill-flat:${unit.id}:${slot}`,
        label: `${unit.characterName ?? 'Unit'} ${variant?.label ?? slot} flat Energy`,
        targetUnitId: unit.id,
        ratePerSecond: flat * skill.usesPerRotation / rotationDuration,
      });
    }
    if (cfg.manualFlatEnergyPerRotation > 0) out.push({
      id: `manual-flat-config:${unit.id}`,
      label: `${unit.characterName ?? 'Unit'} manual flat Energy`,
      targetUnitId: unit.id,
      ratePerSecond: cfg.manualFlatEnergyPerRotation / rotationDuration,
    });
  }
  return out;
}

export function weaponFlatRateSources(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, rotationDuration: number
): FlatRateSource[] {
  if (rotationDuration <= 0) return [];
  const out: FlatRateSource[] = [];
  for (const unit of units) {
    const weapon = unit.weaponName ?? '';
    if (!weapon) continue;
    const cfg = configFor(unit, configs);
    const burstEvery = Math.max(1, cfg.burstEveryRotations || 1);
    const burstInterval = rotationDuration * burstEvery;
    const refinement = Math.min(5, Math.max(1, unit.weaponRefinement || 1));
    const skillUsesPerBurst = (nonNegative(cfg.primary.usesPerRotation) + nonNegative(cfg.secondary.usesPerRotation)) * burstEvery;

    if (weapon === 'Amenoma Kageuchi') {
      const seeds = Math.min(3, skillUsesPerBurst);
      if (seeds > 0) out.push({
        id: `weapon:amenoma:${unit.id}`,
        label: `Amenoma Kageuchi R${refinement}`,
        targetUnitId: unit.id,
        ratePerSecond: (4.5 + 1.5 * refinement) * seeds / burstInterval,
      });
    }

    if (weapon === 'Prototype Amber') out.push({
      id: `weapon:prototype-amber:${unit.id}`,
      label: `Prototype Amber R${refinement}`,
      targetUnitId: unit.id,
      ratePerSecond: (3.5 + 0.5 * refinement) * 3 / burstInterval,
    });

    if (weapon === 'Katsuragikiri Nagamasa' || weapon === 'Kitain Cross Spear') {
      const maxTriggers = Math.max(1, Math.floor(rotationDuration / 10));
      const triggers = Math.min(nonNegative(cfg.primary.usesPerRotation) + nonNegative(cfg.secondary.usesPerRotation), maxTriggers);
      if (triggers > 0) out.push({
        id: `weapon:inazuma-craftable:${unit.id}`,
        label: `${weapon} R${refinement}`,
        targetUnitId: unit.id,
        ratePerSecond: (4.5 + 1.5 * refinement) * triggers / rotationDuration,
      });
    }
  }
  return out;
}

export function characterFlatRateSources(
  units: Unit[], configs: Record<string, UnitEnergyConfig>, rotationDuration: number, sourceER: Record<string, number>
): FlatRateSource[] {
  if (rotationDuration <= 0) return [];
  const out: FlatRateSource[] = [];
  for (const unit of units) {
    const name = spreadsheetName(unit);
    const cfg = configFor(unit, configs);
    const burstInterval = rotationDuration * Math.max(1, cfg.burstEveryRotations || 1);

    if (name === 'Diona' && unit.constellation >= 1) out.push({
      id: `character:diona-c1:${unit.id}`, label: 'Diona C1', targetUnitId: unit.id, ratePerSecond: 15 / burstInterval,
    });

    if (name === 'Traveler (Dendro)' && unit.constellation >= 1) {
      const uses = nonNegative(cfg.primary.usesPerRotation) + nonNegative(cfg.secondary.usesPerRotation);
      if (uses > 0) out.push({
        id: `character:dmc-c1:${unit.id}`, label: 'Dendro Traveler C1', targetUnitId: unit.id,
        ratePerSecond: 3.5 * uses / rotationDuration,
      });
    }

    if (name === 'Arlecchino' && unit.constellation >= 4) out.push({
      id: `character:arlecchino-c4:${unit.id}`, label: 'Arlecchino C4', targetUnitId: unit.id, ratePerSecond: 15 / burstInterval,
    });

    if (name === 'Yumemizuki Mizuki' && unit.constellation >= 4) out.push({
      id: `character:mizuki-c4:${unit.id}`, label: 'Mizuki C4', targetUnitId: unit.id, ratePerSecond: 20 / burstInterval,
    });

    if (name === 'Barbara' && unit.constellation >= 1) out.push({
      id: `character:barbara-c1:${unit.id}`, label: 'Barbara C1', targetUnitId: unit.id, ratePerSecond: 0.1,
    });

    if (name === 'Raiden') {
      const talent = Math.min(10, Math.max(1, unit.talentLevels.burst || 1));
      const raidenER = Math.max(100, sourceER[unit.id] ?? 100);
      const refund = (1.5 + 0.1 * talent) * (1 + 0.6 * (raidenER / 100 - 1)) * 5;
      for (const ally of units) if (ally.id !== unit.id) out.push({
        id: `character:raiden:${unit.id}:${ally.id}`,
        label: `Raiden Burst refund (${raidenER.toFixed(1)}% ER)`,
        targetUnitId: ally.id,
        ratePerSecond: refund / burstInterval,
      });
    }
  }
  return out;
}

export function manualFlatRates(grants: FlatEnergyGrant[], rotationDuration: number): FlatRateSource[] {
  if (rotationDuration <= 0) return [];
  return grants
    .filter((grant): grant is FlatEnergyGrant & { unitId: string } => !!grant.unitId && grant.amount > 0 && grant.occurrences > 0)
    .map((grant) => ({
      id: `manual-flat:${grant.id}`,
      label: 'Manual flat Energy',
      targetUnitId: grant.unitId,
      ratePerSecond: grant.amount * grant.occurrences / rotationDuration,
    }));
}

export function burstDiscountFor(unit: Unit, cfg: UnitEnergyConfig, data: CharacterEnergyData | null): number {
  let discount = nonNegative(data?.burstDiscount ?? 0) + nonNegative(cfg.manualBurstCostDiscount);
  if ((data?.name ?? unit.characterName) === 'Kaeya' && unit.constellation >= 6) discount += 15;
  return discount;
}

export function intrinsicERBonusFor(cfg: UnitEnergyConfig, data: CharacterEnergyData | null): number {
  return nonNegative(data?.intrinsicERBonus ?? 0) + nonNegative(cfg.manualIntrinsicERBonus);
}

export function erScaledDirectEnergyAt100(
  unit: Unit, cfg: UnitEnergyConfig, recipientBurstInterval: number, rotationDuration: number
): number {
  if (spreadsheetName(unit) !== 'Dori') return 0;
  const useRate = (nonNegative(cfg.primary.usesPerRotation) + nonNegative(cfg.secondary.usesPerRotation)) / Math.max(rotationDuration, 1);
  return 5 * useRate * recipientBurstInterval;
}
