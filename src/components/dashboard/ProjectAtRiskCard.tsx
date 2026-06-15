import { useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { computeProjectProgress } from '../../utils/progress'
import { STAGE_HEX, STAGE_LABELS } from '../../utils/colors'
import { AlertTriangle } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'

export function ProjectAtRiskCard() {
  const projects = useProjectStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const atRisk = useMemo(() => {
    return projects
      .filter((p) => p.status === 'active' && p.targetCloseDate)
      .map((p) => {
        const { total } = computeProjectProgress(p, tasks, teams)
        const daysLeft = differenceInCalendarDays(new Date(p.targetCloseDate!), new Date())
        // Risk score: lower remaining days + lower progress = higher risk
        const expectedProgress = Math.max(0, 100 - Math.min(100, (daysLeft / 30) * 100))
        const gap = expectedProgress - total
        return { project: p, progress: total, daysLeft, gap }
      })
      .filter((x) => x.gap > 10 || x.daysLeft < 14)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 6)
  }, [projects, tasks, teams])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-600" />
          Project At Risk
        </h3>
        <span className="text-[11px] text-amber-700">{atRisk.length} project</span>
      </div>
      <div className="text-[11px] text-ink-tertiary mb-2">
        Progress lebih lambat dari yang diharapkan atau deadline ≤14 hari.
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {atRisk.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50 p-3 text-center text-[11px] text-emerald-700">
            ✓ Tidak ada project bermasalah
          </div>
        ) : (
          atRisk.map(({ project, progress, daysLeft, gap }) => (
            <button
              key={project.id}
              onClick={() => openModal({ type: 'project-detail', projectId: project.id })}
              className="w-full text-left rounded-lg border border-border-subtle bg-white p-2 hover:border-pertamina-red/30 hover:bg-pertamina-red-50/30 transition"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-ink-tertiary truncate">{project.code}</div>
                  <div className="text-[12px] font-medium text-ink-primary truncate">{project.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-tertiary flex-wrap">
                    <span style={{ color: STAGE_HEX[project.currentStage] }} className="font-medium">
                      {STAGE_LABELS[project.currentStage]}
                    </span>
                    <span>· {progress}% selesai</span>
                    <span className={daysLeft < 7 ? 'text-red-600 font-semibold' : daysLeft < 14 ? 'text-amber-600' : ''}>
                      · {daysLeft < 0 ? `terlambat ${Math.abs(daysLeft)}d` : `${daysLeft}d lagi`}
                    </span>
                  </div>
                </div>
                {gap > 10 && (
                  <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700">
                    GAP {Math.round(gap)}%
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
