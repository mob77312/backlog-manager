import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { classNames } from '../../utils/helpers'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  label?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightSlot, label, hint, className, ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary">{leftIcon}</span>
        )}
        <input
          ref={ref}
          {...rest}
          className={classNames('input-base', leftIcon ? 'pl-9' : null, rightSlot ? 'pr-10' : null, className)}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
      {hint && <span className="mt-1 block text-[11px] text-ink-tertiary">{hint}</span>}
    </label>
  )
})

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>}
      <textarea {...rest} className={classNames('input-base resize-y min-h-[80px]', className)} />
    </label>
  )
}
