import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { STATUS_HEX, STATUS_LABELS } from '../../utils/colors'
import type { Status } from '../../types'

export function TeamWorkloadChart() {
  const tasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)

  const data = useMemo(() => {
    return teams.map((team) => {
      const row: Record<string, string | number> = { team: team.acronym }
      ;(['backlog', 'in_progress', 'review', 'done', 'operate'] as Status[]).forEach((st) => {
        row[STATUS_LABELS[st]] = tasks.filter((t) => t.teamId === team.id && t.status === st).length
      })
      return row
    })
  }, [tasks, teams])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink-primary">Beban Kerja per Tim</h3>
        <span className="text-[11px] text-ink-tertiary">Stacked by status</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="team" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
              labelStyle={{ color: '#475569' }}
              cursor={{ fill: 'rgba(227,30,36,0.04)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey={STATUS_LABELS.backlog} stackId="a" fill={STATUS_HEX.backlog} radius={[0, 0, 0, 0]} />
            <Bar dataKey={STATUS_LABELS.in_progress} stackId="a" fill={STATUS_HEX.in_progress} />
            <Bar dataKey={STATUS_LABELS.review} stackId="a" fill={STATUS_HEX.review} />
            <Bar dataKey={STATUS_LABELS.done} stackId="a" fill={STATUS_HEX.done} />
            <Bar dataKey={STATUS_LABELS.operate} stackId="a" fill={STATUS_HEX.operate} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
