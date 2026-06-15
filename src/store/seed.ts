import type { ActivityLog, Department, HandoffRequirementField, RequirementFieldType, Task, Team } from '../types'
import { nowIso } from '../utils/helpers'
import { defaultKanbanConfig, osmKanbanConfig } from '../utils/kanbanDefaults'

const DEFAULT_DIV_WORKFLOW = {
  approverRoleIds: ['team_admin'],
  requireApproval: true,
  autoFlagOnDone: true,
}

const dept = (teamId: string, name: string, description: string): Department => ({
  id: `dept_${teamId.replace('team_', '')}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  teamId,
  name,
  description,
  createdAt: nowIso(),
})

const req = (
  slug: string,
  label: string,
  type: RequirementFieldType,
  required: boolean,
  description = '',
  applicableFromTeamIds: string[] = [],
): HandoffRequirementField => ({
  id: `req_${slug}`,
  label,
  description,
  type,
  required,
  applicableFromTeamIds,
})

export const SEED_TEAMS: Team[] = [
  {
    id: 'team_itd',
    name: 'IT Development',
    color: '#5b6af8',
    acronym: 'ITD',
    description: 'Tim pengembangan aplikasi internal & integrasi sistem.',
    memberCount: 8,
    createdAt: nowIso(),
    kanbanConfig: defaultKanbanConfig(),
    divisionWorkflow: DEFAULT_DIV_WORKFLOW,
    departments: [
      dept('team_itd', 'Frontend', 'UI/UX & web app development.'),
      dept('team_itd', 'Backend', 'API, services, dan database engineering.'),
      dept('team_itd', 'DevOps', 'CI/CD, deployment, dan infrastruktur kode.'),
    ],
    handoffRequirements: [
      req('itd_brd', 'Dokumen Spesifikasi (BRD/SRS)', 'document', true, 'Wajib: file PDF/DOCX yang berisi kebutuhan fungsional & non-fungsional.'),
      req('itd_acceptance', 'Kriteria Acceptance', 'longtext', true, 'List checklist apa yang dianggap "selesai" oleh pemberi tugas.'),
      req('itd_target_date', 'Target Go-Live', 'date', true),
      req('itd_design', 'Mockup / Design Reference', 'url', false, 'Link Figma / Penpot kalau ada.'),
      req('itd_from_qat', 'Bug Defect Report', 'document', true, 'Hanya untuk handoff dari QAT â€” wajib report defect dari hasil testing.', ['team_qat']),
    ],
  },
  {
    id: 'team_net',
    name: 'Network & Infra',
    color: '#8b5cf6',
    acronym: 'NET',
    description: 'Tim infrastruktur jaringan, server, dan keamanan perimeter.',
    memberCount: 5,
    createdAt: nowIso(),
    kanbanConfig: osmKanbanConfig(),
    divisionWorkflow: DEFAULT_DIV_WORKFLOW,
    departments: [
      dept('team_net', 'Server Admin', 'OS, virtualisasi, dan datacenter.'),
      dept('team_net', 'Network Engineering', 'Routing, switching, dan WAN.'),
      dept('team_net', 'Security', 'Firewall, IDS/IPS, dan kepatuhan.'),
    ],
    handoffRequirements: [
      req('net_arch', 'Diagram Arsitektur Jaringan', 'document', true, 'Topologi jaringan target (PDF/PNG/Visio).'),
      req('net_risk', 'Risk Assessment & Mitigasi', 'document', true),
      req('net_window', 'Jadwal Window Pemeliharaan', 'date', true),
      req('net_change_approval', 'Change Request sudah disetujui CAB', 'checkbox', true),
      req('net_rollback', 'Rollback Plan', 'longtext', false),
    ],
  },
  {
    id: 'team_biz',
    name: 'Business Analyst',
    color: '#06b6d4',
    acronym: 'BIZ',
    description: 'Tim analis kebutuhan bisnis & dokumentasi proses.',
    memberCount: 6,
    createdAt: nowIso(),
    kanbanConfig: defaultKanbanConfig(),
    divisionWorkflow: DEFAULT_DIV_WORKFLOW,
    departments: [
      dept('team_biz', 'Process Analysis', 'Pemetaan proses dan BPMN.'),
      dept('team_biz', 'Documentation', 'BRD, SRS, dan dokumentasi standar.'),
      dept('team_biz', 'Stakeholder Mgmt', 'Liaison dengan bisnis & klien.'),
    ],
    handoffRequirements: [
      req('biz_stakeholder', 'Daftar Stakeholder Terlibat', 'longtext', true),
      req('biz_current_doc', 'Dokumen Proses Bisnis Saat Ini (AS-IS)', 'document', false),
      req('biz_target', 'Tujuan / Outcome yang Diharapkan', 'longtext', true),
    ],
  },
  {
    id: 'team_qat',
    name: 'QA & Testing',
    color: '#10b981',
    acronym: 'QAT',
    description: 'Tim quality assurance, regression, dan automated testing.',
    memberCount: 4,
    createdAt: nowIso(),
    kanbanConfig: defaultKanbanConfig(),
    divisionWorkflow: DEFAULT_DIV_WORKFLOW,
    departments: [
      dept('team_qat', 'Manual Testing', 'Eksplorasi & functional testing.'),
      dept('team_qat', 'Automation', 'Otomasi UI & API testing.'),
      dept('team_qat', 'Performance', 'Load, stress, dan benchmark.'),
    ],
    handoffRequirements: [
      req('qat_test_plan', 'Test Plan & Test Cases', 'document', true),
      req('qat_env_ready', 'Lingkungan Testing Siap', 'checkbox', true, 'Konfirmasi staging/UAT sudah deploy versi terbaru.'),
      req('qat_build_url', 'Link Build / APK / URL Deploy', 'url', true),
      req('qat_known_issues', 'Known Issues / Bug Defer List', 'longtext', false),
      req('qat_from_itd', 'API Documentation', 'url', true, 'Hanya untuk handoff dari ITD â€” link Swagger/Postman.', ['team_itd']),
      req('qat_from_net', 'Network Topology Doc', 'document', true, 'Hanya untuk handoff dari NET â€” diagram jaringan yang akan diuji.', ['team_net']),
    ],
  },
]

// Seed tasks & logs sengaja kosong — workflow baru: task lahir dari Backlog
// di Board Divisi via user, tidak ada pre-seeded data demo.
export const SEED_TASKS: Task[] = []

export const SEED_LOGS: ActivityLog[] = []
