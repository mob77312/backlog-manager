import { useEffect } from 'react'
import { useUIStore } from '../store/useUIStore'

export function useKeyboardShortcuts() {
  const setView = useUIStore((s) => s.setView)
  const openModal = useUIStore((s) => s.openModal)
  const closeAllModals = useUIStore((s) => s.closeAllModals)
  const focusSearch = useUIStore((s) => s.focusSearch)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      const meta = e.ctrlKey || e.metaKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        focusSearch()
        return
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openModal({ type: 'add-task' })
        return
      }
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setView('board')
        return
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setView('dashboard')
        return
      }
      if (e.key === 'Escape') {
        closeAllModals()
        return
      }
      if (e.key === '?' && !inField) {
        e.preventDefault()
        openModal({ type: 'shortcuts' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setView, openModal, closeAllModals, focusSearch])
}
