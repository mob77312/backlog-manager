import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nowIso, uid } from '../utils/helpers'

export type NotificationCategory =
  | 'project_submitted'
  | 'project_approval_needed'
  | 'project_step_approved'
  | 'project_step_rejected'
  | 'project_activated'
  | 'task_assigned'
  | 'task_evidence_missing'
  | 'handoff_pending'
  | 'system'

export interface Notification {
  id: string
  category: NotificationCategory
  title: string
  body: string
  /** Target user id — kalau null, untuk semua user. */
  targetUserId: string | null
  /** Deep-link untuk membuka modal (opsional). */
  link?: { kind: 'project'; projectId: string } | { kind: 'task'; taskId: string } | { kind: 'approval-queue' }
  read: boolean
  createdAt: string
}

interface NotificationState {
  notifications: Notification[]
  /** Tambah notifikasi (otomatis di-prepend ke list). */
  push: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: (forUserId?: string) => void
  clear: (id: string) => void
  clearAll: () => void
  /** Unread count untuk user tertentu. */
  unreadCountFor: (userId: string) => number
  /** Filter notifikasi untuk user (termasuk yg target null = broadcast). */
  forUser: (userId: string) => Notification[]
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      push: (n) => {
        const notif: Notification = {
          ...n,
          id: uid('notif'),
          read: false,
          createdAt: nowIso(),
        }
        set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 100) }))
      },
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllRead: (forUserId) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            !forUserId || n.targetUserId === forUserId || n.targetUserId === null
              ? { ...n, read: true }
              : n,
          ),
        })),
      clear: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      clearAll: () => set({ notifications: [] }),
      unreadCountFor: (userId) => {
        return get().notifications.filter(
          (n) => !n.read && (n.targetUserId === null || n.targetUserId === userId),
        ).length
      },
      forUser: (userId) => {
        return get().notifications.filter(
          (n) => n.targetUserId === null || n.targetUserId === userId,
        )
      },
    }),
    { name: 'flowdesk:notifications' },
  ),
)
