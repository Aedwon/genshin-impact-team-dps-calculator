import { createDefaultEnergySettings, createDefaultUnitEnergyConfig } from '../energyTypes';
import { createUnit } from '../types';
import { computeTeamEnergyPlan } from './energyModel';

export const SPREADSHEET_ENERGY_REGRESSION = [
  { name: 'Sandrone', uses: 5, fieldTime: 0.55, cost: 60, requiredER: 168.1614349776 },
  { name: 'Odette', uses: 1, fieldTime: 0.15, cost: 60, requiredER: 171.2328767123 },
  { name: 'Traveler (Cryo)', uses: 1, fieldTime: 0.15, cost: 60, requiredER: 183.8235294118 },
  { name: 'Alyosha', uses: 1, fieldTime: 0.15, cost: 70, requiredER: 275.1572327044 },
] as const;

/**
 * Development regression fixture copied from the reference spreadsheet's
 * default team. Throws if the energy model drifts by more than 0.002 ER pp.
 */
export function assertSpreadsheetEnergyRegression(): void {
  const units = SPREADSHEET_ENERGY_REGRESSION.map((fixture, index) => {
    const unit = createUnit(`energy-regression-${index}`);
    unit.characterName = fixture.name;
    unit.burstEnergyCost = fixture.cost;
    return unit;
  });
  const configs = Object.fromEntries(units.map((unit, index) => {
    const config = createDefaultUnitEnergyConfig(unit.id);
    config.primary.usesPerRotation = SPREADSHEET_ENERGY_REGRESSION[index].uses;
    config.timeOnField = SPREADSHEET_ENERGY_REGRESSION[index].fieldTime;
    return [unit.id, config];
  }));
  const plan = computeTeamEnergyPlan(units, configs, createDefaultEnergySettings(), 20, [], [], []);
  for (let index = 0; index < SPREADSHEET_ENERGY_REGRESSION.length; index++) {
    const expected = SPREADSHEET_ENERGY_REGRESSION[index].requiredER;
    const actual = plan.units[index]?.requiredER;
    if (actual == null || Math.abs(actual - expected) > 0.002) {
      throw new Error(`${SPREADSHEET_ENERGY_REGRESSION[index].name}: expected ${expected}, got ${actual}`);
    }
  }
}
