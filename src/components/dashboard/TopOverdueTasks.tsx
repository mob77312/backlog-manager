import { useMemo } from 'react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { deadlineLabel, isOverdue, safeDate } from '../../utils/helpers'
import { differenceInCalendarDays } from 'date-fns'
import { PriorityBadge } from '../ui/Badge'

export function TopOverdueTasks() {
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const top = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done' && isOverdue(t.deadline))
      .sort((a, b) => {
        const da = safeDate(a.deadline)?.getTime() ?? 0
        const db = safeDate(b.deadline)?.getTime() ?? 0
        return da - db
      })
      .slice(0, 5)
  }, [tasks])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Top Tugas Terlambat</h3>
        <span className="text-[11px] text-accent-danger">{top.length} item</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {top.length === 0 && (
          <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50 p-3 sm:p-4 text-center text-[11px] text-emerald-700">
            ✓ Tidak ada tugas terlambat
          </div>
        )}
        {top.map((t) => {
          const team = teams.find((x) => x.id === t.teamId)
          const dl = deadlineLabel(t.deadline)
          const days = t.deadline ? Math.abs(differenceInCalendarDays(new Date(t.deadline), new Date())) : 0
          return (
            <button
              key={t.id}
              onClick={() => openModal({ type: 'detail-task', taskId: t.id })}
              className="w-full text-left rounded-lg border border-border-subtle bg-white p-2.5 hover:bg-pertamina-red-50/40 hover:border-pertamina-red/30 transition"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-ink-primary line-clamp-1">{t.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-tertiary">
                    <span style={{ color: team?.color }}>{team?.acronym}</span>
                    <span className="text-accent-danger">{dl.text}</span>
                    {days > 0 && <span>· {days}d lewat</span>}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
