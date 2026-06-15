import { useMemo } from 'react'
import { useTaskStore } from '../../store/useTaskStore'
import { useTeamStore } from '../../store/useTeamStore'
import { Building2 } from 'lucide-react'
import { classNames } from '../../utils/helpers'

export function DepartmentHeatmap() {
  const allTasks = useTaskStore((s) => s.tasks)
  const teams = useTeamStore((s) => s.teams)

  const { rows, maxCount } = useMemo(() => {
    const r = teams.map((team) => {
      const departments = (team.departments ?? []).map((dept) => {
        const count = allTasks.filter((t) => t.teamId === team.id && t.departmentId === dept.id && t.status !== 'done').length
        return { id: dept.id, name: dept.name, count }
      })
      const noDeptCount = allTasks.filter((t) => t.teamId === team.id && !t.departmentId && t.status !== 'done').length
      return { team, departments, noDeptCount }
    })
    const allCounts = r.flatMap((x) => [...x.departments.map((d) => d.count), x.noDeptCount])
    const max = allCounts.length > 0 ? Math.max(...allCounts) : 0
    return { rows: r, maxCount: max }
  }, [allTasks, teams])

  return (
    <div className="surface rounded-xl p-3 sm:p-4 h-[360px] sm:h-[320px] overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-pertamina-red" />
          <h3 className="text-sm font-semibold text-ink-primary">Beban Team per Divisi</h3>
        </div>
        <span className="text-[11px] text-ink-tertiary">Tugas aktif</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {rows.length === 0 ? (
          <div className="text-center text-[11px] text-ink-tertiary py-8">Belum ada divisi</div>
        ) : (
          rows.map(({ team, departments, noDeptCount }) => (
            <div key={team.id} className="rounded-lg border border-border-subtle bg-white p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                <span className="font-mono text-[10px] font-bold" style={{ color: team.color }}>{team.acronym}</span>
                <span className="text-[11px] text-ink-secondary truncate">{team.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {departments.length === 0 && noDeptCount === 0 ? (
                  <span className="text-[10px] text-ink-tertiary italic">Belum ada team</span>
                ) : (
                  <>
                    {departments.map((d) => {
                      const intensity = maxCount > 0 ? d.count / maxCount : 0
                      return (
                        <div
                          key={d.id}
                          className={classNames(
                            'rounded-md border px-2 py-1 text-[11px] flex items-center gap-1.5',
                            d.count === 0 ? 'border-border-subtle bg-white text-ink-tertiary' : 'border-transparent',
                          )}
                          style={
                            d.count > 0
                              ? {
                                  backgroundColor: `rgba(227, 30, 36, ${0.08 + intensity * 0.4})`,
                                  color: intensity > 0.55 ? '#ffffff' : '#9F1019',
                                  borderColor: 'rgba(227, 30, 36, 0.18)',
                                }
                              : undefined
                          }
                          title={`${team.acronym} / ${d.name}: ${d.count} tugas aktif`}
                        >
                          <span className="font-medium">{d.name}</span>
                          <span className="font-mono font-bold tabular-nums">{d.count}</span>
                        </div>
                      )
                    })}
                    {noDeptCount > 0 && (
                      <div className="rounded-md border border-dashed border-ink-tertiary/30 bg-white px-2 py-1 text-[11px] flex items-center gap-1.5 text-ink-tertiary italic">
                        Tanpa team
                        <span className="font-mono font-bold tabular-nums">{noDeptCount}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
