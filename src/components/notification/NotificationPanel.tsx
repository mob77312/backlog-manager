import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, CheckCircle2, CheckCheck, Inbox, Trash2, X } from 'lucide-react'
import { useNotificationStore, type Notification } from '../../store/useNotificationStore'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { classNames, relativeTime } from '../../utils/helpers'

const CATEGORY_META: Record<Notification['category'], { color: string; bg: string; label: string }> = {
  project_submitted: { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Project Submitted' },
  project_approval_needed: { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Need Approval' },
  project_step_approved: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Step Approved' },
  project_step_rejected: { color: 'text-pertamina-red', bg: 'bg-pertamina-red-50', label: 'Step Rejected' },
  project_activated: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Project Aktif' },
  task_assigned: { color: 'text-blue-700', bg: 'bg-blue-50', label: 'Task Assigned' },
  task_evidence_missing: { color: 'text-pertamina-red', bg: 'bg-pertamina-red-50', label: 'Evidence Missing' },
  handoff_pending: { color: 'text-violet-700', bg: 'bg-violet-50', label: 'Handoff' },
  system: { color: 'text-ink-secondary', bg: 'bg-slate-50', label: 'System' },
}

export function NotificationPanel() {
  const open = useUIStore((s) => s.notificationOpen)
  const setOpen = useUIStore((s) => s.setNotificationOpen)
  const { user } = usePermissions()
  const allNotifs = useNotificationStore((s) => s.notifications)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const clear = useNotificationStore((s) => s.clear)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const openModal = useUIStore((s) => s.openModal)

  const notifs = user
    ? allNotifs.filter((n) => n.targetUserId === null || n.targetUserId === user.id)
    : []
  const unreadCount = notifs.filter((n) => !n.read).length

  const handleClick = (n: Notification) => {
    markRead(n.id)
    if (n.link?.kind === 'project') openModal({ type: 'project-detail', projectId: n.link.projectId })
    else if (n.link?.kind === 'task') openModal({ type: 'detail-task', taskId: n.link.taskId })
    else if (n.link?.kind === 'approval-queue') openModal({ type: 'approval-queue' })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            className="fixed right-0 top-0 z-40 flex h-full w-[360px] max-w-[100vw] flex-col border-l border-border-subtle glass shadow-modal"
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bell size={14} className="text-pertamina-red" />
                  Notifikasi
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-pertamina-red px-1.5 py-0 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-tertiary">{notifs.length} entri</div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => user && markAllRead(user.id)}
                    className="rounded-md border border-border bg-black/[0.04] p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-black/[0.06] transition"
                    title="Tandai semua dibaca"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                {notifs.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Hapus semua notifikasi?')) clearAll()
                    }}
                    className="rounded-md border border-border bg-black/[0.04] p-1.5 text-ink-secondary hover:text-pertamina-red hover:bg-black/[0.06] transition"
                    title="Hapus semua"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-ink-tertiary hover:bg-black/[0.06] hover:text-ink-primary transition"
                >
                  <X size={14} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-[11px] text-ink-tertiary py-10">
                  <BellOff size={24} className="mb-2 opacity-50" />
                  Belum ada notifikasi
                </div>
              ) : (
                notifs.map((n) => {
                  const meta = CATEGORY_META[n.category]
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={classNames(
                        'group cursor-pointer rounded-lg border px-2.5 py-2 hover:border-pertamina-red/40 transition',
                        n.read
                          ? 'border-border-subtle bg-white'
                          : 'border-pertamina-red/30 bg-pertamina-red-50/30',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={classNames('mt-0.5 grid h-6 w-6 place-items-center rounded-md shrink-0', meta.bg, meta.color)}>
                          {n.category === 'project_step_rejected' || n.category === 'task_evidence_missing'
                            ? <X size={12} />
                            : n.category === 'project_activated' || n.category === 'project_step_approved'
                              ? <CheckCircle2 size={12} />
                              : <Inbox size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-1.5">
                            <div className="flex-1 text-[12px] font-medium text-ink-primary leading-snug">
                              {n.title}
                            </div>
                            {!n.read && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-pertamina-red shrink-0" />}
                          </div>
                          <div className="mt-0.5 text-[11px] text-ink-secondary leading-snug line-clamp-2">{n.body}</div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-tertiary">
                            <span className={classNames('rounded px-1 py-0 font-semibold', meta.bg, meta.color)}>
                              {meta.label}
                            </span>
                            <span>{relativeTime(n.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            clear(n.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-ink-tertiary hover:text-pertamina-red transition shrink-0"
                          title="Hapus"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
