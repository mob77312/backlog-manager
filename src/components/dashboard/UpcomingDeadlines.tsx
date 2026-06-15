import { useMemo } from 'react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { CalendarClock } from 'lucide-react'
import { differenceInCalendarDays, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { AvatarStack } from '../ui/Avatar'
import { PriorityBadge } from '../ui/Badge'

export function UpcomingDeadlines() {
  const allTasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const upcoming = useMemo(() => {
    const now = new Date()
    return allTasks
      .filter((t) => {
        if (t.status === 'done' || !t.deadline) return false
        const d = new Date(t.deadline)
        const diff = differenceInCalendarDays(d, now)
        return diff >= 0 && diff <= 7
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 6)
  }, [allTasks])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarClock size={13} className="text-amber-600" />
          <h3 className="text-sm font-semibold text-ink-primary">Deadline 7 Hari ke Depan</h3>
        </div>
        <span className="text-[11px] text-ink-tertiary">{upcoming.length} tugas</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {upcoming.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50 p-3 sm:p-4 text-center text-[11px] text-emerald-700">
            ✓ Tidak ada deadline mendekat
          </div>
        ) : (
          upcoming.map((t) => {
            const team = teams.find((x) => x.id === t.teamId)
            const d = new Date(t.deadline!)
            const diff = differenceInCalendarDays(d, new Date())
            const dayLabel =
              diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : `${diff} hari lagi`
            return (
              <button
                key={t.id}
                onClick={() => openModal({ type: 'detail-task', taskId: t.id })}
                className="w-full text-left rounded-lg border border-border-subtle bg-white p-2.5 hover:border-amber-300 hover:bg-amber-50/40 transition"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded-md px-2 py-1 min-w-[44px] shrink-0">
                    <div className="text-[8px] uppercase font-semibold text-amber-700 tracking-widest">
                      {format(d, 'MMM', { locale: localeId })}
                    </div>
                    <div className="text-[14px] font-bold text-amber-800 leading-none">
                      {format(d, 'd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-ink-primary line-clamp-1">{t.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-tertiary">
                      <span style={{ color: team?.color }} className="font-mono font-bold">{team?.acronym}</span>
                      <span className="text-amber-700">· {dayLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <PriorityBadge priority={t.priority} />
                    {t.assignees.length > 0 && <AvatarStack names={t.assignees} max={2} size="xs" />}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
