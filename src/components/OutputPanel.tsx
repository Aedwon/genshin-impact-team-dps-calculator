import { useMemo, useRef } from 'react';
import { useStore } from '../store';
import { computeInstance, type InstanceBreakdown } from '../lib/damageCalc';
import type { CritMode, RotationInstance } from '../types';

function selected(breakdown: InstanceBreakdown, mode: CritMode): number {
  return breakdown.total[mode];
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

interface Row {
  instance: RotationInstance;
  breakdown: InstanceBreakdown;
  unitName: string;
}

export function OutputPanel() {
  const units = useStore((s) => s.units);
  const buffs = useStore((s) => s.buffs);
  const rotation = useStore((s) => s.rotation);
  const enemy = useStore((s) => s.enemy);
  const rotationDuration = useStore((s) => s.rotationDuration);
  const critMode = useStore((s) => s.critMode);
  const tableRef = useRef<HTMLTableElement>(null);

  const rows: Row[] = useMemo(
    () =>
      rotation.map((instance) => {
        const unit = units.find((u) => u.id === instance.unitId);
        return {
          instance,
          breakdown: computeInstance(instance, units, buffs, enemy),
          unitName: unit?.characterName ?? 'unassigned',
        };
      }),
    [rotation, units, buffs, enemy]
  );

  const perUnitTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.unitName;
      map.set(key, (map.get(key) ?? 0) + selected(row.breakdown, critMode));
    }
    return map;
  }, [rows, critMode]);

  const teamTotal = rows.reduce((sum, r) => sum + selected(r.breakdown, critMode), 0);
  const teamDPS = rotationDuration > 0 ? teamTotal / rotationDuration : 0;

  function copyTable() {
    if (!tableRef.current) return;
    const text = Array.from(tableRef.current.querySelectorAll('tr'))
      .map((tr) => Array.from(tr.querySelectorAll('th,td')).map((cell) => cell.textContent).join('\t'))
      .join('\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <section className="panel">
      <h2>Output</h2>

      <div className="panel" style={{ background: 'var(--bg-alt)' }}>
        <h3>Assumptions</h3>
        <p className="subtle">
          Enemy Lv{enemy.level}, Base RES {enemy.baseRES}% &middot; Rotation length {rotationDuration}s &middot; Crit
          mode: {critMode}
        </p>
        <p className="subtle">
          Units:{' '}
          {units
            .map((u) => `${u.characterName ?? 'unassigned'} C${u.constellation} (${u.talentLevels.normal}/${u.talentLevels.skill}/${u.talentLevels.burst})`)
            .join(', ')}
        </p>
        {buffs.length > 0 && (
          <p className="subtle">
            Buffs:{' '}
            {buffs
              .map((b) => `${b.name} [${b.uptimeMode}${b.uptimeMode === 'fractional' ? ` ${b.fraction ?? 1}` : ''}]`)
              .join(', ')}
          </p>
        )}
      </div>

      <div className="row" style={{ margin: '8px 0' }}>
        <button type="button" className="copy-btn" onClick={copyTable}>
          Copy table
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="dense" ref={tableRef}>
          <thead>
            <tr>
              <th>#</th>
              <th>Label</th>
              <th>Unit</th>
              <th>BaseDMG</th>
              <th>DMG Bonus%</th>
              <th>DEF Mult</th>
              <th>RES Mult</th>
              <th>Amp Mult</th>
              <th>Crit Mult</th>
              <th>Hits</th>
              <th>Non-crit</th>
              <th>Average</th>
              <th>On-crit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ instance, breakdown, unitName }, i) => (
              <tr key={instance.id}>
                <td>{i + 1}</td>
                <td>{instance.label}</td>
                <td>{unitName}</td>
                <td className="num">{breakdown.kind === 'damage' ? fmt(breakdown.baseDMG) : '-'}</td>
                <td className="num">{breakdown.kind === 'damage' ? fmt(breakdown.totalDmgBonusPercent) : '-'}</td>
                <td className="num">{breakdown.kind === 'damage' ? breakdown.defMultiplier.toFixed(4) : '-'}</td>
                <td className="num">{breakdown.resMultiplier.toFixed(4)}</td>
                <td className="num">{breakdown.kind === 'damage' ? breakdown.amplifyingMultiplier.toFixed(4) : '-'}</td>
                <td className="num">
                  {breakdown.kind === 'damage'
                    ? breakdown.critMultiplier.average.toFixed(4)
                    : breakdown.critMultiplier
                    ? breakdown.critMultiplier.average.toFixed(4)
                    : 'off'}
                </td>
                <td className="num">{breakdown.hits}</td>
                <td className="num">{fmt(breakdown.total.nonCrit)}</td>
                <td className="num" style={{ fontWeight: critMode === 'average' ? 700 : 400 }}>
                  {fmt(breakdown.total.average)}
                </td>
                <td className="num">{fmt(breakdown.total.onCrit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table className="dense" style={{ marginTop: 12, maxWidth: 400 }}>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Subtotal ({critMode})</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(perUnitTotals.entries()).map(([name, total]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className="num">{fmt(total)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 700 }}>Team total</td>
            <td className="num" style={{ fontWeight: 700 }}>
              {fmt(teamTotal)}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700 }}>Team DPS</td>
            <td className="num" style={{ fontWeight: 700 }}>
              {fmt(teamDPS)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
