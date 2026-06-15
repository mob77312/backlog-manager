import { useMemo } from 'react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { PriorityBadge } from '../ui/Badge'
import { Briefcase } from 'lucide-react'
import { classNames, deadlineLabel } from '../../utils/helpers'
import { STATUS_LABELS, STATUS_HEX } from '../../utils/colors'

export function MyTasksCard() {
  const { user } = usePermissions()
  const allTasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const myTasks = useMemo(() => {
    if (!user) return []
    return allTasks
      .filter((t) => t.status !== 'done' && t.assignees.includes(user.name))
      .sort((a, b) => {
        const ad = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
        const bd = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
        return ad - bd
      })
      .slice(0, 8)
  }, [allTasks, user])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Briefcase size={13} className="text-pertamina-red" />
          <h3 className="text-sm font-semibold text-ink-primary">Tugas Saya</h3>
        </div>
        <span className="text-[11px] text-ink-tertiary">{myTasks.length} aktif</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {myTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-6 text-center text-[11px] text-ink-tertiary">
            {user ? 'Tidak ada tugas yang ditugaskan kepada Anda.' : 'Login untuk melihat tugas Anda.'}
          </div>
        ) : (
          myTasks.map((t) => {
            const team = teams.find((x) => x.id === t.teamId)
            const dl = deadlineLabel(t.deadline)
            return (
              <button
                key={t.id}
                onClick={() => openModal({ type: 'detail-task', taskId: t.id })}
                className="w-full text-left rounded-lg border border-border-subtle bg-white p-2.5 hover:border-pertamina-red/30 hover:bg-pertamina-red-50/30 transition"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-ink-primary line-clamp-1">{t.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-tertiary flex-wrap">
                      <span style={{ color: team?.color }} className="font-mono font-bold">{team?.acronym}</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_HEX[t.status] }} />
                        {STATUS_LABELS[t.status]}
                      </span>
                      {t.deadline && (
                        <span className={classNames(
                          dl.tone === 'overdue' && 'text-pertamina-red',
                          dl.tone === 'today' && 'text-amber-700',
                          dl.tone === 'soon' && 'text-amber-600',
                        )}>
                          · {dl.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
