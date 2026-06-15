import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KanbanColumn, SegmentChangeAction, SegmentChangeRequest } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { useTeamStore } from './useTeamStore'
import { useTaskStore } from './useTaskStore'
import { useLogStore } from './useLogStore'

interface CreateInput {
  teamId: string
  teamName: string
  action: SegmentChangeAction
  newColumn?: KanbanColumn | null
  removeColumnId?: string | null
  moveTasksToColumnKey?: string | null
  reason: string
  requestedByUserId: string
  requestedByName: string
}

interface SegmentRequestState {
  requests: SegmentChangeRequest[]
  createRequest: (input: CreateInput) => SegmentChangeRequest
  approveRequest: (id: string, byUserId: string, byName: string) => { ok: boolean; error?: string }
  rejectRequest: (id: string, byUserId: string, byName: string, reason: string) => void
  getPendingForTeam: (teamId: string) => SegmentChangeRequest[]
}

export const useSegmentRequestStore = create<SegmentRequestState>()(
  persist(
    (set, get) => ({
      requests: [],

      createRequest: (input) => {
        const req: SegmentChangeRequest = {
          id: uid('sreq'),
          teamId: input.teamId,
          teamName: input.teamName,
          action: input.action,
          newColumn: input.newColumn ?? null,
          removeColumnId: input.removeColumnId ?? null,
          moveTasksToColumnKey: input.moveTasksToColumnKey ?? null,
          reason: input.reason,
          requestedByUserId: input.requestedByUserId,
          requestedByName: input.requestedByName,
          status: 'pending',
          reviewedByUserId: null,
          reviewedByName: null,
          reviewedAt: null,
          rejectedReason: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        set((s) => ({ requests: [req, ...s.requests] }))
        useLogStore.getState().addLog({
          type: 'segment_change_requested',
          message: `${input.requestedByName} mengajukan ${input.action === 'add' ? 'tambah' : 'hapus'} kolom di ${input.teamName}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: input.teamId,
          toTeamId: null,
        })
        return req
      },

      approveRequest: (id, byUserId, byName) => {
        const req = get().requests.find((r) => r.id === id)
        if (!req || req.status !== 'pending') return { ok: false, error: 'Request tidak valid' }
        const teamStore = useTeamStore.getState()
        const team = teamStore.getTeam(req.teamId)
        if (!team) return { ok: false, error: 'Divisi tidak ditemukan' }

        if (req.action === 'add') {
          if (!req.newColumn) return { ok: false, error: 'Data kolom baru kosong' }
          const exists = team.kanbanConfig.some((c) => c.key === req.newColumn!.key)
          if (exists) return { ok: false, error: `Kolom dengan key "${req.newColumn.key}" sudah ada` }
          const newCols = [...team.kanbanConfig, { ...req.newColumn, id: uid('col') }]
          teamStore.updateTeam(req.teamId, { kanbanConfig: newCols })
        } else if (req.action === 'remove') {
          if (!req.removeColumnId) return { ok: false, error: 'Kolom target tidak ada' }
          const target = team.kanbanConfig.find((c) => c.id === req.removeColumnId)
          if (!target) return { ok: false, error: 'Kolom sudah tidak ada' }
          if (target.isSystem) return { ok: false, error: 'Kolom sistem tidak bisa dihapus' }
          // Move tasks first if needed
          if (req.moveTasksToColumnKey) {
            const taskStore = useTaskStore.getState()
            taskStore.tasks
              .filter((t) => t.teamId === req.teamId && t.status === target.key)
              .forEach((t) => taskStore.moveTask(t.id, req.moveTasksToColumnKey!))
          }
          const newCols = team.kanbanConfig.filter((c) => c.id !== req.removeColumnId)
          teamStore.updateTeam(req.teamId, { kanbanConfig: newCols })
        }

        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'approved',
                  reviewedByUserId: byUserId,
                  reviewedByName: byName,
                  reviewedAt: nowIso(),
                  updatedAt: nowIso(),
                }
              : r,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'segment_change_approved',
          message: `${byName} menyetujui perubahan kolom di ${req.teamName}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: req.teamId,
          toTeamId: null,
        })
        return { ok: true }
      },

      rejectRequest: (id, byUserId, byName, reason) => {
        const req = get().requests.find((r) => r.id === id)
        if (!req || req.status !== 'pending') return
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'rejected',
                  reviewedByUserId: byUserId,
                  reviewedByName: byName,
                  reviewedAt: nowIso(),
                  rejectedReason: reason,
                  updatedAt: nowIso(),
                }
              : r,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'segment_change_rejected',
          message: `${byName} menolak perubahan kolom di ${req.teamName}: ${reason}`,
          taskId: null,
          taskTitle: null,
          fromTeamId: req.teamId,
          toTeamId: null,
        })
      },

      getPendingForTeam: (teamId) =>
        get().requests.filter((r) => r.teamId === teamId && r.status === 'pending'),
    }),
    { name: 'flowdesk:segment_requests' },
  ),
)
