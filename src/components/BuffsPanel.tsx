import { useStore } from '../store';
import { BuffEditor } from './BuffEditor';

function scopesOverlap(a: string[] | 'all', b: string[] | 'all'): boolean {
  if (a === 'all' || b === 'all') return true;
  return a.some((x) => b.includes(x));
}

export function BuffsPanel() {
  const buffs = useStore((s) => s.buffs);
  const addBuff = useStore((s) => s.addBuff);

  const fractionalBuffs = buffs.filter((b) => b.uptimeMode === 'fractional');
  const overlapping = fractionalBuffs.some((a, i) =>
    fractionalBuffs.some(
      (b, j) => i !== j && scopesOverlap(a.scopeUnitIds, b.scopeUnitIds) && scopesOverlap(a.scopeCategories, b.scopeCategories)
    )
  );

  return (
    <section className="panel">
      <h2>Buffs</h2>
      {overlapping && (
        <div className="warn-banner">
          Multiple fractional-uptime buffs overlap in scope. Their combined effect is an approximation, not exact — use
          per-hit toggles instead if you need precision.
        </div>
      )}
      {buffs.map((b) => (
        <BuffEditor key={b.id} buff={b} />
      ))}
      <button type="button" onClick={addBuff}>
        + Add buff
      </button>
    </section>
  );
}
