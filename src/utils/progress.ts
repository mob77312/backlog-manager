import type { BusinessStage, KanbanColumn, Project, Task, Team } from '../types'

/**
 * Hitung progress (0-100) suatu stage dalam project berdasarkan task-nya.
 * Logika default:
 *   - Jika ada `progressOverride`, pakai itu.
 *   - Jika tidak ada task di stage tsb → 0
 *   - progress = (jumlah task done / total task) * 100
 *      (done = berada di kolom dengan isDone=true ATAU key='done')
 */
export function computeStageProgress(
  project: Project,
  stage: BusinessStage,
  tasks: Task[],
  teams: Team[],
): number {
  const sc = project.stageConfig.find((s) => s.stage === stage)
  if (!sc) return 0
  if (sc.progressOverride !== null && sc.progressOverride !== undefined) {
    return clamp(sc.progressOverride, 0, 100)
  }
  if (sc.status === 'done') return 100
  const stageTasks = tasks.filter((t) => t.projectId === project.id && t.stage === stage)
  if (stageTasks.length === 0) return sc.status === 'in_progress' ? 0 : 0
  const doneCount = stageTasks.filter((t) => isTaskDone(t, teams)).length
  return Math.round((doneCount / stageTasks.length) * 100)
}

function isTaskDone(task: Task, teams: Team[]): boolean {
  if (task.status === 'done') return true
  const team = teams.find((t) => t.id === task.teamId)
  const col = team?.kanbanConfig?.find((c) => c.key === task.status)
  return col?.isDone === true
}

/** Total progress project (weighted sum semua stage). */
export function computeProjectProgress(
  project: Project,
  tasks: Task[],
  teams: Team[],
): { total: number; perStage: Array<{ stage: BusinessStage; weight: number; progress: number; contribution: number }> } {
  const totalWeight = project.stageConfig.reduce((sum, sc) => sum + (sc.weight ?? 0), 0)
  const perStage = project.stageConfig.map((sc) => {
    const progress = computeStageProgress(project, sc.stage, tasks, teams)
    const contribution = totalWeight > 0 ? (progress * sc.weight) / 100 : 0
    return { stage: sc.stage, weight: sc.weight, progress, contribution }
  })
  // Normalisasi: kalau totalWeight != 100, kita tetap pakai bobot relatif
  const sumContrib = perStage.reduce((sum, p) => sum + p.contribution, 0)
  const total = totalWeight > 0 ? Math.round((sumContrib / totalWeight) * 100) : 0
  return { total: clamp(total, 0, 100), perStage }
}

/** Tipe lampu progress untuk UI. */
export function progressTone(p: number): 'gray' | 'red' | 'amber' | 'emerald' {
  if (p === 0) return 'gray'
  if (p < 30) return 'red'
  if (p < 80) return 'amber'
  return 'emerald'
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Validasi: total weight harus 100 (boleh deviasi ±1 untuk rounding). */
export function isValidWeights(weights: Record<BusinessStage, number>): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  return Math.abs(sum - 100) <= 1
}

/** Cari nama divisi owner untuk suatu stage. */
export function stageOwnerLabels(teamIds: string[], teams: Team[]): string {
  if (teamIds.length === 0) return '—'
  return teamIds
    .map((id) => teams.find((t) => t.id === id)?.acronym ?? '?')
    .join(', ')
}

/** Cari "kolom universal" yang setara untuk migrasi task antar divisi. */
export function findMatchingColumn(
  sourceCol: KanbanColumn,
  destConfig: KanbanColumn[],
): KanbanColumn | null {
  // 1. Match by key
  const byKey = destConfig.find((c) => c.key === sourceCol.key)
  if (byKey) return byKey
  // 2. Fallback to backlog (isSystem)
  return destConfig.find((c) => c.isSystem) ?? destConfig[0] ?? null
}
