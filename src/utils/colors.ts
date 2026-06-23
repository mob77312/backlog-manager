import type { Priority, Status, ActivityType, BusinessStage, ApprovalStepType, ApprovalStepStatus, ProjectStatus, AttachmentCategory, RiskLevel, RiskSeverity, RiskStatus } from '../types'

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string; ring?: string }> = {
  critical: { bg: 'bg-priority-critical', text: 'text-white', border: 'border-priority-critical', ring: 'shadow-glow-danger' },
  high: { bg: 'bg-accent-orange', text: 'text-white', border: 'border-accent-orange' },
  medium: { bg: 'bg-priority-medium', text: 'text-white', border: 'border-priority-medium' },
  low: { bg: 'bg-priority-low', text: 'text-white', border: 'border-priority-low' },
}

export const PRIORITY_HEX: Record<Priority, string> = {
  critical: '#E31E24',
  high: '#ea580c',
  medium: '#d97706',
  low: '#059669',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
}

/**
 * Universal status keys + label/hex defaults. Tiap divisi bisa override
 * label/warna per kolomnya, tapi key-nya tetap untuk mapping handoff.
 */
export const UNIVERSAL_STATUS_KEYS = ['backlog', 'in_progress', 'review', 'done', 'cancel', 'operate'] as const
export type UniversalStatusKey = typeof UNIVERSAL_STATUS_KEYS[number]

export const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Dikerjakan',
  review: 'Review',
  done: 'Selesai',
  cancel: 'Cancel',
  operate: 'Operate',
}

export const STATUS_HEX: Record<string, string> = {
  backlog: '#64748b',
  in_progress: '#2563eb',
  review: '#d97706',
  done: '#059669',
  cancel: '#ef4444',
  operate: '#0891b2',
}

export const STATUS_COLORS: Record<string, { dot: string; bar: string; ring: string; chip: string }> = {
  backlog: { dot: 'bg-status-backlog', bar: 'from-slate-100 via-slate-50 to-transparent', ring: 'border-slate-200', chip: 'bg-slate-100 text-slate-700' },
  in_progress: { dot: 'bg-status-in_progress', bar: 'from-blue-100 via-blue-50 to-transparent', ring: 'border-blue-200', chip: 'bg-blue-100 text-blue-700' },
  review: { dot: 'bg-status-review', bar: 'from-amber-100 via-amber-50 to-transparent', ring: 'border-amber-200', chip: 'bg-amber-100 text-amber-700' },
  done: { dot: 'bg-status-done', bar: 'from-emerald-100 via-emerald-50 to-transparent', ring: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-700' },
  cancel: { dot: 'bg-red-500', bar: 'from-red-100 via-red-50 to-transparent', ring: 'border-red-200', chip: 'bg-red-100 text-red-700' },
  operate: { dot: 'bg-status-operate', bar: 'from-cyan-100 via-cyan-50 to-transparent', ring: 'border-cyan-200', chip: 'bg-cyan-100 text-cyan-700' },
}

/** Resolver dengan fallback untuk custom column key. */
export function statusLabel(s: Status, fallback?: string): string {
  return STATUS_LABELS[s] ?? fallback ?? s
}
export function statusHex(s: Status, fallback = '#94a3b8'): string {
  return STATUS_HEX[s] ?? fallback
}

/* ============================================================
 *  L0 BUSINESS STAGE — Board Utama
 * ============================================================ */

export const STAGE_KEYS: BusinessStage[] = [
  'lead_to_active',
  'plan_to_build',
  'build_to_operate',
  'operate_to_assure',
  'close',
]

export const STAGE_LABELS: Record<BusinessStage, string> = {
  lead_to_active: 'Lead to Active',
  plan_to_build: 'Plan to Build',
  build_to_operate: 'Build to Operate',
  operate_to_assure: 'Operate to Assure',
  close: 'Close',
}

export const STAGE_SHORT_LABELS: Record<BusinessStage, string> = {
  lead_to_active: 'Lead',
  plan_to_build: 'Plan',
  build_to_operate: 'Build',
  operate_to_assure: 'Operate',
  close: 'Close',
}

export const STAGE_HEX: Record<BusinessStage, string> = {
  lead_to_active: '#7c3aed',     // ungu
  plan_to_build: '#2563eb',      // biru
  build_to_operate: '#ea580c',   // oranye
  operate_to_assure: '#0891b2',  // cyan
  close: '#059669',              // hijau
}

export const STAGE_DESCRIPTIONS: Record<BusinessStage, string> = {
  lead_to_active: 'Identifikasi peluang, kualifikasi prospek, hingga deal aktif.',
  plan_to_build: 'Perencanaan, desain solusi, dan persiapan pelaksanaan.',
  build_to_operate: 'Eksekusi pembangunan/implementasi sampai siap operasional.',
  operate_to_assure: 'Operasi berkelanjutan, maintenance, monitoring SLA.',
  close: 'Penutupan kontrak, serah-terima akhir, dokumentasi closure.',
}

/** Default weight (jumlah = 100). */
export const STAGE_DEFAULT_WEIGHTS: Record<BusinessStage, number> = {
  lead_to_active: 10,
  plan_to_build: 25,
  build_to_operate: 30,
  operate_to_assure: 30,
  close: 5,
}

/** Template bobot preset untuk modal create project. */
export const PROJECT_WEIGHT_TEMPLATES: Array<{
  key: string
  label: string
  description: string
  weights: Record<BusinessStage, number>
}> = [
  {
    key: 'standard',
    label: 'Standard',
    description: 'Bobot merata untuk project umum.',
    weights: { lead_to_active: 10, plan_to_build: 25, build_to_operate: 30, operate_to_assure: 30, close: 5 },
  },
  {
    key: 'pro_service',
    label: 'Pro Service (Pengadaan + Maintenance)',
    description: 'Contoh: Radio Trunking PHE. Berat di build & operate.',
    weights: { lead_to_active: 0, plan_to_build: 20, build_to_operate: 35, operate_to_assure: 40, close: 5 },
  },
  {
    key: 'maintenance',
    label: 'Maintenance Only',
    description: 'Project khusus operasional/SLA berkelanjutan.',
    weights: { lead_to_active: 0, plan_to_build: 0, build_to_operate: 0, operate_to_assure: 95, close: 5 },
  },
  {
    key: 'delivery',
    label: 'Delivery Only',
    description: 'Project pengadaan/pembangunan tanpa fase operate.',
    weights: { lead_to_active: 5, plan_to_build: 30, build_to_operate: 60, operate_to_assure: 0, close: 5 },
  },
]

export const TEAM_COLOR_PALETTE = [
  '#E31E24', '#B6171C', '#002F6C', '#009A4E',
  '#1E40AF', '#7C3AED', '#0891B2', '#059669',
  '#EA580C', '#D97706', '#DB2777', '#0F172A',
]

export const ACTIVITY_TYPE_META: Record<ActivityType, { color: string; icon: string }> = {
  task_created: { color: 'text-emerald-700', icon: 'plus' },
  task_moved: { color: 'text-blue-700', icon: 'move' },
  task_done: { color: 'text-emerald-700', icon: 'check' },
  task_deleted: { color: 'text-pertamina-red', icon: 'trash' },
  handoff: { color: 'text-violet-700', icon: 'arrow' },
  team_added: { color: 'text-cyan-700', icon: 'users-plus' },
  team_removed: { color: 'text-pertamina-red', icon: 'users-minus' },
  task_edited: { color: 'text-amber-700', icon: 'edit' },
  user_login: { color: 'text-blue-700', icon: 'login' },
  user_logout: { color: 'text-slate-600', icon: 'logout' },
  user_invited: { color: 'text-emerald-700', icon: 'user-plus' },
  user_removed: { color: 'text-pertamina-red', icon: 'user-minus' },
  user_role_changed: { color: 'text-amber-700', icon: 'shield' },
  handoff_requested: { color: 'text-amber-700', icon: 'inbox' },
  handoff_approved_origin: { color: 'text-emerald-700', icon: 'check' },
  handoff_rejected_origin: { color: 'text-pertamina-red', icon: 'x' },
  handoff_confirmed_target: { color: 'text-emerald-700', icon: 'check' },
  handoff_rejected_target: { color: 'text-pertamina-red', icon: 'x' },
  delete_requested: { color: 'text-pertamina-red', icon: 'trash' },
  delete_approved: { color: 'text-pertamina-red', icon: 'trash' },
  delete_rejected: { color: 'text-slate-600', icon: 'x' },
  project_created: { color: 'text-violet-700', icon: 'plus' },
  project_stage_advanced: { color: 'text-blue-700', icon: 'arrow' },
  project_stage_sentback: { color: 'text-amber-700', icon: 'arrow' },
  project_closed: { color: 'text-emerald-700', icon: 'check' },
  project_weights_changed: { color: 'text-amber-700', icon: 'edit' },
  segment_change_requested: { color: 'text-amber-700', icon: 'inbox' },
  segment_change_approved: { color: 'text-emerald-700', icon: 'check' },
  segment_change_rejected: { color: 'text-pertamina-red', icon: 'x' },
  project_submitted_for_approval: { color: 'text-amber-700', icon: 'inbox' },
  project_approval_step_approved: { color: 'text-emerald-700', icon: 'check' },
  project_approval_step_rejected: { color: 'text-pertamina-red', icon: 'x' },
  project_activated: { color: 'text-emerald-700', icon: 'check' },
  project_approval_rejected: { color: 'text-pertamina-red', icon: 'x' },
  task_attachment_added: { color: 'text-blue-700', icon: 'paperclip' },
  task_attachment_removed: { color: 'text-pertamina-red', icon: 'paperclip' },
  task_attachment_version_added: { color: 'text-violet-700', icon: 'paperclip' },
  project_kickoff_recorded: { color: 'text-blue-700', icon: 'flag' },
  project_risk_added: { color: 'text-pertamina-red', icon: 'alert' },
  project_risk_updated: { color: 'text-amber-700', icon: 'alert' },
  project_risk_removed: { color: 'text-slate-600', icon: 'alert' },
  project_completion_recorded: { color: 'text-emerald-700', icon: 'check' },
}

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

/* ============================================================
 *  PROJECT APPROVAL FLOW — Labels & Colors
 * ============================================================ */

export const APPROVAL_STEP_LABELS: Record<ApprovalStepType, string> = {
  creator_submit: 'Submit oleh Creator',
  kadiv_approval: 'Persetujuan Kadiv',
  kickoff_meeting: 'Kickoff Meeting',
  risk_assessment: 'Risk Assessment',
  osm_approval: 'OSM Approval',
  dmo_approval: 'DMO Approval',
}

export const APPROVAL_STEP_STATUS_LABELS: Record<ApprovalStepStatus, string> = {
  pending: 'Menunggu',
  in_review: 'Sedang Review',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  skipped: 'Dilewati',
}

export const APPROVAL_STEP_STATUS_COLORS: Record<ApprovalStepStatus, string> = {
  pending: '#94a3b8',
  in_review: '#d97706',
  approved: '#059669',
  rejected: '#ef4444',
  skipped: '#cbd5e1',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Approval',
  active: 'Aktif',
  on_hold: 'On Hold',
  completed: 'Selesai',
  closed: 'Closed',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: '#94a3b8',
  pending_approval: '#d97706',
  active: '#059669',
  on_hold: '#475569',
  completed: '#059669',
  closed: '#0891b2',
  cancelled: '#64748b',
  rejected: '#ef4444',
}

/* ============================================================
 *  TASK ATTACHMENTS (P2)
 * ============================================================ */

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  reference: 'Reference',
  execution: 'Execution',
  evidence: 'Evidence',
  result: 'Result',
}

export const ATTACHMENT_CATEGORY_DESCRIPTIONS: Record<AttachmentCategory, string> = {
  reference: 'Dokumen acuan: BOQ, RAB, kontrak draft, spek teknis, surat penugasan.',
  execution: 'File kerja: desain, draft BAST, working document, source design.',
  evidence: 'Bukti pelaksanaan: foto sitevisit, video instalasi, screenshot progress.',
  result: 'Output final: BAST final, dokumen hand-over, laporan closing.',
}

export const ATTACHMENT_CATEGORY_COLORS: Record<AttachmentCategory, { hex: string; bg: string; text: string; border: string }> = {
  reference: { hex: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  execution: { hex: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  evidence: { hex: '#7c3aed', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  result: { hex: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

export const ATTACHMENT_CATEGORY_KEYS: AttachmentCategory[] = ['reference', 'execution', 'evidence', 'result']

/** Limit per file (20 MB) — sesuai keputusan user. */
export const ATTACHMENT_MAX_FILE_BYTES = 20 * 1024 * 1024
/** Limit total file per project (50). */
export const ATTACHMENT_MAX_FILES_PER_PROJECT = 50

/* ============================================================
 *  RISK REGISTER (P5)
 * ============================================================ */

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  extreme: 'Ekstrem',
}

export const RISK_SEVERITY_HEX: Record<RiskSeverity, string> = {
  low: '#059669',
  medium: '#d97706',
  high: '#ea580c',
  extreme: '#E31E24',
}

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Terbuka',
  mitigated: 'Termitigasi',
  accepted: 'Diterima',
  closed: 'Ditutup',
}

export const RISK_STATUS_HEX: Record<RiskStatus, string> = {
  open: '#E31E24',
  mitigated: '#d97706',
  accepted: '#0891b2',
  closed: '#64748b',
}
