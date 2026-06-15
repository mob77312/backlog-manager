import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessStage, Priority, Project, ProjectStageConfig, ProjectStatus } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { STAGE_DEFAULT_WEIGHTS, STAGE_KEYS, STAGE_LABELS } from '../utils/colors'
import { useLogStore } from './useLogStore'
import { SEED_PROJECTS } from './projectSeed'

export function buildDefaultStageConfig(
  weights: Record<BusinessStage, number> = STAGE_DEFAULT_WEIGHTS,
  stageOwners: Partial<Record<BusinessStage, string[]>> = {},
): ProjectStageConfig[] {
  return STAGE_KEYS.map((stage) => ({
    stage,
    weight: weights[stage] ?? 0,
    ownerTeamIds: stageOwners[stage] ?? [],
    status: 'not_started',
    progressOverride: null,
    enteredAt: null,
    completedAt: null,
  }))
}

interface CreateProjectInput {
  code: string
  name: string
  description?: string
  customer?: string
  priority?: Priority
  tags?: string[]
  startDate?: string | null
  targetCloseDate?: string | null
  weights?: Record<BusinessStage, number>
  stageOwners?: Partial<Record<BusinessStage, string[]>>
  startStage?: BusinessStage
  createdByUserId: string
  createdByName: string
}

interface ProjectState {
  projects: Project[]
  getProject: (id: string | null | undefined) => Project | undefined
  createProject: (input: CreateProjectInput) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  updateStageConfig: (id: string, stage: BusinessStage, patch: Partial<ProjectStageConfig>) => void
  setWeights: (id: string, weights: Record<BusinessStage, number>) => void
  advanceStage: (id: string, byUserId: string, byName: string, reason: string) => { ok: boolean; error?: string }
  sendBackStage: (id: string, byUserId: string, byName: string, reason: string) => { ok: boolean; error?: string }
  closeProject: (id: string, byUserId: string, byName: string) => void
  setStatus: (id: string, status: ProjectStatus) => void
  deleteProject: (id: string) => void
  clearAll: () => void
}

function nextStage(curr: BusinessStage): BusinessStage | null {
  const idx = STAGE_KEYS.indexOf(curr)
  if (idx < 0 || idx >= STAGE_KEYS.length - 1) return null
  return STAGE_KEYS[idx + 1]
}

function prevStage(curr: BusinessStage): BusinessStage | null {
  const idx = STAGE_KEYS.indexOf(curr)
  if (idx <= 0) return null
  return STAGE_KEYS[idx - 1]
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      getProject: (id) => (id ? get().projects.find((p) => p.id === id) : undefined),

      createProject: (input) => {
        const stageConfig = buildDefaultStageConfig(input.weights, input.stageOwners)
        // Explicit start stage > first non-zero-weight stage > first stage
        const firstStage =
          input.startStage ?? stageConfig.find((s) => s.weight > 0)?.stage ?? STAGE_KEYS[0]
        const now = nowIso()
        // Tandai stage sebelum firstStage sebagai 'done' (di-skip) supaya progress hitungan benar
        const startIdx = STAGE_KEYS.indexOf(firstStage)
        stageConfig.forEach((s) => {
          const idx = STAGE_KEYS.indexOf(s.stage)
          if (idx < startIdx) {
            s.status = 'skipped'
            s.progressOverride = 100
            s.enteredAt = now
            s.completedAt = now
          } else if (s.stage === firstStage) {
            s.status = 'in_progress'
            s.enteredAt = now
          }
        })
        const project: Project = {
          id: uid('prj'),
          code: input.code.trim(),
          name: input.name.trim(),
          description: input.description ?? '',
          customer: input.customer ?? '',
          priority: input.priority ?? 'medium',
          status: 'active',
          currentStage: firstStage,
          stageConfig,
          stageHistory: [
            {
              id: uid('pst'),
              fromStage: null,
              toStage: firstStage,
              direction: 'forward',
              byUserId: input.createdByUserId,
              byName: input.createdByName,
              reason: 'Project dibuat',
              timestamp: now,
            },
          ],
          tags: input.tags ?? [],
          startDate: input.startDate ?? null,
          targetCloseDate: input.targetCloseDate ?? null,
          actualCloseDate: null,
          createdByUserId: input.createdByUserId,
          createdByName: input.createdByName,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ projects: [project, ...s.projects] }))
        useLogStore.getState().addLog({
          type: 'project_created',
          message: `Project "${project.name}" (${project.code}) dibuat oleh ${input.createdByName}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
        return project
      },

      updateProject: (id, patch) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)),
        }))
      },

      updateStageConfig: (id, stage, patch) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stageConfig: p.stageConfig.map((sc) => (sc.stage === stage ? { ...sc, ...patch } : sc)),
                  updatedAt: nowIso(),
                }
              : p,
          ),
        }))
      },

      setWeights: (id, weights) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stageConfig: p.stageConfig.map((sc) => ({ ...sc, weight: weights[sc.stage] ?? sc.weight })),
                  updatedAt: nowIso(),
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_weights_changed',
          message: `Bobot stage project diperbarui`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
      },

      advanceStage: (id, byUserId, byName, reason) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const next = nextStage(project.currentStage)
        if (!next) return { ok: false, error: 'Sudah di stage terakhir' }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  currentStage: next,
                  stageConfig: p.stageConfig.map((sc) => {
                    if (sc.stage === p.currentStage) return { ...sc, status: 'done', completedAt: now }
                    if (sc.stage === next) return { ...sc, status: 'in_progress', enteredAt: sc.enteredAt ?? now }
                    return sc
                  }),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: next,
                      direction: 'forward',
                      byUserId,
                      byName,
                      reason,
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_stage_advanced',
          message: `Project "${project.name}" → ${STAGE_LABELS[next]} (oleh ${byName})`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
        return { ok: true }
      },

      sendBackStage: (id, byUserId, byName, reason) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { ok: false, error: 'Project tidak ditemukan' }
        const prev = prevStage(project.currentStage)
        if (!prev) return { ok: false, error: 'Sudah di stage paling awal' }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  currentStage: prev,
                  stageConfig: p.stageConfig.map((sc) => {
                    if (sc.stage === p.currentStage)
                      return { ...sc, status: 'not_started', completedAt: null }
                    if (sc.stage === prev) return { ...sc, status: 'in_progress', completedAt: null }
                    return sc
                  }),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: prev,
                      direction: 'backward',
                      byUserId,
                      byName,
                      reason,
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_stage_sentback',
          message: `Project "${project.name}" dikembalikan ke ${STAGE_LABELS[prev]} (oleh ${byName})`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
        return { ok: true }
      },

      closeProject: (id, byUserId, byName) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return
        // Enforce: hanya bisa close kalau sudah di stage 'close'
        if (project.currentStage !== 'close') {
          console.warn(`closeProject ditolak: project ${project.code} belum di stage close (current: ${project.currentStage})`)
          return
        }
        const now = nowIso()
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'closed',
                  currentStage: 'close',
                  actualCloseDate: now,
                  stageConfig: p.stageConfig.map((sc) =>
                    sc.stage === 'close' ? { ...sc, status: 'done', completedAt: now } : sc,
                  ),
                  stageHistory: [
                    ...p.stageHistory,
                    {
                      id: uid('pst'),
                      fromStage: p.currentStage,
                      toStage: 'close',
                      direction: 'forward',
                      byUserId,
                      byName,
                      reason: 'Project ditutup',
                      timestamp: now,
                    },
                  ],
                  updatedAt: now,
                }
              : p,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'project_closed',
          message: `Project "${project.name}" ditutup oleh ${byName}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: null,
          toTeamId: null,
        })
      },

      setStatus: (id, status) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, status, updatedAt: nowIso() } : p)),
        }))
      },

      deleteProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
      },
      clearAll: () => set({ projects: [] }),
    }),
    { name: 'flowdesk:projects' },
  ),
)
