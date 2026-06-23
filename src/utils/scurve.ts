import type { Project, Task, Team } from '../types'

/** Bobot 1 task: gunakan estimatedDurationDays kalau ada, fallback ke storyPoints. */
export function taskWeight(task: Task): number {
  if (task.estimatedDurationDays && task.estimatedDurationDays > 0) return task.estimatedDurationDays
  return Math.max(1, task.storyPoints)
}

function isTaskDone(task: Task, teams: Team[]): boolean {
  if (task.status === 'done') return true
  const team = teams.find((t) => t.id === task.teamId)
  const col = team?.kanbanConfig?.find((c) => c.key === task.status)
  return col?.isDone === true
}

export interface SCurvePoint {
  /** ISO date string */
  date: string
  /** Planned cumulative progress 0-100 */
  planned: number
  /** Actual cumulative progress 0-100 (null = belum tercatat di tanggal itu) */
  actual: number | null
}

export interface SCurveSummary {
  /** Actual progress sekarang (0-100). */
  actualProgress: number
  /** Planned progress sekarang (0-100). */
  plannedProgress: number
  /** Schedule variance dalam % (actual - planned). Positif = ahead, negatif = behind. */
  scheduleVariancePercent: number
  /** Estimasi tanggal selesai (linear extrapolation). Null = belum bisa diestimasi. */
  estimatedCompletionDate: string | null
  /** Selisih hari estimasi vs planned end. Positif = akan terlambat. Null kalau belum bisa estimasi. */
  estimatedDelayDays: number | null
  /** Health indicator. */
  health: 'green' | 'yellow' | 'red' | 'gray'
  /** Total task weight di project. */
  totalWeight: number
  /** Completed task weight. */
  completedWeight: number
  totalTasks: number
  completedTasks: number
}

const DAY_MS = 1000 * 60 * 60 * 24

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS)
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setDate(next.getDate() + days)
  return next
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * S-curve sederhana: planned progress di-distribusikan linear antara plannedStart→plannedEnd.
 * (Bisa di-upgrade ke kurva sigmoid/parabolic di iterasi berikut.)
 */
function plannedProgressAt(date: Date, plannedStart: Date, plannedEnd: Date): number {
  if (date <= plannedStart) return 0
  if (date >= plannedEnd) return 100
  const totalDays = Math.max(1, diffDays(plannedEnd, plannedStart))
  const elapsed = diffDays(date, plannedStart)
  return Math.round((elapsed / totalDays) * 1000) / 10
}

/** Cumulative actual progress dari task milik project sampai tanggal tertentu. */
function actualProgressUntil(date: Date, projectTasks: Task[], teams: Team[]): number {
  const totalW = projectTasks.reduce((sum, t) => sum + taskWeight(t), 0)
  if (totalW === 0) return 0
  const completedW = projectTasks
    .filter((t) => {
      if (!isTaskDone(t, teams)) return false
      const d = t.completedAt ?? t.updatedAt
      return new Date(d) <= date
    })
    .reduce((sum, t) => sum + taskWeight(t), 0)
  return Math.round((completedW / totalW) * 1000) / 10
}

/** Build series untuk chart (≤ 20 titik agar tidak terlalu padat). */
export function buildSCurveSeries(
  project: Project,
  tasks: Task[],
  teams: Team[],
): SCurvePoint[] {
  const plannedStart = project.plannedStartDate ? dateOnly(new Date(project.plannedStartDate)) : null
  const plannedEnd = project.plannedEndDate ? dateOnly(new Date(project.plannedEndDate)) : null
  if (!plannedStart || !plannedEnd || plannedEnd <= plannedStart) return []
  const today = dateOnly(new Date())
  // Series mengisi rentang penuh planned + sedikit buffer setelah end (untuk membandingkan)
  const totalDays = Math.max(1, diffDays(plannedEnd, plannedStart))
  const stepDays = Math.max(1, Math.floor(totalDays / 18))
  const points: SCurvePoint[] = []
  for (let d = new Date(plannedStart); d <= plannedEnd; d = addDays(d, stepDays)) {
    const dt = dateOnly(d)
    points.push({
      date: dt.toISOString(),
      planned: plannedProgressAt(dt, plannedStart, plannedEnd),
      actual: dt <= today ? actualProgressUntil(dt, tasks, teams) : null,
    })
  }
  // Selalu sertakan titik akhir
  const last = points[points.length - 1]
  if (!last || new Date(last.date).getTime() !== plannedEnd.getTime()) {
    points.push({
      date: plannedEnd.toISOString(),
      planned: 100,
      actual: plannedEnd <= today ? actualProgressUntil(plannedEnd, tasks, teams) : null,
    })
  }
  // Pastikan titik "today" ada jika di dalam rentang
  if (today >= plannedStart && today <= plannedEnd && !points.some((p) => new Date(p.date).getTime() === today.getTime())) {
    points.push({
      date: today.toISOString(),
      planned: plannedProgressAt(today, plannedStart, plannedEnd),
      actual: actualProgressUntil(today, tasks, teams),
    })
    points.sort((a, b) => a.date.localeCompare(b.date))
  }
  return points
}

/** Health indicator: hijau (variance ≥ -2%), kuning (-2% > variance > -10%), merah (≤ -10%). */
function healthFor(variance: number, totalTasks: number): SCurveSummary['health'] {
  if (totalTasks === 0) return 'gray'
  if (variance >= -2) return 'green'
  if (variance > -10) return 'yellow'
  return 'red'
}

/**
 * Linear extrapolation berbasis progress rate:
 *   rate = actualProgress% / hariBerjalan
 *   sisaHari = (100 - actualProgress) / rate
 *   estCompletion = today + sisaHari
 */
function extrapolateCompletion(
  actualProgress: number,
  plannedStart: Date,
  today: Date,
): { date: string; delayDays: number } | null {
  if (actualProgress <= 0) return null
  const elapsedDays = Math.max(1, diffDays(today, plannedStart))
  const rate = actualProgress / elapsedDays
  if (rate <= 0) return null
  const remaining = (100 - actualProgress) / rate
  const estDate = addDays(today, Math.ceil(remaining))
  return { date: estDate.toISOString(), delayDays: 0 }
}

export function computeSCurveSummary(
  project: Project,
  tasks: Task[],
  teams: Team[],
): SCurveSummary {
  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  const totalWeight = projectTasks.reduce((sum, t) => sum + taskWeight(t), 0)
  const completedTasksList = projectTasks.filter((t) => isTaskDone(t, teams))
  const completedWeight = completedTasksList.reduce((sum, t) => sum + taskWeight(t), 0)
  const actualProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 1000) / 10 : 0

  const plannedStart = project.plannedStartDate ? dateOnly(new Date(project.plannedStartDate)) : null
  const plannedEnd = project.plannedEndDate ? dateOnly(new Date(project.plannedEndDate)) : null
  const today = dateOnly(new Date())

  let plannedProgress = 0
  if (plannedStart && plannedEnd) {
    plannedProgress = plannedProgressAt(today, plannedStart, plannedEnd)
  }

  const scheduleVariancePercent = Math.round((actualProgress - plannedProgress) * 10) / 10

  let estimatedCompletionDate: string | null = null
  let estimatedDelayDays: number | null = null
  if (plannedStart && plannedEnd && actualProgress > 0 && actualProgress < 100) {
    const ext = extrapolateCompletion(actualProgress, plannedStart, today)
    if (ext) {
      estimatedCompletionDate = ext.date
      estimatedDelayDays = diffDays(new Date(ext.date), plannedEnd)
    }
  } else if (actualProgress >= 100) {
    estimatedCompletionDate = project.actualEndDate ?? today.toISOString()
    estimatedDelayDays = plannedEnd ? diffDays(new Date(estimatedCompletionDate), plannedEnd) : 0
  }

  return {
    actualProgress,
    plannedProgress,
    scheduleVariancePercent,
    estimatedCompletionDate,
    estimatedDelayDays,
    health: healthFor(scheduleVariancePercent, projectTasks.length),
    totalWeight,
    completedWeight,
    totalTasks: projectTasks.length,
    completedTasks: completedTasksList.length,
  }
}
