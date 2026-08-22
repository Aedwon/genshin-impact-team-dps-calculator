import { useMemo } from 'react';
import { useStore } from '../store';
import { getOffFieldMultiplier } from '../constants';
import { computeEnergyResults } from '../lib/energyCalc';
import { PARTICLE_TIER_LABELS, type ParticleTier } from '../types';

const TIERS: ParticleTier[] = ['particle', 'orb'];

function fmt(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function EnergyPanel() {
  const units = useStore((s) => s.units);
  const buffs = useStore((s) => s.buffs);
  const batches = useStore((s) => s.particleBatches);
  const addParticleBatch = useStore((s) => s.addParticleBatch);
  const removeParticleBatch = useStore((s) => s.removeParticleBatch);
  const updateParticleBatch = useStore((s) => s.updateParticleBatch);
  const grants = useStore((s) => s.flatEnergyGrants);
  const addFlatEnergyGrant = useStore((s) => s.addFlatEnergyGrant);
  const removeFlatEnergyGrant = useStore((s) => s.removeFlatEnergyGrant);
  const updateFlatEnergyGrant = useStore((s) => s.updateFlatEnergyGrant);

  const results = useMemo(() => computeEnergyResults(units, batches, grants, buffs), [units, batches, grants, buffs]);
  const resultByUnit = useMemo(() => new Map(results.map((r) => [r.unitId, r])), [results]);

  function unitLabel(id: string | null): string {
    if (!id) return '-- unassigned --';
    return units.find((u) => u.id === id)?.characterName ?? id.slice(0, 4);
  }

  return (
    <section className="panel">
      <h2>Energy / ER requirements</h2>
      <p className="subtle">
        Particle generation isn't reliably in genshin-db — enter it yourself from an online reference. Every
        particle/orb feeds the whole team at once: pick who was on-field (the catcher) when it happened — everyone
        else automatically gets the reduced off-field share ({' '}
        {units.length <= 1 ? 'n/a (solo team)' : `${Math.round(getOffFieldMultiplier(units.length) * 100)}%`} value
        for this team size), nobody gets zero.
      </p>

      <h3>Particle sources</h3>
      {batches.map((batch) => (
        <div key={batch.id} className="buff-card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="pill">Particle source</span>
            <button className="danger" type="button" onClick={() => removeParticleBatch(batch.id)}>
              remove
            </button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 8 }}>
            <div className="field">
              <label>Produced by (Skill/Burst/etc. of)</label>
              <select
                value={batch.sourceUnitId ?? ''}
                disabled={batch.isWhite}
                onChange={(e) => updateParticleBatch(batch.id, { sourceUnitId: e.target.value || null })}
              >
                <option value="">-- unassigned --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.characterName ?? u.id.slice(0, 4)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={batch.isWhite}
                  onChange={(e) => updateParticleBatch(batch.id, { isWhite: e.target.checked })}
                />
                White/neutral particles (no element)
              </label>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 4 }}>
            <div className="field">
              <label>Tier</label>
              <select
                value={batch.tier}
                onChange={(e) => updateParticleBatch(batch.id, { tier: e.target.value as ParticleTier })}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {PARTICLE_TIER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Count (per rotation)</label>
              <input
                type="number"
                min={0}
                value={batch.count}
                onChange={(e) => updateParticleBatch(batch.id, { count: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>On-field catcher</label>
              <select
                value={batch.catcherUnitId ?? ''}
                onChange={(e) => updateParticleBatch(batch.id, { catcherUnitId: e.target.value || null })}
              >
                <option value="">-- none (everyone off-field) --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.characterName ?? u.id.slice(0, 4)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="subtle">
            {unitLabel(batch.sourceUnitId)} {batch.isWhite ? '(white)' : ''} → {batch.count}×{' '}
            {PARTICLE_TIER_LABELS[batch.tier].toLowerCase()}, caught on-field by {unitLabel(batch.catcherUnitId)} —
            every other unit gets the off-field share automatically.
          </p>
        </div>
      ))}
      <button type="button" onClick={addParticleBatch}>
        + Add particle source
      </button>

      <h3 style={{ marginTop: 14 }}>Flat energy refunds</h3>
      <p className="subtle">For talents/constellations/weapons worded as "restores N Energy" — not scaled by ER%.</p>
      {grants.map((grant) => (
        <div key={grant.id} className="row" style={{ marginBottom: 6 }}>
          <select
            value={grant.unitId ?? ''}
            onChange={(e) => updateFlatEnergyGrant(grant.id, { unitId: e.target.value || null })}
          >
            <option value="">-- unassigned --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.characterName ?? u.id.slice(0, 4)}
              </option>
            ))}
          </select>
          <span className="subtle">amount</span>
          <input
            type="number"
            min={0}
            style={{ width: 80 }}
            value={grant.amount}
            onChange={(e) => updateFlatEnergyGrant(grant.id, { amount: Number(e.target.value) })}
          />
          <span className="subtle">× occurrences</span>
          <input
            type="number"
            min={0}
            style={{ width: 70 }}
            value={grant.occurrences}
            onChange={(e) => updateFlatEnergyGrant(grant.id, { occurrences: Number(e.target.value) })}
          />
          <button type="button" className="danger" onClick={() => removeFlatEnergyGrant(grant.id)}>
            remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addFlatEnergyGrant}>
        + Add flat energy refund
      </button>

      <div className="table-scroll" style={{ marginTop: 14 }}>
        <table className="dense">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Current ER%</th>
              <th>Burst cost</th>
              <th>Raw particle energy</th>
              <th>Flat energy</th>
              <th>Energy received</th>
              <th>Required ER%</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const r = resultByUnit.get(u.id);
              if (!r) return null;
              return (
                <tr key={u.id}>
                  <td>{u.characterName ?? 'unassigned'}</td>
                  <td className="num">{fmt(r.currentER)}</td>
                  <td className="num">{fmt(r.burstEnergyCost, 0)}</td>
                  <td className="num">{fmt(r.rawEnergyPerRotation)}</td>
                  <td className="num">{fmt(r.flatEnergyPerRotation)}</td>
                  <td className="num">{fmt(r.energyReceived)}</td>
                  <td className="num">{r.requiredER != null ? fmt(r.requiredER) : 'n/a (0 energy in)'}</td>
                  <td style={{ color: r.ready ? 'var(--ok)' : 'var(--danger)', textAlign: 'left' }}>
                    {r.ready ? 'Ready' : `Short by ${fmt(r.shortfall)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
