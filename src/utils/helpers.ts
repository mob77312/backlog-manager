import { differenceInCalendarDays, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

export function relativeTime(value: string | null | undefined): string {
  const d = safeDate(value)
  if (!d) return ''
  return formatDistanceToNow(d, { addSuffix: true, locale: idLocale })
}

export function deadlineLabel(value: string | null): { text: string; tone: 'normal' | 'soon' | 'overdue' | 'today' } {
  const d = safeDate(value)
  if (!d) return { text: 'Tanpa deadline', tone: 'normal' }
  const days = differenceInCalendarDays(d, new Date())
  if (days < 0) return { text: `Terlambat ${Math.abs(days)} hari`, tone: 'overdue' }
  if (days === 0) return { text: 'Hari ini', tone: 'today' }
  if (days === 1) return { text: 'Besok', tone: 'soon' }
  if (days <= 3) return { text: `${days} hari lagi`, tone: 'soon' }
  return { text: `${days} hari lagi`, tone: 'normal' }
}

export function formatDateShort(value: string | null): string {
  const d = safeDate(value)
  if (!d) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null): string {
  const d = safeDate(value)
  if (!d) return '-'
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export function isOverdue(value: string | null): boolean {
  const d = safeDate(value)
  if (!d) return false
  return differenceInCalendarDays(d, new Date()) < 0
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function deriveAcronym(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'TM'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return (words[0][0] + words[1][0] + (words[2]?.[0] ?? '')).toUpperCase().slice(0, 3)
}

export function downloadCsv(rows: Array<Record<string, string | number>>, filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? '')
          if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return `"${v.replace(/"/g, '""')}"`
          }
          return v
        })
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function classNames(...parts: Array<string | number | false | null | undefined>): string {
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' ')
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}
