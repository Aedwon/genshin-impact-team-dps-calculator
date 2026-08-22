// Interop export to gidmgcalculator.web.app's file format. This is a
// separate, explicitly user-triggered feature — unlike the rest of this app
// it calls a third-party public API (CORS-open) to resolve the character/
// weapon/artifact-set numeric codes that tool's file format requires, since
// our own KQMS model never tracks those (set bonuses are manual buffs here).
//
// The pseudo-per-piece breakdown itself (pooled substats fabricated into 5
// pieces) is shared with the in-app artifact display — see
// distributeSubstatsToPieces in lib/artifacts.ts.
import { distributeSubstatsToPieces } from './artifacts';
import { getCharacterBaseData } from './genshinData';
import type { SubstatType, Unit } from '../types';

export const GIDMG_METADATA_URL = 'https://gidmgcalculator.vercel.app/api/meta-data';

export interface GidmgCharacterMeta {
  code: number;
  name: string;
  weaponType: string;
}

export interface GidmgWeaponMeta {
  code: number;
  name: string;
  type: string;
}

export interface GidmgArtifactSetMeta {
  code: number;
  name: string;
}

export interface GidmgMetadata {
  version: string;
  characters: GidmgCharacterMeta[];
  weapons: GidmgWeaponMeta[];
  artifacts: GidmgArtifactSetMeta[];
}

let cachedMetadata: Promise<GidmgMetadata> | null = null;

/** Fetches and caches (in-memory, for this session) gidmgcalculator's public metadata. */
export function fetchGidmgMetadata(): Promise<GidmgMetadata> {
  if (!cachedMetadata) {
    cachedMetadata = fetch(GIDMG_METADATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`gidmgcalculator metadata request failed (HTTP ${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!json?.data?.characters) throw new Error('Unexpected response shape from gidmgcalculator metadata API');
        return json.data as GidmgMetadata;
      })
      .catch((err) => {
        cachedMetadata = null; // allow retry next call
        throw err;
      });
  }
  return cachedMetadata;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Exact name match first, then "their name is a nickname/suffix of ours" (e.g. "Kazuha" vs "Kaedehara Kazuha"). */
function findByName<T extends { name: string }>(entries: T[], ourName: string): T | null {
  const exact = entries.find((e) => e.name === ourName);
  if (exact) return exact;
  const normOurs = normalize(ourName);
  return entries.find((e) => normOurs.endsWith(normalize(e.name))) ?? null;
}

const LEVEL_BREAKPOINTS = [20, 40, 50, 60, 70, 80, 90];

/** Our characterLevel is a single number and always assumed post-ascension (see genshinData's '+' lookup). */
function formatLevel(level: number): string {
  for (const bp of LEVEL_BREAKPOINTS) {
    if (level <= bp) return level === bp ? `${bp}/${bp}` : `${level}/${bp}`;
  }
  return '90/90';
}

const SUBSTAT_KEY_MAP: Record<SubstatType, string> = {
  hpPercent: 'hp_',
  flatHP: 'hp',
  atkPercent: 'atk_',
  flatATK: 'atk',
  defPercent: 'def_',
  flatDEF: 'def',
  em: 'em',
  critRate: 'cRate_',
  critDMG: 'cDmg_',
  er: 'er_',
};

function mainStatKeyFromField(mainStat: { field: SubstatType | 'elementalDMG' | 'physicalDMG' | 'healingBonus'; element?: string }): string {
  if (mainStat.field === 'elementalDMG') return (mainStat.element ?? 'physical').toLowerCase();
  if (mainStat.field === 'physicalDMG') return 'phys';
  if (mainStat.field === 'healingBonus') return 'healB_';
  return SUBSTAT_KEY_MAP[mainStat.field];
}

export interface UnitExportOptions {
  artifactSetCode: number | null;
}

export interface GidmgExportOutcome {
  fileData: {
    version: number;
    characters: unknown[];
    weapons: unknown[];
    artifacts: unknown[];
    setups: unknown[];
  };
  warnings: string[];
}

export function buildGidmgExport(
  units: Unit[],
  meta: GidmgMetadata,
  options: Record<string, UnitExportOptions>
): GidmgExportOutcome {
  const warnings: string[] = [];
  let idSeed = Date.now();
  const nextId = () => idSeed++;

  const characters: unknown[] = [];
  const weapons: unknown[] = [];
  const artifacts: unknown[] = [];

  for (const unit of units) {
    const label = unit.characterName ?? 'Unassigned unit';
    if (!unit.characterName) continue;

    const charMeta = findByName(meta.characters, unit.characterName);
    if (!charMeta) {
      warnings.push(`Skipped ${label}: not found in gidmgcalculator's character database.`);
      continue;
    }

    const opts = options[unit.id];
    if (!opts?.artifactSetCode) {
      warnings.push(`Skipped ${label}: no artifact set chosen for export (required — real artifacts always belong to a set).`);
      continue;
    }

    if (!unit.weaponName) {
      warnings.push(`Skipped ${label}: no weapon selected.`);
      continue;
    }
    const weaponMeta = findByName(meta.weapons, unit.weaponName);
    if (!weaponMeta) {
      warnings.push(`Skipped ${label}: weapon "${unit.weaponName}" not found in gidmgcalculator's database.`);
      continue;
    }

    const charData = getCharacterBaseData(unit.characterName, unit.characterLevel);
    const wielderElement = charData?.elementType ?? 'Physical';

    const weaponId = nextId();
    weapons.push({
      ID: weaponId,
      code: weaponMeta.code,
      type: weaponMeta.type,
      level: formatLevel(unit.characterLevel),
      refi: Math.min(5, Math.max(1, unit.weaponRefinement ?? 1)),
      owner: charMeta.code,
    });

    const pieces = distributeSubstatsToPieces(unit.artifacts, wielderElement);
    const artifactIDs: number[] = [];
    for (const piece of pieces) {
      const id = nextId();
      artifactIDs.push(id);
      artifacts.push({
        ID: id,
        code: opts.artifactSetCode,
        type: piece.slot,
        rarity: 5,
        level: 20,
        mainStatType: mainStatKeyFromField(piece.mainStat),
        subStats: piece.substats.map((s) => ({ type: SUBSTAT_KEY_MAP[s.type], value: s.value })),
        owner: charMeta.code,
      });
    }

    characters.push({
      code: charMeta.code,
      level: formatLevel(unit.characterLevel),
      NAs: unit.talentLevels.normal,
      ES: unit.talentLevels.skill,
      EB: unit.talentLevels.burst,
      cons: unit.constellation,
      enhanced: false,
      weaponID: weaponId,
      artifactIDs,
    });
  }

  return {
    fileData: { version: 6, characters, weapons, artifacts, setups: [] },
    warnings,
  };
}

export function downloadGidmgExport(outcome: GidmgExportOutcome, filename = 'gidmgcalculator-import.json'): void {
  const blob = new Blob([JSON.stringify(outcome.fileData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
