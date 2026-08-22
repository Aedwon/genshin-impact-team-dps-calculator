import { useStore } from '../store';
import { InstanceRow } from './InstanceRow';

export function RotationPanel() {
  const rotation = useStore((s) => s.rotation);
  const addDamageInstance = useStore((s) => s.addDamageInstance);
  const addTransformativeInstance = useStore((s) => s.addTransformativeInstance);

  return (
    <section className="panel">
      <h2>Rotation</h2>
      {rotation.map((instance, i) => (
        <InstanceRow key={instance.id} instance={instance} index={i} total={rotation.length} />
      ))}
      <div className="row">
        <button type="button" onClick={addDamageInstance}>
          + Damage instance
        </button>
        <button type="button" onClick={addTransformativeInstance}>
          + Transformative reaction
        </button>
      </div>
    </section>
  );
}
