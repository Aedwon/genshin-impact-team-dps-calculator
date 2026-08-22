import { getCharacterEnergyData, getEligibleEnergyVariants } from '../data/energyData';
import type { EnergySkillConfig, UnitEnergyConfig } from '../energyTypes';
import type { UnitEnergyPlanResult } from '../lib/energyModel';
import { getDefaultEnergyVariant } from '../lib/energyVariants';
import type { Unit } from '../types';

interface Props { unit: Unit; units: Unit[]; config: UnitEnergyConfig; result: UnitEnergyPlanResult | undefined; onChange: (patch: Partial<UnitEnergyConfig>) => void; onReset: () => void; }
function pct(value: number): number { return Math.round(value * 1000) / 10; }
function n(value: string): number { return Math.max(0, Number(value)); }

function SkillRow({ title, skill, variants, fallbackLabel, units, unitId, onChange }: { title: string; skill: EnergySkillConfig; variants: { label: string }[]; fallbackLabel: string; units: Unit[]; unitId: string; onChange: (next: EnergySkillConfig) => void }) {
  return <>
    <div className="field"><label>{title} variant</label><select value={skill.variantLabel ?? fallbackLabel} disabled={!variants.length} onChange={(e) => onChange({ ...skill, variantLabel: e.target.value || null })}>{!variants.length && <option value="">No sheet data</option>}{variants.map((variant) => <option key={variant.label} value={variant.label}>{variant.label}</option>)}</select></div>
    <div className="field"><label>{title} uses / rotation</label><input type="number" min={0} step={0.25} value={skill.usesPerRotation} onChange={(e) => onChange({ ...skill, usesPerRotation: n(e.target.value) })} /></div>
    <div className="field"><label>Feed {title.toLowerCase()} to</label><select value={skill.funnelTargetUnitId ?? ''} onChange={(e) => onChange({ ...skill, funnelTargetUnitId: e.target.value || null })}><option value="">self / natural catch</option>{units.filter((candidate) => candidate.id !== unitId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.characterName ?? candidate.id.slice(0, 4)}</option>)}</select></div>
    <div className="field"><label>Feed proportion</label><input type="number" min={0} max={100} step={5} value={pct(skill.funnelFraction)} onChange={(e) => onChange({ ...skill, funnelFraction: Math.min(1, n(e.target.value) / 100) })} /></div>
  </>;
}

function OverrideFields({ label, skill, onChange }: { label: string; skill: EnergySkillConfig; onChange: (next: EnergySkillConfig) => void }) {
  function set(key: keyof EnergySkillConfig['overrides'], raw: string) { onChange({ ...skill, overrides: { ...skill.overrides, [key]: raw === '' ? null : n(raw) } }); }
  return <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', marginBottom: 8 }}>
    <div className="field"><label>{label} particles/use</label><input type="number" min={0} step={0.01} placeholder="auto" value={skill.overrides.averageParticles ?? ''} onChange={(e) => set('averageParticles', e.target.value)} /></div>
    <div className="field"><label>{label} RNG variance</label><input type="number" min={0} max={1} step={0.01} placeholder="auto" value={skill.overrides.variance ?? ''} onChange={(e) => set('variance', e.target.value)} /></div>
    <div className="field"><label>{label} turret particles/s</label><input type="number" min={0} step={0.01} placeholder="auto" value={skill.overrides.particlesPerSecond ?? ''} onChange={(e) => set('particlesPerSecond', e.target.value)} /></div>
    <div className="field"><label>{label} turret duration</label><input type="number" min={0} step={0.5} placeholder="auto" value={skill.overrides.duration ?? ''} onChange={(e) => set('duration', e.target.value)} /></div>
    <div className="field"><label>{label} flat Energy/use</label><input type="number" min={0} step={0.5} placeholder="auto" value={skill.overrides.flatEnergyPerUse ?? ''} onChange={(e) => set('flatEnergyPerUse', e.target.value)} /></div>
  </div>;
}

export function EnergyUnitSetup({ unit, units, config: cfg, result, onChange, onReset }: Props) {
  const data = getCharacterEnergyData(unit.characterName); const variants = getEligibleEnergyVariants(data, unit.constellation); const fallback = getDefaultEnergyVariant(data, unit.constellation)?.label ?? '';
  return <div className="buff-card">
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><strong>{unit.characterName ?? 'Unassigned unit'}</strong><button type="button" className="copy-btn" onClick={onReset}>reset energy setup</button></div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 8 }}><SkillRow title="Primary" skill={cfg.primary} variants={variants} fallbackLabel={fallback} units={units} unitId={unit.id} onChange={(primary) => onChange({ primary })} /></div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 8 }}><SkillRow title="Secondary" skill={cfg.secondary} variants={variants} fallbackLabel="" units={units} unitId={unit.id} onChange={(secondary) => onChange({ secondary })} /></div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 8 }}>
      <div className="field"><label>Time on field</label><input type="number" min={0} max={100} step={5} value={pct(cfg.timeOnField)} onChange={(e) => onChange({ timeOnField: Math.min(1, n(e.target.value) / 100) })} /></div>
      <div className="field"><label>Rotations between bursts</label><input type="number" min={1} step={1} value={cfg.burstEveryRotations} onChange={(e) => onChange({ burstEveryRotations: Math.max(1, n(e.target.value)) })} /></div>
      <div className="field"><label>Favonius triggers / rotation</label><input type="number" min={0} step={0.25} value={cfg.favoniusTriggersPerRotation} onChange={(e) => onChange({ favoniusTriggersPerRotation: n(e.target.value) })} /></div>
      <div className="field"><label>Feed Favonius to</label><select value={cfg.favoniusTargetUnitId ?? ''} onChange={(e) => onChange({ favoniusTargetUnitId: e.target.value || null })}><option value="">self / natural catch</option>{units.filter((candidate) => candidate.id !== unit.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.characterName ?? candidate.id.slice(0, 4)}</option>)}</select></div>
      <div className="field"><label>Favonius feed proportion</label><input type="number" min={0} max={100} step={5} value={pct(cfg.favoniusFeedFraction)} onChange={(e) => onChange({ favoniusFeedFraction: Math.min(1, n(e.target.value) / 100) })} /></div>
    </div>
    <details><summary>Manual overrides for uncertain/special data</summary><OverrideFields label="Primary" skill={cfg.primary} onChange={(primary) => onChange({ primary })} /><OverrideFields label="Secondary" skill={cfg.secondary} onChange={(secondary) => onChange({ secondary })} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}><div className="field"><label>Extra flat Energy / rotation</label><input type="number" min={0} value={cfg.manualFlatEnergyPerRotation} onChange={(e) => onChange({ manualFlatEnergyPerRotation: n(e.target.value) })} /></div><div className="field"><label>Extra burst-cost discount</label><input type="number" min={0} value={cfg.manualBurstCostDiscount} onChange={(e) => onChange({ manualBurstCostDiscount: n(e.target.value) })} /></div><div className="field"><label>Extra effective ER bonus (pp)</label><input type="number" min={0} value={cfg.manualIntrinsicERBonus} onChange={(e) => onChange({ manualIntrinsicERBonus: n(e.target.value) })} /></div></div>
    </details>
    {data?.help && <p className="subtle" style={{ marginTop: 8 }}>{data.help}</p>}{result && <p className="subtle" style={{ marginTop: 8 }}>{result.erScaledEnergyAt100ER.toFixed(1)} ER-scaled Energy @100% + {result.flatEnergyPerBurst.toFixed(1)} flat over {result.burstIntervalSeconds.toFixed(0)}s.</p>}
  </div>;
}
