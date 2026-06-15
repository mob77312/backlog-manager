import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessStage, FulfilledRequirement, HandoffRequest, HandoffRequestStatus, HandoffRequirementField } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { useTaskStore } from './useTaskStore'
import { useTeamStore } from './useTeamStore'
import { useLogStore } from './useLogStore'
import { useProjectStore } from './useProjectStore'
import { STAGE_KEYS } from '../utils/colors'

interface CreateInput {
  taskId: string
  toTeamId: string
  reason: string
  requestedByUserId: string
  requestedByName: string
  requirementSnapshot?: HandoffRequirementField[]
  fulfillments?: FulfilledRequirement[]
  /** Untuk promote: stage berikut. Saat target approve, task.stage akan jadi value ini. */
  promoteToStage?: BusinessStage | null
  /** Untuk promote: reset task.status ke 'backlog' di divisi tujuan. */
  resetStatusToBacklog?: boolean
}

interface HandoffState {
  requests: HandoffRequest[]

  createRequest: (input: CreateInput) => HandoffRequest | null
  approveOrigin: (requestId: string, byUserId: string, byName: string, note?: string) => void
  rejectOrigin: (requestId: string, byUserId: string, byName: string, reason: string) => void
  confirmTarget: (
    requestId: string,
    byUserId: string,
    byName: string,
    toDepartmentId: string | null,
    toAssigneeUserId: string | null,
    toAssigneeName: string | null,
    note?: string,
  ) => void
  rejectTarget: (requestId: string, byUserId: string, byName: string, reason: string) => void

  getByTask: (taskId: string) => HandoffRequest | undefined
}

export const useHandoffStore = create<HandoffState>()(
  persist(
    (set, get) => ({
      requests: [],

      createRequest: (input) => {
        const task = useTaskStore.getState().tasks.find((t) => t.id === input.taskId)
        if (!task) return null
        if (task.teamId === input.toTeamId) return null

        // Prevent duplicate active request for the same task
        const active = get().requests.find(
          (r) => r.taskId === input.taskId && (r.status === 'pending_origin' || r.status === 'pending_target'),
        )
        if (active) return null

        const toTeamForSnap = useTeamStore.getState().getTeam(input.toTeamId)
        const snapshot = input.requirementSnapshot ?? toTeamForSnap?.handoffRequirements ?? []
        const req: HandoffRequest = {
          id: uid('hreq'),
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: task.teamId,
          fromDepartmentId: task.departmentId,
          toTeamId: input.toTeamId,
          toDepartmentId: null,
          toAssigneeUserId: null,
          reason: input.reason,
          requestedByUserId: input.requestedByUserId,
          requestedByName: input.requestedByName,
          status: 'pending_origin',
          originReviewedByUserId: null,
          originReviewedByName: null,
          originReviewedAt: null,
          originDecisionNote: null,
          targetReviewedByUserId: null,
          targetReviewedByName: null,
          targetReviewedAt: null,
          targetDecisionNote: null,
          rejectedReason: null,
          rejectedStage: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          requirementSnapshot: snapshot,
          fulfillments: input.fulfillments ?? [],
          promoteToStage: input.promoteToStage ?? null,
          resetStatusToBacklog: input.resetStatusToBacklog ?? false,
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        const fromTeam = useTeamStore.getState().getTeam(task.teamId)
        const toTeam = useTeamStore.getState().getTeam(input.toTeamId)
        useLogStore.getState().addLog({
          type: 'handoff_requested',
          message: `${input.requestedByName} mengajukan handoff "${task.title}" dari ${fromTeam?.acronym} ke ${toTeam?.acronym}`,
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: task.teamId,
          toTeamId: input.toTeamId,
        })
        return req
      },

      approveOrigin: (requestId, byUserId, byName, note) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending_origin') return
        const updated: HandoffRequest = {
          ...r,
          status: 'pending_target',
          originReviewedByUserId: byUserId,
          originReviewedByName: byName,
          originReviewedAt: nowIso(),
          originDecisionNote: note ?? null,
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))
        const fromTeam = useTeamStore.getState().getTeam(r.fromTeamId)
        const toTeam = useTeamStore.getState().getTeam(r.toTeamId)
        useLogStore.getState().addLog({
          type: 'handoff_approved_origin',
          message: `Kadiv ${fromTeam?.acronym} (${byName}) menyetujui handoff "${r.taskTitle}" → ${toTeam?.acronym}`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.fromTeamId,
          toTeamId: r.toTeamId,
        })
      },

      rejectOrigin: (requestId, byUserId, byName, reason) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending_origin') return
        const updated: HandoffRequest = {
          ...r,
          status: 'rejected',
          originReviewedByUserId: byUserId,
          originReviewedByName: byName,
          originReviewedAt: nowIso(),
          rejectedReason: reason,
          rejectedStage: 'origin',
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))
        const fromTeam = useTeamStore.getState().getTeam(r.fromTeamId)
        useLogStore.getState().addLog({
          type: 'handoff_rejected_origin',
          message: `Kadiv ${fromTeam?.acronym} menolak handoff "${r.taskTitle}": ${reason}`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.fromTeamId,
          toTeamId: r.toTeamId,
        })
      },

      confirmTarget: (requestId, byUserId, byName, toDepartmentId, toAssigneeUserId, toAssigneeName, note) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending_target') return
        const updated: HandoffRequest = {
          ...r,
          status: 'approved',
          toDepartmentId,
          toAssigneeUserId,
          targetReviewedByUserId: byUserId,
          targetReviewedByName: byName,
          targetReviewedAt: nowIso(),
          targetDecisionNote: note ?? null,
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))

        // Apply transfer to task
        const taskStore = useTaskStore.getState()
        const task = taskStore.tasks.find((t) => t.id === r.taskId)
        if (task) {
          const newAssignees = toAssigneeName ? Array.from(new Set([...task.assignees, toAssigneeName])) : task.assignees
          taskStore.applyHandoff(r.taskId, {
            toTeamId: r.toTeamId,
            toDepartmentId,
            assignees: newAssignees,
            reason: r.reason,
            by: byName,
            originalFromTeamId: r.fromTeamId,
            promoteToStage: r.promoteToStage,
            resetStatusToBacklog: r.resetStatusToBacklog,
          })
        }
        // Advance project stage ke promoteToStage juga (gap 1 step saja)
        if (r.promoteToStage && task?.projectId) {
          const projectStore = useProjectStore.getState()
          const project = projectStore.projects.find((p) => p.id === task.projectId)
          if (project && project.currentStage !== r.promoteToStage) {
            const curIdx = STAGE_KEYS.indexOf(project.currentStage)
            const tgtIdx = STAGE_KEYS.indexOf(r.promoteToStage)
            if (tgtIdx === curIdx + 1) {
              projectStore.advanceStage(
                project.id,
                byUserId,
                byName,
                `Auto-advance via handoff task "${r.taskTitle}"`,
              )
            }
          }
        }
        const fromTeam = useTeamStore.getState().getTeam(r.fromTeamId)
        const toTeam = useTeamStore.getState().getTeam(r.toTeamId)
        useLogStore.getState().addLog({
          type: 'handoff_confirmed_target',
          message: `Kadiv ${toTeam?.acronym} (${byName}) menerima handoff "${r.taskTitle}"${toAssigneeName ? ` → ${toAssigneeName}` : ''} (${fromTeam?.acronym} → ${toTeam?.acronym})`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.fromTeamId,
          toTeamId: r.toTeamId,
        })
      },

      rejectTarget: (requestId, byUserId, byName, reason) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending_target') return
        const updated: HandoffRequest = {
          ...r,
          status: 'rejected',
          targetReviewedByUserId: byUserId,
          targetReviewedByName: byName,
          targetReviewedAt: nowIso(),
          rejectedReason: reason,
          rejectedStage: 'target',
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))
        const toTeam = useTeamStore.getState().getTeam(r.toTeamId)
        useLogStore.getState().addLog({
          type: 'handoff_rejected_target',
          message: `Kadiv ${toTeam?.acronym} (${byName}) menolak handoff "${r.taskTitle}": ${reason}`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.fromTeamId,
          toTeamId: r.toTeamId,
        })
      },

      getByTask: (taskId) =>
        get().requests.find(
          (r) => r.taskId === taskId && (r.status === 'pending_origin' || r.status === 'pending_target'),
        ),
    }),
    { name: 'flowdesk:handoff_requests' },
  ),
)

// Helper exposed to callers
export function statusLabel(s: HandoffRequestStatus): string {
  switch (s) {
    case 'pending_origin':
      return 'Menunggu Kadiv Asal'
    case 'pending_target':
      return 'Menunggu Kadiv Tujuan'
    case 'approved':
      return 'Selesai'
    case 'rejected':
      return 'Ditolak'
  }
}

