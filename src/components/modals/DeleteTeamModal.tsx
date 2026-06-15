import { Modal } from '../ui/Modal'
import { useTeamStore } from '../../store/useTeamStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useLogStore } from '../../store/useLogStore'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
}

export function DeleteTeamModal({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => s.teams.find((t) => t.id === teamId))
  const removeTeam = useTeamStore((s) => s.removeTeam)
  const allTasks = useTaskStore((s) => s.tasks)
  const tasks = allTasks.filter((t) => t.teamId === teamId)
  const removeTasksByTeam = useTaskStore((s) => s.removeTasksByTeam)
  const addLog = useLogStore((s) => s.addLog)
  const { can } = usePermissions()
  const perm = can('team.delete', { teamId })

  if (!team) return null

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

  const activeTasks = tasks.filter((t) => t.status !== 'done').length

  return (
    <Modal open={open} onClose={onClose} title="Hapus Divisi" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-accent-danger/30 bg-accent-danger/10 p-3">
          <AlertTriangle size={18} className="mt-0.5 text-accent-danger" />
          <div className="text-sm text-ink-primary">
            Anda akan menghapus divisi <strong>{team.name}</strong>.
            {activeTasks > 0 && (
              <div className="mt-1 text-[12px] text-accent-danger">
                Divisi ini masih memiliki <strong>{activeTasks} tugas aktif</strong>.
                Semua tugas, team di dalamnya, dan riwayat handoff yang terkait akan ikut terhapus.
              </div>
            )}
          </div>
        </div>

        <div className="surface rounded-lg p-3 text-[12px] text-ink-secondary">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="text-ink-primary font-medium">{team.name}</span>
            <span className="font-mono text-[10px]" style={{ color: team.color }}>
              {team.acronym}
            </span>
          </div>
          <div>{team.description}</div>
          <div className="mt-1 text-ink-tertiary">
            {team.memberCount} anggota · {tasks.length} tugas
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              removeTasksByTeam(team.id)
              removeTeam(team.id)
              addLog({
                type: 'team_removed',
                message: `Divisi ${team.name} dihapus`,
                taskId: null,
                taskTitle: null,
                fromTeamId: team.id,
                toTeamId: null,
              })
              toast.success(`Divisi ${team.name} dihapus`)
              onClose()
            }}
          >
            Hapus Permanen
          </button>
        </div>
      </div>
    </Modal>
  )
}
