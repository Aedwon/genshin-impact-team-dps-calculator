// Single Zustand store holding team, buffs, damage rotation, energy setup, and enemy config.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ENEMY } from './constants';
import {
  createDefaultEnergySettings,
  createDefaultUnitEnergyConfig,
  type EnergySettings,
  type EnergyStateSlice,
  type UnitEnergyConfig,
} from './energyTypes';
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

export type PersistedState = AppState & EnergyStateSlice;

export interface StoreState extends PersistedState {
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
  setEnergySettings: (patch: Partial<EnergySettings>) => void;
  updateUnitEnergyConfig: (unitId: string, patch: Partial<UnitEnergyConfig>) => void;
  resetUnitEnergyConfig: (unitId: string) => void;
  loadState: (state: PersistedState) => void;
  resetAll: () => void;
}

function buildInitialState(): PersistedState {
  const firstUnit = createUnit(uid());
  return {
    units: [firstUnit], buffs: [], rotation: [], enemy: { ...DEFAULT_ENEMY }, rotationDuration: 20, critMode: 'average',
    particleBatches: [], flatEnergyGrants: [], energySettings: createDefaultEnergySettings(),
    unitEnergyConfigs: { [firstUnit.id]: createDefaultUnitEnergyConfig(firstUnit.id) },
  };
}

const initialState = buildInitialState();

function normalizeEnergyState(state: Partial<PersistedState>): PersistedState {
  const units = Array.isArray(state.units) && state.units.length > 0 ? state.units : initialState.units;
  const configs: Record<string, UnitEnergyConfig> = {};
  for (const unit of units) {
    const defaults = createDefaultUnitEnergyConfig(unit.id);
    const saved = state.unitEnergyConfigs?.[unit.id];
    configs[unit.id] = {
      ...defaults, ...(saved ?? {}),
      primary: { ...defaults.primary, ...(saved?.primary ?? {}), overrides: { ...defaults.primary.overrides, ...(saved?.primary?.overrides ?? {}) } },
      secondary: { ...defaults.secondary, ...(saved?.secondary ?? {}), overrides: { ...defaults.secondary.overrides, ...(saved?.secondary?.overrides ?? {}) } },
    };
  }
  const settingsDefaults = createDefaultEnergySettings();
  return {
    units,
    buffs: state.buffs ?? [],
    rotation: state.rotation ?? [],
    enemy: state.enemy ?? { ...DEFAULT_ENEMY },
    rotationDuration: state.rotationDuration ?? 20,
    critMode: state.critMode ?? 'average',
    particleBatches: state.particleBatches ?? [],
    flatEnergyGrants: state.flatEnergyGrants ?? [],
    energySettings: {
      ...settingsDefaults, ...(state.energySettings ?? {}),
      customEnemyParticles: { ...settingsDefaults.customEnemyParticles, ...(state.energySettings?.customEnemyParticles ?? {}) },
    },
    unitEnergyConfigs: configs,
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialState,
      addUnit: () => set((s) => {
        if (s.units.length >= MAX_UNITS) return s;
        const unit = createUnit(uid());
        return { units: [...s.units, unit], unitEnergyConfigs: { ...s.unitEnergyConfigs, [unit.id]: createDefaultUnitEnergyConfig(unit.id) } };
      }),
      removeUnit: (id) => set((s) => {
        const { [id]: _removed, ...restConfigs } = s.unitEnergyConfigs;
        const nextConfigs: Record<string, UnitEnergyConfig> = {};
        for (const [unitId, config] of Object.entries(restConfigs) as [string, UnitEnergyConfig][]) {
          nextConfigs[unitId] = {
            ...config,
            primary: { ...config.primary, funnelTargetUnitId: config.primary.funnelTargetUnitId === id ? null : config.primary.funnelTargetUnitId },
            secondary: { ...config.secondary, funnelTargetUnitId: config.secondary.funnelTargetUnitId === id ? null : config.secondary.funnelTargetUnitId },
            favoniusTargetUnitId: config.favoniusTargetUnitId === id ? null : config.favoniusTargetUnitId,
          };
        }
        return {
          units: s.units.filter((u) => u.id !== id),
          rotation: s.rotation.map((r) => (r.unitId === id ? { ...r, unitId: null } : r)),
          buffs: s.buffs.map((b) => b.scopeUnitIds === 'all' ? b : { ...b, scopeUnitIds: b.scopeUnitIds.filter((u) => u !== id) }),
          particleBatches: s.particleBatches.map((batch) => ({ ...batch, sourceUnitId: batch.sourceUnitId === id ? null : batch.sourceUnitId, catcherUnitId: batch.catcherUnitId === id ? null : batch.catcherUnitId })),
          flatEnergyGrants: s.flatEnergyGrants.map((g) => (g.unitId === id ? { ...g, unitId: null } : g)),
          unitEnergyConfigs: nextConfigs,
        };
      }),
      updateUnit: (id, patch) => set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      addBuff: () => set((s) => ({ buffs: [...s.buffs, createBuff(uid())] })),
      removeBuff: (id) => set((s) => ({
        buffs: s.buffs.filter((b) => b.id !== id),
        rotation: s.rotation.map((r) => {
          if (!(r.buffToggles && r.buffToggles[id] !== undefined)) return r;
          const { [id]: _removed, ...rest } = r.buffToggles;
          return { ...r, buffToggles: rest };
        }),
      })),
      updateBuff: (id, patch) => set((s) => ({ buffs: s.buffs.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      addDamageInstance: () => set((s) => ({ rotation: [...s.rotation, createDamageInstance(uid())] })),
      addTransformativeInstance: () => set((s) => ({ rotation: [...s.rotation, createTransformativeInstance(uid())] })),
      removeInstance: (id) => set((s) => ({ rotation: s.rotation.filter((r) => r.id !== id) })),
      updateInstance: (id, patch) => set((s) => ({ rotation: s.rotation.map((r) => (r.id === id ? ({ ...r, ...patch } as RotationInstance) : r)) })),
      moveInstance: (id, direction) => set((s) => {
        const idx = s.rotation.findIndex((r) => r.id === id);
        if (idx === -1) return s;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= s.rotation.length) return s;
        const next = [...s.rotation]; [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        return { rotation: next };
      }),
      setEnemy: (patch) => set((s) => ({ enemy: { ...s.enemy, ...patch } })),
      setRotationDuration: (seconds) => set({ rotationDuration: seconds }),
      setCritMode: (mode) => set({ critMode: mode }),
      addParticleBatch: () => set((s) => ({ particleBatches: [...s.particleBatches, createParticleBatch(uid())] })),
      removeParticleBatch: (id) => set((s) => ({ particleBatches: s.particleBatches.filter((b) => b.id !== id) })),
      updateParticleBatch: (id, patch) => set((s) => ({ particleBatches: s.particleBatches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      addFlatEnergyGrant: () => set((s) => ({ flatEnergyGrants: [...s.flatEnergyGrants, createFlatEnergyGrant(uid())] })),
      removeFlatEnergyGrant: (id) => set((s) => ({ flatEnergyGrants: s.flatEnergyGrants.filter((g) => g.id !== id) })),
      updateFlatEnergyGrant: (id, patch) => set((s) => ({ flatEnergyGrants: s.flatEnergyGrants.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      setEnergySettings: (patch) => set((s) => ({
        energySettings: { ...s.energySettings, ...patch, customEnemyParticles: patch.customEnemyParticles ? { ...s.energySettings.customEnemyParticles, ...patch.customEnemyParticles } : s.energySettings.customEnemyParticles },
      })),
      updateUnitEnergyConfig: (unitId, patch) => set((s) => {
        const current = s.unitEnergyConfigs[unitId] ?? createDefaultUnitEnergyConfig(unitId);
        return { unitEnergyConfigs: { ...s.unitEnergyConfigs, [unitId]: {
          ...current, ...patch,
          primary: patch.primary ? { ...current.primary, ...patch.primary } : current.primary,
          secondary: patch.secondary ? { ...current.secondary, ...patch.secondary } : current.secondary,
        } } };
      }),
      resetUnitEnergyConfig: (unitId) => set((s) => ({ unitEnergyConfigs: { ...s.unitEnergyConfigs, [unitId]: createDefaultUnitEnergyConfig(unitId) } })),
      loadState: (state) => set({ ...normalizeEnergyState(state) }),
      resetAll: () => set({ ...buildInitialState() }),
    }),
    {
      name: 'gi-dps-calculator',
      partialize: (s) => ({
        units: s.units, buffs: s.buffs, rotation: s.rotation, enemy: s.enemy, rotationDuration: s.rotationDuration,
        critMode: s.critMode, particleBatches: s.particleBatches, flatEnergyGrants: s.flatEnergyGrants,
        energySettings: s.energySettings, unitEnergyConfigs: s.unitEnergyConfigs,
      }),
      merge: (persisted, current) => ({ ...current, ...normalizeEnergyState((persisted ?? {}) as Partial<PersistedState>) }),
    }
  )
);

export function getFullState(): PersistedState {
  const s = useStore.getState();
  return {
    units: s.units, buffs: s.buffs, rotation: s.rotation, enemy: s.enemy, rotationDuration: s.rotationDuration,
    critMode: s.critMode, particleBatches: s.particleBatches, flatEnergyGrants: s.flatEnergyGrants,
    energySettings: s.energySettings, unitEnergyConfigs: s.unitEnergyConfigs,
  };
}
