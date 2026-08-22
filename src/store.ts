// Single Zustand store holding team, buffs, rotation, and enemy config.
// Autosaves to localStorage (persist middleware) per spec §2; explicit JSON
// export/import is layered on top in lib/persistence.ts.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ENEMY } from './constants';
import {
  createBuff,
  createDamageInstance,
  createFlatEnergyGrant,
  createParticleBatch,
  createTransformativeInstance,
  createUnit,
  type AppState,
  type Buff,
  type CritMode,
  type EnemyConfig,
  type FlatEnergyGrant,
  type ParticleBatch,
  type RotationInstance,
  type Unit,
} from './types';

export const MAX_UNITS = 4;

function uid(): string {
  return crypto.randomUUID();
}

export interface StoreState extends AppState {
  addUnit: () => void;
  removeUnit: (id: string) => void;
  updateUnit: (id: string, patch: Partial<Unit>) => void;

  addBuff: () => void;
  removeBuff: (id: string) => void;
  updateBuff: (id: string, patch: Partial<Buff>) => void;

  addDamageInstance: () => void;
  addTransformativeInstance: () => void;
  removeInstance: (id: string) => void;
  updateInstance: (id: string, patch: Partial<RotationInstance>) => void;
  moveInstance: (id: string, direction: 'up' | 'down') => void;

  setEnemy: (patch: Partial<EnemyConfig>) => void;
  setRotationDuration: (seconds: number) => void;
  setCritMode: (mode: CritMode) => void;

  addParticleBatch: () => void;
  removeParticleBatch: (id: string) => void;
  updateParticleBatch: (id: string, patch: Partial<ParticleBatch>) => void;

  addFlatEnergyGrant: () => void;
  removeFlatEnergyGrant: (id: string) => void;
  updateFlatEnergyGrant: (id: string, patch: Partial<FlatEnergyGrant>) => void;

  loadState: (state: AppState) => void;
  resetAll: () => void;
}

const initialState: AppState = {
  units: [createUnit(uid())],
  buffs: [],
  rotation: [],
  enemy: { ...DEFAULT_ENEMY },
  rotationDuration: 20,
  critMode: 'average',
  particleBatches: [],
  flatEnergyGrants: [],
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialState,

      addUnit: () =>
        set((s) => (s.units.length >= MAX_UNITS ? s : { units: [...s.units, createUnit(uid())] })),
      removeUnit: (id) =>
        set((s) => ({
          units: s.units.filter((u) => u.id !== id),
          rotation: s.rotation.map((r) => (r.unitId === id ? { ...r, unitId: null } : r)),
          buffs: s.buffs.map((b) =>
            b.scopeUnitIds === 'all' ? b : { ...b, scopeUnitIds: b.scopeUnitIds.filter((u) => u !== id) }
          ),
          particleBatches: s.particleBatches.map((batch) => ({
            ...batch,
            sourceUnitId: batch.sourceUnitId === id ? null : batch.sourceUnitId,
            catcherUnitId: batch.catcherUnitId === id ? null : batch.catcherUnitId,
          })),
          flatEnergyGrants: s.flatEnergyGrants.map((g) => (g.unitId === id ? { ...g, unitId: null } : g)),
        })),
      updateUnit: (id, patch) =>
        set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

      addBuff: () => set((s) => ({ buffs: [...s.buffs, createBuff(uid())] })),
      removeBuff: (id) =>
        set((s) => ({
          buffs: s.buffs.filter((b) => b.id !== id),
          rotation: s.rotation.map((r) => {
            if (!(r.buffToggles && r.buffToggles[id] !== undefined)) return r;
            const { [id]: _removed, ...rest } = r.buffToggles;
            return { ...r, buffToggles: rest };
          }),
        })),
      updateBuff: (id, patch) => set((s) => ({ buffs: s.buffs.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      addDamageInstance: () => set((s) => ({ rotation: [...s.rotation, createDamageInstance(uid())] })),
      addTransformativeInstance: () =>
        set((s) => ({ rotation: [...s.rotation, createTransformativeInstance(uid())] })),
      removeInstance: (id) => set((s) => ({ rotation: s.rotation.filter((r) => r.id !== id) })),
      updateInstance: (id, patch) =>
        set((s) => ({
          rotation: s.rotation.map((r) => (r.id === id ? ({ ...r, ...patch } as RotationInstance) : r)),
        })),
      moveInstance: (id, direction) =>
        set((s) => {
          const idx = s.rotation.findIndex((r) => r.id === id);
          if (idx === -1) return s;
          const swapWith = direction === 'up' ? idx - 1 : idx + 1;
          if (swapWith < 0 || swapWith >= s.rotation.length) return s;
          const next = [...s.rotation];
          [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
          return { rotation: next };
        }),

      setEnemy: (patch) => set((s) => ({ enemy: { ...s.enemy, ...patch } })),
      setRotationDuration: (seconds) => set({ rotationDuration: seconds }),
      setCritMode: (mode) => set({ critMode: mode }),

      addParticleBatch: () => set((s) => ({ particleBatches: [...s.particleBatches, createParticleBatch(uid())] })),
      removeParticleBatch: (id) =>
        set((s) => ({ particleBatches: s.particleBatches.filter((b) => b.id !== id) })),
      updateParticleBatch: (id, patch) =>
        set((s) => ({ particleBatches: s.particleBatches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      addFlatEnergyGrant: () =>
        set((s) => ({ flatEnergyGrants: [...s.flatEnergyGrants, createFlatEnergyGrant(uid())] })),
      removeFlatEnergyGrant: (id) =>
        set((s) => ({ flatEnergyGrants: s.flatEnergyGrants.filter((g) => g.id !== id) })),
      updateFlatEnergyGrant: (id, patch) =>
        set((s) => ({ flatEnergyGrants: s.flatEnergyGrants.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      loadState: (state) => set({ ...state }),
      resetAll: () => set({ ...initialState, units: [createUnit(uid())] }),
    }),
    {
      name: 'gi-dps-calculator',
      partialize: (s) => ({
        units: s.units,
        buffs: s.buffs,
        rotation: s.rotation,
        enemy: s.enemy,
        rotationDuration: s.rotationDuration,
        critMode: s.critMode,
        particleBatches: s.particleBatches,
        flatEnergyGrants: s.flatEnergyGrants,
      }),
    }
  )
);

export function getFullState(): AppState {
  const s = useStore.getState();
  return {
    units: s.units,
    buffs: s.buffs,
    rotation: s.rotation,
    enemy: s.enemy,
    rotationDuration: s.rotationDuration,
    critMode: s.critMode,
    particleBatches: s.particleBatches,
    flatEnergyGrants: s.flatEnergyGrants,
  };
}
