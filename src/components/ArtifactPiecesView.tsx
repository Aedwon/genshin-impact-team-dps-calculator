import { distributeSubstatsToPieces, type ArtifactSlot } from '../lib/artifacts';
import { SUBSTAT_LABELS, type ArtifactConfig, type Element } from '../types';

const SLOT_LABELS: Record<ArtifactSlot, string> = {
  flower: 'Flower',
  plume: 'Feather',
  sands: 'Sands',
  goblet: 'Goblet',
  circlet: 'Circlet',
};

const FLAT_FIELDS = new Set(['flatHP', 'flatATK', 'flatDEF', 'em']);

function formatMainStat(field: string, value: number, element?: Element): string {
  if (field === 'elementalDMG') return `${element ?? ''} DMG +${value.toFixed(1)}%`;
  if (field === 'physicalDMG') return `Physical DMG +${value.toFixed(1)}%`;
  if (field === 'healingBonus') return `Healing Bonus +${value.toFixed(1)}%`;
  if (FLAT_FIELDS.has(field)) return value.toFixed(0);
  return `+${value.toFixed(1)}%`;
}

function mainStatLabel(field: string): string {
  if (field === 'elementalDMG') return 'Elemental DMG';
  if (field === 'physicalDMG') return 'Physical DMG';
  if (field === 'healingBonus') return 'Healing Bonus';
  return SUBSTAT_LABELS[field as keyof typeof SUBSTAT_LABELS] ?? field;
}

interface Props {
  artifacts: ArtifactConfig;
  wielderElement: Element;
}

export function ArtifactPiecesView({ artifacts, wielderElement }: Props) {
  const pieces = distributeSubstatsToPieces(artifacts, wielderElement);

  return (
    <div>
      <p className="subtle" style={{ marginBottom: 6 }}>
        Fabricated to match your KQMS-allocated totals exactly — this app pools substats across the whole set rather
        than tracking real per-piece rolls, so which piece a given substat landed on isn't meaningful, only the
        totals are.
      </p>
      <div className="artifact-pieces-grid" style={{ marginBottom: 8 }}>
        {pieces.map((piece) => (
          <div key={piece.slot} className="artifact-piece-card">
            <h3 style={{ fontSize: 12.5, marginBottom: 4 }}>{SLOT_LABELS[piece.slot]}</h3>
            <p className="subtle" style={{ marginBottom: 4 }}>
              {mainStatLabel(piece.mainStat.field)}
            </p>
            <p className="num" style={{ marginBottom: 6, fontWeight: 600 }}>
              {formatMainStat(piece.mainStat.field, piece.mainStat.value, piece.mainStat.element)}
            </p>
            {piece.substats.map((s) => (
              <div key={s.type} className="row" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                <span className="subtle">{SUBSTAT_LABELS[s.type]}</span>
                <span className="num">{FLAT_FIELDS.has(s.type) ? s.value.toFixed(0) : `+${s.value.toFixed(1)}%`}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
