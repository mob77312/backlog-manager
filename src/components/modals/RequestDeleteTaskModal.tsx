import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Input'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useDeleteRequestStore } from '../../store/useDeleteRequestStore'
import { usePermissions } from '../../hooks/usePermissions'
import { AlertTriangle, Info, ShieldAlert, Trash2 } from 'lucide-react'
import { PriorityBadge } from '../ui/Badge'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
}

export function RequestDeleteTaskModal({ open, onClose, taskId }: Props) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const team = useTeamStore((s) => s.getTeam(task?.teamId))
  const existing = useDeleteRequestStore((s) => (taskId ? s.getByTask(taskId) : undefined))
  const createRequest = useDeleteRequestStore((s) => s.createRequest)
  const { user, can } = usePermissions()
  const perm = task ? can('task.requestDelete', { teamId: task.teamId, departmentId: task.departmentId }) : { allowed: false, reason: 'Tugas tidak ditemukan' }
  const [reason, setReason] = useState('')

  if (!task) return null

  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="flex items-start gap-2 rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-ink-primary">
          <ShieldAlert size={16} className="mt-0.5 text-pertamina-red" />
          <div>{perm.reason}</div>
        </div>
      </Modal>
    )
  }

  if (existing) {
    return (
      <Modal open={open} onClose={onClose} title="Sudah ada request hapus aktif" size="md">
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-ink-primary">
            <Info size={16} className="mt-0.5 text-amber-700" />
            <div>
              Tugas ini sudah memiliki request penghapusan yang sedang menunggu approval Kadiv.
              <div className="mt-1 text-[12px] text-ink-secondary">Diajukan oleh: {existing.requestedByName}</div>
              {existing.reason && <div className="mt-1 text-[12px] text-ink-secondary italic">"{existing.reason}"</div>}
            </div>
          </div>
          <button className="btn-ghost w-full" onClick={onClose}>Tutup</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Usulkan Hapus Tugas" description={`Penghapusan tugas perlu approval Kadiv ${team?.acronym ?? ''}`} size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 flex items-start gap-2 text-[12px] text-ink-primary">
          <AlertTriangle size={16} className="mt-0.5 text-pertamina-red shrink-0" />
          <div>
            Anda mengusulkan penghapusan tugas. Request akan dikirim ke <strong>Kadiv {team?.name}</strong> untuk disetujui.
            Tugas tetap aktif sampai Kadiv menyetujui.
          </div>
        </div>

        <div className="surface rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-1">Tugas yang akan dihapus</div>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-primary">{task.title}</div>
              {task.description && <div className="mt-1 text-[12px] text-ink-secondary line-clamp-2">{task.description}</div>}
              <div className="mt-1 text-[11px] text-ink-tertiary">
                {team?.acronym} • {team?.name}
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <Textarea
          label="Alasan Penghapusan (wajib)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Jelaskan kenapa tugas ini perlu dihapus, dampaknya, dan apakah ada backup/duplikat..."
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button
            className="btn-danger"
            disabled={!reason.trim() || !user}
            onClick={() => {
              if (!user) return
              const req = createRequest({
                taskId: task.id,
                reason: reason.trim(),
                requestedByUserId: user.id,
                requestedByName: user.name,
              })
              if (!req) {
                toast.error('Gagal mengirim request')
                return
              }
              toast.success(`Request hapus dikirim ke Kadiv ${team?.acronym ?? ''} untuk persetujuan`, { duration: 4000 })
              onClose()
            }}
          >
            <Trash2 size={13} /> Kirim Request Hapus
          </button>
        </div>
      </div>
    </Modal>
  )
}
