import { SUBSTAT_ROLL_VALUES } from '../constants';
import type { Buff, Unit } from '../types';
import { distributedRollBudget, perSubstatCap, raritySubstatScalar, totalDistributed } from './artifacts';
import { nonNegative } from './energyInternals';
import { computeBaseStatSheet } from './statSheet';

export interface ERReservationResult {
  desiredRolls: number;
  reservedRolls: number;
  maxAvailableRolls: number;
  erPerRoll: number;
  baseERWithoutDistributedRolls: number;
  attainableER: number;
  erShortfall: number;
}

function baseERWithoutDistributedRolls(unit: Unit, buffs: Buff[]): number {
  const clone: Unit = {
    ...unit,
    artifacts: { ...unit.artifacts, distributed: { ...unit.artifacts.distributed, er: 0 } },
  };
  return computeBaseStatSheet(clone, buffs).er;
}

export function reservationFor(unit: Unit, buffs: Buff[], requiredER: number | null, autoReserve: boolean): ERReservationResult {
  const baseER = baseERWithoutDistributedRolls(unit, buffs);
  const erPerRoll = SUBSTAT_ROLL_VALUES.er * raritySubstatScalar(unit.artifacts);
  const otherRolls = totalDistributed(unit.artifacts) - nonNegative(unit.artifacts.distributed.er);
  const budgetRemaining = Math.max(0, distributedRollBudget(unit.artifacts) - otherRolls);
  const maxAvailableRolls = Math.max(0, Math.min(perSubstatCap(unit.artifacts, 'er'), budgetRemaining));
  const desiredRolls = requiredER == null || requiredER <= baseER || erPerRoll <= 0
    ? 0
    : Math.max(0, Math.ceil((requiredER - baseER - 1e-9) / erPerRoll));
  const reservedRolls = autoReserve
    ? Math.min(desiredRolls, maxAvailableRolls)
    : Math.min(nonNegative(unit.artifacts.distributed.er), maxAvailableRolls);
  const attainableER = baseER + reservedRolls * erPerRoll;
  return {
    desiredRolls,
    reservedRolls,
    maxAvailableRolls,
    erPerRoll,
    baseERWithoutDistributedRolls: baseER,
    attainableER,
    erShortfall: requiredER == null ? 0 : Math.max(0, requiredER - attainableER),
  };
}
