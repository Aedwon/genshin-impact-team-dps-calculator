import { useStore } from '../store';
import type { CritMode } from '../types';

export function EnemyPanel() {
  const enemy = useStore((s) => s.enemy);
  const setEnemy = useStore((s) => s.setEnemy);
  const rotationDuration = useStore((s) => s.rotationDuration);
  const setRotationDuration = useStore((s) => s.setRotationDuration);
  const critMode = useStore((s) => s.critMode);
  const setCritMode = useStore((s) => s.setCritMode);

  return (
    <section className="panel">
      <h2>Enemy &amp; rotation</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="field">
          <label htmlFor="enemyLevel">Enemy Level</label>
          <input
            id="enemyLevel"
            type="number"
            value={enemy.level}
            onChange={(e) => setEnemy({ level: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="enemyRES">Enemy Base RES%</label>
          <input
            id="enemyRES"
            type="number"
            value={enemy.baseRES}
            onChange={(e) => setEnemy({ baseRES: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="rotDuration">Rotation Duration (s)</label>
          <input
            id="rotDuration"
            type="number"
            min={0.1}
            step={0.1}
            value={rotationDuration}
            onChange={(e) => setRotationDuration(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="critMode">Crit Mode</label>
          <select id="critMode" value={critMode} onChange={(e) => setCritMode(e.target.value as CritMode)}>
            <option value="average">Average</option>
            <option value="onCrit">On-crit</option>
            <option value="nonCrit">Non-crit</option>
          </select>
        </div>
      </div>
    </section>
  );
}
