import { MAX_UNITS, useStore } from '../store';
import { UnitCard } from './UnitCard';

export function UnitsPanel() {
  const units = useStore((s) => s.units);
  const addUnit = useStore((s) => s.addUnit);

  return (
    <section className="panel">
      <h2>Team (units)</h2>
      <div className="units-grid">
        {units.map((u) => (
          <UnitCard key={u.id} unit={u} canRemove={units.length > 1} />
        ))}
      </div>
      <button type="button" style={{ marginTop: 10 }} onClick={addUnit} disabled={units.length >= MAX_UNITS}>
        + Add unit ({units.length}/{MAX_UNITS})
      </button>
    </section>
  );
}
