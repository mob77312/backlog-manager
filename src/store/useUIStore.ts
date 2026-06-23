import { create } from 'zustand'
import type { Filters, PageView } from '../types'

export type ModalType =
  | { type: 'add-task'; defaultStatus?: import('../types').Status; defaultProjectId?: string; defaultStage?: import('../types').BusinessStage }
  | { type: 'edit-task'; taskId: string }
  | { type: 'detail-task'; taskId: string }
  | { type: 'handoff'; taskId: string }
  | { type: 'add-team' }
  | { type: 'edit-team'; teamId: string }
  | { type: 'delete-team'; teamId: string }
  | { type: 'shortcuts' }
  | { type: 'user-management' }
  | { type: 'invite-user'; userId?: string }
  | { type: 'approval-queue' }
  | { type: 'approval-detail'; requestId: string }
  | { type: 'role-management' }
  | { type: 'workflow-config' }
  | { type: 'stage-owners' }
  | { type: 'project-list'; stage: import('../types').BusinessStage }
  | { type: 'task-list'; statusKey: string; teamIds: string[] | null }
  | { type: 'handoff-requirements'; teamId: string }
  | { type: 'request-delete-task'; taskId: string }
  | { type: 'delete-request-detail'; requestId: string }
  | { type: 'add-project'; defaultStage?: import('../types').BusinessStage }
  | { type: 'project-detail'; projectId: string }
  | { type: 'project-advance'; projectId: string }
  | { type: 'project-approval'; projectId: string }
  | { type: 'all-projects' }
  | { type: 'approval-templates' }
  | { type: 'project-completion'; projectId: string }
  | { type: 'kanban-config'; teamId: string }
  | { type: 'segment-request'; teamId: string; action: 'add' | 'remove'; columnId?: string }
  | { type: 'segment-request-detail'; requestId: string }
  | { type: 'promote-stage'; taskId: string }
  | { type: 'division-workflow'; teamId: string }

interface UIState {
  view: PageView
  setView: (v: PageView) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void

  activityLogOpen: boolean
  toggleActivityLog: () => void
  setActivityLogOpen: (open: boolean) => void

  notificationOpen: boolean
  toggleNotification: () => void
  setNotificationOpen: (open: boolean) => void

  filters: Filters
  setSearch: (q: string) => void
  togglePriority: (p: import('../types').Priority) => void
  toggleTeamFilter: (id: string) => void
  toggleStatusFilter: (s: import('../types').Status) => void
  setProjectFilter: (projectId: string | null) => void
  resetFilters: () => void

  /** Stage L0 yang dipilih saat masuk Board Divisi via klik stage column. */
  boardStageContext: import('../types').BusinessStage | null
  setBoardStageContext: (s: import('../types').BusinessStage | null) => void

  sidebarTeamFilter: string | null
  setSidebarTeamFilter: (id: string | null) => void

  modal: ModalType | null
  openModal: (m: ModalType) => void
  closeAllModals: () => void

  searchFocusToken: number
  focusSearch: () => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'project-board',
  setView: (v) => set({ view: v }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  activityLogOpen: false,
  toggleActivityLog: () => set((s) => ({ activityLogOpen: !s.activityLogOpen })),
  setActivityLogOpen: (open) => set({ activityLogOpen: open }),

  notificationOpen: false,
  toggleNotification: () => set((s) => ({ notificationOpen: !s.notificationOpen })),
  setNotificationOpen: (open) => set({ notificationOpen: open }),

  filters: { search: '', priorities: [], teamIds: [], statuses: [], projectId: null },
  setSearch: (q) => set((s) => ({ filters: { ...s.filters, search: q } })),
  setProjectFilter: (projectId) => set((s) => ({ filters: { ...s.filters, projectId } })),
  togglePriority: (p) =>
    set((s) => ({
      filters: {
        ...s.filters,
        priorities: s.filters.priorities.includes(p)
          ? s.filters.priorities.filter((x) => x !== p)
          : [...s.filters.priorities, p],
      },
    })),
  toggleTeamFilter: (id) =>
    set((s) => ({
      filters: {
        ...s.filters,
        teamIds: s.filters.teamIds.includes(id)
          ? s.filters.teamIds.filter((x) => x !== id)
          : [...s.filters.teamIds, id],
      },
    })),
  toggleStatusFilter: (st) =>
    set((s) => ({
      filters: {
        ...s.filters,
        statuses: s.filters.statuses.includes(st)
          ? s.filters.statuses.filter((x) => x !== st)
          : [...s.filters.statuses, st],
      },
    })),
  resetFilters: () => set({ filters: { search: '', priorities: [], teamIds: [], statuses: [], projectId: null }, sidebarTeamFilter: null }),

  sidebarTeamFilter: null,
  setSidebarTeamFilter: (id) => set({ sidebarTeamFilter: id }),

  boardStageContext: null,
  setBoardStageContext: (s) => set({ boardStageContext: s }),

  modal: null,
  openModal: (m) => set({ modal: m }),
  closeAllModals: () => set({ modal: null }),

  searchFocusToken: 0,
  focusSearch: () => set((s) => ({ searchFocusToken: s.searchFocusToken + 1 })),
}))
