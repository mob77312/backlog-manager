import { Modal } from '../ui/Modal'
import { TaskForm } from './TaskForm'
import { useTaskStore } from '../../store/useTaskStore'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
}

export function EditTaskModal({ open, onClose, taskId }: Props) {
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const updateTask = useTaskStore((s) => s.updateTask)

  if (!task) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit Tugas" size="xl">
      <TaskForm
        initial={task}
        onCancel={onClose}
        submitLabel="Simpan Perubahan"
        onSubmit={(data) => {
          updateTask(task.id, data)
          onClose()
          toast.success('Perubahan disimpan')
        }}
      />
    </Modal>
  )
}
