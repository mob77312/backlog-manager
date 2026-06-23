import { useMemo } from 'react'
import type { SCurvePoint } from '../../utils/scurve'

interface Props {
  points: SCurvePoint[]
  /** Tinggi chart dalam px. Width responsif. */
  height?: number
  /** Tampilkan grid horizontal. */
  showGrid?: boolean
}

/** SVG line chart sederhana: planned (abu putus-putus) + actual (merah solid). */
export function SCurveChart({ points, height = 220, showGrid = true }: Props) {
  const { plannedPath, actualPath, lastActual, lastPlanned, xLabels } = useMemo(() => {
    if (points.length < 2) return { plannedPath: '', actualPath: '', lastActual: null, lastPlanned: null, xLabels: [] as Array<{ x: number; label: string }> }
    const W = 1000
    const H = 100
    const padL = 30
    const padR = 10
    const padT = 4
    const padB = 16
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const n = points.length
    const x = (i: number) => padL + (i / (n - 1)) * innerW
    const y = (v: number) => padT + ((100 - v) / 100) * innerH
    const planned = points
      .map((p, i) => (i === 0 ? `M ${x(i)} ${y(p.planned)}` : `L ${x(i)} ${y(p.planned)}`))
      .join(' ')
    const actualPts = points
      .map((p, i) => (p.actual != null ? { i, v: p.actual } : null))
      .filter((p): p is { i: number; v: number } => !!p)
    const actual = actualPts.length >= 2
      ? actualPts
          .map((p, i) => (i === 0 ? `M ${x(p.i)} ${y(p.v)}` : `L ${x(p.i)} ${y(p.v)}`))
          .join(' ')
      : ''
    const lastA = actualPts.length > 0 ? actualPts[actualPts.length - 1] : null
    const lastP = points[points.length - 1]
    // X-axis labels (≤ 5 segments)
    const labelCount = Math.min(5, points.length)
    const step = Math.max(1, Math.floor(points.length / labelCount))
    const labels: Array<{ x: number; label: string }> = []
    for (let i = 0; i < points.length; i += step) {
      const d = new Date(points[i].date)
      labels.push({ x: x(i), label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) })
    }
    return {
      plannedPath: planned,
      actualPath: actual,
      lastActual: lastA ? { x: x(lastA.i), y: y(lastA.v), v: lastA.v } : null,
      lastPlanned: { x: x(points.length - 1), y: y(lastP.planned), v: lastP.planned },
      xLabels: labels,
    }
  }, [points])

  if (points.length < 2) {
    return (
      <div
        className="rounded-lg border border-dashed border-border-subtle bg-bg-column/40 flex items-center justify-center text-[11px] text-ink-tertiary"
        style={{ height }}
      >
        Belum cukup data untuk S-Curve (butuh planned dates)
      </div>
    )
  }

  return (
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ height, width: '100%' }} className="overflow-visible">
      {/* Grid */}
      {showGrid && [0, 25, 50, 75, 100].map((g) => {
        const y = 4 + ((100 - g) / 100) * (100 - 4 - 16)
        return (
          <g key={g}>
            <line x1={30} x2={990} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.4} strokeDasharray="2 2" />
            <text x={4} y={y + 2} fontSize={6} fill="#94a3b8">{g}%</text>
          </g>
        )
      })}
      {/* X labels */}
      {xLabels.map((l, idx) => (
        <text key={idx} x={l.x} y={98} fontSize={5} fill="#94a3b8" textAnchor="middle">
          {l.label}
        </text>
      ))}
      {/* Planned (dashed slate) */}
      <path d={plannedPath} fill="none" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 3" />
      {/* Actual (solid red) */}
      {actualPath && <path d={actualPath} fill="none" stroke="#E31E24" strokeWidth={1.8} />}
      {/* Last point markers */}
      {lastPlanned && (
        <circle cx={lastPlanned.x} cy={lastPlanned.y} r={1.6} fill="#94a3b8" />
      )}
      {lastActual && (
        <>
          <circle cx={lastActual.x} cy={lastActual.y} r={2.4} fill="#E31E24" />
          <circle cx={lastActual.x} cy={lastActual.y} r={4} fill="#E31E24" fillOpacity={0.2} />
        </>
      )}
      {/* Legend */}
      <g transform="translate(38, 8)">
        <line x1={0} x2={10} y1={2} y2={2} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3 2" />
        <text x={13} y={4} fontSize={6} fill="#475569">Planned</text>
        <line x1={48} x2={58} y1={2} y2={2} stroke="#E31E24" strokeWidth={1.8} />
        <text x={61} y={4} fontSize={6} fill="#475569">Actual</text>
      </g>
    </svg>
  )
}
