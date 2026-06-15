import { Modal } from '../ui/Modal'

const SHORTCUTS: Array<{ keys: string[]; desc: string }> = [
  { keys: ['⌘', 'K'], desc: 'Fokus ke kotak pencarian' },
  { keys: ['⌘', 'N'], desc: 'Buka modal tambah tugas' },
  { keys: ['⌘', 'B'], desc: 'Pindah ke tampilan Board' },
  { keys: ['⌘', 'D'], desc: 'Pindah ke tampilan Dashboard' },
  { keys: ['Esc'], desc: 'Tutup modal yang sedang terbuka' },
  { keys: ['?'], desc: 'Tampilkan daftar shortcut ini' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function ShortcutsModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" description="Akselerasi alur kerja Anda" size="md">
      <ul className="divide-y divide-border-subtle">
        {SHORTCUTS.map((s) => (
          <li key={s.desc} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-ink-secondary">{s.desc}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="rounded-md border border-border bg-bg-elevated px-2 py-0.5 text-[11px] font-mono text-ink-primary"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-tertiary">
        Pada Windows, gunakan <kbd className="font-mono">Ctrl</kbd> sebagai pengganti <kbd className="font-mono">⌘</kbd>.
      </p>
    </Modal>
  )
}
