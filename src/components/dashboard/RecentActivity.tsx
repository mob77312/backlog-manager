import { useLogStore } from '../../store/useLogStore'
import { ACTIVITY_TYPE_META } from '../../utils/colors'
import { relativeTime, classNames } from '../../utils/helpers'
import { ArrowRightLeft, CheckCircle2, Edit3, Move, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  plus: <Plus size={12} />,
  move: <Move size={12} />,
  check: <CheckCircle2 size={12} />,
  trash: <Trash2 size={12} />,
  arrow: <ArrowRightLeft size={12} />,
  'users-plus': <UserPlus size={12} />,
  'users-minus': <UserMinus size={12} />,
  edit: <Edit3 size={12} />,
}

export function RecentActivity() {
  const allLogs = useLogStore((s) => s.logs)
  const logs = allLogs.slice(0, 10)

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Aktivitas Terbaru</h3>
        <span className="text-[11px] text-ink-tertiary">10 entri</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {logs.map((log) => {
          const meta = ACTIVITY_TYPE_META[log.type]
          return (
            <div key={log.id} className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-black/[0.04]">
              <div className={classNames('mt-0.5 grid h-6 w-6 place-items-center rounded-md bg-black/[0.04]', meta.color)}>
                {ICON_MAP[meta.icon]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-ink-primary truncate">{log.message}</div>
                <div className="text-[10px] text-ink-tertiary">{relativeTime(log.timestamp)}</div>
              </div>
            </div>
          )
        })}
        {logs.length === 0 && <div className="text-[11px] text-ink-tertiary text-center py-8">Belum ada aktivitas</div>}
      </div>
    </div>
  )
}
