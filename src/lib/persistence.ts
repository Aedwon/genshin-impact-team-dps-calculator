import type { PersistedState } from '../store';

export function exportStateToFile(state: PersistedState, filename = 'gi-dps-build.json'): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(json: string): PersistedState {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.units) || !Array.isArray(parsed.rotation) || !Array.isArray(parsed.buffs) || !parsed.enemy) {
    throw new Error('Invalid build file: missing units/rotation/buffs/enemy.');
  }
  // Energy fields are optional here for backwards compatibility. Store.loadState
  // fills defaults for builds exported before the ER planner existed.
  return parsed as PersistedState;
}
