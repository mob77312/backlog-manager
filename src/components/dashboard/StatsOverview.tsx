import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon, CheckCircle2, ClipboardList, Loader2, Inbox, Activity as ActivityIcon } from 'lucide-react'
import { useTaskStore } from '../../store/useTaskStore'
import { useApprovalQueue } from '../../hooks/useApprovalQueue'
import { isOverdue } from '../../utils/helpers'

export function StatsOverview() {
  const tasks = useTaskStore((s) => s.tasks)
  const { actionableCount, myPendingCount } = useApprovalQueue()

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const operate = tasks.filter((t) => t.status === 'operate').length
    const overdue = tasks.filter((t) => t.status !== 'done' && isOverdue(t.deadline)).length
    return { total, done, inProgress, operate, overdue }
  }, [tasks])

  const cards = [
    { label: 'Total Tugas', value: stats.total, icon: <ClipboardList size={16} />, accent: 'from-slate-300 to-transparent', bg: 'bg-slate-100', tone: 'text-slate-700', valueTone: 'text-ink-primary' },
    { label: 'Selesai', value: stats.done, icon: <CheckCircle2 size={16} />, accent: 'from-emerald-400 to-transparent', bg: 'bg-emerald-100', tone: 'text-emerald-700', valueTone: 'text-emerald-700' },
    { label: 'Dalam Proses', value: stats.inProgress, icon: <Loader2 size={16} />, accent: 'from-blue-400 to-transparent', bg: 'bg-blue-100', tone: 'text-blue-700', valueTone: 'text-blue-700' },
    { label: 'Operate', value: stats.operate, icon: <ActivityIcon size={16} />, accent: 'from-cyan-400 to-transparent', bg: 'bg-cyan-100', tone: 'text-cyan-700', valueTone: 'text-cyan-700' },
    { label: 'Terlambat', value: stats.overdue, icon: <AlertOctagon size={16} />, accent: 'from-pertamina-red to-transparent', bg: 'bg-pertamina-red-50', tone: 'text-pertamina-red', valueTone: 'text-pertamina-red' },
    { label: 'Menunggu Approval', value: actionableCount + myPendingCount, icon: <Inbox size={16} />, accent: 'from-violet-400 to-transparent', bg: 'bg-violet-100', tone: 'text-violet-700', valueTone: 'text-violet-700' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="surface relative overflow-hidden rounded-xl p-4"
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.accent}`} />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-tertiary">{c.label}</div>
              <div className={`mt-1.5 text-2xl font-semibold ${c.valueTone}`}>{c.value}</div>
            </div>
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${c.bg} ${c.tone}`}>{c.icon}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
