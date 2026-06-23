import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AttachmentCategory, BusinessStage, Status, SubTask, Task, TaskAttachment } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { SEED_TASKS } from './seed'
import { useLogStore } from './useLogStore'
import { useTeamStore } from './useTeamStore'
import {
  ATTACHMENT_CATEGORY_LABELS,
  ATTACHMENT_MAX_FILES_PER_PROJECT,
  ATTACHMENT_MAX_FILE_BYTES,
  STATUS_LABELS,
} from '../utils/colors'

type CreateTaskInput = Partial<Task> & {
  title: string
  teamId: string
}

/** Input untuk addAttachment — caller harus sudah convert file ke base64 + size + mime. */
export interface AddAttachmentInput {
  category: AttachmentCategory
  name: string
  description?: string
  size: number
  mimeType: string
  dataUrl: string
  uploadedByUserId: string
  uploadedByName: string
  /** Kalau diisi: ini adalah versi baru dari attachment lain. Version otomatis di-bump. */
  versionOfId?: string | null
}

export interface AttachmentResult {
  ok: boolean
  error?: string
  attachment?: TaskAttachment
}

interface TaskState {
  tasks: Task[]
  createTask: (input: CreateTaskInput) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: Status) => void
  handoff: (taskId: string, toTeamId: string, reason: string, by: string) => void
  applyHandoff: (
    taskId: string,
    payload: {
      toTeamId: string
      toDepartmentId: string | null
      assignees: string[]
      reason: string
      by: string
      originalFromTeamId: string
      promoteToStage?: BusinessStage | null
      resetStatusToBacklog?: boolean
    },
  ) => void
  toggleSubTask: (taskId: string, subTaskId: string) => void
  addSubTask: (taskId: string, title: string) => void
  removeSubTask: (taskId: string, subTaskId: string) => void
  addComment: (taskId: string, author: string, content: string) => void
  removeTasksByTeam: (teamId: string) => void
  markDone: (id: string) => { ok: boolean; error?: string }
  /** P2: tambah attachment. Validasi size + per-project quota. */
  addAttachment: (taskId: string, input: AddAttachmentInput) => AttachmentResult
  removeAttachment: (taskId: string, attachmentId: string) => void
  updateAttachmentMeta: (taskId: string, attachmentId: string, patch: { name?: string; description?: string; category?: AttachmentCategory }) => void
  clearAll: () => void
  /** I6: reset ke seed data. */
  resetToSeed: () => void
}

/** Hitung total attachment di seluruh task untuk satu project. */
export function countProjectAttachments(tasks: Task[], projectId: string | null): number {
  if (!projectId) return 0
  return tasks
    .filter((t) => t.projectId === projectId)
    .reduce((sum, t) => sum + (t.attachments?.length ?? 0), 0)
}

/** Versi berikutnya berdasarkan versi terakhir di chain yang sama. */
export function nextVersionString(existing: TaskAttachment[]): string {
  if (existing.length === 0) return 'v1.0'
  // Cari semua versi (v1.0, v1.1, ...), ambil major.minor tertinggi, bump minor.
  const parsed = existing
    .map((a) => {
      const m = a.version.match(/^v(\d+)\.(\d+)$/)
      if (!m) return null
      return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10) }
    })
    .filter((x): x is { major: number; minor: number } => !!x)
  if (parsed.length === 0) return `v${existing.length + 1}.0`
  parsed.sort((a, b) => (b.major - a.major) || (b.minor - a.minor))
  const top = parsed[0]
  return `v${top.major}.${top.minor + 1}`
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: SEED_TASKS,
      createTask: (input) => {
        const task: Task = {
          id: uid('tsk'),
          title: input.title,
          description: input.description ?? '',
          priority: input.priority ?? 'medium',
          status: input.status ?? 'backlog',
          teamId: input.teamId,
          assignees: input.assignees ?? [],
          coPics: input.coPics ?? [],
          tags: input.tags ?? [],
          deadline: input.deadline ?? null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          storyPoints: input.storyPoints ?? 3,
          estimatedDurationDays: input.estimatedDurationDays ?? null,
          isMilestone: input.isMilestone ?? false,
          deliverable: input.deliverable ?? '',
          completedAt: null,
          handoffHistory: [],
          attachmentCount: input.attachmentCount ?? 0,
          attachments: input.attachments ?? [],
          commentCount: input.commentCount ?? 0,
          parentTaskId: input.parentTaskId ?? null,
          subTasks: input.subTasks ?? [],
          comments: input.comments ?? [],
          departmentId: input.departmentId ?? null,
          projectId: input.projectId ?? 'prj_internal_pgncom',
          stage: input.stage ?? 'build_to_operate',
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        useLogStore.getState().addLog({
          type: 'task_created',
          message: `Tugas "${task.title}" dibuat`,
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: null,
          toTeamId: task.teamId,
        })
        return task
      },
      updateTask: (id, patch) => {
        const existing = get().tasks.find((t) => t.id === id)
        if (!existing) return
        const updated: Task = { ...existing, ...patch, updatedAt: nowIso() }
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
        useLogStore.getState().addLog({
          type: 'task_edited',
          message: `Tugas "${updated.title}" diperbarui`,
          taskId: updated.id,
          taskTitle: updated.title,
          fromTeamId: existing.teamId,
          toTeamId: updated.teamId,
        })
      },
      deleteTask: (id) => {
        const existing = get().tasks.find((t) => t.id === id)
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
        if (existing) {
          useLogStore.getState().addLog({
            type: 'task_deleted',
            message: `Tugas "${existing.title}" dihapus`,
            taskId: existing.id,
            taskTitle: existing.title,
            fromTeamId: existing.teamId,
            toTeamId: null,
          })
        }
      },
      moveTask: (id, status) => {
        const existing = get().tasks.find((t) => t.id === id)
        if (!existing || existing.status === status) return
        const team = useTeamStore.getState().getTeam(existing.teamId)
        const col = team?.kanbanConfig?.find((c) => c.key === status)
        const isDoneCol = col?.isDone === true || status === 'done'
        const isDone = status === 'done'
        const completedAt = isDoneCol ? nowIso() : null
        const updated: Task = { ...existing, status, updatedAt: nowIso(), completedAt }
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
        const colLabel = col?.label ?? STATUS_LABELS[status] ?? status
        useLogStore.getState().addLog({
          type: isDone ? 'task_done' : 'task_moved',
          message: isDone
            ? `Tugas "${existing.title}" diselesaikan`
            : `Tugas "${existing.title}" dipindah ke ${colLabel}`,
          taskId: existing.id,
          taskTitle: existing.title,
          fromTeamId: existing.teamId,
          toTeamId: existing.teamId,
        })
      },
      markDone: (id) => {
        const existing = get().tasks.find((t) => t.id === id)
        if (!existing) return { ok: false, error: 'Tugas tidak ditemukan' }
        // P2: Evidence gate — task tidak boleh diselesaikan tanpa minimal 1 attachment kategori Evidence.
        const hasEvidence = (existing.attachments ?? []).some((a) => a.category === 'evidence')
        if (!hasEvidence) {
          return { ok: false, error: 'Tambahkan minimal 1 lampiran kategori Evidence sebelum menyelesaikan tugas' }
        }
        get().moveTask(id, 'done')
        return { ok: true }
      },
      applyHandoff: (taskId, payload) => {
        const existing = get().tasks.find((t) => t.id === taskId)
        if (!existing) return
        const record = {
          id: uid('hof'),
          fromTeamId: payload.originalFromTeamId,
          toTeamId: payload.toTeamId,
          reason: payload.reason,
          timestamp: nowIso(),
          by: payload.by,
        }
        const updated: Task = {
          ...existing,
          teamId: payload.toTeamId,
          departmentId: payload.toDepartmentId,
          assignees: payload.assignees,
          updatedAt: nowIso(),
          handoffHistory: [...existing.handoffHistory, record],
          // Promote: advance task.stage ke stage berikut
          stage: payload.promoteToStage ?? existing.stage,
          // Reset ke backlog di divisi tujuan (untuk promote flow)
          status: payload.resetStatusToBacklog ? 'backlog' : existing.status,
          completedAt: payload.resetStatusToBacklog ? null : existing.completedAt,
        }
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)) }))
      },
      handoff: (taskId, toTeamId, reason, by) => {
        const existing = get().tasks.find((t) => t.id === taskId)
        if (!existing || existing.teamId === toTeamId) return
        const record = {
          id: uid('hof'),
          fromTeamId: existing.teamId,
          toTeamId,
          reason,
          timestamp: nowIso(),
          by,
        }
        const updated: Task = {
          ...existing,
          teamId: toTeamId,
          updatedAt: nowIso(),
          handoffHistory: [...existing.handoffHistory, record],
        }
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)) }))
        const team = useTeamStore.getState().getTeam(toTeamId)
        useLogStore.getState().addLog({
          type: 'handoff',
          message: `Tugas "${existing.title}" diserahkan ke ${team?.name ?? 'Tim Lain'}`,
          taskId: existing.id,
          taskTitle: existing.title,
          fromTeamId: existing.teamId,
          toTeamId,
        })
      },
      toggleSubTask: (taskId, subTaskId) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subTasks: t.subTasks.map((st) => (st.id === subTaskId ? { ...st, done: !st.done } : st)),
                  updatedAt: nowIso(),
                }
              : t,
          ),
        }))
      },
      addSubTask: (taskId, title) => {
        const sub: SubTask = { id: uid('st'), title, done: false }
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subTasks: [...t.subTasks, sub], updatedAt: nowIso() } : t,
          ),
        }))
      },
      removeSubTask: (taskId, subTaskId) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subTasks: t.subTasks.filter((st) => st.id !== subTaskId), updatedAt: nowIso() }
              : t,
          ),
        }))
      },
      addComment: (taskId, author, content) => {
        const comment = { id: uid('cmt'), author, content, timestamp: nowIso() }
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [...t.comments, comment],
                  commentCount: (t.commentCount ?? 0) + 1,
                  updatedAt: nowIso(),
                }
              : t,
          ),
        }))
      },
      removeTasksByTeam: (teamId) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.teamId !== teamId) }))
      },

      addAttachment: (taskId, input) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return { ok: false, error: 'Tugas tidak ditemukan' }
        if (input.size > ATTACHMENT_MAX_FILE_BYTES) {
          return { ok: false, error: `Ukuran file melebihi batas (${(ATTACHMENT_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB)` }
        }
        const totalForProject = countProjectAttachments(get().tasks, task.projectId)
        if (totalForProject >= ATTACHMENT_MAX_FILES_PER_PROJECT) {
          return { ok: false, error: `Project sudah mencapai batas ${ATTACHMENT_MAX_FILES_PER_PROJECT} lampiran` }
        }
        // Version handling
        let version = 'v1.0'
        let rootId: string | null = null
        if (input.versionOfId) {
          const parent = task.attachments.find((a) => a.id === input.versionOfId)
          if (!parent) return { ok: false, error: 'Lampiran asal versi tidak ditemukan' }
          rootId = parent.versionOfId ?? parent.id
          const chain = task.attachments.filter((a) => (a.versionOfId ?? a.id) === rootId)
          version = nextVersionString(chain)
        }
        const attachment: TaskAttachment = {
          id: uid('att'),
          category: input.category,
          name: input.name.trim() || `Untitled-${Date.now()}`,
          description: input.description ?? '',
          version,
          versionOfId: rootId,
          size: input.size,
          mimeType: input.mimeType,
          dataUrl: input.dataUrl,
          uploadedByUserId: input.uploadedByUserId,
          uploadedByName: input.uploadedByName,
          uploadedAt: nowIso(),
        }
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: [...t.attachments, attachment],
                  attachmentCount: t.attachments.length + 1,
                  updatedAt: nowIso(),
                }
              : t,
          ),
        }))
        useLogStore.getState().addLog({
          type: input.versionOfId ? 'task_attachment_version_added' : 'task_attachment_added',
          message: input.versionOfId
            ? `Versi baru "${attachment.version}" ditambah ke "${task.title}" (${ATTACHMENT_CATEGORY_LABELS[input.category]})`
            : `Lampiran "${attachment.name}" ditambah ke "${task.title}" (${ATTACHMENT_CATEGORY_LABELS[input.category]})`,
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: task.teamId,
          toTeamId: null,
        })
        return { ok: true, attachment }
      },

      removeAttachment: (taskId, attachmentId) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const att = task.attachments.find((a) => a.id === attachmentId)
        if (!att) return
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: t.attachments.filter((a) => a.id !== attachmentId),
                  attachmentCount: Math.max(0, t.attachments.length - 1),
                  updatedAt: nowIso(),
                }
              : t,
          ),
        }))
        useLogStore.getState().addLog({
          type: 'task_attachment_removed',
          message: `Lampiran "${att.name}" (${att.version}) dihapus dari "${task.title}"`,
          taskId: task.id,
          taskTitle: task.title,
          fromTeamId: task.teamId,
          toTeamId: null,
        })
      },

      updateAttachmentMeta: (taskId, attachmentId, patch) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: t.attachments.map((a) =>
                    a.id === attachmentId
                      ? {
                          ...a,
                          name: patch.name ?? a.name,
                          description: patch.description ?? a.description,
                          category: patch.category ?? a.category,
                        }
                      : a,
                  ),
                  updatedAt: nowIso(),
                }
              : t,
          ),
        }))
      },

      clearAll: () => set({ tasks: [] }),
      resetToSeed: () => set({ tasks: SEED_TASKS }),
    }),
    {
      name: 'flowdesk:tasks',
      onRehydrateStorage: () => (state) => {
        // Migration: ensure task has projectId & stage + P2 fields (coPics, attachments, deliverable...)
        if (!state) return
        let dirty = false
        const tasks = state.tasks.map((t) => {
          const next = { ...t } as Task
          if (next.projectId === undefined) {
            next.projectId = 'prj_internal_pgncom'
            dirty = true
          }
          if (next.stage === undefined) {
            if (next.status === 'done') next.stage = 'close'
            else if (next.status === 'operate') next.stage = 'operate_to_assure'
            else next.stage = 'build_to_operate'
            dirty = true
          }
          if (next.coPics === undefined) { next.coPics = []; dirty = true }
          if (next.attachments === undefined) { next.attachments = []; dirty = true }
          if (next.estimatedDurationDays === undefined) { next.estimatedDurationDays = null; dirty = true }
          if (next.isMilestone === undefined) { next.isMilestone = false; dirty = true }
          if (next.deliverable === undefined) { next.deliverable = ''; dirty = true }
          return next
        })
        if (dirty) (state as { tasks: Task[] }).tasks = tasks
      },
    },
  ),
)
