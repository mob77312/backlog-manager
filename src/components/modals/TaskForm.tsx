import { useMemo, useState } from 'react'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import type { BusinessStage, Priority, Status, Task } from '../../types'
import { useTeamStore } from '../../store/useTeamStore'
import { useProjectStore } from '../../store/useProjectStore'
import { FIBONACCI_POINTS, PRIORITY_LABELS, STAGE_KEYS, STAGE_LABELS } from '../../utils/colors'
import { defaultKanbanConfig, sortedColumns } from '../../utils/kanbanDefaults'
import { INTERNAL_PROJECT_ID } from '../../utils/constants'
import { TagPill } from '../ui/Badge'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

export interface TaskFormState {
  title: string
  description: string
  priority: Priority
  status: Status
  teamId: string
  departmentId: string | null
  assignees: string[]
  tags: string[]
  deadline: string | null
  storyPoints: number
  projectId: string | null
  stage: BusinessStage | null
}

interface TaskFormProps {
  initial: Partial<Task> & { defaultStatus?: Status; defaultProjectId?: string; defaultStage?: BusinessStage }
  onSubmit: (data: TaskFormState) => void
  onCancel: () => void
  submitLabel?: string
  lockTeam?: boolean
}

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export function TaskForm({ initial, onSubmit, onCancel, submitLabel = 'Simpan', lockTeam = false }: TaskFormProps) {
  const teams = useTeamStore((s) => s.teams)
  const projects = useProjectStore((s) => s.projects)
  const effectiveStage: BusinessStage =
    initial.stage ?? initial.defaultStage ?? 'build_to_operate'
  // Smart-pick project: kalau caller tidak spesifik, cari project yang currentStage cocok stage context
  const smartDefaultProjectId = (() => {
    if (initial.projectId) return initial.projectId
    if (initial.defaultProjectId) return initial.defaultProjectId
    if (initial.defaultStage) {
      const candidate = projects.find(
        (p) => p.currentStage === initial.defaultStage && p.status === 'active' && p.id !== INTERNAL_PROJECT_ID,
      )
      if (candidate) return candidate.id
    }
    return INTERNAL_PROJECT_ID
  })()
  const [state, setState] = useState<TaskFormState>({
    title: initial.title ?? '',
    description: initial.description ?? '',
    priority: initial.priority ?? 'medium',
    status: initial.status ?? initial.defaultStatus ?? 'backlog',
    teamId: initial.teamId ?? teams[0]?.id ?? '',
    departmentId: initial.departmentId ?? null,
    assignees: initial.assignees ?? [],
    tags: initial.tags ?? [],
    deadline: initial.deadline ?? null,
    storyPoints: initial.storyPoints ?? 3,
    projectId: smartDefaultProjectId,
    stage: effectiveStage,
  })
  const [assigneeInput, setAssigneeInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  const update = <K extends keyof TaskFormState>(k: K, v: TaskFormState[K]) =>
    setState((s) => ({ ...s, [k]: v }))

  const currentTeam = useMemo(() => teams.find((t) => t.id === state.teamId), [teams, state.teamId])
  const availableDepts = currentTeam?.departments ?? []
  const teamCols = useMemo(
    () => sortedColumns(currentTeam?.kanbanConfig ?? defaultKanbanConfig()),
    [currentTeam],
  )
  const selectedProject = useMemo(() => projects.find((p) => p.id === state.projectId), [projects, state.projectId])
  const stageMismatch = selectedProject && selectedProject.currentStage !== state.stage
  const projectsAtStage = useMemo(
    () => projects.filter((p) => p.currentStage === state.stage && p.status === 'active'),
    [projects, state.stage],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.title.trim()) {
      toast.error('Judul proyek wajib diisi')
      return
    }
    if (!state.teamId) {
      toast.error('Divisi pemilik wajib dipilih — buka master role kalau Anda Super Admin tanpa divisi')
      return
    }
    onSubmit(state)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <Input
        label="Judul Proyek"
        value={state.title}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Contoh: Pengadaan Radio Trunking PHE"
        required
        autoFocus
      />

      <Textarea
        label="Deskripsi"
        value={state.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="Detail tugas, konteks, dan kriteria selesai..."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label={projectsAtStage.length > 0 ? `Project (${projectsAtStage.length} di stage ini)` : 'Project'}
          value={state.projectId ?? ''}
          onChange={(e) => update('projectId', e.target.value || null)}
          options={[
            // Project di stage ini di-prioritaskan di atas dengan marker ▶
            ...projectsAtStage.map((p) => ({ value: p.id, label: `▶ ${p.code} • ${p.name}` })),
            { value: INTERNAL_PROJECT_ID, label: 'Project Internal PGNCOM' },
            ...projects
              .filter((p) => p.id !== INTERNAL_PROJECT_ID && p.currentStage !== state.stage)
              .map((p) => ({ value: p.id, label: `${p.code} • ${p.name} (${STAGE_LABELS[p.currentStage]})` })),
          ]}
        />
        <Select
          label="Stage L0"
          value={state.stage ?? 'build_to_operate'}
          onChange={(e) => update('stage', e.target.value as BusinessStage)}
          options={STAGE_KEYS.map((k) => ({ value: k, label: STAGE_LABELS[k] }))}
        />
      </div>

      {/* Auto-spawn project: trigger saat user buka modal dari Board Divisi (initial.defaultStage ada)
          dan project masih default internal */}
      {projectsAtStage.length === 0 &&
        state.projectId === INTERNAL_PROJECT_ID &&
        state.stage &&
        !!initial.defaultStage && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-700">
            <span className="mt-0.5">✨</span>
            <div>
              Belum ada project di stage <strong>{STAGE_LABELS[state.stage]}</strong>. Sistem akan otomatis
              membuat <strong>project baru</strong> di Board Utama menggunakan judul tugas ini.
            </div>
          </div>
        )}
      {stageMismatch && state.projectId !== INTERNAL_PROJECT_ID && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
          <span className="mt-0.5">ℹ</span>
          <div>
            Project <strong>{selectedProject?.code}</strong> saat ini di stage{' '}
            <strong>{STAGE_LABELS[selectedProject?.currentStage ?? 'build_to_operate']}</strong>, bukan{' '}
            <strong>{STAGE_LABELS[state.stage ?? 'build_to_operate']}</strong>. Card project tetap muncul di kolom
            stage saat ini di Board Utama.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Prioritas"
          value={state.priority}
          onChange={(e) => update('priority', e.target.value as Priority)}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
        />
        <Select
          label="Status (kolom kanban divisi)"
          value={state.status}
          onChange={(e) => update('status', e.target.value)}
          options={teamCols.map((c) => ({ value: c.key, label: c.label }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={lockTeam ? 'Divisi Pemilik (terkunci ke divisi Anda)' : 'Divisi Pemilik'}
          value={state.teamId}
          disabled={lockTeam}
          onChange={(e) => {
            update('teamId', e.target.value)
            update('departmentId', null)
          }}
          options={teams.map((t) => ({ value: t.id, label: `${t.acronym} • ${t.name}` }))}
        />
        <Select
          label={
            availableDepts.length === 0
              ? 'Team (belum ada team di divisi ini)'
              : 'Team'
          }
          value={state.departmentId ?? ''}
          disabled={availableDepts.length === 0}
          onChange={(e) => update('departmentId', e.target.value || null)}
          options={[
            { value: '', label: availableDepts.length === 0 ? '— Tidak ada team —' : '— Belum ditentukan —' },
            ...availableDepts.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Story Points"
          value={String(state.storyPoints)}
          onChange={(e) => update('storyPoints', parseInt(e.target.value, 10))}
          options={FIBONACCI_POINTS.map((p) => ({ value: String(p), label: `${p} poin` }))}
        />
        <Input
          label="Deadline"
          type="date"
          value={state.deadline ? state.deadline.slice(0, 10) : ''}
          onChange={(e) => update('deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Assignees</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {state.assignees.map((a) => (
            <span key={a} className="pill">
              {a}
              <button
                type="button"
                onClick={() => update('assignees', state.assignees.filter((x) => x !== a))}
                className="ml-1 text-ink-tertiary hover:text-accent-danger"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <input
          className="input-base"
          placeholder="Ketik nama lalu Enter"
          value={assigneeInput}
          onChange={(e) => setAssigneeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && assigneeInput.trim()) {
              e.preventDefault()
              if (!state.assignees.includes(assigneeInput.trim())) {
                update('assignees', [...state.assignees, assigneeInput.trim()])
              }
              setAssigneeInput('')
            }
          }}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Tags</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {state.tags.map((t) => (
            <TagPill key={t} label={t} onRemove={() => update('tags', state.tags.filter((x) => x !== t))} />
          ))}
        </div>
        <input
          className="input-base"
          placeholder="Tambah tag, tekan Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              e.preventDefault()
              if (!state.tags.includes(tagInput.trim())) {
                update('tags', [...state.tags, tagInput.trim()])
              }
              setTagInput('')
            }
          }}
        />
      </div>

      <div className="sticky bottom-0 bg-bg-elevated/80 backdrop-blur pt-3 -mx-1 px-1 flex items-center justify-end gap-2 border-t border-border-subtle">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
