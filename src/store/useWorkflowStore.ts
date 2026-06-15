import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessStage, StageOwnerMap, WorkflowConfig, WorkflowStage } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { STAGE_KEYS } from '../utils/colors'

const DEFAULT_CONFIG: WorkflowConfig = {
  stages: [
    {
      id: 'wf_origin',
      name: 'Persetujuan Asal',
      side: 'origin',
      approverRoleIds: ['super_admin', 'team_admin'],
      requireAssignment: false,
    },
    {
      id: 'wf_target',
      name: 'Konfirmasi Tujuan',
      side: 'target',
      approverRoleIds: ['super_admin', 'team_admin'],
      requireAssignment: true,
    },
  ],
  updatedAt: nowIso(),
}

function emptyStageOwners(): StageOwnerMap {
  return STAGE_KEYS.reduce((acc, k) => {
    acc[k] = []
    return acc
  }, {} as StageOwnerMap)
}

/**
 * Default mapping divisi seed → stage L0. Tujuannya supaya fresh install
 * sudah bisa promote/handover dari hari pertama tanpa wajib setup Workflow Config.
 * User bebas override via Workflow Config Modal.
 */
function defaultStageOwners(): StageOwnerMap {
  return {
    lead_to_active: ['team_biz'],       // BIZ - business analyst (lead generation)
    plan_to_build: ['team_itd'],        // ITD - planning & design
    build_to_operate: ['team_itd', 'team_qat'],  // ITD build + QAT test
    operate_to_assure: ['team_net'],    // NET - operations & infra
    close: ['team_biz'],                // BIZ - documentation closure
  }
}

interface WorkflowState {
  config: WorkflowConfig
  /** Mapping L0 stage → divisi (teamId[]) yang punya otoritas. */
  stageOwners: StageOwnerMap
  setApprovers: (stageId: string, roleIds: string[]) => void
  setStageName: (stageId: string, name: string) => void
  addStage: (side: 'origin' | 'target') => WorkflowStage
  removeStage: (stageId: string) => void
  setStageOwners: (stage: BusinessStage, teamIds: string[]) => void
  addStageOwner: (stage: BusinessStage, teamId: string) => void
  removeStageOwner: (stage: BusinessStage, teamId: string) => void
  isTeamOwnerOfStage: (teamId: string, stage: BusinessStage) => boolean
  getStagesOwnedByTeam: (teamId: string) => BusinessStage[]
  resetDefault: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      stageOwners: defaultStageOwners(),
      setApprovers: (stageId, roleIds) =>
        set((s) => ({
          config: {
            stages: s.config.stages.map((st) => (st.id === stageId ? { ...st, approverRoleIds: roleIds } : st)),
            updatedAt: nowIso(),
          },
        })),
      setStageName: (stageId, name) =>
        set((s) => ({
          config: {
            stages: s.config.stages.map((st) => (st.id === stageId ? { ...st, name } : st)),
            updatedAt: nowIso(),
          },
        })),
      addStage: (side) => {
        const stage: WorkflowStage = {
          id: uid('wf'),
          name: side === 'origin' ? 'Approval Tambahan (Asal)' : 'Konfirmasi Tambahan (Tujuan)',
          side,
          approverRoleIds: ['super_admin'],
          requireAssignment: false,
        }
        set((s) => ({
          config: { stages: [...s.config.stages, stage], updatedAt: nowIso() },
        }))
        return stage
      },
      removeStage: (stageId) =>
        set((s) => ({
          config: {
            stages: s.config.stages.filter((st) => st.id !== stageId),
            updatedAt: nowIso(),
          },
        })),
      setStageOwners: (stage, teamIds) =>
        set((s) => ({ stageOwners: { ...s.stageOwners, [stage]: Array.from(new Set(teamIds)) } })),
      addStageOwner: (stage, teamId) =>
        set((s) => ({
          stageOwners: {
            ...s.stageOwners,
            [stage]: Array.from(new Set([...(s.stageOwners[stage] ?? []), teamId])),
          },
        })),
      removeStageOwner: (stage, teamId) =>
        set((s) => ({
          stageOwners: {
            ...s.stageOwners,
            [stage]: (s.stageOwners[stage] ?? []).filter((id) => id !== teamId),
          },
        })),
      isTeamOwnerOfStage: (teamId, stage) => (get().stageOwners[stage] ?? []).includes(teamId),
      getStagesOwnedByTeam: (teamId) =>
        STAGE_KEYS.filter((s) => (get().stageOwners[s] ?? []).includes(teamId)),
      resetDefault: () => set({ config: DEFAULT_CONFIG, stageOwners: defaultStageOwners() }),
    }),
    {
      name: 'flowdesk:workflow',
      onRehydrateStorage: () => (state) => {
        // Migration: ensure stageOwners exists with all keys
        if (!state) return
        const so = state.stageOwners ?? emptyStageOwners()
        const filled = { ...emptyStageOwners(), ...so }
        ;(state as { stageOwners: StageOwnerMap }).stageOwners = filled
      },
    },
  ),
)
