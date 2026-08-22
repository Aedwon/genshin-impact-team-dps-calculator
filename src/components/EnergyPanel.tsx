import { useEffect, useMemo } from 'react';
import { ENERGY_DATA_VERSION } from '../data/energyData';
import { createDefaultUnitEnergyConfig, ENERGY_ELEMENTS } from '../energyTypes';
import { buildAutoReservedArtifacts, computeTeamEnergyPlan, type UnitEnergyPlanResult } from '../lib/energyModel';
import { useStore } from '../store';
import { CharacterAvatar, getCharacterVisualInfo } from './CharacterAvatar';
import { EnergyUnitSetup } from './EnergyUnitSetup';
import { ManualEnergySources } from './ManualEnergySources';
import './energy.css';

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

function targetProgress(result: UnitEnergyPlanResult): number {
  if (result.requiredER == null || result.requiredER <= 0) return 0;
  return Math.max(0, Math.min(100, result.attainedStaticER / result.requiredER * 100));
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
          <p className="energy-eyebrow">Rotation resource planner</p>
          <h2 className="energy-title">Energy Recharge</h2>
          <p className="energy-intro">
            Check the ER targets first, then adjust only the parts of the rotation that differ from the reference assumptions.
          </p>
        </div>
        <div className="energy-header-context">
          <span>{fmt(rotationDuration, 0)}s rotation</span>
          <span>{settings.rngMode} particles</span>
          <span>data v{ENERGY_DATA_VERSION}</span>
        </div>
      </header>

      <section className="energy-team-check" aria-labelledby="energy-team-check-title">
        <div className="energy-section-heading">
          <div>
            <h3 id="energy-team-check-title">Team at a glance</h3>
            <p className="subtle">The large number is the ER target. The bar compares the current attainable build against that target.</p>
          </div>
        </div>

        <div className="energy-overview-grid">
          {units.map((unit) => {
            const result = resultByUnit.get(unit.id);
            if (!result) return null;
            const status = resultStatus(result);
            const visual = getCharacterVisualInfo(unit);
            const progress = targetProgress(result);
            return (
              <article className="energy-overview-card" data-element={visual.element.toLowerCase()} key={unit.id}>
                <div className="energy-overview-accent" />
                <header className="energy-overview-identity">
                  <CharacterAvatar unit={unit} size="md" />
                  <div className="energy-overview-name">
                    <strong>{unit.characterName ?? 'Unassigned unit'}</strong>
                    <span>{visual.element}{visual.rarity ? ` · ${visual.rarity}★` : ''}</span>
                  </div>
                  <span className={`energy-status-chip energy-status-chip--${status.tone}`}>{status.label}</span>
                </header>

                <div className="energy-overview-target">
                  <span>Required ER</span>
                  <strong>{result.requiredER == null ? '—' : `${fmt(result.requiredER)}%`}</strong>
                </div>

                <div className="energy-target-track" aria-hidden="true">
                  <span className={`energy-target-fill energy-target-fill--${status.tone}`} style={{ width: `${progress}%` }} />
                </div>

                <div className="energy-overview-meta">
                  <span><small>Build ER</small><strong>{fmt(result.attainedStaticER)}%</strong></span>
                  <span><small>ER rolls</small><strong>{settings.autoReserveERRolls ? result.reservation.reservedRolls : 'Manual'}</strong></span>
                  <span><small>Burst</small><strong>{fmt(result.energyReceived)} / {fmt(result.effectiveBurstCost, 0)}</strong></span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="energy-settings" aria-labelledby="energy-settings-title">
        <div className="energy-section-heading">
          <div>
            <h3 id="energy-settings-title">Rotation assumptions</h3>
            <p className="subtle">These are the team-wide inputs most likely to change between calculations.</p>
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
              <small>Meet the ER target first; leave the rest unallocated.</small>
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
            <h3 id="energy-character-title">Character rotation</h3>
            <p className="subtle">Each card starts with the result, then the few rotation inputs that drive it. Optional mechanics stay collapsed.</p>
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
