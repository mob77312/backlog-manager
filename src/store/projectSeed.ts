import type { Project } from '../types'

/**
 * Seed kosong — proyek lahir organik dari Backlog Board Divisi (via auto-spawn
 * di AddTaskModal saat task pertama dibuat). Tidak ada project pre-seeded
 * supaya state awal bersih dan sesuai mental model user.
 */
export const SEED_PROJECTS: Project[] = []
