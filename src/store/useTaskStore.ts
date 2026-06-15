import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessStage, Status, SubTask, Task } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { SEED_TASKS } from './seed'
import { useLogStore } from './useLogStore'
import { useTeamStore } from './useTeamStore'
import { STATUS_LABELS } from '../utils/colors'

type CreateTaskInput = Partial<Task> & {
  title: string
  teamId: string
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
  markDone: (id: string) => void
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
          tags: input.tags ?? [],
          deadline: input.deadline ?? null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          storyPoints: input.storyPoints ?? 3,
          completedAt: null,
          handoffHistory: [],
          attachmentCount: input.attachmentCount ?? 0,
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
        const isDone = status === 'done'
        const completedAt = isDone ? nowIso() : null
        const updated: Task = { ...existing, status, updatedAt: nowIso(), completedAt }
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
        const team = useTeamStore.getState().getTeam(existing.teamId)
        const colLabel = team?.kanbanConfig?.find((c) => c.key === status)?.label
          ?? STATUS_LABELS[status]
          ?? status
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
      markDone: (id) => get().moveTask(id, 'done'),
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
    }),
    {
      name: 'flowdesk:tasks',
      onRehydrateStorage: () => (state) => {
        // Migration: ensure task has projectId & stage, migrate 'operate' status per team config
        if (!state) return
        let dirty = false
        const tasks = state.tasks.map((t) => {
          const next = { ...t }
          if (next.projectId === undefined) {
            next.projectId = 'prj_internal_pgncom'
            dirty = true
          }
          if (next.stage === undefined) {
            // infer stage from status (best-effort)
            if (next.status === 'done') next.stage = 'close'
            else if (next.status === 'operate') next.stage = 'operate_to_assure'
            else next.stage = 'build_to_operate'
            dirty = true
          }
          return next
        })
        if (dirty) (state as { tasks: Task[] }).tasks = tasks
      },
    },
  ),
)
