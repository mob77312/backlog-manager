import { useMemo } from 'react'
import { Activity, AlertTriangle, Calendar, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useUIStore } from '../../store/useUIStore'
import { buildSCurveSeries, computeSCurveSummary, taskWeight } from '../../utils/scurve'
import { PRIORITY_HEX, PRIORITY_LABELS, STAGE_HEX, STAGE_LABELS, STAGE_KEYS } from '../../utils/colors'
import type { Project, Task, Team } from '../../types'
import { classNames } from '../../utils/helpers'
import { SCurveChart } from './SCurveChart'

const HEALTH_COLORS = {
  green: { hex: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Sehat' },
  yellow: { hex: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Waspada' },
  red: { hex: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'Kritis' },
  gray: { hex: '#94a3b8', bg: 'bg-slate-50', text: 'text-slate-600', label: 'Belum mulai' },
}

function isTaskDone(task: Task, teams: Team[]): boolean {
  if (task.status === 'done') return true
  const team = teams.find((t) => t.id === task.teamId)
  const col = team?.kanbanConfig?.find((c) => c.key === task.status)
  return col?.isDone === true
}

interface Props {
  project: Project
  compact?: boolean
  /** Default: open project-detail modal saat klik. Set false untuk disable (mis. saat sudah di dalam modal). */
  clickable?: boolean
}

export function ProjectDashboardCard({ project, compact = false, clickable = true }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const openModal = useUIStore((s) => s.openModal)

  const summary = useMemo(() => computeSCurveSummary(project, tasks, teams), [project, tasks, teams])
  const series = useMemo(() => buildSCurveSeries(project, tasks, teams), [project, tasks, teams])

  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id])

  const perStage = useMemo(() => {
    return STAGE_KEYS.map((stage) => {
      const cfg = project.stageConfig.find((s) => s.stage === stage)
      const stageTasks = projectTasks.filter((t) => t.stage === stage)
      const totalW = stageTasks.reduce((sum, t) => sum + taskWeight(t), 0)
      const doneTasks = stageTasks.filter((t) => isTaskDone(t, teams))
      const doneW = doneTasks.reduce((sum, t) => sum + taskWeight(t), 0)
      const progress = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0
      return {
        stage,
        weight: cfg?.weight ?? 0,
        progress,
        taskCount: stageTasks.length,
        doneCount: doneTasks.length,
        contribution: Math.round((progress * (cfg?.weight ?? 0)) / 100),
      }
    })
  }, [project, projectTasks, teams])

  const health = HEALTH_COLORS[summary.health]

  const milestones = useMemo(() => projectTasks.filter((t) => t.isMilestone), [projectTasks])
  const completedMilestones = milestones.filter((m) => isTaskDone(m, teams))

  return (
    <div
      className={classNames(
        'rounded-xl border border-border-subtle bg-white shadow-card overflow-hidden transition',
        clickable && 'cursor-pointer hover:shadow-card-hover',
      )}
      style={{ borderTop: `3px solid ${health.hex}` }}
      onClick={() => clickable && openModal({ type: 'project-detail', projectId: project.id })}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] text-ink-tertiary">
            <span className="font-mono">{project.code}</span>
            <span>·</span>
            <span>{project.customer || 'Internal'}</span>
            <span>·</span>
            <span className="font-medium" style={{ color: STAGE_HEX[project.currentStage] }}>
              {STAGE_LABELS[project.currentStage]}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-[13px] font-semibold text-ink-primary">{project.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{
              background: `${PRIORITY_HEX[project.priority]}18`,
              color: PRIORITY_HEX[project.priority],
            }}
          >
            {PRIORITY_LABELS[project.priority]}
          </span>
          <span
            className={classNames('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', health.bg, health.text)}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.hex }} />
            {health.label}
          </span>
        </div>
      </div>

      {/* Summary cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-3 py-2.5 bg-bg-column/30">
        <Stat
          label="Actual"
          value={`${summary.actualProgress}%`}
          icon={<Activity size={11} className="text-pertamina-red" />}
        />
        <Stat
          label="Planned"
          value={`${summary.plannedProgress}%`}
          icon={<Calendar size={11} className="text-ink-tertiary" />}
        />
        <Stat
          label="Variance"
          value={`${summary.scheduleVariancePercent > 0 ? '+' : ''}${summary.scheduleVariancePercent}%`}
          icon={
            summary.scheduleVariancePercent >= 0
              ? <TrendingUp size={11} className="text-emerald-600" />
              : <TrendingDown size={11} className="text-pertamina-red" />
          }
          tone={summary.scheduleVariancePercent >= -2 ? 'good' : summary.scheduleVariancePercent > -10 ? 'warn' : 'bad'}
        />
        <Stat
          label="Est. Selesai"
          value={
            summary.estimatedCompletionDate
              ? new Date(summary.estimatedCompletionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
              : '—'
          }
          icon={
            summary.estimatedDelayDays != null && summary.estimatedDelayDays > 0
              ? <AlertTriangle size={11} className="text-amber-600" />
              : <CheckCircle2 size={11} className="text-emerald-600" />
          }
          tone={
            summary.estimatedDelayDays == null
              ? 'neutral'
              : summary.estimatedDelayDays > 7
                ? 'bad'
                : summary.estimatedDelayDays > 0
                  ? 'warn'
                  : 'good'
          }
        />
      </div>

      {/* Chart */}
      {!compact && (
        <div className="px-3 py-2">
          <SCurveChart points={series} height={160} />
        </div>
      )}

      {/* Stage table */}
      {!compact && (
        <div className="border-t border-border-subtle">
          <div className="grid grid-cols-[1fr_60px_60px_1fr_60px] gap-2 px-3 py-1.5 bg-black/[0.03] text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">
            <span>Stage L0</span>
            <span className="text-right">Bobot</span>
            <span className="text-right">Tasks</span>
            <span>Progress</span>
            <span className="text-right">Kontribusi</span>
          </div>
          {perStage.map((s) => (
            <div
              key={s.stage}
              className="grid grid-cols-[1fr_60px_60px_1fr_60px] items-center gap-2 px-3 py-1.5 border-t border-border-subtle text-[11px]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: STAGE_HEX[s.stage] }} />
                <span className="truncate text-ink-primary">{STAGE_LABELS[s.stage]}</span>
              </span>
              <span className="text-right font-mono text-ink-secondary">{s.weight}%</span>
              <span className="text-right font-mono text-ink-secondary">{s.doneCount}/{s.taskCount}</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.progress}%`, background: STAGE_HEX[s.stage] }}
                  />
                </div>
                <span className="font-mono text-[10px] text-ink-tertiary">{s.progress}%</span>
              </div>
              <span className="text-right font-mono font-semibold" style={{ color: STAGE_HEX[s.stage] }}>
                {s.contribution}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border-subtle px-3 py-1.5 flex items-center justify-between text-[10px] text-ink-tertiary">
        <span>
          {summary.completedTasks}/{summary.totalTasks} tugas selesai
        </span>
        {milestones.length > 0 && (
          <span>
            🎯 {completedMilestones.length}/{milestones.length} milestone
          </span>
        )}
        <span>
          {project.plannedStartDate
            ? new Date(project.plannedStartDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
            : '—'}
          {' → '}
          {project.plannedEndDate
            ? new Date(project.plannedEndDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
            : '—'}
        </span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const toneCls = {
    good: 'border-emerald-200 bg-emerald-50/40',
    warn: 'border-amber-200 bg-amber-50/40',
    bad: 'border-red-200 bg-red-50/40',
    neutral: 'border-border-subtle bg-white',
  }[tone]
  return (
    <div className={classNames('rounded-md border px-2 py-1.5', toneCls)}>
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-bold text-ink-primary">{value}</div>
    </div>
  )
}
