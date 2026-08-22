// Energy Recharge feasibility check: not part of the original KQMS damage
// spec, added on top so a rotation's ER requirements can be validated before
// worrying about damage. Particle generation is user-supplied (sourced from
// online references) since it isn't reliably present in genshin-db's data.
import { PARTICLE_BASE_VALUES, getOffFieldMultiplier } from '../constants';
import { getCharacterBaseData } from './genshinData';
import { computeBaseStatSheet } from './statSheet';
import type { Buff, FlatEnergyGrant, ParticleBatch, Unit } from '../types';

/** unitId -> character element, resolved once per calc pass. */
function buildElementLookup(units: Unit[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const u of units) {
    if (!u.characterName) continue;
    const data = getCharacterBaseData(u.characterName, u.characterLevel);
    if (data) map.set(u.id, data.elementType);
  }
  return map;
}

function particleValueFor(batch: ParticleBatch, sourceElement: string | undefined, catcherElement: string | undefined): number {
  const values = PARTICLE_BASE_VALUES[batch.tier];
  if (batch.isWhite || !sourceElement) return values.neutral;
  return sourceElement === catcherElement ? values.same : values.different;
}

export interface UnitEnergyResult {
  unitId: string;
  currentER: number;
  burstEnergyCost: number;
  /** Raw particle/orb energy accumulated per rotation at 100% ER (before this unit's ER% is applied). */
  rawEnergyPerRotation: number;
  /** Flat energy restoration per rotation — NOT scaled by ER%. */
  flatEnergyPerRotation: number;
  /** Total energy received per rotation: (raw x ER%) + flat. */
  energyReceived: number;
  /** Minimum ER% (whole-number percent) needed to reach the burst cost, accounting for flat energy already covering part of it. */
  requiredER: number | null;
  ready: boolean;
  shortfall: number;
}

export function computeEnergyResults(
  units: Unit[],
  batches: ParticleBatch[],
  grants: FlatEnergyGrant[],
  buffs: Buff[]
): UnitEnergyResult[] {
  const teamSize = units.length;
  const offFieldMult = getOffFieldMultiplier(teamSize);
  const elementByUnit = buildElementLookup(units);

  return units.map((unit) => {
    const sheet = computeBaseStatSheet(unit, buffs);
    const currentER = sheet.er;

    let rawEnergyPerRotation = 0;
    for (const batch of batches) {
      if (batch.count <= 0) continue;
      // Every particle/orb feeds the whole team: the on-field catcher gets full
      // value, everyone else automatically gets the reduced off-field share —
      // nobody is "not caught" outright.
      const sourceElement = batch.isWhite
        ? undefined
        : batch.sourceUnitId
          ? elementByUnit.get(batch.sourceUnitId)
          : undefined;
      const value = particleValueFor(batch, sourceElement, elementByUnit.get(unit.id));
      const isCatcher = batch.catcherUnitId === unit.id;
      rawEnergyPerRotation += value * batch.count * (isCatcher ? 1 : offFieldMult);
    }

    const flatEnergyPerRotation = grants
      .filter((g) => g.unitId === unit.id)
      .reduce((sum, g) => sum + g.amount * g.occurrences, 0);

    const burstEnergyCost = unit.burstEnergyCost ?? 0;
    const energyReceived = rawEnergyPerRotation * (currentER / 100) + flatEnergyPerRotation;
    const remainingNeed = Math.max(0, burstEnergyCost - flatEnergyPerRotation);
    const requiredER = remainingNeed <= 0 ? 0 : rawEnergyPerRotation > 0 ? (remainingNeed / rawEnergyPerRotation) * 100 : null;
    const ready = burstEnergyCost === 0 || energyReceived >= burstEnergyCost;

    return {
      unitId: unit.id,
      currentER,
      burstEnergyCost,
      rawEnergyPerRotation,
      flatEnergyPerRotation,
      energyReceived,
      requiredER,
      ready,
      shortfall: Math.max(0, burstEnergyCost - energyReceived),
    };
  });
}
