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
    <Modal open={open} onClose={onClose} title="Tambah Tugas Baru" description="Task baru — kalau dibuat dengan stage L0 dan project default, project baru akan otomatis dibuat di Board Utama." size="xl">
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
          let finalProjectId = data.projectId
          // Auto-spawn project SETIAP KALI task dibuat dari Board Divisi context (defaultStage passed eksplisit)
          // DAN projectId masih default internal. Berlaku untuk SEMUA stage termasuk build_to_operate.
          const isFromBoardDivisiContext = !!defaultStage
          if (
            data.projectId === INTERNAL_PROJECT_ID &&
            data.stage &&
            isFromBoardDivisiContext
          ) {
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
            toast.success(`Project "${newProject.name}" dibuat di ${STAGE_LABELS[data.stage]}`, { duration: 4000 })
          }
          const t = createTask({ ...data, projectId: finalProjectId })
          onClose()
          toast.success('Tugas berhasil dibuat', { icon: '✨' })
          setTimeout(() => openModal({ type: 'detail-task', taskId: t.id }), 50)
        }}
      />
    </Modal>
  )
}
