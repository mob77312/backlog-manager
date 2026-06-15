import { Dialog, Transition } from '@headlessui/react'
import { Fragment, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { classNames } from '../../utils/helpers'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  footer?: ReactNode
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-[680px]',
  '2xl': 'max-w-[920px]',
  '3xl': 'max-w-[1100px]',
}

export function Modal({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={classNames(
                  'w-full rounded-2xl glass shadow-modal text-ink-primary overflow-hidden flex flex-col max-h-[92vh]',
                  SIZES[size],
                )}
              >
                {(title || description) && (
                  <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-4 sm:p-5 shrink-0">
                    <div className="min-w-0">
                      {title && <Dialog.Title className="text-base font-semibold tracking-tight truncate">{title}</Dialog.Title>}
                      {description && <Dialog.Description className="mt-1 text-xs text-ink-secondary line-clamp-2">{description}</Dialog.Description>}
                    </div>
                    <button
                      onClick={onClose}
                      className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.06] hover:text-ink-primary transition shrink-0"
                      aria-label="Tutup"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">{children}</div>
                {footer && <div className="border-t border-border-subtle p-3 sm:p-4 flex items-center justify-end gap-2 shrink-0 flex-wrap">{footer}</div>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
