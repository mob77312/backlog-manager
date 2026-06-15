import { classNames } from '../../utils/helpers'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

const TONE: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'bg-accent-primary',
  success: 'bg-accent-success',
  warning: 'bg-accent-warning',
  danger: 'bg-accent-danger',
}

export function ProgressBar({ value, max, className, tone = 'primary' }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={classNames('h-1 w-full overflow-hidden rounded-full bg-black/[0.06]', className)}>
      <div
        className={classNames('h-full rounded-full transition-all duration-500', TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
