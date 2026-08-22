import { PARTICLE_TIER_LABELS, type FlatEnergyGrant, type ParticleBatch, type ParticleTier, type Unit } from '../types';

const TIERS: ParticleTier[] = ['particle', 'orb'];

interface Props {
  units: Unit[];
  batches: ParticleBatch[];
  grants: FlatEnergyGrant[];
  addParticleBatch: () => void;
  removeParticleBatch: (id: string) => void;
  updateParticleBatch: (id: string, patch: Partial<ParticleBatch>) => void;
  addFlatEnergyGrant: () => void;
  removeFlatEnergyGrant: (id: string) => void;
  updateFlatEnergyGrant: (id: string, patch: Partial<FlatEnergyGrant>) => void;
}

function nameFor(unit: Unit): string {
  return unit.characterName ?? unit.id.slice(0, 4);
}

export function ManualEnergySources(props: Props) {
  const { units, batches, grants } = props;

  return (
    <details className="energy-disclosure energy-methodology">
      <summary>Manual Energy sources · advanced</summary>
      <div className="energy-disclosure-body">
        <p className="subtle">
          Add sources only when a mechanic is not represented by the automatic character and weapon rules. These values are additive.
        </p>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 8px' }}>
          <div>
            <strong>Particle sources</strong>
            <div className="subtle">Particles or orbs generated during the base rotation.</div>
          </div>
          <button type="button" onClick={props.addParticleBatch}>Add particle source</button>
        </div>

        {batches.length === 0 && <p className="subtle">No manual particle sources.</p>}
        {batches.map((batch) => (
          <div key={batch.id} className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(110px, 1fr)) auto auto', alignItems: 'end', marginBottom: 8 }}>
            <div className="field">
              <label>Produced by</label>
              <select
                value={batch.sourceUnitId ?? ''}
                disabled={batch.isWhite}
                onChange={(e) => props.updateParticleBatch(batch.id, { sourceUnitId: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{nameFor(unit)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select value={batch.tier} onChange={(e) => props.updateParticleBatch(batch.id, { tier: e.target.value as ParticleTier })}>
                {TIERS.map((tier) => <option key={tier} value={tier}>{PARTICLE_TIER_LABELS[tier]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Count / rotation</label>
              <input type="number" min={0} value={batch.count} onChange={(e) => props.updateParticleBatch(batch.id, { count: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Who catches?</label>
              <select value={batch.catcherUnitId ?? ''} onChange={(e) => props.updateParticleBatch(batch.id, { catcherUnitId: e.target.value || null })}>
                <option value="">Everyone off-field</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{nameFor(unit)}</option>)}
              </select>
            </div>
            <label className="checkbox-row" style={{ minHeight: 28 }}>
              <input type="checkbox" checked={batch.isWhite} onChange={(e) => props.updateParticleBatch(batch.id, { isWhite: e.target.checked })} />
              Neutral
            </label>
            <button className="text-button danger" type="button" onClick={() => props.removeParticleBatch(batch.id)}>Remove</button>
          </div>
        ))}

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', margin: '18px 0 8px' }}>
          <div>
            <strong>Flat Energy</strong>
            <div className="subtle">Direct Energy that does not scale with Energy Recharge.</div>
          </div>
          <button type="button" onClick={props.addFlatEnergyGrant}>Add flat Energy</button>
        </div>

        {grants.length === 0 && <p className="subtle">No manual flat Energy sources.</p>}
        {grants.map((grant) => (
          <div key={grant.id} className="grid" style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(100px, 140px) minmax(100px, 140px) auto', alignItems: 'end', marginBottom: 8 }}>
            <div className="field">
              <label>Character</label>
              <select value={grant.unitId ?? ''} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { unitId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{nameFor(unit)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Energy each time</label>
              <input type="number" min={0} value={grant.amount} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { amount: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Times / rotation</label>
              <input type="number" min={0} value={grant.occurrences} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { occurrences: Number(e.target.value) })} />
            </div>
            <button type="button" className="text-button danger" onClick={() => props.removeFlatEnergyGrant(grant.id)}>Remove</button>
          </div>
        ))}
      </div>
    </details>
  );
}
