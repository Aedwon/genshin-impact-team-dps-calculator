import { PARTICLE_TIER_LABELS, type FlatEnergyGrant, type ParticleBatch, type ParticleTier, type Unit } from '../types';

const TIERS: ParticleTier[] = ['particle', 'orb'];
interface Props {
  units: Unit[]; batches: ParticleBatch[]; grants: FlatEnergyGrant[];
  addParticleBatch: () => void; removeParticleBatch: (id: string) => void; updateParticleBatch: (id: string, patch: Partial<ParticleBatch>) => void;
  addFlatEnergyGrant: () => void; removeFlatEnergyGrant: (id: string) => void; updateFlatEnergyGrant: (id: string, patch: Partial<FlatEnergyGrant>) => void;
}
export function ManualEnergySources(props: Props) {
  const { units, batches, grants } = props;
  return <details style={{ marginTop: 14 }}><summary>Advanced manual particle / flat Energy sources</summary>
    <p className="subtle">Additive escape hatches for mechanics not represented by the automatic data/rule layer. Counts are per base rotation.</p>
    {batches.map((batch) => <div key={batch.id} className="buff-card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><span className="pill">Manual particle source</span><button className="danger" type="button" onClick={() => props.removeParticleBatch(batch.id)}>remove</button></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <div className="field"><label>Produced by</label><select value={batch.sourceUnitId ?? ''} disabled={batch.isWhite} onChange={(e) => props.updateParticleBatch(batch.id, { sourceUnitId: e.target.value || null })}><option value="">unassigned</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.characterName ?? unit.id.slice(0, 4)}</option>)}</select></div>
        <div className="field"><label>Tier</label><select value={batch.tier} onChange={(e) => props.updateParticleBatch(batch.id, { tier: e.target.value as ParticleTier })}>{TIERS.map((tier) => <option key={tier} value={tier}>{PARTICLE_TIER_LABELS[tier]}</option>)}</select></div>
        <div className="field"><label>Count / rotation</label><input type="number" min={0} value={batch.count} onChange={(e) => props.updateParticleBatch(batch.id, { count: Number(e.target.value) })} /></div>
        <div className="field"><label>On-field catcher</label><select value={batch.catcherUnitId ?? ''} onChange={(e) => props.updateParticleBatch(batch.id, { catcherUnitId: e.target.value || null })}><option value="">everyone off-field</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.characterName ?? unit.id.slice(0, 4)}</option>)}</select></div>
        <label className="checkbox-row"><input type="checkbox" checked={batch.isWhite} onChange={(e) => props.updateParticleBatch(batch.id, { isWhite: e.target.checked })} />Neutral / clear</label>
      </div>
    </div>)}
    <button type="button" onClick={props.addParticleBatch}>+ Add manual particle source</button>
    <h4>Manual flat Energy</h4>
    {grants.map((grant) => <div key={grant.id} className="row" style={{ marginBottom: 6 }}>
      <select value={grant.unitId ?? ''} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { unitId: e.target.value || null })}><option value="">unassigned</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.characterName ?? unit.id.slice(0, 4)}</option>)}</select>
      <span className="subtle">amount</span><input type="number" min={0} style={{ width: 80 }} value={grant.amount} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { amount: Number(e.target.value) })} />
      <span className="subtle">× occurrences</span><input type="number" min={0} style={{ width: 70 }} value={grant.occurrences} onChange={(e) => props.updateFlatEnergyGrant(grant.id, { occurrences: Number(e.target.value) })} />
      <button type="button" className="danger" onClick={() => props.removeFlatEnergyGrant(grant.id)}>remove</button>
    </div>)}
    <button type="button" onClick={props.addFlatEnergyGrant}>+ Add manual flat Energy</button>
  </details>;
}
