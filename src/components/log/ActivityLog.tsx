import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Download, Edit3, Flag, Inbox, LogIn, LogOut, Move, Paperclip, Plus, Shield, Trash2, UserMinus, UserPlus, X } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { useLogStore } from '../../store/useLogStore'
import { ACTIVITY_TYPE_META } from '../../utils/colors'
import { classNames, downloadCsv, relativeTime } from '../../utils/helpers'
import type { ActivityType } from '../../types'

const ICON_MAP: Record<string, React.ReactNode> = {
  plus: <Plus size={12} />,
  move: <Move size={12} />,
  check: <CheckCircle2 size={12} />,
  trash: <Trash2 size={12} />,
  arrow: <ArrowRightLeft size={12} />,
  'users-plus': <UserPlus size={12} />,
  'users-minus': <UserMinus size={12} />,
  edit: <Edit3 size={12} />,
  login: <LogIn size={12} />,
  logout: <LogOut size={12} />,
  'user-plus': <UserPlus size={12} />,
  'user-minus': <UserMinus size={12} />,
  shield: <Shield size={12} />,
  inbox: <Inbox size={12} />,
  paperclip: <Paperclip size={12} />,
  flag: <Flag size={12} />,
  alert: <AlertTriangle size={12} />,
  x: <X size={12} />,
}

const TYPE_LABELS: Record<ActivityType, string> = {
  task_created: 'Tugas Dibuat',
  task_moved: 'Status Pindah',
  task_done: 'Tugas Selesai',
  task_deleted: 'Tugas Dihapus',
  handoff: 'Handoff',
  team_added: 'Tim Ditambah',
  team_removed: 'Tim Dihapus',
  task_edited: 'Tugas Diedit',
  user_login: 'Login',
  user_logout: 'Logout',
  user_invited: 'User Diundang',
  user_removed: 'User Dihapus',
  user_role_changed: 'Role Diubah',
  handoff_requested: 'Handoff Diajukan',
  handoff_approved_origin: 'Disetujui Asal',
  handoff_rejected_origin: 'Ditolak Asal',
  handoff_confirmed_target: 'Dikonfirmasi Tujuan',
  handoff_rejected_target: 'Ditolak Tujuan',
  delete_requested: 'Usul Hapus',
  delete_approved: 'Hapus Disetujui',
  delete_rejected: 'Hapus Ditolak',
  project_created: 'Project Dibuat',
  project_stage_advanced: 'Stage Maju',
  project_stage_sentback: 'Stage Mundur',
  project_closed: 'Project Ditutup',
  project_weights_changed: 'Bobot Diubah',
  segment_change_requested: 'Usul Ubah Kolom',
  segment_change_approved: 'Ubah Kolom Disetujui',
  segment_change_rejected: 'Ubah Kolom Ditolak',
  project_submitted_for_approval: 'Project Submit Approval',
  project_approval_step_approved: 'Approval Step Disetujui',
  project_approval_step_rejected: 'Approval Step Ditolak',
  project_activated: 'Project Aktif',
  project_approval_rejected: 'Project Ditolak',
  task_attachment_added: 'Lampiran Ditambah',
  task_attachment_removed: 'Lampiran Dihapus',
  task_attachment_version_added: 'Versi Lampiran Baru',
  project_kickoff_recorded: 'Kickoff Tercatat',
  project_risk_added: 'Risiko Ditambah',
  project_risk_updated: 'Risiko Diperbarui',
  project_risk_removed: 'Risiko Dihapus',
  project_completion_recorded: 'Form Penyelesaian',
}

const TYPE_FILTERS: ActivityType[] = ['handoff_requested', 'handoff_approved_origin', 'handoff_confirmed_target', 'handoff_rejected_origin', 'handoff_rejected_target', 'delete_requested', 'delete_approved', 'delete_rejected', 'task_created', 'task_moved', 'task_done', 'handoff', 'task_edited', 'task_deleted', 'team_added', 'team_removed', 'user_invited', 'user_removed', 'user_role_changed']

export function ActivityLogPanel() {
  const open = useUIStore((s) => s.activityLogOpen)
  const setOpen = useUIStore((s) => s.setActivityLogOpen)
  const logs = useLogStore((s) => s.logs)
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')

  const filtered = useMemo(() => (filter === 'all' ? logs : logs.filter((l) => l.type === filter)), [logs, filter])

  const exportCsv = () => {
    downloadCsv(
      filtered.map((l) => ({
        id: l.id,
        timestamp: l.timestamp,
        type: l.type,
        message: l.message,
        taskId: l.taskId ?? '',
        taskTitle: l.taskTitle ?? '',
        fromTeamId: l.fromTeamId ?? '',
        toTeamId: l.toTeamId ?? '',
      })),
      `activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
    )
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
                <div className="text-sm font-semibold">Activity Log</div>
                <div className="text-[11px] text-ink-tertiary">{filtered.length} entri</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={exportCsv}
                  className="rounded-md border border-border bg-black/[0.04] p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-black/[0.06] transition"
                  title="Export CSV"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-ink-tertiary hover:bg-black/[0.06] hover:text-ink-primary transition"
                >
                  <X size={14} />
                </button>
              </div>
            </header>

            <div className="border-b border-border-subtle px-3 py-2 flex flex-wrap gap-1">
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
                Semua
              </FilterBtn>
              {TYPE_FILTERS.map((t) => (
                <FilterBtn key={t} active={filter === t} onClick={() => setFilter(t)}>
                  {TYPE_LABELS[t]}
                </FilterBtn>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {filtered.length === 0 ? (
                <div className="text-center text-[11px] text-ink-tertiary py-10">Tidak ada entri</div>
              ) : (
                filtered.map((log) => {
                  const meta = ACTIVITY_TYPE_META[log.type]
                  return (
                    <div key={log.id} className="flex items-start gap-2 rounded-md p-1.5 hover:bg-black/[0.04]">
                      <div className={classNames('mt-0.5 grid h-6 w-6 place-items-center rounded-md bg-black/[0.04]', meta.color)}>
                        {ICON_MAP[meta.icon]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-ink-primary leading-snug">{log.message}</div>
                        <div className="text-[10px] text-ink-tertiary">{relativeTime(log.timestamp)}</div>
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

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
        active
          ? 'border-pertamina-red/60 bg-pertamina-red-50 text-pertamina-red'
          : 'border-border bg-black/[0.04] text-ink-secondary hover:text-ink-primary hover:bg-black/[0.06]',
      )}
    >
      {children}
    </button>
  )
}
