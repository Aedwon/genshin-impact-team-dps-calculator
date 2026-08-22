// Explicit JSON export/import (§2/§8), on top of the localStorage autosave
// handled by the zustand persist middleware in store.ts.
import type { AppState } from '../types';

export function exportStateToFile(state: AppState, filename = 'gi-dps-build.json'): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(json: string): AppState {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.units) || !Array.isArray(parsed.rotation) || !Array.isArray(parsed.buffs) || !parsed.enemy) {
    throw new Error('Invalid build file: missing units/rotation/buffs/enemy.');
  }
  return parsed as AppState;
}
