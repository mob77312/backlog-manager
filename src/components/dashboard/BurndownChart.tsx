import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useTaskStore } from '../../store/useTaskStore'

export function BurndownChart() {
  const tasks = useTaskStore((s) => s.tasks)

  const data = useMemo(() => {
    const days = 30
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - (days - 1))

    const totalActive = tasks.filter((t) => new Date(t.createdAt) <= today).length
    const ideal = (i: number) => Math.max(0, totalActive * (1 - i / (days - 1)))

    return Array.from({ length: days }).map((_, i) => {
      const day = new Date(start)
      day.setDate(day.getDate() + i)

      const created = tasks.filter((t) => new Date(t.createdAt) <= day).length
      const doneByDay = tasks.filter((t) => t.completedAt && new Date(t.completedAt) <= day).length
      const remaining = Math.max(0, created - doneByDay)

      return {
        date: day.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        ideal: Math.round(ideal(i)),
        aktual: remaining,
      }
    })
  }, [tasks])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Burndown Chart</h3>
        <span className="text-[11px] text-ink-tertiary">30 hari terakhir</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} interval={4} />
            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
              labelStyle={{ color: '#475569' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Ideal" />
            <Line type="monotone" dataKey="aktual" stroke="#E31E24" strokeWidth={2.5} dot={false} name="Aktual" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
