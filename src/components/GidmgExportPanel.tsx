import { useState } from 'react';
import { useStore } from '../store';
import { buildGidmgExport, downloadGidmgExport, fetchGidmgMetadata, type GidmgMetadata } from '../lib/gidmgExport';
import { SearchableSelect } from './SearchableSelect';

export function GidmgExportPanel() {
  const units = useStore((s) => s.units);
  const [metadata, setMetadata] = useState<GidmgMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setSelections, setSetSelections] = useState<Record<string, string | null>>({});
  const [warnings, setWarnings] = useState<string[] | null>(null);

  const configuredUnits = units.filter((u) => u.characterName);
  const setNames = metadata?.artifacts.map((a) => a.name).sort() ?? [];

  async function handleFetch() {
    setLoading(true);
    setError(null);
    try {
      const meta = await fetchGidmgMetadata();
      setMetadata(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gidmgcalculator metadata.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!metadata) return;
    const options = Object.fromEntries(
      configuredUnits.map((u) => {
        const setName = setSelections[u.id];
        const code = setName ? metadata.artifacts.find((a) => a.name === setName)?.code ?? null : null;
        return [u.id, { artifactSetCode: code }];
      })
    );
    const outcome = buildGidmgExport(units, metadata, options);
    setWarnings(outcome.warnings);
    if (outcome.fileData.characters.length > 0) {
      downloadGidmgExport(outcome);
    }
  }

  return (
    <section className="panel">
      <h2>Export to gidmgcalculator format</h2>
      <p className="subtle">
        Interop with{' '}
        <a href="https://gidmgcalculator.web.app/" target="_blank" rel="noreferrer">
          gidmgcalculator.web.app
        </a>
        . Our KQMS artifact model pools substats across the whole set rather than tracking real per-piece rolls, so
        the 5 exported pieces are fabricated to match your totals — not a real drop breakdown. This also doesn't
        track which real artifact set you're using (KQMS treats set bonuses as manual buffs), so pick one below for
        each character purely for the export; it has no effect on this app's own damage numbers. Unlike the rest of
        this tool, this feature calls a third-party public API (gidmgcalculator's own metadata endpoint) to resolve
        character/weapon/set IDs — only when you click the button below.
      </p>

      {!metadata && (
        <button type="button" onClick={handleFetch} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch gidmgcalculator data'}
        </button>
      )}
      {error && <div className="error-banner">{error}</div>}

      {metadata && (
        <>
          <div className="table-scroll" style={{ marginBottom: 10 }}>
            <table className="dense">
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Weapon</th>
                  <th>Artifact set (export only)</th>
                </tr>
              </thead>
              <tbody>
                {configuredUnits.map((u) => (
                  <tr key={u.id}>
                    <td>{u.characterName}</td>
                    <td>{u.weaponName ?? '(none)'}</td>
                    <td>
                      <SearchableSelect
                        id={`gidmg-set-${u.id}`}
                        value={setSelections[u.id] ?? null}
                        onChange={(v) => setSetSelections((prev) => ({ ...prev, [u.id]: v }))}
                        options={setNames}
                        placeholder="Search set..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="primary" onClick={handleDownload}>
            Download gidmgcalculator JSON
          </button>

          {warnings && warnings.length > 0 && (
            <div className="warn-banner" style={{ marginTop: 8 }}>
              {warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
