import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Department, DivisionAdvanceWorkflow, HandoffRequirementField, KanbanColumn, Team } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { SEED_TEAMS } from './seed'
import { defaultKanbanConfig, ensureUniversalColumns } from '../utils/kanbanDefaults'

export function defaultDivisionWorkflow(): DivisionAdvanceWorkflow {
  return {
    approverRoleIds: ['team_admin'],
    requireApproval: true,
    autoFlagOnDone: true,
  }
}

interface TeamState {
  teams: Team[]
  addTeam: (data: Omit<Team, 'id' | 'createdAt' | 'departments' | 'handoffRequirements' | 'kanbanConfig' | 'divisionWorkflow'> & { departments?: Department[]; handoffRequirements?: HandoffRequirementField[]; kanbanConfig?: KanbanColumn[]; divisionWorkflow?: DivisionAdvanceWorkflow }) => Team
  updateTeam: (id: string, patch: Partial<Team>) => void
  removeTeam: (id: string) => void
  getTeam: (id: string | null | undefined) => Team | undefined
  addDepartment: (teamId: string, name: string, description?: string) => Department | null
  removeDepartment: (teamId: string, departmentId: string) => void
  renameDepartment: (teamId: string, departmentId: string, name: string) => void
  getDepartment: (teamId: string, departmentId: string | null | undefined) => Department | undefined
  addRequirement: (teamId: string, data: Omit<HandoffRequirementField, 'id'>) => HandoffRequirementField | null
  updateRequirement: (teamId: string, fieldId: string, patch: Partial<Omit<HandoffRequirementField, 'id'>>) => void
  removeRequirement: (teamId: string, fieldId: string) => void
  reorderRequirements: (teamId: string, fieldIds: string[]) => void
  /** Rename kolom (instant, tidak perlu approval). */
  renameKanbanColumn: (teamId: string, columnId: string, label: string) => void
  /** Direct set (untuk seed/migration). Hindari pemakaian normal — gunakan SegmentRequest. */
  setKanbanConfig: (teamId: string, config: KanbanColumn[]) => void
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: SEED_TEAMS,
      addTeam: (data) => {
        const team: Team = {
          ...data,
          id: uid('team'),
          createdAt: nowIso(),
          departments: data.departments ?? [],
          handoffRequirements: data.handoffRequirements ?? [],
          kanbanConfig: data.kanbanConfig ?? defaultKanbanConfig(),
          divisionWorkflow: data.divisionWorkflow ?? defaultDivisionWorkflow(),
        }
        set((s) => ({ teams: [...s.teams, team] }))
        return team
      },
      updateTeam: (id, patch) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
      getTeam: (id) => (id ? get().teams.find((t) => t.id === id) : undefined),
      addDepartment: (teamId, name, description = '') => {
        const team = get().teams.find((t) => t.id === teamId)
        if (!team) return null
        const dept: Department = { id: uid('dept'), teamId, name: name.trim(), description, createdAt: nowIso() }
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId ? { ...t, departments: [...(t.departments ?? []), dept] } : t,
          ),
        }))
        return dept
      },
      removeDepartment: (teamId, departmentId) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, departments: (t.departments ?? []).filter((d) => d.id !== departmentId) }
              : t,
          ),
        }))
      },
      renameDepartment: (teamId, departmentId, name) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  departments: (t.departments ?? []).map((d) => (d.id === departmentId ? { ...d, name } : d)),
                }
              : t,
          ),
        }))
      },
      getDepartment: (teamId, departmentId) => {
        if (!departmentId) return undefined
        const team = get().teams.find((t) => t.id === teamId)
        return team?.departments?.find((d) => d.id === departmentId)
      },

      addRequirement: (teamId, data) => {
        const team = get().teams.find((t) => t.id === teamId)
        if (!team) return null
        const field: HandoffRequirementField = {
          ...data,
          id: uid('req'),
          label: data.label.trim(),
          description: data.description.trim(),
          applicableFromTeamIds: data.applicableFromTeamIds ?? [],
        }
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId ? { ...t, handoffRequirements: [...(t.handoffRequirements ?? []), field] } : t,
          ),
        }))
        return field
      },
      updateRequirement: (teamId, fieldId, patch) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  handoffRequirements: (t.handoffRequirements ?? []).map((f) =>
                    f.id === fieldId ? { ...f, ...patch } : f,
                  ),
                }
              : t,
          ),
        }))
      },
      removeRequirement: (teamId, fieldId) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, handoffRequirements: (t.handoffRequirements ?? []).filter((f) => f.id !== fieldId) }
              : t,
          ),
        }))
      },
      reorderRequirements: (teamId, fieldIds) => {
        set((s) => ({
          teams: s.teams.map((t) => {
            if (t.id !== teamId) return t
            const map = new Map((t.handoffRequirements ?? []).map((f) => [f.id, f] as const))
            const ordered: HandoffRequirementField[] = []
            fieldIds.forEach((id) => {
              const f = map.get(id)
              if (f) ordered.push(f)
            })
            // Append any fields not in fieldIds (shouldn't happen, but defensive)
            ;(t.handoffRequirements ?? []).forEach((f) => {
              if (!fieldIds.includes(f.id)) ordered.push(f)
            })
            return { ...t, handoffRequirements: ordered }
          }),
        }))
      },
      renameKanbanColumn: (teamId, columnId, label) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  kanbanConfig: (t.kanbanConfig ?? defaultKanbanConfig()).map((c) =>
                    c.id === columnId ? { ...c, label } : c,
                  ),
                }
              : t,
          ),
        }))
      },
      setKanbanConfig: (teamId, config) => {
        set((s) => ({
          teams: s.teams.map((t) => (t.id === teamId ? { ...t, kanbanConfig: config } : t)),
        }))
      },
    }),
    {
      name: 'flowdesk:teams',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        // v0/v1 -> v2: tambah kanbanConfig & divisionWorkflow ke setiap team
        const state = persistedState as { teams?: Team[] } | undefined
        if (!state || !Array.isArray(state.teams)) return state
        if (version < 2) {
          state.teams = state.teams.map((t) => {
            const cfg = t.kanbanConfig && t.kanbanConfig.length > 0 ? t.kanbanConfig : defaultKanbanConfig()
            return {
              ...t,
              kanbanConfig: ensureUniversalColumns(cfg),
              divisionWorkflow: t.divisionWorkflow ?? defaultDivisionWorkflow(),
            }
          })
        }
        return state
      },
      merge: (persistedState, currentState) => {
        // Defensive: pastikan semua team punya field baru (kalau migrate skipped/gagal)
        const persisted = persistedState as { teams?: Team[] } | undefined
        const stateTeams = persisted?.teams ?? currentState.teams
        const teams = stateTeams.map((t) => {
          const cfg = t.kanbanConfig && t.kanbanConfig.length > 0 ? t.kanbanConfig : defaultKanbanConfig()
          return {
            ...t,
            kanbanConfig: ensureUniversalColumns(cfg),
            divisionWorkflow: t.divisionWorkflow ?? defaultDivisionWorkflow(),
          }
        })
        return { ...currentState, ...(persisted ?? {}), teams }
      },
    },
  ),
)
