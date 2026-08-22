import { getCharacterEnergyData, getEligibleEnergyVariants } from '../data/energyData';
import type { EnergySkillConfig, UnitEnergyConfig } from '../energyTypes';
import type { UnitEnergyPlanResult } from '../lib/energyModel';
import { getDefaultEnergyVariant } from '../lib/energyVariants';
import type { Unit } from '../types';

interface Props {
  unit: Unit;
  units: Unit[];
  config: UnitEnergyConfig;
  result: UnitEnergyPlanResult | undefined;
  onChange: (patch: Partial<UnitEnergyConfig>) => void;
  onReset: () => void;
}

function pct(value: number): number {
  return Math.round(value * 1000) / 10;
}

function n(value: string): number {
  return Math.max(0, Number(value));
}

function characterName(unit: Unit): string {
  return unit.characterName ?? unit.id.slice(0, 4);
}

function SkillInputs({
  label,
  skill,
  variants,
  fallbackLabel,
  onChange,
}: {
  label: string;
  skill: EnergySkillConfig;
  variants: { label: string }[];
  fallbackLabel: string;
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

function resultSummary(result: UnitEnergyPlanResult | undefined): string {
  if (!result) return '';
  if (result.requiredER == null) return 'No particle energy reaches this character';
  if (result.reservation.erShortfall > 0) return `${result.reservation.erShortfall.toFixed(1)}% ER beyond artifact cap`;
  if (result.reservation.budgetConflictRolls > 0) return `Free ${result.reservation.budgetConflictRolls} non-ER roll(s)`;
  return result.ready ? 'Burst ready' : `${result.energyShortfall.toFixed(1)} Energy short`;
}

export function EnergyUnitSetup({ unit, units, config: cfg, result, onChange, onReset }: Props) {
  const data = getCharacterEnergyData(unit.characterName);
  const variants = getEligibleEnergyVariants(data, unit.constellation);
  const fallback = getDefaultEnergyVariant(data, unit.constellation)?.label ?? '';
  const secondaryActive = cfg.secondary.usesPerRotation > 0;
  const funnelActive = Boolean(
    (cfg.primary.funnelTargetUnitId && cfg.primary.funnelFraction > 0)
    || (cfg.secondary.funnelTargetUnitId && cfg.secondary.funnelFraction > 0),
  );
  const favoniusActive = cfg.favoniusTriggersPerRotation > 0;

  return (
    <article className="energy-unit">
      <header className="energy-unit-header">
        <div>
          <h4>{unit.characterName ?? 'Unassigned unit'}</h4>
          {result && (
            <p className="energy-unit-result">
              <strong>{result.requiredER == null ? '—' : `${result.requiredER.toFixed(1)}% ER required`}</strong>
              <span>·</span>
              <span>{resultSummary(result)}</span>
            </p>
          )}
        </div>
        <button type="button" className="text-button" onClick={onReset}>Reset</button>
      </header>

      <div className="energy-unit-body">
        <div className="energy-core-settings">
          <div className="energy-core-copy">
            <strong>Rotation</strong>
            <span>How this character generates particles and how often they Burst.</span>
          </div>
          <div className="energy-core-controls">
            <SkillInputs
              label="Skill"
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
        </div>

        <details className="energy-inline-disclosure">
          <summary>Secondary particle source <span>{secondaryActive ? `${cfg.secondary.usesPerRotation} use(s)` : 'Off'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Use this for a second skill variant or an additional particle-producing action in the same rotation.</p>
            <SkillInputs
              label="Secondary"
              skill={cfg.secondary}
              variants={variants}
              fallbackLabel=""
              onChange={(secondary) => onChange({ secondary })}
            />
          </div>
        </details>

        <details className="energy-inline-disclosure">
          <summary>Particle funneling <span>{funnelActive ? 'Customized' : 'Natural catches'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Only change this when you deliberately swap characters so someone else catches the generated particles.</p>
            <FunnelInputs
              label="Primary skill"
              skill={cfg.primary}
              units={units}
              unitId={unit.id}
              onChange={(primary) => onChange({ primary })}
            />
            {secondaryActive && (
              <FunnelInputs
                label="Secondary source"
                skill={cfg.secondary}
                units={units}
                unitId={unit.id}
                onChange={(secondary) => onChange({ secondary })}
              />
            )}
          </div>
        </details>

        <details className="energy-inline-disclosure">
          <summary>Favonius <span>{favoniusActive ? `${cfg.favoniusTriggersPerRotation} trigger(s)` : 'Off'}</span></summary>
          <div className="energy-inline-disclosure-body">
            <p className="subtle">Enter expected Favonius passive triggers per rotation. Leave at 0 when this character is not using a Favonius weapon.</p>
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
          <details className="energy-inline-disclosure">
            <summary>Why this ER requirement? <span>{result.erScaledEnergyAt100ER.toFixed(1)} Energy before ER scaling</span></summary>
            <div className="energy-inline-disclosure-body">
              <div className="energy-explanation-grid">
                <div>
                  <strong>Need</strong>
                  <dl className="energy-breakdown-list">
                    <div><dt>Burst cost</dt><dd>{result.burstEnergyCost.toFixed(0)}</dd></div>
                    {result.burstCostDiscount > 0 && <div><dt>Cost discount</dt><dd>−{result.burstCostDiscount.toFixed(1)}</dd></div>}
                    {result.flatEnergyPerBurst > 0 && <div><dt>Flat Energy</dt><dd>−{result.flatEnergyPerBurst.toFixed(1)}</dd></div>}
                  </dl>
                </div>
                <div>
                  <strong>Particle / ER-scaled Energy at 100% ER</strong>
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
