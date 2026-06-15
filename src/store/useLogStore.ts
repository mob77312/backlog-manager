import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActivityLog, ActivityType } from '../types'
import { nowIso, uid } from '../utils/helpers'
import { SEED_LOGS } from './seed'

const MAX_LOGS = 200

interface LogState {
  logs: ActivityLog[]
  addLog: (entry: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) => void
  clear: () => void
  byType: (type: ActivityType) => ActivityLog[]
}

export const useLogStore = create<LogState>()(
  persist(
    (set, get) => ({
      logs: SEED_LOGS,
      addLog: (entry) =>
        set((s) => ({
          logs: [
            { id: uid('log'), timestamp: entry.timestamp ?? nowIso(), ...entry },
            ...s.logs,
          ].slice(0, MAX_LOGS),
        })),
      clear: () => set({ logs: [] }),
      byType: (type) => get().logs.filter((l) => l.type === type),
    }),
    { name: 'flowdesk:logs' },
  ),
)
