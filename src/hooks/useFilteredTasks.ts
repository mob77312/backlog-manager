import { useMemo } from 'react'
import { useTaskStore } from '../store/useTaskStore'
import { useUIStore } from '../store/useUIStore'
import { useTeamStore } from '../store/useTeamStore'
import { useWorkflowStore } from '../store/useWorkflowStore'
import type { Task } from '../types'
import { defaultKanbanConfig, sortedColumns } from '../utils/kanbanDefaults'

export function useFilteredTasks() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useUIStore((s) => s.filters)
  const sidebarTeamId = useUIStore((s) => s.sidebarTeamFilter)
  const stageCtx = useUIStore((s) => s.boardStageContext)
  const teams = useTeamStore((s) => s.teams)
  const stageOwnersMap = useWorkflowStore((s) => s.stageOwners)

  return useMemo(() => {
    // Stage multi-mode: scope task ke teams yg own stage (kalau sidebarTeamId belum di-pin)
    const stageOwnerTeamIds = stageCtx ? (stageOwnersMap[stageCtx] ?? []) : []
    const inMultiStageMode = !sidebarTeamId && stageCtx && stageOwnerTeamIds.length > 0

    const q = filters.search.trim().toLowerCase()
    const filtered = tasks.filter((t) => {
      if (sidebarTeamId && t.teamId !== sidebarTeamId) return false
      if (inMultiStageMode && !stageOwnerTeamIds.includes(t.teamId)) return false
      if (stageCtx && t.stage !== stageCtx) return false
      if (filters.teamIds.length && !filters.teamIds.includes(t.teamId)) return false
      if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false
      if (filters.statuses.length && !filters.statuses.includes(t.status)) return false
      if (filters.projectId && t.projectId !== filters.projectId) return false
      if (q) {
        const hay = `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Group by column key, per-team if sidebar filter is active
    const grouped: Record<string, Task[]> = {}
    filtered.forEach((t) => {
      const k = t.status || 'backlog'
      if (!grouped[k]) grouped[k] = []
      grouped[k].push(t)
    })

    // Resolve columns to show:
    // - single team aktif (sidebarTeamFilter) → pakai kanbanConfig divisi tsb
    // - multi-stage mode → union dari kanban semua divisi owner stage tsb
    // - kalau tidak ada konteks → union dari semua divisi (atau teamIds filter)
    let columns
    if (sidebarTeamId) {
      const team = teams.find((t) => t.id === sidebarTeamId)
      columns = sortedColumns(team?.kanbanConfig ?? defaultKanbanConfig())
    } else {
      const teamIdsSource = inMultiStageMode
        ? stageOwnerTeamIds
        : filters.teamIds.length
          ? filters.teamIds
          : teams.map((t) => t.id)
      const seen = new Map<string, { key: string; label: string; color: string; position: number; isSystem: boolean; isTerminal: boolean; isInProgress: boolean; isDone: boolean; id: string }>()
      teamIdsSource.forEach((tid) => {
        const team = teams.find((t) => t.id === tid)
        const cfg = team?.kanbanConfig ?? defaultKanbanConfig()
        cfg.forEach((c) => {
          if (!seen.has(c.key)) seen.set(c.key, c)
        })
      })
      // Canonical order: universal columns (backlog, in_progress, review, done, cancel, operate)
      // di urutan tetap, lalu custom columns by position
      const CANONICAL_ORDER = ['backlog', 'in_progress', 'review', 'operate', 'done', 'cancel']
      const universalCols = CANONICAL_ORDER
        .map((key) => seen.get(key))
        .filter((c): c is NonNullable<typeof c> => c !== undefined)
      const customCols = Array.from(seen.values())
        .filter((c) => !CANONICAL_ORDER.includes(c.key))
        .sort((a, b) => a.position - b.position)
      columns = [...universalCols, ...customCols].map((c, i) => ({ ...c, position: i }))
    }

    return { filtered, grouped, columns }
  }, [tasks, filters, sidebarTeamId, stageCtx, stageOwnersMap, teams])
}
