import { useRef, useState } from 'react';
import { getFullState, useStore } from '../store';
import { exportStateToFile, parseImportedState } from '../lib/persistence';

export function ExportImportBar() {
  const loadState = useStore((s) => s.loadState);
  const resetAll = useStore((s) => s.resetAll);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    exportStateToFile(getFullState());
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const state = parseImportedState(text);
      loadState(state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <button type="button" onClick={handleExport}>
        Export build (JSON)
      </button>
      <button type="button" onClick={handleImportClick}>
        Import build (JSON)
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
      <button type="button" className="danger" onClick={() => confirm('Reset all data?') && resetAll()}>
        Reset
      </button>
      {error && <span className="error-banner">{error}</span>}
    </div>
  );
}
