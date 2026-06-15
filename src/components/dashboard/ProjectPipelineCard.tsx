import { useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { STAGE_HEX, STAGE_KEYS, STAGE_LABELS, STAGE_SHORT_LABELS } from '../../utils/colors'
import { computeProjectProgress } from '../../utils/progress'
import { Briefcase } from 'lucide-react'
import type { BusinessStage } from '../../types'

export function ProjectPipelineCard() {
  const projects = useProjectStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const setView = useUIStore((s) => s.setView)

  const stageStats = useMemo(() => {
    const map: Record<BusinessStage, { count: number; avgProgress: number }> = {
      lead_to_active: { count: 0, avgProgress: 0 },
      plan_to_build: { count: 0, avgProgress: 0 },
      build_to_operate: { count: 0, avgProgress: 0 },
      operate_to_assure: { count: 0, avgProgress: 0 },
      close: { count: 0, avgProgress: 0 },
    }
    const sums: Record<BusinessStage, number> = {
      lead_to_active: 0,
      plan_to_build: 0,
      build_to_operate: 0,
      operate_to_assure: 0,
      close: 0,
    }
    projects.forEach((p) => {
      const { total } = computeProjectProgress(p, tasks, teams)
      map[p.currentStage].count += 1
      sums[p.currentStage] += total
    })
    STAGE_KEYS.forEach((s) => {
      map[s].avgProgress = map[s].count > 0 ? Math.round(sums[s] / map[s].count) : 0
    })
    return map
  }, [projects, tasks, teams])

  const totalActive = projects.filter((p) => p.status === 'active').length

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
          <Briefcase size={13} className="text-pertamina-red" />
          Project Pipeline (L0)
        </h3>
        <button
          onClick={() => setView('project-board')}
          className="text-[11px] text-pertamina-red hover:underline"
        >
          Buka Board Utama →
        </button>
      </div>

      <div className="text-[11px] text-ink-tertiary mb-2">
        {totalActive} project aktif · {projects.length} total
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {STAGE_KEYS.map((stage) => {
          const s = stageStats[stage]
          return (
            <div
              key={stage}
              className="rounded-lg border border-border-subtle bg-white p-2"
              style={{ borderLeft: `4px solid ${STAGE_HEX[stage]}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-ink-primary">{STAGE_LABELS[stage]}</span>
                <span className="text-[10px] font-mono text-ink-tertiary">
                  {s.count} project · avg {s.avgProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${s.avgProgress}%`, backgroundColor: STAGE_HEX[stage] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1 text-[10px]">
        {STAGE_KEYS.map((stage) => (
          <div key={stage} className="text-center">
            <div className="font-mono font-semibold" style={{ color: STAGE_HEX[stage] }}>
              {stageStats[stage].count}
            </div>
            <div className="text-ink-tertiary truncate">{STAGE_SHORT_LABELS[stage]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
