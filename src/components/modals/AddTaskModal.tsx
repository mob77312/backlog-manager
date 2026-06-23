import { Modal } from '../ui/Modal'
import { TaskForm } from './TaskForm'
import { useTaskStore } from '../../store/useTaskStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import type { BusinessStage, Status } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  defaultStatus?: Status
  defaultProjectId?: string
  defaultStage?: BusinessStage
}

export function AddTaskModal({ open, onClose, defaultStatus, defaultProjectId, defaultStage }: Props) {
  const createTask = useTaskStore((s) => s.createTask)
  const openModal = useUIStore((s) => s.openModal)
  const { user, can } = usePermissions()
  const perm = can('task.create')

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Tugas Baru"
      description="Tugas baru lahir di Backlog divisi. Pilih project parent dari dropdown untuk meng-attach ke project yang sudah aktif."
      size="xl"
    >
      <TaskForm
        initial={{
          defaultStatus,
          defaultProjectId,
          defaultStage,
          teamId: user?.teamId ?? undefined,
          assignees: user ? [user.name] : [],
        }}
        lockTeam={user?.role !== 'super_admin' && !!user?.teamId}
        onCancel={onClose}
        submitLabel="Buat Tugas"
        onSubmit={(data) => {
          if (!user) {
            toast.error('Session expired — silakan login ulang')
            return
          }
          const t = createTask(data)
          onClose()
          toast.success('Tugas berhasil dibuat', { icon: '✨' })
          setTimeout(() => openModal({ type: 'detail-task', taskId: t.id }), 50)
        }}
      />
    </Modal>
  )
}
