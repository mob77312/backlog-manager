import type { MasterRole } from '../types'

const SALT = 'flowdesk:v1:'

export function hashPassword(plain: string): string {
  let h = 0x811c9dc5
  const input = SALT + plain
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  let h2 = 0x84222325
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i)
    h2 = Math.imul(h2, 0x01000193)
  }
  return ((h >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'))
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash
}

/**
 * Derive Tailwind classes for a role badge from its color hex.
 * Uses inline style for the bg/border tint; class returned only contains text color anchor.
 */
export function roleToneStyle(role: MasterRole | undefined | null): { className: string; style: React.CSSProperties } {
  const color = role?.color ?? '#64748B'
  return {
    className: 'chip border',
    style: {
      backgroundColor: `${color}1a`,
      color,
      borderColor: `${color}55`,
    },
  }
}

export function roleLabel(role: MasterRole | undefined | null): string {
  return role?.name ?? 'Tanpa Role'
}
