import { useMemo } from 'react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { useHandoffStore } from '../../store/useHandoffStore'
import { ArrowRightLeft } from 'lucide-react'
import { classNames } from '../../utils/helpers'

export function HandoffFlowMatrix() {
  const allTasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)
  const requests = useHandoffStore((s) => s.requests)

  const { matrix, maxCount, totalFlows } = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    teams.forEach((t) => {
      m[t.id] = {}
      teams.forEach((u) => {
        m[t.id][u.id] = 0
      })
    })

    // Count from task handoff history (completed handoffs)
    let total = 0
    allTasks.forEach((task) => {
      task.handoffHistory.forEach((h) => {
        if (m[h.fromTeamId] && m[h.fromTeamId][h.toTeamId] !== undefined) {
          m[h.fromTeamId][h.toTeamId] += 1
          total += 1
        }
      })
    })

    // Count from pending/approved requests
    requests.forEach((r) => {
      if (r.status === 'rejected') return
      if (m[r.fromTeamId] && m[r.fromTeamId][r.toTeamId] !== undefined) {
        m[r.fromTeamId][r.toTeamId] += 1
        total += 1
      }
    })

    let max = 0
    Object.values(m).forEach((row) => {
      Object.values(row).forEach((v) => {
        if (v > max) max = v
      })
    })
    return { matrix: m, maxCount: max, totalFlows: total }
  }, [allTasks, teams, requests])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft size={13} className="text-pertamina-red" />
          <h3 className="text-sm font-semibold text-ink-primary">Alur Handoff Antar Divisi</h3>
        </div>
        <span className="text-[11px] text-ink-tertiary">{totalFlows} total handoff</span>
      </div>

      <div className="flex-1 overflow-auto">
        {teams.length === 0 ? (
          <div className="text-center text-[11px] text-ink-tertiary py-8">Belum ada divisi</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 bg-white px-2 py-1.5 text-left text-[10px] text-ink-tertiary uppercase tracking-widest font-medium z-20">
                  Dari ↓ / Ke →
                </th>
                {teams.map((t) => (
                  <th key={t.id} className="sticky top-0 bg-white px-2 py-1.5 text-center font-mono text-[10px] font-bold z-10" style={{ color: t.color }} title={t.name}>
                    {t.acronym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((from) => (
                <tr key={from.id}>
                  <td className="sticky left-0 bg-white px-2 py-1.5 font-mono text-[10px] font-bold z-10" style={{ color: from.color }} title={from.name}>
                    {from.acronym}
                  </td>
                  {teams.map((to) => {
                    const v = matrix[from.id]?.[to.id] ?? 0
                    const isDiagonal = from.id === to.id
                    const intensity = maxCount > 0 ? v / maxCount : 0
                    return (
                      <td
                        key={to.id}
                        className={classNames(
                          'text-center font-medium tabular-nums px-1 py-1.5 border border-border-subtle',
                          isDiagonal ? 'bg-slate-100 text-ink-tertiary' : v === 0 ? 'bg-white text-ink-tertiary' : '',
                        )}
                        style={
                          !isDiagonal && v > 0
                            ? {
                                backgroundColor: `rgba(227, 30, 36, ${0.08 + intensity * 0.45})`,
                                color: intensity > 0.55 ? '#ffffff' : '#9F1019',
                              }
                            : undefined
                        }
                        title={isDiagonal ? '— internal —' : `${from.acronym} → ${to.acronym}: ${v} handoff`}
                      >
                        {isDiagonal ? '—' : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-tertiary">
        <span>Intensitas:</span>
        <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: 'rgba(227,30,36,0.10)' }} />
        <span>kecil</span>
        <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: 'rgba(227,30,36,0.30)' }} />
        <span>sedang</span>
        <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: 'rgba(227,30,36,0.53)' }} />
        <span>tinggi</span>
      </div>
    </div>
  )
}
