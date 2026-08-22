import { useEffect, useMemo } from 'react';
import { ENERGY_DATA_VERSION } from '../data/energyData';
import { createDefaultUnitEnergyConfig, ENERGY_ELEMENTS } from '../energyTypes';
import { buildAutoReservedArtifacts, computeTeamEnergyPlan, type UnitEnergyPlanResult } from '../lib/energyModel';
import { useStore } from '../store';
import { EnergyUnitSetup } from './EnergyUnitSetup';
import { ManualEnergySources } from './ManualEnergySources';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function resultStatus(result: UnitEnergyPlanResult): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (result.requiredER == null) return { label: 'No particle energy', tone: 'bad' };
  if (result.reservation.erShortfall > 0) return { label: `ER cap short by ${fmt(result.reservation.erShortfall)}%`, tone: 'bad' };
  if (result.reservation.budgetConflictRolls > 0) return { label: `Free ${result.reservation.budgetConflictRolls} artifact roll(s)`, tone: 'warn' };
  if (!result.ready) return { label: `Energy short by ${fmt(result.energyShortfall)}`, tone: 'bad' };
  return { label: 'Burst ready', tone: 'ok' };
}

export function EnergyPanel() {
  const units = useStore((s) => s.units);
  const buffs = useStore((s) => s.buffs);
  const rotationDuration = useStore((s) => s.rotationDuration);
  const setRotationDuration = useStore((s) => s.setRotationDuration);
  const settings = useStore((s) => s.energySettings);
  const setEnergySettings = useStore((s) => s.setEnergySettings);
  const configs = useStore((s) => s.unitEnergyConfigs);
  const updateUnitEnergyConfig = useStore((s) => s.updateUnitEnergyConfig);
  const resetUnitEnergyConfig = useStore((s) => s.resetUnitEnergyConfig);
  const updateUnit = useStore((s) => s.updateUnit);
  const batches = useStore((s) => s.particleBatches);
  const addParticleBatch = useStore((s) => s.addParticleBatch);
  const removeParticleBatch = useStore((s) => s.removeParticleBatch);
  const updateParticleBatch = useStore((s) => s.updateParticleBatch);
  const grants = useStore((s) => s.flatEnergyGrants);
  const addFlatEnergyGrant = useStore((s) => s.addFlatEnergyGrant);
  const removeFlatEnergyGrant = useStore((s) => s.removeFlatEnergyGrant);
  const updateFlatEnergyGrant = useStore((s) => s.updateFlatEnergyGrant);

  const plan = useMemo(
    () => computeTeamEnergyPlan(units, configs, settings, rotationDuration, batches, grants, buffs),
    [units, configs, settings, rotationDuration, batches, grants, buffs],
  );
  const resultByUnit = useMemo(() => new Map(plan.units.map((result) => [result.unitId, result])), [plan.units]);

  useEffect(() => {
    if (!settings.autoReserveERRolls) return;
    for (const unit of units) {
      const result = resultByUnit.get(unit.id);
      if (result && unit.artifacts.distributed.er !== result.reservation.reservedRolls) {
        updateUnit(unit.id, { artifacts: buildAutoReservedArtifacts(unit, result) });
      }
    }
  }, [settings.autoReserveERRolls, units, resultByUnit, updateUnit]);

  return (
    <section className="panel energy-panel">
      <header className="energy-header">
        <div>
          <h2 className="energy-title">Energy Recharge</h2>
          <p className="energy-intro">
            Start with the team check below. Character defaults come from the reference sheet; only change a setting when your rotation differs.
          </p>
        </div>
        <span className="energy-data-version">data v{ENERGY_DATA_VERSION}</span>
      </header>

      <section className="energy-team-check" aria-labelledby="energy-team-check-title">
        <div className="energy-section-heading">
          <div>
            <h3 id="energy-team-check-title">Team check</h3>
            <p className="subtle">Required ER already includes the configured rotation, particles, refunds, and artifact reservation.</p>
          </div>
          <span className="energy-rotation-note">{fmt(rotationDuration, 0)}s rotation · {settings.rngMode} particles</span>
        </div>

        <div className="energy-result-list">
          {units.map((unit) => {
            const result = resultByUnit.get(unit.id);
            if (!result) return null;
            const status = resultStatus(result);
            return (
              <div className="energy-result-row" key={unit.id}>
                <div className="energy-result-character">
                  <strong>{unit.characterName ?? 'Unassigned unit'}</strong>
                  <span className={`energy-status energy-status--${status.tone}`}>{status.label}</span>
                </div>
                <div className="energy-result-metric">
                  <span>Required ER</span>
                  <strong>{result.requiredER == null ? '—' : `${fmt(result.requiredER)}%`}</strong>
                </div>
                <div className="energy-result-metric">
                  <span>Build ER</span>
                  <strong>{fmt(result.attainedStaticER)}%</strong>
                </div>
                <div className="energy-result-metric">
                  <span>Reserved ER rolls</span>
                  <strong>{settings.autoReserveERRolls ? result.reservation.reservedRolls : 'manual'}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="energy-settings" aria-labelledby="energy-settings-title">
        <div className="energy-section-heading">
          <div>
            <h3 id="energy-settings-title">Rotation assumptions</h3>
            <p className="subtle">These two settings are the ones most users need to touch.</p>
          </div>
        </div>
        <div className="energy-settings-row">
          <div className="field">
            <label>Rotation length</label>
            <div className="input-with-unit">
              <input type="number" min={1} value={rotationDuration} onChange={(e) => setRotationDuration(Math.max(1, Number(e.target.value)))} />
              <span>sec</span>
            </div>
          </div>
          <div className="field">
            <label>Particle assumption</label>
            <select value={settings.rngMode} onChange={(e) => setEnergySettings({ rngMode: e.target.value as typeof settings.rngMode })}>
              <option value="average">Average</option>
              <option value="safe">Safe</option>
              <option value="worst">Worst case</option>
            </select>
          </div>
          <label className="energy-toggle">
            <input type="checkbox" checked={settings.autoReserveERRolls} onChange={(e) => setEnergySettings({ autoReserveERRolls: e.target.checked })} />
            <span>
              <strong>Reserve required ER rolls</strong>
              <small>Leaves remaining artifact rolls unallocated.</small>
            </span>
          </label>
        </div>

        <details className="energy-disclosure">
          <summary>Encounter assumptions</summary>
          <div className="energy-disclosure-body">
            <p className="subtle">Enemy drops and Electro Resonance are included automatically. Change these only when the encounter differs.</p>
            <div className="energy-settings-row energy-settings-row--compact">
              <div className="field">
                <label>Enemy particle model</label>
                <select value={settings.enemyParticleMode} onChange={(e) => setEnergySettings({ enemyParticleMode: e.target.value as typeof settings.enemyParticleMode })}>
                  <option value="default">Default · 9 neutral particles</option>
                  <option value="none">Ignore enemy particles</option>
                  <option value="custom">Custom drops</option>
                </select>
              </div>
              <div className="field">
                <label>Enemy clear time</label>
                <div className="input-with-unit">
                  <input type="number" min={1} value={settings.clearTimeSeconds} onChange={(e) => setEnergySettings({ clearTimeSeconds: Math.max(1, Number(e.target.value)) })} />
                  <span>sec</span>
                </div>
              </div>
              <div className="field">
                <label>Electro Resonance trigger interval</label>
                <div className="input-with-unit">
                  <input type="number" min={5} step={0.5} value={settings.electroReactionIntervalSeconds} onChange={(e) => setEnergySettings({ electroReactionIntervalSeconds: Math.max(5, Number(e.target.value)) })} />
                  <span>sec</span>
                </div>
              </div>
            </div>

            {settings.enemyParticleMode === 'custom' && (
              <div className="energy-custom-particles">
                {(['Clear', ...ENERGY_ELEMENTS] as const).map((element) => (
                  <div className="field" key={element}>
                    <label>{element}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={settings.customEnemyParticles[element]}
                      onChange={(e) => setEnergySettings({
                        customEnemyParticles: { ...settings.customEnemyParticles, [element]: Math.max(0, Number(e.target.value)) },
                      })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </section>

      {plan.warnings.length > 0 && (
        <div className="warn-banner energy-plan-warning">
          {plan.warnings.map((warning) => <div key={warning}>{warning}</div>)}
        </div>
      )}

      <section className="energy-character-section" aria-labelledby="energy-character-title">
        <div className="energy-section-heading">
          <div>
            <h3 id="energy-character-title">Character setup</h3>
            <p className="subtle">The default view shows rotation inputs. Funneling, Favonius, and manual mechanics stay tucked away until needed.</p>
          </div>
        </div>
        <div className="energy-unit-list">
          {units.map((unit) => (
            <EnergyUnitSetup
              key={unit.id}
              unit={unit}
              units={units}
              config={configs[unit.id] ?? createDefaultUnitEnergyConfig(unit.id)}
              result={resultByUnit.get(unit.id)}
              onChange={(patch) => updateUnitEnergyConfig(unit.id, patch)}
              onReset={() => resetUnitEnergyConfig(unit.id)}
            />
          ))}
        </div>
      </section>

      <details className="energy-disclosure energy-methodology">
        <summary>Calculation details</summary>
        <div className="energy-disclosure-body">
          <p className="subtle">
            Particle energy scales with ER; flat Energy refunds do not. ER-dependent effects such as Raiden's Burst refund are recalculated using the resolved ER after artifact reservation.
          </p>
          <p className="subtle">Solver: {plan.converged ? `converged in ${plan.iterations} pass(es).` : 'did not fully converge.'}</p>
        </div>
      </details>

      <ManualEnergySources
        units={units}
        batches={batches}
        grants={grants}
        addParticleBatch={addParticleBatch}
        removeParticleBatch={removeParticleBatch}
        updateParticleBatch={updateParticleBatch}
        addFlatEnergyGrant={addFlatEnergyGrant}
        removeFlatEnergyGrant={removeFlatEnergyGrant}
        updateFlatEnergyGrant={updateFlatEnergyGrant}
      />
    </section>
  );
}
