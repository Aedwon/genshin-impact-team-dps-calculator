// Thin wrapper around the `genshin-db` package: character/weapon/talent
// lookups and conversion of its raw FIGHT_PROP stat model into this app's
// stat-sheet fields. Roster/weapon lists come live from the package, so the
// tool never hardcodes a fixed roster (per spec §4).
import gdb from 'genshin-db';
import type { AbilityCategory, Element } from '../types';

type GdbAny = any;
const db = gdb as GdbAny;

export type FlatOrPercentField =
  | 'hpPercent'
  | 'flatHP'
  | 'atkPercent'
  | 'flatATK'
  | 'defPercent'
  | 'flatDEF'
  | 'em'
  | 'critRate'
  | 'critDMG'
  | 'er'
  | 'elementalDMG'
  | 'physicalDMG'
  | 'healingBonus';

interface FightPropMapping {
  field: FlatOrPercentField;
  isPercent: boolean;
  element?: Element;
}

const FIGHT_PROP_MAP: Record<string, FightPropMapping> = {
  FIGHT_PROP_HP_PERCENT: { field: 'hpPercent', isPercent: true },
  FIGHT_PROP_ATTACK_PERCENT: { field: 'atkPercent', isPercent: true },
  FIGHT_PROP_DEFENSE_PERCENT: { field: 'defPercent', isPercent: true },
  FIGHT_PROP_ELEMENT_MASTERY: { field: 'em', isPercent: false },
  FIGHT_PROP_CRITICAL: { field: 'critRate', isPercent: true },
  FIGHT_PROP_CRITICAL_HURT: { field: 'critDMG', isPercent: true },
  FIGHT_PROP_CHARGE_EFFICIENCY: { field: 'er', isPercent: true },
  FIGHT_PROP_HEAL_ADD: { field: 'healingBonus', isPercent: true },
  FIGHT_PROP_PHYSICAL_ADD_HURT: { field: 'physicalDMG', isPercent: true },
  FIGHT_PROP_FIRE_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Pyro' },
  FIGHT_PROP_WATER_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Hydro' },
  FIGHT_PROP_ELEC_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Electro' },
  FIGHT_PROP_ICE_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Cryo' },
  FIGHT_PROP_WIND_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Anemo' },
  FIGHT_PROP_ROCK_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Geo' },
  FIGHT_PROP_GRASS_ADD_HURT: { field: 'elementalDMG', isPercent: true, element: 'Dendro' },
};

const ELEMENT_TYPE_MAP: Record<string, Element> = {
  ELEMENT_PYRO: 'Pyro',
  ELEMENT_HYDRO: 'Hydro',
  ELEMENT_ELECTRO: 'Electro',
  ELEMENT_CRYO: 'Cryo',
  ELEMENT_ANEMO: 'Anemo',
  ELEMENT_GEO: 'Geo',
  ELEMENT_DENDRO: 'Dendro',
  ELEMENT_NONE: 'Physical',
};

export function listCharacterNames(): string[] {
  const names = db.characters('names', { matchCategories: true }) as string[];
  return Array.from(new Set(names)).sort();
}

export function listWeaponNames(): string[] {
  const names = db.weapons('names', { matchCategories: true }) as string[];
  return Array.from(new Set(names)).sort();
}

export function listArtifactSetNames(): string[] {
  const names = db.artifacts('names', { matchCategories: true }) as string[];
  return Array.from(new Set(names)).sort();
}

export interface ArtifactSetInfo {
  name: string;
  effect2Pc: string;
  effect4Pc: string;
}

export function getArtifactSet(name: string): ArtifactSetInfo | null {
  const set = db.artifacts(name);
  if (!set) return null;
  return { name: set.name, effect2Pc: set.effect2Pc ?? '', effect4Pc: set.effect4Pc ?? '' };
}

export function getCharacter(name: string): GdbAny | undefined {
  return db.characters(name);
}

export function getWeapon(name: string): GdbAny | undefined {
  return db.weapons(name);
}

export function getTalents(characterName: string): GdbAny | undefined {
  return db.talents(characterName);
}

export interface AscensionStat {
  field: FlatOrPercentField;
  /** Value already converted: whole-number percent for %-type fields, flat number otherwise. */
  value: number;
  element?: Element;
}

function readAscensionStat(fightPropKey: string | undefined, specialized: number | undefined): AscensionStat | null {
  if (!fightPropKey || specialized === undefined) return null;
  const mapping = FIGHT_PROP_MAP[fightPropKey];
  if (!mapping) return null;
  return {
    field: mapping.field,
    value: mapping.isPercent ? specialized * 100 : specialized,
    element: mapping.element,
  };
}

export interface CharacterBaseData {
  hp: number;
  atk: number;
  def: number;
  elementType: Element;
  ascensionStat: AscensionStat | null;
}

/** Base HP/ATK/DEF + ascension stat at the given level ('+' = post-ascension breakpoint). */
export function getCharacterBaseData(name: string, level: number): CharacterBaseData | null {
  const char = getCharacter(name);
  if (!char) return null;
  const stats = char.stats(level, '+');
  return {
    hp: stats.hp ?? 0,
    atk: stats.attack ?? 0,
    def: stats.defense ?? 0,
    elementType: ELEMENT_TYPE_MAP[char.elementType] ?? 'Physical',
    ascensionStat: readAscensionStat(char.substatType, stats.specialized),
  };
}

export interface WeaponBaseData {
  atk: number;
  secondaryStat: AscensionStat | null;
}

export function getWeaponBaseData(name: string, level: number): WeaponBaseData | null {
  const weapon = getWeapon(name);
  if (!weapon) return null;
  const stats = weapon.stats(level, '+');
  return {
    atk: stats.attack ?? 0,
    secondaryStat: readAscensionStat(weapon.mainStatType, stats.specialized),
  };
}

/** Talent motion-value suggestions for a character, keyed by ability category. */
export interface TalentMvSuggestion {
  category: AbilityCategory;
  hitLabel: string;
  /** Values indexed by talent level (0 = level 1). */
  valuesByTalentLevel: number[];
}

/**
 * Labels embed their param references as literal tokens, e.g.
 * "Skill DMG|{param1:P}" or "Low/High Plunge DMG|{param11:P}/{param12:P}".
 * A label's position in the `labels` array does NOT reliably correspond to
 * the same position in `Object.keys(parameters)` — some labels embed more
 * than one {paramN} token, which shifts every later label out of alignment.
 * Always resolve the param key by parsing the token out of the label text.
 */
function firstParamKeyInLabel(label: string): string | null {
  const match = label.match(/\{(param\d+):/);
  return match ? match[1] : null;
}

function extractMvSuggestions(
  detail: GdbAny | undefined,
  category: AbilityCategory
): TalentMvSuggestion[] {
  if (!detail?.attributes?.parameters || !detail?.attributes?.labels) return [];
  const { labels, parameters } = detail.attributes;
  const out: TalentMvSuggestion[] = [];
  labels.forEach((label: string) => {
    // Only surface entries that look like DMG% motion values, skip stamina cost etc.
    if (!/DMG/i.test(label)) return;
    const key = firstParamKeyInLabel(label);
    const values = key ? parameters[key] : undefined;
    if (!Array.isArray(values)) return;
    out.push({ category, hitLabel: label.split('|')[0], valuesByTalentLevel: values });
  });
  return out;
}

/** Best-effort MV reference table for a character's Normal/Charged/Plunge, Skill, and Burst. */
export function getTalentMvSuggestions(characterName: string): TalentMvSuggestion[] {
  const talent = getTalents(characterName);
  if (!talent) return [];
  return [
    ...extractMvSuggestions(talent.combat1, 'Normal'),
    ...extractMvSuggestions(talent.combat2, 'Skill'),
    ...extractMvSuggestions(talent.combat3, 'Burst'),
  ];
}

/** Burst energy cost, read from the "Energy Cost" parameter embedded in the Burst talent (constant across talent levels). */
export function getBurstEnergyCostSuggestion(characterName: string): number | null {
  const talent = getTalents(characterName);
  const detail = talent?.combat3;
  if (!detail?.attributes?.parameters || !detail?.attributes?.labels) return null;
  const { labels, parameters } = detail.attributes;
  const label = labels.find((l: string) => /energy cost/i.test(l));
  const key = label ? firstParamKeyInLabel(label) : null;
  const values = key ? parameters[key] : undefined;
  return Array.isArray(values) ? values[0] ?? null : null;
}
