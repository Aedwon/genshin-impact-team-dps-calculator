import { getCharacterEnergyData, getEligibleEnergyVariants } from '../data/energyData';
import type { EnergySkillConfig, UnitEnergyConfig } from '../energyTypes';
import type { UnitEnergyPlanResult } from '../lib/energyModel';
import { getDefaultEnergyVariant } from '../lib/energyVariants';
import type { Unit } from '../types';
import { CharacterAvatar, getCharacterVisualInfo } from './CharacterAvatar';

interface Props {
  unit: Unit;
  units: Unit[];
  config: UnitEnergyConfig;
  result: UnitEnergyPlanResult | undefined;
  onChange: (patch: Partial<UnitEnergyConfig>) => void;
  onReset: () => void;
}

type ResultTone = 'ok' | 'warn' | 'bad' | 'neutral';

function pct(value: number): number {
  return Math.round(value * 1000) / 10;
}

function n(value: string): number {
  return Math.max(0, Number(value));
}

function characterName(unit: Unit): string {
  return unit.characterName ?? unit.id.slice(0, 4);
}

function resultTone(result: UnitEnergyPlanResult | undefined): ResultTone {
  if (!result || result.requiredER == null) return 'neutral';
  if (result.reservation.erShortfall > 0 || !result.ready) return 'bad';
  if (result.reservation.budgetConflictRolls > 0) return 'warn';
  return 'ok';
}

function resultSummary(result: UnitEnergyPlanResult | undefined): string {
  if (!result) return 'Waiting for energy data';
  if (result.requiredER == null) return 'No particle energy reaches this character';
  if (result.reservation.erShortfall > 0) return `${result.reservation.erShortfall.toFixed(1)}% ER beyond artifact cap`;
  if (result.reservation.budgetConflictRolls > 0) return `Free ${result.reservation.budgetConflictRolls} non-ER roll(s)`;
  return result.ready ? 'Burst ready' : `${result.energyShortfall.toFixed(1)} Energy short`;
}

function SkillInputs({
  label,
  skill,
  variants,
  fallbackLabel,
  optional = false,
  onChange,
}: {
  label: string;
  skill: EnergySkillConfig;
  variants: { label: string }[];
  fallbackLabel: string;
  optional?: boolean;
  onChange: (next: EnergySkillConfig) => void;
}) {
  return (
    <div className="energy-skill-row">
      <div className="energy-skill-name">{label}</div>
      <div className="field">
        <label>Skill version</label>
        <select
          value={skill.variantLabel ?? fallbackLabel}
          disabled={!variants.length}
          onChange={(e) => onChange({ ...skill, variantLabel: e.target.value || null })}
        >
          {!variants.length && <option value="">No data</option>}
          {optional && variants.length > 0 && <option value="">Choose a version</option>}
          {variants.map((variant) => <option key={variant.label} value={variant.label}>{variant.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Uses per rotation</label>
        <input
          type="number"
          min={0}
          step={0.25}
          value={skill.usesPerRotation}
          onChange={(e) => onChange({ ...skill, usesPerRotation: n(e.target.value) })}
        />
      </div>
    </div>
  );
}

function FunnelInputs({
  label,
  skill,
  units,
  unitId,
  onChange,
}: {
  label: string;
  skill: EnergySkillConfig;
  units: Unit[];
  unitId: string;
  onChange: (next: EnergySkillConfig) => void;
}) {
  return (
    <div className="energy-funnel-row">
      <span>{label}</span>
      <div className="field">
        <label>Who catches the particles?</label>
        <select
          value={skill.funnelTargetUnitId ?? ''}
          onChange={(e) => onChange({ ...skill, funnelTargetUnitId: e.target.value || null })}
        >
          <option value="">Natural catch / self</option>
          {units.filter((candidate) => candidate.id !== unitId).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{characterName(candidate)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Share caught</label>
        <div className="input-with-unit">
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={pct(skill.funnelFraction)}
            onChange={(e) => onChange({ ...skill, funnelFraction: Math.min(1, n(e.target.value) / 100) })}
          />
          <span>%</span>
        </div>
      </div>
    </div>
  );
}

function OverrideFields({ label, skill, onChange }: { label: string; skill: EnergySkillConfig; onChange: (next: EnergySkillConfig) => void }) {
  function set(key: keyof EnergySkillConfig['overrides'], raw: string) {
    onChange({ ...skill, overrides: { ...skill.overrides, [key]: raw === '' ? null : n(raw) } });
  }

  return (
    <div className="energy-override-group">
      <strong>{label}</strong>
      <div className="energy-custom-particles">
        <div className="field">
          <label>Particles / use</label>
          <input type="number" min={0} step={0.01} placeholder="auto" value={skill.overrides.averageParticles ?? ''} onChange={(e) => set('averageParticles', e.target.value)} />
        </div>
        <div className="field">
          <label>RNG variance</label>
          <input type="number" min={0} max={1} step={0.01} placeholder="auto" value={skill.overrides.variance ?? ''} onChange={(e) => set('variance', e.target.value)} />
        </div>
        <div className="field">
          <label>Turret particles / sec</label>
          <input type="number" min={0} step={0.01} placeholder="auto" value={skill.overrides.particlesPerSecond ?? ''} onChange={(e) => set('particlesPerSecond', e.target.value)} />
        </div>
        <div className="field">
          <label>Turret duration</label>
          <input type="number" min={0} step={0.5} placeholder="auto" value={skill.overrides.duration ?? ''} onChange={(e) => set('duration', e.target.value)} />
        </div>
        <div className="field">
          <label>Flat Energy / use</label>
          <input type="number" min={0} step={0.5} placeholder="auto" value={skill.overrides.flatEnergyPerUse ?? ''} onChange={(e) => set('flatEnergyPerUse', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export function EnergyUnitSetup({ unit, units, config: cfg, result, onChange, onReset }: Props) {
  const data = getCharacterEnergyData(unit.characterName);
  const variants = getEligibleEnergyVariants(data, unit.constellation);
  const fallback = getDefaultEnergyVariant(data, unit.constellation)?.label ?? '';
  const visual = getCharacterVisualInfo(unit);
  const tone = resultTone(result);
  const secondaryActive = cfg.secondary.usesPerRotation > 0;
  const funnelActive = Boolean(
    (cfg.primary.funnelTargetUnitId && cfg.primary.funnelFraction > 0)
    || (cfg.secondary.funnelTargetUnitId && cfg.secondary.funnelFraction > 0),
  );
  const favoniusActive = cfg.favoniusTriggersPerRotation > 0;

  const erProgress = result?.requiredER
    ? Math.max(0, Math.min(100, result.attainedStaticER / result.requiredER * 100))
    : 0;
  const burstProgress = result && result.effectiveBurstCost > 0
    ? Math.max(0, Math.min(100, result.energyReceived / result.effectiveBurstCost * 100))
    : 100;
  const scaledEnergy = result ? result.erScaledEnergyAt100ER * result.effectiveERForEnergy / 100 : 0;
  const totalIncoming = result ? scaledEnergy + result.flatEnergyPerBurst : 0;
  const particleShare = totalIncoming > 0 ? Math.max(0, Math.min(100, scaledEnergy / totalIncoming * 100)) : 0;
  const flatShare = totalIncoming > 0 ? Math.max(0, 100 - particleShare) : 0;

  return (
    <article className="energy-unit energy-character-card" data-element={visual.element.toLowerCase()} data-status={tone}>
      <div className="energy-card-accent" />
      <header className="energy-card-header">
        <div className="energy-card-identity">
          <CharacterAvatar unit={unit} size="lg" />
          <div>
            <div className="energy-card-name-row">
              <h4>{unit.characterName ?? 'Unassigned unit'}</h4>
              <span className="energy-element-label">{visual.element}</span>
            </div>
            <p className="energy-card-meta">
              <span>C{unit.constellation}</span>
              <span>·</span>
              <span>{unit.weaponName ?? 'No weapon selected'}</span>
              <span>·</span>
              <span>{unit.burstEnergyCost} Burst cost</span>
            </p>
          </div>
        </div>

        <div className="energy-card-target">
          <span className={`energy-status-chip energy-status-chip--${tone === 'neutral' ? 'warn' : tone}`}>{resultSummary(result)}</span>
          <div className="energy-card-target-number">
            <small>Required ER</small>
            <strong>{result?.requiredER == null ? '—' : `${result.requiredER.toFixed(1)}%`}</strong>
          </div>
          <button type="button" className="text-button" onClick={onReset}>Reset setup</button>
        </div>
      </header>

      {result && (
        <div className="energy-card-summary">
          <div className="energy-summary-stat">
            <span>Build ER</span>
            <strong>{result.attainedStaticER.toFixed(1)}%</strong>
            <small>{result.reservation.reservedRolls} ER roll{result.reservation.reservedRolls === 1 ? '' : 's'} reserved</small>
          </div>
          <div className="energy-summary-stat">
            <span>Energy for Burst</span>
            <strong>{result.energyReceived.toFixed(1)} / {result.effectiveBurstCost.toFixed(0)}</strong>
            <small>{result.burstIntervalSeconds.toFixed(0)}s between Bursts</small>
          </div>
          <div className="energy-summary-visuals">
            <div className="energy-meter-row">
              <div className="energy-meter-label"><span>ER target</span><span>{Math.round(erProgress)}%</span></div>
              <div className="energy-target-track"><span className={`energy-target-fill energy-target-fill--${tone === 'neutral' ? 'warn' : tone}`} style={{ width: `${erProgress}%` }} /></div>
            </div>
            <div className="energy-meter-row">
              <div className="energy-meter-label"><span>Burst energy</span><span>{Math.round(burstProgress)}%</span></div>
              <div className="energy-target-track"><span className={`energy-target-fill energy-target-fill--${result.ready ? 'ok' : 'bad'}`} style={{ width: `${burstProgress}%` }} /></div>
            </div>
          </div>
          <div className="energy-source-visual">
            <div className="energy-meter-label"><span>Incoming energy mix</span><span>{totalIncoming.toFixed(1)}</span></div>
            <div className="energy-source-track" aria-hidden="true">
              <span className="energy-source-particles" style={{ width: `${particleShare}%` }} />
              <span className="energy-source-flat" style={{ width: `${flatShare}%` }} />
            </div>
            <div className="energy-source-legend">
              <span><i className="energy-source-dot energy-source-dot--particles" />Particles · {scaledEnergy.toFixed(1)}</span>
              <span><i className="energy-source-dot energy-source-dot--flat" />Flat refunds · {result.flatEnergyPerBurst.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="energy-unit-body">
        <section className="energy-core-settings">
          <div className="energy-core-copy">
            <span className="energy-step-number">01</span>
            <div>
              <strong>Rotation inputs</strong>
              <span>Set what this character actually does. Start here before touching advanced mechanics.</span>
            </div>
          </div>
          <div className="energy-core-controls">
            <SkillInputs
              label="Primary"
              skill={cfg.primary}
              variants={variants}
              fallbackLabel={fallback}
              onChange={(primary) => onChange({ primary })}
            />

            <div className="energy-character-basics">
              <div className="field">
                <label>Time on field</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={pct(cfg.timeOnField)}
                    onChange={(e) => onChange({ timeOnField: Math.min(1, n(e.target.value) / 100) })}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="field">
                <label>Burst every</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={cfg.burstEveryRotations}
                    onChange={(e) => onChange({ burstEveryRotations: Math.max(1, n(e.target.value)) })}
                  />
                  <span>rotation(s)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="energy-card-options-label">
          <span className="energy-step-number">02</span>
          <div><strong>Optional mechanics</strong><span>Open only the mechanics your team actually uses.</span></div>
        </div>

        <details className="energy-inline-disclosure">
          <summary>Secondary particle source <span>{secondaryActive ? `${cfg.secondary.usesPerRotation} use(s)` : 'Off'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Use this when the character has a second particle-generating skill version or additional action in the rotation.</p>
            <SkillInputs
              label="Secondary"
              skill={cfg.secondary}
              variants={variants}
              fallbackLabel=""
              optional
              onChange={(secondary) => onChange({ secondary })}
            />
          </div>
        </details>

        <details className="energy-inline-disclosure">
          <summary>Particle funneling <span>{funnelActive ? 'Customized' : 'Natural catches'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Change this only when you deliberately swap characters so someone else catches generated particles.</p>
            <FunnelInputs label="Primary skill" skill={cfg.primary} units={units} unitId={unit.id} onChange={(primary) => onChange({ primary })} />
            {secondaryActive && (
              <FunnelInputs label="Secondary source" skill={cfg.secondary} units={units} unitId={unit.id} onChange={(secondary) => onChange({ secondary })} />
            )}
          </div>
        </details>

        <details className="energy-inline-disclosure">
          <summary>Favonius <span>{favoniusActive ? `${cfg.favoniusTriggersPerRotation} trigger(s)` : 'Off'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Enter expected Favonius passive triggers per rotation. Leave this at 0 when the character is not using a Favonius weapon.</p>
            <div className="energy-favonius-row">
              <div className="field">
                <label>Triggers per rotation</label>
                <input type="number" min={0} step={0.25} value={cfg.favoniusTriggersPerRotation} onChange={(e) => onChange({ favoniusTriggersPerRotation: n(e.target.value) })} />
              </div>
              <div className="field">
                <label>Who catches the particles?</label>
                <select value={cfg.favoniusTargetUnitId ?? ''} onChange={(e) => onChange({ favoniusTargetUnitId: e.target.value || null })}>
                  <option value="">Natural catch / self</option>
                  {units.filter((candidate) => candidate.id !== unit.id).map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{characterName(candidate)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Share caught</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={pct(cfg.favoniusFeedFraction)}
                    onChange={(e) => onChange({ favoniusFeedFraction: Math.min(1, n(e.target.value) / 100) })}
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>
        </details>

        {result && (
          <details className="energy-inline-disclosure energy-explain-disclosure">
            <summary>Why this ER requirement? <span>{result.erScaledEnergyAt100ER.toFixed(1)} Energy at 100% ER</span></summary>
            <div className="energy-inline-disclosure-body">
              <div className="energy-explanation-grid">
                <div>
                  <strong>Energy needed</strong>
                  <dl className="energy-breakdown-list">
                    <div><dt>Burst cost</dt><dd>{result.burstEnergyCost.toFixed(0)}</dd></div>
                    {result.burstCostDiscount > 0 && <div><dt>Cost discount</dt><dd>−{result.burstCostDiscount.toFixed(1)}</dd></div>}
                    {result.flatEnergyPerBurst > 0 && <div><dt>Flat Energy</dt><dd>−{result.flatEnergyPerBurst.toFixed(1)}</dd></div>}
                  </dl>
                </div>
                <div>
                  <strong>Particle Energy at 100% ER</strong>
                  <dl className="energy-breakdown-list">
                    {result.particleBreakdown.map((source) => (
                      <div key={source.id}><dt>{source.label}</dt><dd>{source.energyAt100ER.toFixed(1)}</dd></div>
                    ))}
                    {result.erScaledDirectEnergyAt100ER > 0 && <div><dt>ER-scaled direct Energy</dt><dd>{result.erScaledDirectEnergyAt100ER.toFixed(1)}</dd></div>}
                  </dl>
                </div>
                {result.flatBreakdown.length > 0 && (
                  <div>
                    <strong>Flat Energy sources</strong>
                    <dl className="energy-breakdown-list">
                      {result.flatBreakdown.map((source, index) => <div key={`${source.label}-${index}`}><dt>{source.label}</dt><dd>{source.amount.toFixed(1)}</dd></div>)}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </details>
        )}

        {(data?.help || !data) && (
          <details className="energy-inline-disclosure">
            <summary>Character notes</summary>
            <div className="energy-inline-disclosure-body">
              <p className="subtle">{data?.help ?? 'No reference-sheet energy data was found for this character. Use manual sources or overrides as needed.'}</p>
            </div>
          </details>
        )}

        <details className="energy-inline-disclosure energy-advanced">
          <summary>Manual overrides <span>Advanced</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Use these only for mechanics the automatic model cannot infer from the rotation.</p>
            <OverrideFields label="Primary skill" skill={cfg.primary} onChange={(primary) => onChange({ primary })} />
            <OverrideFields label="Secondary source" skill={cfg.secondary} onChange={(secondary) => onChange({ secondary })} />
            <div className="energy-favonius-row">
              <div className="field">
                <label>Extra flat Energy / rotation</label>
                <input type="number" min={0} value={cfg.manualFlatEnergyPerRotation} onChange={(e) => onChange({ manualFlatEnergyPerRotation: n(e.target.value) })} />
              </div>
              <div className="field">
                <label>Extra Burst cost discount</label>
                <input type="number" min={0} value={cfg.manualBurstCostDiscount} onChange={(e) => onChange({ manualBurstCostDiscount: n(e.target.value) })} />
              </div>
              <div className="field">
                <label>Extra effective ER bonus</label>
                <div className="input-with-unit">
                  <input type="number" min={0} value={cfg.manualIntrinsicERBonus} onChange={(e) => onChange({ manualIntrinsicERBonus: n(e.target.value) })} />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </article>
  );
}
