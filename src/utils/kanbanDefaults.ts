import type { KanbanColumn } from '../types'
import { STATUS_HEX, STATUS_LABELS } from './colors'

/**
 * Default kanban columns yang otomatis di-seed untuk setiap divisi baru.
 * Backlog = isSystem (tidak bisa dihapus, universal di seluruh divisi).
 * Selesai = isTerminal (state akhir).
 */
export function defaultKanbanConfig(): KanbanColumn[] {
  return [
    {
      id: 'col_backlog',
      key: 'backlog',
      label: STATUS_LABELS.backlog,
      color: STATUS_HEX.backlog,
      position: 0,
      isSystem: true,
      isTerminal: false,
      isInProgress: false,
      isDone: false,
    },
    {
      id: 'col_in_progress',
      key: 'in_progress',
      label: STATUS_LABELS.in_progress,
      color: STATUS_HEX.in_progress,
      position: 1,
      isSystem: false,
      isTerminal: false,
      isInProgress: true,
      isDone: false,
    },
    {
      id: 'col_review',
      key: 'review',
      label: STATUS_LABELS.review,
      color: STATUS_HEX.review,
      position: 2,
      isSystem: false,
      isTerminal: false,
      isInProgress: true,
      isDone: false,
    },
    {
      id: 'col_done',
      key: 'done',
      label: STATUS_LABELS.done,
      color: STATUS_HEX.done,
      position: 3,
      isSystem: true,         // wajib di semua divisi (universal)
      isTerminal: true,
      isInProgress: false,
      isDone: true,
    },
    {
      id: 'col_cancel',
      key: 'cancel',
      label: STATUS_LABELS.cancel,
      color: STATUS_HEX.cancel,
      position: 4,
      isSystem: false,
      isTerminal: true,
      isInProgress: false,
      isDone: false,
    },
  ]
}

/** Konfigurasi khusus OSM: tambah Operate sebelum Selesai. */
export function osmKanbanConfig(): KanbanColumn[] {
  const cfg = defaultKanbanConfig()
  return [
    ...cfg.slice(0, 3), // backlog, in_progress, review
    {
      id: 'col_operate',
      key: 'operate',
      label: STATUS_LABELS.operate,
      color: STATUS_HEX.operate,
      position: 3,
      isSystem: false,
      isTerminal: false,
      isInProgress: true,
      isDone: false,
    },
    { ...cfg[3], position: 4 }, // done
    { ...cfg[4], position: 5 }, // cancel
  ]
}

/** Validasi minimal: Backlog & Selesai (isSystem) wajib ada. */
export function isValidKanbanConfig(cols: KanbanColumn[]): { ok: boolean; reason?: string } {
  if (!cols.some((c) => c.key === 'backlog')) return { ok: false, reason: 'Kolom Backlog (universal) wajib ada.' }
  if (!cols.some((c) => c.key === 'done')) return { ok: false, reason: 'Kolom Selesai (universal) wajib ada — task selesai trigger promote ke stage L0 berikut.' }
  return { ok: true }
}

/** Pastikan kanban config punya kolom Selesai & Backlog (untuk migration data lama). */
export function ensureUniversalColumns(cols: KanbanColumn[]): KanbanColumn[] {
  let result = [...cols]
  const hasBacklog = result.some((c) => c.key === 'backlog')
  const hasDone = result.some((c) => c.key === 'done')
  if (!hasBacklog) {
    result = [
      {
        id: 'col_backlog',
        key: 'backlog',
        label: STATUS_LABELS.backlog,
        color: STATUS_HEX.backlog,
        position: -1,
        isSystem: true,
        isTerminal: false,
        isInProgress: false,
        isDone: false,
      },
      ...result,
    ]
  }
  if (!hasDone) {
    result = [
      ...result,
      {
        id: 'col_done',
        key: 'done',
        label: STATUS_LABELS.done,
        color: STATUS_HEX.done,
        position: result.length,
        isSystem: true,
        isTerminal: true,
        isInProgress: false,
        isDone: true,
      },
    ]
  }
  // Re-mark existing 'done' & 'backlog' as isSystem
  result = result.map((c) => {
    if (c.key === 'backlog' || c.key === 'done') return { ...c, isSystem: true }
    return c
  })
  // Re-position cleanly
  return result
    .sort((a, b) => a.position - b.position)
    .map((c, i) => ({ ...c, position: i }))
}

/** Sort by position untuk render. */
export function sortedColumns(cols: KanbanColumn[]): KanbanColumn[] {
  return [...cols].sort((a, b) => a.position - b.position)
}
