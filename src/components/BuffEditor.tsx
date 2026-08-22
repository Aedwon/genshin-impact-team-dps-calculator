import { useStore } from '../store';
import {
  BUFF_EFFECT_LABELS,
  type AbilityCategory,
  type Buff,
  type BuffEffect,
  type BuffEffectType,
  type Element,
} from '../types';

const EFFECT_TYPES = Object.keys(BUFF_EFFECT_LABELS) as BuffEffectType[];
const CATEGORIES: AbilityCategory[] = ['Normal', 'Charged', 'Plunge', 'Skill', 'Burst', 'Reaction'];
const ELEMENTS: Element[] = ['Pyro', 'Hydro', 'Electro', 'Cryo', 'Anemo', 'Geo', 'Dendro', 'Physical'];

interface Props {
  buff: Buff;
}

export function BuffEditor({ buff }: Props) {
  const updateBuff = useStore((s) => s.updateBuff);
  const removeBuff = useStore((s) => s.removeBuff);
  const units = useStore((s) => s.units);

  const hasCritEffect = buff.effects.some((e) => e.type === 'critRate' || e.type === 'critDMG');

  function updateEffect(idx: number, patch: Partial<BuffEffect>) {
    const effects = buff.effects.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    updateBuff(buff.id, { effects });
  }
  function addEffect() {
    updateBuff(buff.id, { effects: [...buff.effects, { type: 'atkPercent', value: 0 }] });
  }
  function removeEffect(idx: number) {
    updateBuff(buff.id, { effects: buff.effects.filter((_, i) => i !== idx) });
  }

  function toggleUnitScope(unitId: string) {
    const current = buff.scopeUnitIds === 'all' ? units.map((u) => u.id) : buff.scopeUnitIds;
    const next = current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId];
    updateBuff(buff.id, { scopeUnitIds: next });
  }
  function toggleCategoryScope(cat: AbilityCategory) {
    const current = buff.scopeCategories === 'all' ? CATEGORIES : buff.scopeCategories;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    updateBuff(buff.id, { scopeCategories: next });
  }

  return (
    <div className="buff-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <input
          type="text"
          style={{ maxWidth: 220, fontFamily: 'var(--sans)' }}
          value={buff.name}
          onChange={(e) => updateBuff(buff.id, { name: e.target.value })}
        />
        <button className="danger" type="button" onClick={() => removeBuff(buff.id)}>
          remove
        </button>
      </div>

      <table className="dense" style={{ marginTop: 8, marginBottom: 6 }}>
        <thead>
          <tr>
            <th>Effect</th>
            <th>Value</th>
            <th>Element</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {buff.effects.map((effect, i) => (
            <tr key={i}>
              <td>
                <select value={effect.type} onChange={(e) => updateEffect(i, { type: e.target.value as BuffEffectType })}>
                  {EFFECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {BUFF_EFFECT_LABELS[t]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  style={{ width: 80 }}
                  value={effect.value}
                  onChange={(e) => updateEffect(i, { value: Number(e.target.value) })}
                />
              </td>
              <td>
                {effect.type === 'elementalDMG' ? (
                  <select value={effect.element ?? 'Pyro'} onChange={(e) => updateEffect(i, { element: e.target.value as Element })}>
                    {ELEMENTS.map((el) => (
                      <option key={el} value={el}>
                        {el}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="subtle">-</span>
                )}
              </td>
              <td>
                <button type="button" className="danger" onClick={() => removeEffect(i)}>
                  x
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addEffect} style={{ marginBottom: 8 }}>
        + effect
      </button>

      <div className="row" style={{ marginBottom: 6 }}>
        <span className="subtle">Units:</span>
        <label className="checkbox-row">
          <input type="checkbox" checked={buff.scopeUnitIds === 'all'} onChange={(e) => updateBuff(buff.id, { scopeUnitIds: e.target.checked ? 'all' : units.map((u) => u.id) })} />
          all
        </label>
        {buff.scopeUnitIds !== 'all' &&
          units.map((u) => (
            <label key={u.id} className="checkbox-row">
              <input type="checkbox" checked={buff.scopeUnitIds.includes(u.id)} onChange={() => toggleUnitScope(u.id)} />
              {u.characterName ?? u.id.slice(0, 4)}
            </label>
          ))}
      </div>

      <div className="row" style={{ marginBottom: 6 }}>
        <span className="subtle">Categories:</span>
        <label className="checkbox-row">
          <input type="checkbox" checked={buff.scopeCategories === 'all'} onChange={(e) => updateBuff(buff.id, { scopeCategories: e.target.checked ? 'all' : CATEGORIES })} />
          all
        </label>
        {buff.scopeCategories !== 'all' &&
          CATEGORIES.map((cat) => (
            <label key={cat} className="checkbox-row">
              <input type="checkbox" checked={buff.scopeCategories.includes(cat)} onChange={() => toggleCategoryScope(cat)} />
              {cat}
            </label>
          ))}
      </div>

      <div className="row">
        <span className="subtle">Uptime:</span>
        <select value={buff.uptimeMode} onChange={(e) => updateBuff(buff.id, { uptimeMode: e.target.value as Buff['uptimeMode'] })}>
          <option value="always">Always-on</option>
          <option value="perHit">Per-hit toggle</option>
          <option value="fractional">Fractional</option>
        </select>
        {buff.uptimeMode === 'fractional' && (
          <input
            type="number"
            step={0.05}
            min={0}
            max={1}
            style={{ width: 70 }}
            value={buff.fraction ?? 1}
            onChange={(e) => updateBuff(buff.id, { fraction: Number(e.target.value) })}
          />
        )}
      </div>
      {buff.uptimeMode === 'fractional' && hasCritEffect && (
        <div className="warn-banner">
          Fractional uptime on a crit-type effect is an approximation, not exact. Per-hit toggling is exact if you need precision.
        </div>
      )}
    </div>
  );
}
