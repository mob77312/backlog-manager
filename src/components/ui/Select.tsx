import { type SelectHTMLAttributes } from 'react'
import { classNames } from '../../utils/helpers'

interface Option {
  label: string
  value: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: Option[]
  label?: string
}

export function Select({ options, label, className, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>}
      <select {...rest} className={classNames('input-base appearance-none cursor-pointer pr-8', className)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-elevated">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
