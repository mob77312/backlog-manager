import { memo } from 'react'
import type { Priority } from '../../types'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/colors'
import { classNames } from '../../utils/helpers'

interface PriorityBadgeProps {
  priority: Priority
  size?: 'sm' | 'md'
}

export const PriorityBadge = memo(function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const c = PRIORITY_COLORS[priority]
  return (
    <span
      className={classNames(
        'chip',
        c.bg,
        c.text,
        priority === 'critical' && 'shadow-glow-danger',
        size === 'md' && 'px-2.5 py-1 text-[11px]',
      )}
    >
      <span className={classNames('h-1.5 w-1.5 rounded-full bg-white/90')} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
})

interface TeamBadgeProps {
  name: string
  color: string
  acronym: string
}

export const TeamBadge = memo(function TeamBadge({ name, color, acronym }: TeamBadgeProps) {
  return (
    <span
      className="chip border"
      style={{
        backgroundColor: `${color}20`,
        color,
        borderColor: `${color}55`,
      }}
      title={name}
    >
      <span className="font-mono text-[10px]">{acronym}</span>
      <span className="hidden sm:inline">{name}</span>
    </span>
  )
})

interface TagPillProps {
  label: string
  onRemove?: () => void
}

export function TagPill({ label, onRemove }: TagPillProps) {
  return (
    <span className="pill">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 text-ink-tertiary hover:text-accent-danger">
          ×
        </button>
      )}
    </span>
  )
}
