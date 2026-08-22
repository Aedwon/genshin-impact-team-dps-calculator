import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { getBurstEnergyCostSuggestion, listCharacterNames, listWeaponNames } from '../lib/genshinData';
import { computeBaseStatSheet } from '../lib/statSheet';
import { ArtifactAllocator } from './ArtifactAllocator';
import { SearchableSelect } from './SearchableSelect';
import type { Unit } from '../types';

interface Props {
  unit: Unit;
  canRemove: boolean;
}

const characterNames = listCharacterNames();
const weaponNames = listWeaponNames();

export function UnitCard({ unit, canRemove }: Props) {
  const updateUnit = useStore((s) => s.updateUnit);
  const removeUnit = useStore((s) => s.removeUnit);
  const buffs = useStore((s) => s.buffs);

  const sheet = useMemo(() => computeBaseStatSheet(unit, buffs), [unit, buffs]);
  const burstCostSuggestion = unit.characterName ? getBurstEnergyCostSuggestion(unit.characterName) : null;

  // Backfill burstEnergyCost for units saved before this field existed (or
  // any other path that left it unset) — the display fallback below is
  // cosmetic only, this is what makes the stored value real everywhere else
  // (e.g. the Energy panel's calculations) reads it.
  useEffect(() => {
    if (unit.burstEnergyCost == null && burstCostSuggestion != null) {
      updateUnit(unit.id, { burstEnergyCost: burstCostSuggestion });
    }
  }, [unit.id, unit.burstEnergyCost, burstCostSuggestion, updateUnit]);

  return (
    <div className="unit-card">
      <h3>
        <span>{unit.characterName ?? 'Unassigned unit'}</span>
        {canRemove && (
          <button className="danger" type="button" onClick={() => removeUnit(unit.id)}>
            remove
          </button>
        )}
      </h3>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
        <div className="field">
          <label htmlFor={`char-${unit.id}`}>Character</label>
          <SearchableSelect
            id={`char-${unit.id}`}
            value={unit.characterName}
            onChange={(v) => updateUnit(unit.id, { characterName: v })}
            options={characterNames}
            placeholder="Search character..."
          />
        </div>
        <div className="field">
          <label htmlFor={`weapon-${unit.id}`}>Weapon</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <SearchableSelect
              id={`weapon-${unit.id}`}
              value={unit.weaponName}
              onChange={(v) => updateUnit(unit.id, { weaponName: v })}
              options={weaponNames}
              placeholder="Search weapon..."
            />
            <input
              type="number"
              min={1}
              max={5}
              title="Refinement (doesn't feed the damage calc — weapon passives are manual buffs; tracked for reference/export)"
              style={{ width: 42, flex: '0 0 42px' }}
              value={unit.weaponRefinement ?? 1}
              onChange={(e) => updateUnit(unit.id, { weaponRefinement: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 8 }}>
        <div className="field">
          <label htmlFor={`lvl-${unit.id}`}>Level</label>
          <input
            id={`lvl-${unit.id}`}
            type="number"
            min={1}
            max={90}
            value={unit.characterLevel}
            onChange={(e) => updateUnit(unit.id, { characterLevel: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor={`c-${unit.id}`}>Constellation</label>
          <input
            id={`c-${unit.id}`}
            type="number"
            min={0}
            max={6}
            value={unit.constellation}
            onChange={(e) => updateUnit(unit.id, { constellation: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor={`talent-normal-${unit.id}`}>Normal Atk Lv</label>
          <input
            id={`talent-normal-${unit.id}`}
            type="number"
            min={1}
            max={15}
            value={unit.talentLevels.normal}
            onChange={(e) => updateUnit(unit.id, { talentLevels: { ...unit.talentLevels, normal: Number(e.target.value) } })}
          />
        </div>
        <div className="field">
          <label htmlFor={`talent-skill-${unit.id}`}>Skill Lv</label>
          <input
            id={`talent-skill-${unit.id}`}
            type="number"
            min={1}
            max={15}
            value={unit.talentLevels.skill}
            onChange={(e) => updateUnit(unit.id, { talentLevels: { ...unit.talentLevels, skill: Number(e.target.value) } })}
          />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 10 }}>
        <div className="field">
          <label htmlFor={`talent-burst-${unit.id}`}>Burst Lv</label>
          <input
            id={`talent-burst-${unit.id}`}
            type="number"
            min={1}
            max={15}
            value={unit.talentLevels.burst}
            onChange={(e) => updateUnit(unit.id, { talentLevels: { ...unit.talentLevels, burst: Number(e.target.value) } })}
          />
        </div>
        <div className="field">
          <label htmlFor={`burst-cost-${unit.id}`}>Burst Energy Cost</label>
          <input
            id={`burst-cost-${unit.id}`}
            type="number"
            min={0}
            value={unit.burstEnergyCost ?? 60}
            onChange={(e) => updateUnit(unit.id, { burstEnergyCost: Number(e.target.value) })}
          />
          {burstCostSuggestion != null && burstCostSuggestion !== unit.burstEnergyCost && (
            <button
              type="button"
              className="copy-btn"
              style={{ marginTop: 2 }}
              onClick={() => updateUnit(unit.id, { burstEnergyCost: burstCostSuggestion })}
            >
              genshin-db suggests {burstCostSuggestion}
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll" style={{ marginBottom: 10 }}>
        <table className="dense">
          <thead>
            <tr>
              <th>ATK</th>
              <th>HP</th>
              <th>DEF</th>
              <th>EM</th>
              <th>CR%</th>
              <th>CD%</th>
              <th>ER%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">{sheet.atk.toFixed(1)}</td>
              <td className="num">{sheet.hp.toFixed(1)}</td>
              <td className="num">{sheet.def.toFixed(1)}</td>
              <td className="num">{sheet.em.toFixed(1)}</td>
              <td className="num">{sheet.critRate.toFixed(1)}</td>
              <td className="num">{sheet.critDMG.toFixed(1)}</td>
              <td className="num">{sheet.er.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {Object.keys(sheet.elementalDMG).length > 0 && (
        <p className="subtle">
          Always-on elemental DMG%:{' '}
          {Object.entries(sheet.elementalDMG)
            .map(([el, v]) => `${el} +${v.toFixed(1)}%`)
            .join(', ')}
        </p>
      )}

      <h3 style={{ marginTop: 10 }}>Artifacts (KQMS)</h3>
      <ArtifactAllocator
        artifacts={unit.artifacts}
        wielderElement={sheet.elementType}
        onChange={(patch) => updateUnit(unit.id, { artifacts: { ...unit.artifacts, ...patch } })}
      />
    </div>
  );
}
