import { useMemo } from 'react';
import {
  distributedRollBudget,
  perSubstatCap,
  totalDistributed,
  validateAllocator,
} from '../lib/artifacts';
import { getArtifactSet, listArtifactSetNames } from '../lib/genshinData';
import { SUBSTAT_LABELS, SUBSTAT_TYPES, type ArtifactConfig, type CircletMain, type Element, type GobletMain, type SandsMain } from '../types';
import { ArtifactPiecesView } from './ArtifactPiecesView';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  artifacts: ArtifactConfig;
  wielderElement: Element;
  onChange: (patch: Partial<ArtifactConfig>) => void;
}

const artifactSetNames = listArtifactSetNames();

const SANDS_OPTIONS: { value: SandsMain; label: string }[] = [
  { value: 'hpPercent', label: 'HP%' },
  { value: 'atkPercent', label: 'ATK%' },
  { value: 'defPercent', label: 'DEF%' },
  { value: 'em', label: 'EM' },
  { value: 'er', label: 'Energy Recharge%' },
];

const GOBLET_OPTIONS: { value: GobletMain; label: string }[] = [
  { value: 'hpPercent', label: 'HP%' },
  { value: 'atkPercent', label: 'ATK%' },
  { value: 'defPercent', label: 'DEF%' },
  { value: 'em', label: 'EM' },
  { value: 'elementalDMG', label: 'Elemental DMG%' },
  { value: 'physicalDMG', label: 'Physical DMG%' },
];

const CIRCLET_OPTIONS: { value: CircletMain; label: string }[] = [
  { value: 'hpPercent', label: 'HP%' },
  { value: 'atkPercent', label: 'ATK%' },
  { value: 'defPercent', label: 'DEF%' },
  { value: 'em', label: 'EM' },
  { value: 'critRate', label: 'Crit Rate%' },
  { value: 'critDMG', label: 'Crit DMG%' },
  { value: 'healingBonus', label: 'Healing Bonus%' },
];

export function ArtifactAllocator({ artifacts, wielderElement, onChange }: Props) {
  const validation = validateAllocator(artifacts);
  const budget = distributedRollBudget(artifacts);
  const total = totalDistributed(artifacts);
  const setInfo = useMemo(() => (artifacts.setName ? getArtifactSet(artifacts.setName) : null), [artifacts.setName]);

  function setDistributed(type: (typeof SUBSTAT_TYPES)[number], next: number) {
    const cap = perSubstatCap(artifacts, type);
    const current = artifacts.distributed[type];
    const wouldBeTotal = total - current + next;
    if (next < 0 || next > cap || wouldBeTotal > budget) return; // hard block, no silent clamp
    onChange({ distributed: { ...artifacts.distributed, [type]: next } });
  }

  return (
    <div>
      <div className="field" style={{ marginBottom: 8, maxWidth: 260 }}>
        <label htmlFor="artifactSetName">Artifact set (reference only — bonuses are manual buffs, §6)</label>
        <SearchableSelect
          id="artifactSetName"
          value={artifacts.setName}
          onChange={(v) => onChange({ setName: v })}
          options={artifactSetNames}
          placeholder="Search set..."
        />
      </div>
      {setInfo && (
        <p className="subtle" style={{ marginBottom: 8 }}>
          <strong>2pc:</strong> {setInfo.effect2Pc} <strong>4pc:</strong> {setInfo.effect4Pc}
        </p>
      )}

      <ArtifactPiecesView artifacts={artifacts} wielderElement={wielderElement} />

      <div className="row" style={{ marginBottom: 8 }}>
        <div className="field">
          <label htmlFor="sandsMain">Sands</label>
          <select id="sandsMain" value={artifacts.sandsMain} onChange={(e) => onChange({ sandsMain: e.target.value as SandsMain })}>
            {SANDS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gobletMain">Goblet</label>
          <select id="gobletMain" value={artifacts.gobletMain} onChange={(e) => onChange({ gobletMain: e.target.value as GobletMain })}>
            {GOBLET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="circletMain">Circlet</label>
          <select id="circletMain" value={artifacts.circletMain} onChange={(e) => onChange({ circletMain: e.target.value as CircletMain })}>
            {CIRCLET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 6 }}>
        <span className="pill">
          Distributed {total} / {budget}
        </span>
        {validation.valid ? (
          <span className="pill" style={{ color: 'var(--ok)' }}>
            valid
          </span>
        ) : null}
      </div>

      {!validation.valid && (
        <div className="error-banner">
          {validation.errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      <div className="table-scroll" style={{ marginBottom: 8 }}>
        <table className="dense">
          <thead>
            <tr>
              <th>Substat</th>
              <th>Fixed</th>
              <th>Distributed</th>
              <th>Cap</th>
              <th>Total rolls</th>
            </tr>
          </thead>
          <tbody>
            {SUBSTAT_TYPES.map((type) => {
              const cap = perSubstatCap(artifacts, type);
              const dist = artifacts.distributed[type];
              return (
                <tr key={type}>
                  <td>{SUBSTAT_LABELS[type]}</td>
                  <td className="num">2</td>
                  <td>
                    <div className="stepper">
                      <button type="button" onClick={() => setDistributed(type, dist - 1)} disabled={dist <= 0}>
                        -
                      </button>
                      <span className="count">{dist}</span>
                      <button
                        type="button"
                        onClick={() => setDistributed(type, dist + 1)}
                        disabled={dist >= cap || total >= budget}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="num">{cap}</td>
                  <td className="num">{2 + dist}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="checkbox-row" style={{ marginBottom: 4 }}>
        <input
          type="checkbox"
          id="rarityMixEnabled"
          checked={artifacts.rarityMix.enabled}
          onChange={(e) => onChange({ rarityMix: { ...artifacts.rarityMix, enabled: e.target.checked } })}
        />
        <label htmlFor="rarityMixEnabled">Advanced: 4★/5★ rarity mix</label>
      </div>
      {artifacts.rarityMix.enabled && (
        <div className="row">
          <span className="subtle">4★ pieces (of 5):</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => onChange({ rarityMix: { ...artifacts.rarityMix, count4Star: Math.max(0, artifacts.rarityMix.count4Star - 1) } })}
              disabled={artifacts.rarityMix.count4Star <= 0}
            >
              -
            </button>
            <span className="count">{artifacts.rarityMix.count4Star}</span>
            <button
              type="button"
              onClick={() => onChange({ rarityMix: { ...artifacts.rarityMix, count4Star: Math.min(5, artifacts.rarityMix.count4Star + 1) } })}
              disabled={artifacts.rarityMix.count4Star >= 5}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
