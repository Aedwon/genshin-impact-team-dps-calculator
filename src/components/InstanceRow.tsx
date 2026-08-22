import { useMemo } from 'react';
import { useStore } from '../store';
import { getTalentMvSuggestions } from '../lib/genshinData';
import {
  TRANSFORMATIVE_LABELS,
  type AbilityCategory,
  type AmpDirection,
  type DamageInstance,
  type Element,
  type ReactionType,
  type RotationInstance,
  type ScalingStat,
  type TransformativeInstance,
  type TransformativeType,
} from '../types';

const CATEGORIES: AbilityCategory[] = ['Normal', 'Charged', 'Plunge', 'Skill', 'Burst'];
const ELEMENTS: Element[] = ['Pyro', 'Hydro', 'Electro', 'Cryo', 'Anemo', 'Geo', 'Dendro', 'Physical'];
const SCALING_STATS: ScalingStat[] = ['ATK', 'HP', 'DEF', 'EM'];
const REACTIONS: ReactionType[] = ['none', 'vaporize', 'melt', 'aggravate', 'spread'];
const TRANSFORMATIVE_TYPES = Object.keys(TRANSFORMATIVE_LABELS) as TransformativeType[];

const AMP_OPTIONS: Record<'vaporize' | 'melt', { value: AmpDirection; label: string }[]> = {
  vaporize: [
    { value: 'vapeHydroOnPyro', label: 'Hydro on Pyro (2.0x)' },
    { value: 'vapePyroOnHydro', label: 'Pyro on Hydro (1.5x)' },
  ],
  melt: [
    { value: 'meltPyroOnCryo', label: 'Pyro on Cryo (2.0x)' },
    { value: 'meltCryoOnPyro', label: 'Cryo on Pyro (1.5x)' },
  ],
};

interface Props {
  instance: RotationInstance;
  index: number;
  total: number;
}

export function InstanceRow({ instance, index, total }: Props) {
  const units = useStore((s) => s.units);
  const buffs = useStore((s) => s.buffs);
  const updateInstance = useStore((s) => s.updateInstance);
  const removeInstance = useStore((s) => s.removeInstance);
  const moveInstance = useStore((s) => s.moveInstance);

  const unit = units.find((u) => u.id === instance.unitId);
  const category: AbilityCategory = instance.kind === 'damage' ? instance.category : 'Reaction';

  const eligiblePerHitBuffs = useMemo(
    () =>
      buffs.filter((b) => {
        if (b.uptimeMode !== 'perHit') return false;
        const unitOk = b.scopeUnitIds === 'all' || (instance.unitId != null && b.scopeUnitIds.includes(instance.unitId));
        const catOk = b.scopeCategories === 'all' || b.scopeCategories.includes(category);
        return unitOk && catOk;
      }),
    [buffs, instance.unitId, category]
  );

  const mvSuggestions =
    instance.kind === 'damage' && unit?.characterName
      ? getTalentMvSuggestions(unit.characterName).filter((s) => s.category === instance.category)
      : [];

  function toggleBuff(buffId: string, checked: boolean) {
    updateInstance(instance.id, { buffToggles: { ...instance.buffToggles, [buffId]: checked } });
  }

  return (
    <div className="instance-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="pill">
          #{index + 1} {instance.kind === 'transformative' ? '(transformative)' : ''}
        </span>
        <div className="row">
          <button type="button" onClick={() => moveInstance(instance.id, 'up')} disabled={index === 0}>
            ↑
          </button>
          <button type="button" onClick={() => moveInstance(instance.id, 'down')} disabled={index === total - 1}>
            ↓
          </button>
          <button type="button" className="danger" onClick={() => removeInstance(instance.id)}>
            remove
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', margin: '8px 0' }}>
        <div className="field">
          <label>Label</label>
          <input
            type="text"
            value={instance.label}
            onChange={(e) => updateInstance(instance.id, { label: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Unit</label>
          <select value={instance.unitId ?? ''} onChange={(e) => updateInstance(instance.id, { unitId: e.target.value || null })}>
            <option value="">-- unassigned --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.characterName ?? u.id.slice(0, 4)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {instance.kind === 'damage' ? (
        <DamageFields instance={instance} mvSuggestions={mvSuggestions} />
      ) : (
        <TransformativeFields instance={instance} />
      )}

      {eligiblePerHitBuffs.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span className="subtle">Per-hit buffs active on this instance:</span>
          <div className="row">
            {eligiblePerHitBuffs.map((b) => (
              <label key={b.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!instance.buffToggles[b.id]}
                  onChange={(e) => toggleBuff(b.id, e.target.checked)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DamageFields({
  instance,
  mvSuggestions,
}: {
  instance: DamageInstance;
  mvSuggestions: { hitLabel: string; valuesByTalentLevel: number[] }[];
}) {
  const updateInstance = useStore((s) => s.updateInstance);

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 8 }}>
        <div className="field">
          <label>Category</label>
          <select value={instance.category} onChange={(e) => updateInstance(instance.id, { category: e.target.value as AbilityCategory })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Element</label>
          <select value={instance.element} onChange={(e) => updateInstance(instance.id, { element: e.target.value as Element })}>
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Scaling stat</label>
          <select value={instance.scalingStat} onChange={(e) => updateInstance(instance.id, { scalingStat: e.target.value as ScalingStat })}>
            {SCALING_STATS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Hits</label>
          <input type="number" min={1} value={instance.hits} onChange={(e) => updateInstance(instance.id, { hits: Number(e.target.value) })} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', marginBottom: 8 }}>
        <div className="field">
          <label>MV (fraction, e.g. 3.0 = 300%)</label>
          <input type="number" step={0.001} value={instance.mv} onChange={(e) => updateInstance(instance.id, { mv: Number(e.target.value) })} />
        </div>
        {mvSuggestions.length > 0 && (
          <div className="field">
            <label>genshin-db reference (talent lvl 9, click to use)</label>
            <div className="row">
              {mvSuggestions.map((s) => {
                const v = s.valuesByTalentLevel[8] ?? s.valuesByTalentLevel[s.valuesByTalentLevel.length - 1];
                return (
                  <button key={s.hitLabel} type="button" className="copy-btn" onClick={() => updateInstance(instance.id, { mv: v, mvSuggestion: v })}>
                    {s.hitLabel}: {v.toFixed(3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 4 }}>
        <div className="field">
          <label>Reaction</label>
          <select value={instance.reaction} onChange={(e) => updateInstance(instance.id, { reaction: e.target.value as ReactionType, ampDirection: null })}>
            {REACTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {(instance.reaction === 'vaporize' || instance.reaction === 'melt') && (
          <div className="field">
            <label>Direction</label>
            <select value={instance.ampDirection ?? ''} onChange={(e) => updateInstance(instance.id, { ampDirection: e.target.value as AmpDirection })}>
              <option value="">-- select --</option>
              {AMP_OPTIONS[instance.reaction].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </>
  );
}

function TransformativeFields({ instance }: { instance: TransformativeInstance }) {
  const updateInstance = useStore((s) => s.updateInstance);
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <div className="field">
        <label>Reaction type</label>
        <select value={instance.reactionType} onChange={(e) => updateInstance(instance.id, { reactionType: e.target.value as TransformativeType })}>
          {TRANSFORMATIVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TRANSFORMATIVE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Hits / ticks</label>
        <input type="number" min={1} value={instance.hits} onChange={(e) => updateInstance(instance.id, { hits: Number(e.target.value) })} />
      </div>
      <div className="field">
        <label>Allow crit (rare)</label>
        <label className="checkbox-row">
          <input type="checkbox" checked={instance.allowCrit} onChange={(e) => updateInstance(instance.id, { allowCrit: e.target.checked })} />
          enabled
        </label>
      </div>
    </div>
  );
}
