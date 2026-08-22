import { useEffect, useMemo } from 'react';
import { ENERGY_DATA_VERSION } from '../data/energyData';
import { createDefaultUnitEnergyConfig, ENERGY_ELEMENTS } from '../energyTypes';
import { buildAutoReservedArtifacts, computeTeamEnergyPlan } from '../lib/energyModel';
import { useStore } from '../store';
import { EnergyUnitSetup } from './EnergyUnitSetup';
import { ManualEnergySources } from './ManualEnergySources';

function fmt(n: number, digits = 1): string { return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }); }

export function EnergyPanel() {
  const units = useStore((s) => s.units); const buffs = useStore((s) => s.buffs);
  const rotationDuration = useStore((s) => s.rotationDuration); const setRotationDuration = useStore((s) => s.setRotationDuration);
  const settings = useStore((s) => s.energySettings); const setEnergySettings = useStore((s) => s.setEnergySettings);
  const configs = useStore((s) => s.unitEnergyConfigs); const updateUnitEnergyConfig = useStore((s) => s.updateUnitEnergyConfig); const resetUnitEnergyConfig = useStore((s) => s.resetUnitEnergyConfig); const updateUnit = useStore((s) => s.updateUnit);
  const batches = useStore((s) => s.particleBatches); const addParticleBatch = useStore((s) => s.addParticleBatch); const removeParticleBatch = useStore((s) => s.removeParticleBatch); const updateParticleBatch = useStore((s) => s.updateParticleBatch);
  const grants = useStore((s) => s.flatEnergyGrants); const addFlatEnergyGrant = useStore((s) => s.addFlatEnergyGrant); const removeFlatEnergyGrant = useStore((s) => s.removeFlatEnergyGrant); const updateFlatEnergyGrant = useStore((s) => s.updateFlatEnergyGrant);
  const plan = useMemo(() => computeTeamEnergyPlan(units, configs, settings, rotationDuration, batches, grants, buffs), [units, configs, settings, rotationDuration, batches, grants, buffs]);
  const resultByUnit = useMemo(() => new Map(plan.units.map((result) => [result.unitId, result])), [plan.units]);

  useEffect(() => {
    if (!settings.autoReserveERRolls) return;
    for (const unit of units) {
      const result = resultByUnit.get(unit.id);
      if (result && unit.artifacts.distributed.er !== result.reservation.reservedRolls) updateUnit(unit.id, { artifacts: buildAutoReservedArtifacts(unit, result) });
    }
  }, [settings.autoReserveERRolls, units, resultByUnit, updateUnit]);

  return <section className="panel">
    <h2>Energy setup / ER requirements</h2>
    <p className="subtle">Spreadsheet-model energy planner (data v{ENERGY_DATA_VERSION}), intentionally separate from the damage-instance rotation. ER rolls are reserved automatically; unused artifact rolls remain unallocated.</p>
    <h3>Team energy assumptions</h3>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 10 }}>
      <div className="field"><label>Rotation length (seconds)</label><input type="number" min={1} value={rotationDuration} onChange={(e) => setRotationDuration(Math.max(1, Number(e.target.value)))} /></div>
      <div className="field"><label>Particle RNG</label><select value={settings.rngMode} onChange={(e) => setEnergySettings({ rngMode: e.target.value as typeof settings.rngMode })}><option value="average">Average</option><option value="safe">Safe</option><option value="worst">Worst case</option></select></div>
      <div className="field"><label>Enemy HP particles</label><select value={settings.enemyParticleMode} onChange={(e) => setEnergySettings({ enemyParticleMode: e.target.value as typeof settings.enemyParticleMode })}><option value="default">Default (9 clear)</option><option value="none">No particles</option><option value="custom">Custom</option></select></div>
      <div className="field"><label>Clear time (seconds)</label><input type="number" min={1} value={settings.clearTimeSeconds} onChange={(e) => setEnergySettings({ clearTimeSeconds: Math.max(1, Number(e.target.value)) })} /></div>
    </div>
    {settings.enemyParticleMode === 'custom' && <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 10 }}>{(['Clear', ...ENERGY_ELEMENTS] as const).map((element) => <div className="field" key={element}><label>{element} particles / clear</label><input type="number" min={0} step={0.5} value={settings.customEnemyParticles[element]} onChange={(e) => setEnergySettings({ customEnemyParticles: { ...settings.customEnemyParticles, [element]: Math.max(0, Number(e.target.value)) } })} /></div>)}</div>}
    <div className="row" style={{ marginBottom: 10 }}>
      <div className="field"><label>Electro Resonance interval (seconds)</label><input type="number" min={5} step={0.5} value={settings.electroReactionIntervalSeconds} onChange={(e) => setEnergySettings({ electroReactionIntervalSeconds: Math.max(5, Number(e.target.value)) })} /></div>
      <label className="checkbox-row"><input type="checkbox" checked={settings.autoReserveERRolls} onChange={(e) => setEnergySettings({ autoReserveERRolls: e.target.checked })} />Automatically reserve artifact ER rolls</label>
    </div>
    {plan.warnings.length > 0 && <div className="error-banner" style={{ marginBottom: 10 }}>{plan.warnings.map((warning) => <div key={warning}>{warning}</div>)}</div>}
    <h3>Character energy rotation</h3>
    {units.map((unit) => <EnergyUnitSetup key={unit.id} unit={unit} units={units} config={configs[unit.id] ?? createDefaultUnitEnergyConfig(unit.id)} result={resultByUnit.get(unit.id)} onChange={(patch) => updateUnitEnergyConfig(unit.id, patch)} onReset={() => resetUnitEnergyConfig(unit.id)} />)}
    <h3>ER results and artifact reservation</h3>
    <div className="table-scroll"><table className="dense"><thead><tr><th>Unit</th><th>Cost after discount</th><th>ER-scaled Energy @100%</th><th>Flat Energy</th><th>Required static ER%</th><th>Auto ER rolls</th><th>Attainable ER%</th><th>Status</th></tr></thead><tbody>
      {units.map((unit) => { const result = resultByUnit.get(unit.id); if (!result) return null; return <tr key={unit.id}><td>{unit.characterName ?? 'unassigned'}</td><td className="num">{fmt(result.effectiveBurstCost, 0)}</td><td className="num">{fmt(result.erScaledEnergyAt100ER)}</td><td className="num">{fmt(result.flatEnergyPerBurst)}</td><td className="num">{result.requiredER == null ? 'n/a' : fmt(result.requiredER)}</td><td className="num">{result.reservation.reservedRolls} / {result.reservation.desiredRolls}</td><td className="num">{fmt(result.attainedStaticER)}</td><td style={{ color: result.ready && result.reservation.erShortfall <= 0 ? 'var(--ok)' : 'var(--danger)' }}>{result.requiredER == null ? 'No ER-scaled energy' : result.reservation.erShortfall > 0 ? `ER short ${fmt(result.reservation.erShortfall)} pp; Energy short ${fmt(result.energyShortfall)}` : result.ready ? 'Ready' : `Energy short ${fmt(result.energyShortfall)}`}</td></tr>; })}
    </tbody></table></div>
    <p className="subtle">ER-dependent source effects such as Raiden's Burst refund use resolved ER after reservation. Solver: {plan.converged ? `converged in ${plan.iterations} pass(es).` : 'convergence warning.'}</p>
    <ManualEnergySources units={units} batches={batches} grants={grants} addParticleBatch={addParticleBatch} removeParticleBatch={removeParticleBatch} updateParticleBatch={updateParticleBatch} addFlatEnergyGrant={addFlatEnergyGrant} removeFlatEnergyGrant={removeFlatEnergyGrant} updateFlatEnergyGrant={updateFlatEnergyGrant} />
  </section>;
}
