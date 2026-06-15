import { memo } from 'react'
import { classNames } from '../../utils/helpers'

interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
}

const PALETTE = ['#5b6af8', '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#eab308', '#14b8a6']

function colorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export const Avatar = memo(function Avatar({ name, size = 'sm', color }: AvatarProps) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  const dim =
    size === 'xs' ? 'w-5 h-5 text-[9px]' : size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-bg-surface',
        dim,
      )}
      style={{ backgroundColor: color ?? colorFor(name) }}
      title={name}
    >
      {initials}
    </span>
  )
})

interface AvatarStackProps {
  names: string[]
  max?: number
  size?: AvatarProps['size']
}

export function AvatarStack({ names, max = 2, size = 'sm' }: AvatarStackProps) {
  const visible = names.slice(0, max)
  const extra = names.length - visible.length
  return (
    <div className="flex -space-x-1.5">
      {visible.map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-bg-elevated text-[10px] font-semibold text-ink-secondary ring-2 ring-bg-surface w-6 h-6">
          +{extra}
        </span>
      )}
    </div>
  )
}
