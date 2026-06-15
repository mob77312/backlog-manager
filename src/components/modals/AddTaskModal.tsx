import { Modal } from '../ui/Modal'
import { TaskForm } from './TaskForm'
import { useTaskStore } from '../../store/useTaskStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useWorkflowStore } from '../../store/useWorkflowStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { STAGE_DEFAULT_WEIGHTS, STAGE_LABELS } from '../../utils/colors'
import { INTERNAL_PROJECT_ID } from '../../utils/constants'
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
  const createProject = useProjectStore((s) => s.createProject)
  const stageOwners = useWorkflowStore((s) => s.stageOwners)
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
    <Modal open={open} onClose={onClose} title="Tambah Proyek Baru" description="Proyek baru lahir di Backlog divisi. Akan otomatis muncul di Board Utama saat dipindah ke kolom Selesai." size="xl">
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
        submitLabel="Buat Proyek"
        onSubmit={(data) => {
          if (!user) {
            toast.error('Session expired — silakan login ulang')
            return
          }
          let finalProjectId = data.projectId
          // Auto-spawn project SETIAP KALI projectId masih INTERNAL & stage diset.
          // Tombol "Tambah Proyek" semantik: setiap klik = bikin proyek baru.
          // Kalau user mau attach task ke proyek existing, ganti dropdown Project di form.
          if (data.projectId === INTERNAL_PROJECT_ID && data.stage) {
            const stageStr = data.stage
            const codeSeq = Date.now().toString().slice(-5)
            const newProject = createProject({
              code: `PGN-${stageStr.split('_')[0].toUpperCase()}-${codeSeq}`,
              name: data.title,
              description: data.description,
              customer: '',
              priority: data.priority,
              tags: data.tags,
              startDate: new Date().toISOString(),
              targetCloseDate: null,
              weights: STAGE_DEFAULT_WEIGHTS,
              stageOwners,
              startStage: data.stage,
              createdByUserId: user.id,
              createdByName: user.name,
            })
            finalProjectId = newProject.id
            console.log('[AddTaskModal] Auto-spawned project:', { code: newProject.code, id: newProject.id, currentStage: newProject.currentStage, taskStage: data.stage })
            toast.success(`Project "${newProject.name}" dibuat di ${STAGE_LABELS[data.stage]}`, { duration: 4000 })
          }
          const t = createTask({ ...data, projectId: finalProjectId })
          console.log('[AddTaskModal] Created task:', { id: t.id, title: t.title, projectId: t.projectId, stage: t.stage, status: t.status, teamId: t.teamId })
          onClose()
          toast.success('Proyek berhasil dibuat', { icon: '✨' })
          setTimeout(() => openModal({ type: 'detail-task', taskId: t.id }), 50)
        }}
      />
    </Modal>
  )
}
