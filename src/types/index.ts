export type Priority = 'critical' | 'high' | 'medium' | 'low'
/**
 * Status sekarang adalah string bebas (column key) karena tiap divisi
 * bisa custom kolom kanbannya. Universal columns: backlog, in_progress,
 * review, done, cancel, operate. Custom keys boleh apa saja.
 */
export type Status = string

/** L0 Business Process stages — universal di seluruh sistem. */
export type BusinessStage =
  | 'lead_to_active'
  | 'plan_to_build'
  | 'build_to_operate'
  | 'operate_to_assure'
  | 'close'

export type ActivityType =
  | 'task_created'
  | 'task_moved'
  | 'task_done'
  | 'task_deleted'
  | 'handoff'
  | 'team_added'
  | 'team_removed'
  | 'task_edited'
  | 'user_login'
  | 'user_logout'
  | 'user_invited'
  | 'user_removed'
  | 'user_role_changed'
  | 'handoff_requested'
  | 'handoff_approved_origin'
  | 'handoff_rejected_origin'
  | 'handoff_confirmed_target'
  | 'handoff_rejected_target'
  | 'delete_requested'
  | 'delete_approved'
  | 'delete_rejected'
  | 'project_created'
  | 'project_stage_advanced'
  | 'project_stage_sentback'
  | 'project_closed'
  | 'project_weights_changed'
  | 'segment_change_requested'
  | 'segment_change_approved'
  | 'segment_change_rejected'
  | 'project_submitted_for_approval'
  | 'project_approval_step_approved'
  | 'project_approval_step_rejected'
  | 'project_activated'
  | 'project_approval_rejected'
  | 'task_attachment_added'
  | 'task_attachment_removed'
  | 'task_attachment_version_added'
  | 'project_kickoff_recorded'
  | 'project_risk_added'
  | 'project_risk_updated'
  | 'project_risk_removed'
  | 'project_completion_recorded'

export type Role = string

export type ScopeRestriction = 'own_department' | 'own_division' | 'any'

export interface RolePermissions {
  // Task
  canCreateTask: boolean
  canEditTask: boolean
  canDeleteTask: boolean
  canMoveTask: boolean
  canHandoffTask: boolean
  canCommentTask: boolean
  // Divisi & Team
  canCreateDivision: boolean
  canEditDivision: boolean
  canDeleteDivision: boolean
  canManageDivisionTeams: boolean
  canEditHandoffRequirements: boolean
  // User
  canManageUsers: boolean
  canInviteUsers: boolean
  canDeleteUsers: boolean
  canChangeUserRoles: boolean
  // Master config
  canManageRoles: boolean
  canConfigureWorkflow: boolean
  // Approval / workflow
  canApproveHandoff: boolean
  // Project (Board Utama L0)
  canCreateProject: boolean
  canEditProject: boolean
  canDeleteProject: boolean
  canAdvanceProjectStage: boolean
  canEditProjectWeights: boolean
  canCloseProject: boolean
  // Kanban segment config per-divisi
  canRequestSegmentChange: boolean
  canApproveSegmentChange: boolean
  // Project approval roles (P1 redesign)
  canApproveAsOSM: boolean
  canApproveAsDMO: boolean
  // F2: Kadiv approval khusus untuk project (divisi-scoped, sebelum OSM/DMO)
  canApproveAsKadiv: boolean
}

export interface MasterRole {
  id: string
  name: string
  description: string
  color: string
  rank: number
  isSystem: boolean
  scopeRestriction: ScopeRestriction
  permissions: RolePermissions
}

export interface WorkflowStage {
  id: string
  name: string
  side: 'origin' | 'target'
  approverRoleIds: string[]
  requireAssignment: boolean
}

export interface WorkflowConfig {
  stages: WorkflowStage[]
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  teamId: string | null
  departmentId: string | null
  avatarColor: string
  active: boolean
  createdAt: string
  createdBy: string | null
  lastLoginAt: string | null
}

export interface AuthSession {
  userId: string
  loggedInAt: string
}

export type PermissionAction =
  | 'task.create'
  | 'task.edit'
  | 'task.delete'
  | 'task.requestDelete'
  | 'task.move'
  | 'task.handoff'
  | 'task.comment'
  | 'team.create'
  | 'team.edit'
  | 'team.delete'
  | 'team.manageTeams'
  | 'team.editHandoffRequirements'
  | 'user.manage'
  | 'user.invite'
  | 'user.edit'
  | 'user.delete'
  | 'user.changeRole'
  | 'role.manage'
  | 'workflow.configure'
  | 'project.create'
  | 'project.edit'
  | 'project.delete'
  | 'project.advanceStage'
  | 'project.editWeights'
  | 'project.close'
  | 'segment.request'
  | 'segment.approve'
  | 'project.approveAsOSM'
  | 'project.approveAsDMO'
  | 'project.approveAsKadiv'

export interface PermissionContext {
  teamId?: string | null
  departmentId?: string | null
  targetUserId?: string
  targetRole?: Role
  /** Stage L0 untuk konteks project-related actions */
  stage?: BusinessStage
  /** Daftar teamId owners stage L0 (untuk advance / edit weights / dst) */
  stageOwnerTeamIds?: string[]
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export interface SubTask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
}

export interface HandoffRecord {
  id: string
  fromTeamId: string
  toTeamId: string
  reason: string
  timestamp: string
  by: string
}

/* ============================================================
 *  TASK ATTACHMENTS (P2)
 * ============================================================ */

export type AttachmentCategory = 'reference' | 'execution' | 'evidence' | 'result'

export interface TaskAttachment {
  id: string
  category: AttachmentCategory
  name: string
  description: string
  /** Semver-like string: v1.0, v1.1, v2.0, ... */
  version: string
  /** ID attachment versi sebelumnya (null = versi pertama dari root). */
  versionOfId: string | null
  /** Size in bytes (untuk validasi 20MB/file). */
  size: number
  mimeType: string
  /** Base64 data URL — disimpan inline karena tidak ada backend. */
  dataUrl: string
  uploadedByUserId: string
  uploadedByName: string
  uploadedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  status: Status
  teamId: string
  /** Primary PIC (assignee). */
  assignees: string[]
  /** P2: Co-PIC (pendukung utama PIC). */
  coPics: string[]
  tags: string[]
  deadline: string | null
  createdAt: string
  updatedAt: string
  storyPoints: number
  /** P2: Estimasi durasi dalam hari kerja. Null = belum di-set. */
  estimatedDurationDays: number | null
  /** P2: Apakah task ini milestone penting (akan ditampilkan di S-Curve). */
  isMilestone: boolean
  /** P2: Deliverable utama yang diharapkan dari task ini. */
  deliverable: string
  completedAt: string | null
  handoffHistory: HandoffRecord[]
  /** @deprecated dihitung dari attachments.length */
  attachmentCount: number
  /** P2: Attachment multi-kategori dengan versioning. */
  attachments: TaskAttachment[]
  commentCount: number
  parentTaskId: string | null
  subTasks: SubTask[]
  comments: Comment[]
  departmentId: string | null
  /** Project parent (Board Utama L0). Null kalau task orphan. */
  projectId: string | null
  /** Stage L0 saat task ini dibuat. Null kalau pre-migration. */
  stage: BusinessStage | null
}

export interface Department {
  id: string
  teamId: string
  name: string
  description: string
  createdAt: string
}

export type RequirementFieldType = 'text' | 'longtext' | 'document' | 'url' | 'checkbox' | 'date'

export interface HandoffRequirementField {
  id: string
  label: string
  description: string
  type: RequirementFieldType
  required: boolean
  /**
   * Daftar teamId divisi asal yang dikenai syarat ini.
   * Empty array = berlaku untuk semua divisi asal (default).
   */
  applicableFromTeamIds: string[]
}

export interface FulfilledRequirement {
  fieldId: string
  value: string
  fileName?: string
  fileSize?: number
  fileType?: string
  /**
   * Base64 data URL untuk preview/download (hanya untuk type='document').
   * Disimpan inline di request karena tidak ada backend penyimpanan file.
   */
  fileData?: string
}

export interface KanbanColumn {
  id: string
  key: string                          // identifier kolom, contoh 'backlog' atau 'qa_internal'
  label: string                        // tampilan ke user
  color: string                        // hex
  position: number                     // urutan kiri-ke-kanan
  isSystem: boolean                    // true = Backlog universal, tidak bisa dihapus
  isTerminal: boolean                  // true = state akhir (Selesai/Cancel)
  isInProgress: boolean                // true = ikut dihitung sebagai "sedang dikerjakan" utk progress
  isDone: boolean                      // true = ikut dihitung sebagai "selesai" untuk progress
}

export interface DivisionAdvanceWorkflow {
  /**
   * Role di divisi yang berhak approve "promote stage L0 berikut" untuk task
   * yang sudah masuk kolom Selesai. Default: ['team_admin'] (Kadiv).
   */
  approverRoleIds: string[]
  /**
   * Apakah promote butuh approval di sisi divisi ini sebelum diteruskan.
   * False = otomatis advance, true = generate request.
   */
  requireApproval: boolean
  /**
   * Apakah saat task Selesai, otomatis tag task untuk siap promote.
   */
  autoFlagOnDone: boolean
}

export interface Team {
  id: string
  name: string
  color: string
  acronym: string
  description: string
  memberCount: number
  createdAt: string
  departments: Department[]
  handoffRequirements: HandoffRequirementField[]
  /** Kanban columns kustom per divisi. Migration auto-seed default jika kosong. */
  kanbanConfig: KanbanColumn[]
  /** Workflow approval khusus untuk advance project ke stage L0 berikutnya. */
  divisionWorkflow: DivisionAdvanceWorkflow
}

export type HandoffRequestStatus =
  | 'pending_origin'
  | 'pending_target'
  | 'approved'
  | 'rejected'

export type DeleteRequestStatus = 'pending' | 'approved' | 'rejected'

export interface DeleteRequest {
  id: string
  taskId: string
  taskTitle: string
  taskTeamId: string
  taskDepartmentId: string | null
  reason: string
  requestedByUserId: string
  requestedByName: string
  status: DeleteRequestStatus
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  rejectedReason: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface HandoffRequest {
  id: string
  taskId: string
  taskTitle: string
  fromTeamId: string
  fromDepartmentId: string | null
  toTeamId: string
  toDepartmentId: string | null
  toAssigneeUserId: string | null
  reason: string
  requestedByUserId: string
  requestedByName: string
  status: HandoffRequestStatus
  originReviewedByUserId: string | null
  originReviewedByName: string | null
  originReviewedAt: string | null
  originDecisionNote: string | null
  targetReviewedByUserId: string | null
  targetReviewedByName: string | null
  targetReviewedAt: string | null
  targetDecisionNote: string | null
  rejectedReason: string | null
  rejectedStage: 'origin' | 'target' | null
  createdAt: string
  updatedAt: string
  requirementSnapshot: HandoffRequirementField[]
  fulfillments: FulfilledRequirement[]
  /** Saat approval target, advance task.stage ke stage ini. Null = same-stage handoff. */
  promoteToStage: BusinessStage | null
  /** Saat approval target, set task.status ke 'backlog' di divisi tujuan. */
  resetStatusToBacklog: boolean
}

export interface ActivityLog {
  id: string
  type: ActivityType
  message: string
  taskId: string | null
  taskTitle: string | null
  fromTeamId: string | null
  toTeamId: string | null
  timestamp: string
}

export interface Filters {
  search: string
  priorities: Priority[]
  teamIds: string[]
  statuses: Status[]
  /** Filter project untuk Board Divisi. Null = semua. */
  projectId?: string | null
}

export type PageView = 'project-board' | 'board' | 'dashboard'

/* ============================================================
 *  PROJECT (Board Utama L0)
 * ============================================================ */

export interface ProjectStageConfig {
  stage: BusinessStage
  weight: number                    // 0-100 (total semua stage harus = 100)
  ownerTeamIds: string[]            // bisa multi-divisi per stage
  status: 'not_started' | 'in_progress' | 'done' | 'skipped'
  /**
   * Manual override progress (0-100). Null = hitung otomatis dari tasks.
   */
  progressOverride: number | null
  enteredAt: string | null
  completedAt: string | null
}

export interface ProjectStageTransition {
  id: string
  fromStage: BusinessStage | null
  toStage: BusinessStage
  direction: 'forward' | 'backward'
  byUserId: string
  byName: string
  reason: string
  timestamp: string
}

export type ProjectStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'closed'
  | 'cancelled'
  | 'rejected'

/* ============================================================
 *  PROJECT APPROVAL FLOW (Priority-driven)
 *  P1 Scope: Low/Medium fully wired. High/Critical stub kickoff/risk steps
 *  yang akan diisi penuh di P4 (Kickoff) & P5 (Risk Assessment).
 * ============================================================ */

export type ApprovalStepType =
  | 'creator_submit'
  | 'kadiv_approval'      // Kadiv divisi creator (F2 — internal validation dulu)
  | 'kickoff_meeting'     // HIGH + CRITICAL (P4)
  | 'risk_assessment'     // CRITICAL only (P5)
  | 'osm_approval'
  | 'dmo_approval'

export type ApprovalStepStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'skipped'

export type ApproverRole = 'project_owner' | 'kadiv_approver' | 'osm_approver' | 'dmo_approver' | 'system'

export interface ApprovalStep {
  id: string
  order: number
  type: ApprovalStepType
  label: string
  status: ApprovalStepStatus
  requiredRole: ApproverRole
  /** Komentar wajib (MEDIUM/HIGH/CRITICAL pada OSM/DMO step). */
  requireComment: boolean
  /** Risk acknowledgement checkbox (CRITICAL pada OSM/DMO step). */
  requireRiskAck: boolean
  /** Approval data */
  approvedByUserId: string | null
  approvedByName: string | null
  approvedAt: string | null
  comment: string | null
  riskAcknowledged: boolean
  /** Untuk LOW: checklist "Saya telah mengetahui project ini" */
  acknowledgedChecklist: boolean
  rejectedReason: string | null
}

/* ============================================================
 *  KICKOFF MEETING (P4) — HIGH + CRITICAL priority
 * ============================================================ */

export interface KickoffMeeting {
  /** Tanggal pelaksanaan kickoff. */
  meetingDate: string
  /** Lokasi (fisik atau link virtual). */
  location: string
  /** Daftar attendee (nama, opsional role). */
  attendees: string[]
  /** Agenda diskusi (bullet point per baris). */
  agenda: string
  /** Keputusan utama yang diambil. */
  decisions: string
  /** Catatan tambahan / notulen. */
  notes: string
  /** Action items hasil kickoff. */
  actionItems: string
  recordedByUserId: string
  recordedByName: string
  recordedAt: string
}

/* ============================================================
 *  PROJECT COMPLETION FORM (F4) — wajib saat tutup project
 * ============================================================ */

export type CompletionOutcome = 'successful' | 'partial' | 'cancelled'

export interface CompletionAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  dataUrl: string
}

export interface ProjectCompletion {
  outcome: CompletionOutcome
  /** Tanggal aktual penyelesaian. */
  completionDate: string
  /** Ringkasan deliverable yang diserahkan. */
  deliverableSummary: string
  /** Lessons learned untuk knowledge base. */
  lessonsLearned: string
  /** Stakeholder satisfaction note. */
  stakeholderFeedback: string
  /** Minimal 1 evidence wajib (BAST, foto serah terima, dll). */
  evidence: CompletionAttachment[]
  closedByUserId: string
  closedByName: string
  closedAt: string
}

/* ============================================================
 *  RISK REGISTER (P5) — CRITICAL priority
 * ============================================================ */

export type RiskLevel = 'low' | 'medium' | 'high'
export type RiskSeverity = 'low' | 'medium' | 'high' | 'extreme'
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed'

export interface RiskItem {
  id: string
  /** Kode singkat: R001, R002, dst. */
  code: string
  description: string
  probability: RiskLevel
  impact: RiskLevel
  /** Severity = derived dari probability × impact (auto). */
  severity: RiskSeverity
  mitigationPlan: string
  riskOwner: string
  status: RiskStatus
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  /** Kode project manual, contoh "PGN-RT-PHE-001" */
  code: string
  name: string
  description: string
  customer: string                  // contoh: "PHE", "Indomaret"
  priority: Priority
  status: ProjectStatus
  currentStage: BusinessStage
  stageConfig: ProjectStageConfig[]
  stageHistory: ProjectStageTransition[]
  tags: string[]
  /** Planned dates dari form Create Project (untuk baseline S-Curve). */
  plannedStartDate: string | null
  plannedEndDate: string | null
  /** Actual dates (di-track otomatis dari aktivitas project). */
  actualStartDate: string | null
  actualEndDate: string | null
  /** @deprecated pakai plannedStartDate */
  startDate: string | null
  /** @deprecated pakai plannedEndDate */
  targetCloseDate: string | null
  actualCloseDate: string | null
  /** Approval flow steps — generated saat createProject berdasarkan priority */
  approvalFlow: ApprovalStep[]
  /** P4: Kickoff meeting data (HIGH + CRITICAL). Null = belum direkam. */
  kickoffMeeting: KickoffMeeting | null
  /** P5: Risk register (CRITICAL). Kosong = belum ada item. */
  riskRegister: RiskItem[]
  /** F4: Form penyelesaian project (wajib saat close). Null = belum diselesaikan. */
  completion: ProjectCompletion | null
  createdByUserId: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

/* ============================================================
 *  SEGMENT CHANGE REQUEST (Custom Kanban per Divisi)
 * ============================================================ */

export type SegmentChangeAction = 'add' | 'remove'
export type SegmentChangeStatus = 'pending' | 'approved' | 'rejected'

export interface SegmentChangeRequest {
  id: string
  teamId: string
  teamName: string
  action: SegmentChangeAction
  /** Untuk action='add': data kolom baru. Untuk 'remove': null. */
  newColumn: KanbanColumn | null
  /** Untuk action='remove': id kolom yang dihapus. */
  removeColumnId: string | null
  /** Untuk action='remove': kolom tujuan task yang di-move. */
  moveTasksToColumnKey: string | null
  reason: string
  requestedByUserId: string
  requestedByName: string
  status: SegmentChangeStatus
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  rejectedReason: string | null
  createdAt: string
  updatedAt: string
}

/* ============================================================
 *  WORKFLOW: Stage Owners Mapping (L0 → divisi)
 * ============================================================ */

export type StageOwnerMap = Record<BusinessStage, string[]>  // stage → teamIds
