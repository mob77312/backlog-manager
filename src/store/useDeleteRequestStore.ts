import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DeleteRequest } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { useTaskStore } from './useTaskStore'
import { useTeamStore } from './useTeamStore'
import { useLogStore } from './useLogStore'

interface CreateInput {
  taskId: string
  reason: string
  requestedByUserId: string
  requestedByName: string
}

interface DeleteRequestState {
  requests: DeleteRequest[]
  createRequest: (input: CreateInput) => DeleteRequest | null
  approve: (requestId: string, byUserId: string, byName: string, note?: string) => void
  reject: (requestId: string, byUserId: string, byName: string, reason: string) => void
  getByTask: (taskId: string) => DeleteRequest | undefined
  clearAll: () => void
}

export const useDeleteRequestStore = create<DeleteRequestState>()(
  persist(
    (set, get) => ({
      requests: [],

      createRequest: (input) => {
        const task = useTaskStore.getState().tasks.find((t) => t.id === input.taskId)
        if (!task) return null

        // Prevent duplicate active request
        const active = get().requests.find((r) => r.taskId === input.taskId && r.status === 'pending')
        if (active) return null

        const req: DeleteRequest = {
          id: uid('drq'),
          taskId: task.id,
          taskTitle: task.title,
          taskTeamId: task.teamId,
          taskDepartmentId: task.departmentId,
          reason: input.reason,
          requestedByUserId: input.requestedByUserId,
          requestedByName: input.requestedByName,
          status: 'pending',
          reviewedByUserId: null,
          reviewedByName: null,
          reviewedAt: null,
          rejectedReason: null,
          decisionNote: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        const team = useTeamStore.getState().getTeam(task.teamId)
        useLogStore.getState().addLog({
          type: 'delete_requested',
          message: `${input.requestedByName} mengusulkan hapus tugas "${task.title}" (${team?.acronym ?? '?'})`,
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: task.teamId,
          toTeamId: null,
        })
        return req
      },

      approve: (requestId, byUserId, byName, note) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending') return
        const updated: DeleteRequest = {
          ...r,
          status: 'approved',
          reviewedByUserId: byUserId,
          reviewedByName: byName,
          reviewedAt: nowIso(),
          decisionNote: note ?? null,
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))
        // Actually delete the task
        useTaskStore.getState().deleteTask(r.taskId)
        const team = useTeamStore.getState().getTeam(r.taskTeamId)
        useLogStore.getState().addLog({
          type: 'delete_approved',
          message: `Kadiv ${team?.acronym ?? '?'} (${byName}) menyetujui hapus tugas "${r.taskTitle}"`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.taskTeamId,
          toTeamId: null,
        })
      },

      reject: (requestId, byUserId, byName, reason) => {
        const r = get().requests.find((x) => x.id === requestId)
        if (!r || r.status !== 'pending') return
        const updated: DeleteRequest = {
          ...r,
          status: 'rejected',
          reviewedByUserId: byUserId,
          reviewedByName: byName,
          reviewedAt: nowIso(),
          rejectedReason: reason,
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: s.requests.map((x) => (x.id === requestId ? updated : x)) }))
        const team = useTeamStore.getState().getTeam(r.taskTeamId)
        useLogStore.getState().addLog({
          type: 'delete_rejected',
          message: `Kadiv ${team?.acronym ?? '?'} (${byName}) menolak hapus tugas "${r.taskTitle}": ${reason}`,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          fromTeamId: r.taskTeamId,
          toTeamId: null,
        })
      },

      getByTask: (taskId) => get().requests.find((r) => r.taskId === taskId && r.status === 'pending'),
      clearAll: () => set({ requests: [] }),
    }),
    { name: 'flowdesk:delete_requests' },
  ),
)
