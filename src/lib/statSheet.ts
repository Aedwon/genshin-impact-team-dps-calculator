// Builds a unit's base stat sheet (§4): character base + weapon base +
// artifact main/substats + ascension/secondary stats + always-on buffs.
// This is the auditable "resting" profile shown in the Unit panel. Partial
// uptime buffs are intentionally excluded here — they are resolved per
// instance in damageCalc.ts.
import { BASE_CRIT_DMG, BASE_CRIT_RATE, BASE_ENERGY_RECHARGE } from '../constants';
import { artifactContributions, type StatContribution } from './artifacts';
import { getCharacterBaseData, getWeaponBaseData } from './genshinData';
import { totalStatValue } from './formulas';
import type { Buff, Element, Unit } from '../types';

export interface StatAccumulator {
  atkPercent: number;
  flatATK: number;
  hpPercent: number;
  flatHP: number;
  defPercent: number;
  flatDEF: number;
  em: number;
  critRate: number;
  critDMG: number;
  er: number;
  elementalDMG: Partial<Record<Element, number>>;
  physicalDMG: number;
}

export function emptyAccumulator(): StatAccumulator {
  return {
    atkPercent: 0,
    flatATK: 0,
    hpPercent: 0,
    flatHP: 0,
    defPercent: 0,
    flatDEF: 0,
    em: 0,
    critRate: 0,
    critDMG: 0,
    er: 0,
    elementalDMG: {},
    physicalDMG: 0,
  };
}

export function addContribution(acc: StatAccumulator, c: StatContribution): void {
  switch (c.field) {
    case 'elementalDMG':
      if (c.element) acc.elementalDMG[c.element] = (acc.elementalDMG[c.element] ?? 0) + c.value;
      break;
    case 'physicalDMG':
      acc.physicalDMG += c.value;
      break;
    case 'healingBonus':
      break; // out of scope for damage calc
    default:
      acc[c.field] += c.value;
  }
}

export function unitIsEligibleForBuff(buff: Buff, unitId: string | null): boolean {
  if (buff.scopeUnitIds === 'all') return true;
  if (!unitId) return false;
  return buff.scopeUnitIds.includes(unitId);
}

export interface BaseStatSheet {
  charBaseAtk: number;
  charBaseHp: number;
  charBaseDef: number;
  weaponBaseAtk: number;
  elementType: Element;
  atk: number;
  hp: number;
  def: number;
  em: number;
  critRate: number;
  critDMG: number;
  er: number;
  /** Always-on elemental DMG% by element, informational (also fed into per-instance calc). */
  elementalDMG: Partial<Record<Element, number>>;
  physicalDMG: number;
}

const EMPTY_SHEET: BaseStatSheet = {
  charBaseAtk: 0,
  charBaseHp: 0,
  charBaseDef: 0,
  weaponBaseAtk: 0,
  elementType: 'Physical',
  atk: 0,
  hp: 0,
  def: 0,
  em: 0,
  critRate: BASE_CRIT_RATE,
  critDMG: BASE_CRIT_DMG,
  er: BASE_ENERGY_RECHARGE,
  elementalDMG: {},
  physicalDMG: 0,
};

/** Static (no-uptime-concept) contributions: character ascension stat + weapon secondary stat + artifacts. */
export function staticContributions(unit: Unit): StatContribution[] {
  const contribs: StatContribution[] = [];
  if (unit.characterName) {
    const charData = getCharacterBaseData(unit.characterName, unit.characterLevel);
    if (charData?.ascensionStat) {
      contribs.push({
        field: charData.ascensionStat.field as any,
        value: charData.ascensionStat.value,
        element: charData.ascensionStat.element,
      });
    }
  }
  if (unit.weaponName) {
    const weaponData = getWeaponBaseData(unit.weaponName, unit.characterLevel);
    if (weaponData?.secondaryStat) {
      contribs.push({
        field: weaponData.secondaryStat.field as any,
        value: weaponData.secondaryStat.value,
        element: weaponData.secondaryStat.element,
      });
    }
  }
  const wielderElement = unit.characterName
    ? getCharacterBaseData(unit.characterName, unit.characterLevel)?.elementType ?? 'Physical'
    : 'Physical';
  contribs.push(...artifactContributions(unit.artifacts, wielderElement));
  return contribs;
}

export function computeBaseStatSheet(unit: Unit, buffs: Buff[]): BaseStatSheet {
  if (!unit.characterName) return EMPTY_SHEET;

  const charData = getCharacterBaseData(unit.characterName, unit.characterLevel);
  const weaponData = unit.weaponName ? getWeaponBaseData(unit.weaponName, unit.characterLevel) : null;
  if (!charData) return EMPTY_SHEET;

  const acc = emptyAccumulator();
  acc.critRate = BASE_CRIT_RATE;
  acc.critDMG = BASE_CRIT_DMG;
  acc.er = BASE_ENERGY_RECHARGE;

  for (const c of staticContributions(unit)) addContribution(acc, c);

  for (const buff of buffs) {
    if (buff.uptimeMode !== 'always') continue;
    if (!unitIsEligibleForBuff(buff, unit.id)) continue;
    for (const effect of buff.effects) {
      if (effect.type === 'elementalDMG') {
        addContribution(acc, { field: 'elementalDMG', value: effect.value, element: effect.element });
      } else if (
        effect.type === 'atkPercent' ||
        effect.type === 'flatATK' ||
        effect.type === 'hpPercent' ||
        effect.type === 'flatHP' ||
        effect.type === 'defPercent' ||
        effect.type === 'flatDEF' ||
        effect.type === 'em' ||
        effect.type === 'critRate' ||
        effect.type === 'critDMG'
      ) {
        addContribution(acc, { field: effect.type, value: effect.value });
      }
      // allDMG/talentDMG/reactionBonus/resShred/defReduction/defIgnore/flatAdditiveBase
      // are inherently per-instance and resolved in damageCalc.ts, not here.
    }
  }

  return {
    charBaseAtk: charData.atk,
    charBaseHp: charData.hp,
    charBaseDef: charData.def,
    weaponBaseAtk: weaponData?.atk ?? 0,
    elementType: charData.elementType,
    atk: totalStatValue(charData.atk + (weaponData?.atk ?? 0), acc.atkPercent, acc.flatATK),
    hp: totalStatValue(charData.hp, acc.hpPercent, acc.flatHP),
    def: totalStatValue(charData.def, acc.defPercent, acc.flatDEF),
    em: acc.em,
    critRate: acc.critRate,
    critDMG: acc.critDMG,
    er: acc.er,
    elementalDMG: acc.elementalDMG,
    physicalDMG: acc.physicalDMG,
  };
}
