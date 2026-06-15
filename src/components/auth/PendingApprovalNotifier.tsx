import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { useRoleStore } from '../../store/useRoleStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useUIStore } from '../../store/useUIStore'
import { useApprovalQueue } from '../../hooks/useApprovalQueue'
import toast from 'react-hot-toast'

export function PendingApprovalNotifier() {
  const session = useAuthStore((s) => s.session)
  const userId = session?.userId ?? null
  const openModal = useUIStore((s) => s.openModal)
  const queue = useApprovalQueue()
  const requests = useHandoffStore((s) => s.requests)
  const deleteRequests = useDeleteRequestStore((s) => s.requests)

  const greetedFor = useRef<string | null>(null)
  const prevRequestsById = useRef<Map<string, string>>(new Map())
  const prevDeletesById = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!userId) {
      greetedFor.current = null
      return
    }
    if (greetedFor.current === userId) return
    greetedFor.current = userId
    const total = queue.actionableCount
    if (total > 0) {
      const timer = window.setTimeout(() => {
        toast(
          (t) => (
            <span className="flex items-center gap-3">
              <span>
                <strong className="text-pertamina-red">{total}</strong> request handoff menunggu tindakan Anda.
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  openModal({ type: 'approval-queue' })
                }}
                className="rounded-md bg-pertamina-red px-2 py-1 text-[11px] font-medium text-white hover:bg-pertamina-red-dark"
              >
                Buka
              </button>
            </span>
          ),
          { duration: 6000, icon: '🔔' },
        )
      }, 600)
      return () => window.clearTimeout(timer)
    }
  }, [userId, queue.actionableCount, openModal])

  useEffect(() => {
    if (!userId) {
      prevRequestsById.current = new Map()
      return
    }
    const prev = prevRequestsById.current
    const next = new Map<string, string>()
    requests.forEach((r) => next.set(r.id, r.status))

    const isApproverForStage = (side: 'origin' | 'target', requestTeamId: string): boolean => {
      const me = useAuthStore.getState().users.find((u) => u.id === userId)
      if (!me) return false
      const role = useRoleStore.getState().getRole(me.role)
      if (!role || !role.permissions.canApproveHandoff) return false
      const stage = useWorkflowStore.getState().config.stages.find((s) => s.side === side)
      if (!stage) return false
      if (!stage.approverRoleIds.includes(role.id)) return false
      if (role.scopeRestriction === 'own_division') return me.teamId === requestTeamId
      return true
    }

    requests.forEach((r) => {
      const prevStatus = prev.get(r.id)

      if (!prev.has(r.id) && prev.size > 0) {
        if (r.status === 'pending_origin' && isApproverForStage('origin', r.fromTeamId) && r.requestedByUserId !== userId) {
          toast((t) => (
            <span className="flex items-center gap-3">
              <span>
                Request handoff baru dari <strong>{r.requestedByName}</strong> menunggu persetujuan Anda.
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  openModal({ type: 'approval-detail', requestId: r.id })
                }}
                className="rounded-md bg-pertamina-red px-2 py-1 text-[11px] font-medium text-white hover:bg-pertamina-red-dark"
              >
                Review
              </button>
            </span>
          ), { duration: 7000, icon: '📥' })
        }
      }

      if (prevStatus && prevStatus !== r.status && r.requestedByUserId === userId) {
        if (r.status === 'pending_target') {
          toast.success(`✓ Request handoff "${r.taskTitle}" disetujui Kadiv asal — menunggu konfirmasi tujuan.`, { duration: 5000 })
        } else if (r.status === 'approved') {
          toast.success(`🎉 Request handoff "${r.taskTitle}" telah dikonfirmasi & tugas dipindah!`, { duration: 6000 })
        } else if (r.status === 'rejected') {
          toast.error(`Request handoff "${r.taskTitle}" ditolak. ${r.rejectedReason ?? ''}`, { duration: 7000 })
        }
      }

      if (prevStatus === 'pending_origin' && r.status === 'pending_target') {
        if (isApproverForStage('target', r.toTeamId) && r.requestedByUserId !== userId) {
          toast((t) => (
            <span className="flex items-center gap-3">
              <span>
                Project masuk dari divisi asal: <strong>{r.taskTitle}</strong>. Konfirmasi & assign sekarang.
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  openModal({ type: 'approval-detail', requestId: r.id })
                }}
                className="rounded-md bg-pertamina-red px-2 py-1 text-[11px] font-medium text-white hover:bg-pertamina-red-dark"
              >
                Konfirmasi
              </button>
            </span>
          ), { duration: 8000, icon: '📦' })
        }
      }
    })

    prevRequestsById.current = next
  }, [requests, userId, openModal])

  // Delete request notifications
  useEffect(() => {
    if (!userId) {
      prevDeletesById.current = new Map()
      return
    }
    const prev = prevDeletesById.current
    const next = new Map<string, string>()
    deleteRequests.forEach((r) => next.set(r.id, r.status))

    const isApproverForTeam = (teamId: string, deptId: string | null): boolean => {
      const me = useAuthStore.getState().users.find((u) => u.id === userId)
      if (!me) return false
      const role = useRoleStore.getState().getRole(me.role)
      if (!role || !role.permissions.canDeleteTask) return false
      if (role.scopeRestriction === 'own_department') {
        return me.teamId === teamId && me.departmentId === deptId
      }
      if (role.scopeRestriction === 'own_division') return me.teamId === teamId
      return true
    }

    deleteRequests.forEach((r) => {
      const prevStatus = prev.get(r.id)

      // New incoming delete request for approver
      if (!prev.has(r.id) && prev.size > 0 && r.status === 'pending') {
        if (isApproverForTeam(r.taskTeamId, r.taskDepartmentId) && r.requestedByUserId !== userId) {
          toast((t) => (
            <span className="flex items-center gap-3">
              <span>
                <strong>{r.requestedByName}</strong> mengusulkan hapus tugas <strong>"{r.taskTitle}"</strong>
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  openModal({ type: 'delete-request-detail', requestId: r.id })
                }}
                className="rounded-md bg-pertamina-red px-2 py-1 text-[11px] font-medium text-white hover:bg-pertamina-red-dark"
              >
                Review
              </button>
            </span>
          ), { duration: 7000, icon: '🗑' })
        }
      }

      // Status update for requester
      if (prevStatus && prevStatus !== r.status && r.requestedByUserId === userId) {
        if (r.status === 'approved') {
          toast.success(`✓ Tugas "${r.taskTitle}" disetujui untuk dihapus oleh Kadiv.`, { duration: 5000 })
        } else if (r.status === 'rejected') {
          toast.error(`Usul hapus "${r.taskTitle}" ditolak. ${r.rejectedReason ?? ''}`, { duration: 6000 })
        }
      }
    })

    prevDeletesById.current = next
  }, [deleteRequests, userId, openModal])

  return null
}
