import { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTaskStore } from '../../store/useTaskStore'
import { PRIORITY_HEX, PRIORITY_LABELS } from '../../utils/colors'
import type { Priority } from '../../types'

const ORDER: Priority[] = ['critical', 'high', 'medium', 'low']

export function PriorityDistribution() {
  const allTasks = useTaskStore((s) => s.tasks)

  const data = useMemo(() => {
    const active = allTasks.filter((t) => t.status !== 'done')
    return ORDER.map((p) => ({
      name: PRIORITY_LABELS[p],
      value: active.filter((t) => t.priority === p).length,
      color: PRIORITY_HEX[p],
    })).filter((d) => d.value > 0)
  }, [allTasks])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Distribusi Prioritas</h3>
        <span className="text-[11px] text-ink-tertiary">Tugas aktif</span>
      </div>
      <div className="h-[260px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-ink-tertiary">Tidak ada tugas aktif</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                labelStyle={{ color: '#475569' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
