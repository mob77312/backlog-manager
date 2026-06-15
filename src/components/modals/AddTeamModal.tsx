import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { useTeamStore } from '../../store/useTeamStore'
import { useLogStore } from '../../store/useLogStore'
import { useTaskStore } from '../../store/useTaskStore'
import { TEAM_COLOR_PALETTE } from '../../utils/colors'
import { classNames, deriveAcronym } from '../../utils/helpers'
import { usePermissions } from '../../hooks/usePermissions'
import { Building2, Check, ClipboardCheck, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import type { Team } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  teamId?: string
}

export function AddTeamModal({ open, onClose, teamId }: Props) {
  const team = useTeamStore((s) => (teamId ? s.teams.find((t) => t.id === teamId) : undefined))
  const { can } = usePermissions()
  if (!open) return null
  const perm = team ? can('team.edit', { teamId: team.id }) : can('team.create')
  if (!perm.allowed) {
    return (
      <Modal open={open} onClose={onClose} title="Tidak memiliki akses" size="sm">
        <div className="flex items-start gap-2 rounded-lg border border-pertamina-red/30 bg-pertamina-red-50 p-3 text-sm text-ink-primary">
          <ShieldAlert size={16} className="mt-0.5 text-pertamina-red" />
          <div>{perm.reason}</div>
        </div>
      </Modal>
    )
  }
  return <TeamFormModal key={team?.id ?? 'new'} open={open} onClose={onClose} team={team} />
}

interface FormProps {
  open: boolean
  onClose: () => void
  team?: Team
}

function TeamFormModal({ open, onClose, team }: FormProps) {
  const addTeam = useTeamStore((s) => s.addTeam)
  const updateTeam = useTeamStore((s) => s.updateTeam)
  const addLog = useLogStore((s) => s.addLog)
  const { can } = usePermissions()
  const canManageTeams = can('team.manageTeams', { teamId: team?.id }).allowed

  const [name, setName] = useState(team?.name ?? '')
  const [acronym, setAcronym] = useState(team?.acronym ?? '')
  const [color, setColor] = useState(team?.color ?? TEAM_COLOR_PALETTE[0])
  const [description, setDescription] = useState(team?.description ?? '')
  const [members, setMembers] = useState(team?.memberCount ?? 1)
  const [acronymTouched, setAcronymTouched] = useState(!!team)

  const computedAcronym = useMemo(
    () => (acronymTouched ? acronym : deriveAcronym(name)),
    [acronymTouched, acronym, name],
  )

  const submit = () => {
    if (!name.trim()) {
      toast.error('Nama divisi wajib diisi')
      return
    }
    const data = {
      name: name.trim(),
      acronym: (computedAcronym || 'DV').slice(0, 3).toUpperCase(),
      color,
      description: description.trim(),
      memberCount: Math.max(0, members),
    }
    if (team) {
      updateTeam(team.id, data)
      toast.success('Divisi diperbarui')
    } else {
      const created = addTeam(data)
      addLog({
        type: 'team_added',
        message: `Divisi ${created.name} ditambahkan`,
        taskId: null,
        taskTitle: null,
        fromTeamId: null,
        toTeamId: created.id,
      })
      toast.success('Divisi baru dibuat', { icon: '🎉' })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={team ? 'Edit Divisi' : 'Tambah Divisi Baru'} size="lg">
      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input label="Nama Divisi" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Service Operations" autoFocus />
          <Input
            label="Akronim"
            value={computedAcronym}
            onChange={(e) => {
              setAcronymTouched(true)
              setAcronym(e.target.value.toUpperCase().slice(0, 3))
            }}
            placeholder="SVC"
            className="w-20 text-center font-mono uppercase"
            maxLength={3}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Warna Divisi</span>
          <div className="grid grid-cols-12 gap-2">
            {TEAM_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={classNames(
                  'h-7 w-7 rounded-full border-2 transition',
                  color === c ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100',
                )}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 12px ${c}80` : undefined }}
              />
            ))}
          </div>
        </div>

        <Textarea
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat peran divisi..."
        />

        <Input
          label="Jumlah Anggota"
          type="number"
          min={0}
          value={members}
          onChange={(e) => setMembers(parseInt(e.target.value || '0', 10))}
        />

        <div className="surface rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">Pratinjau</div>
          <div className="flex items-center gap-2">
            <span
              className="chip border"
              style={{
                backgroundColor: `${color}20`,
                color,
                borderColor: `${color}55`,
              }}
            >
              <span className="font-mono text-[10px]">{(computedAcronym || 'DV').slice(0, 3).toUpperCase()}</span>
              <span>{name || 'Nama Divisi'}</span>
            </span>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
            <span className="text-[11px] text-ink-secondary">{description || 'Deskripsi divisi...'}</span>
          </div>
        </div>

        {/* Teams (sub-units) - only visible when editing existing divisi */}
        {team && (
          <>
            <DivisionTeamsSection team={team} canManage={canManageTeams} />
            <HandoffRequirementsLink team={team} />
          </>
        )}

        {!team && (
          <div className="rounded-lg border border-border-subtle bg-pertamina-red-50/30 p-3 text-[11px] text-ink-secondary leading-relaxed flex items-start gap-2">
            <Building2 size={14} className="mt-0.5 text-pertamina-red shrink-0" />
            <div>
              <strong className="text-ink-primary">Tip:</strong> Setelah divisi dibuat, buka kembali via menu Edit untuk menambahkan <strong>Team</strong> di dalamnya (sub-unit operasional).
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <button className="btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button className="btn-primary" onClick={submit}>
            {team ? 'Simpan Perubahan' : 'Buat Divisi'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DivisionTeamsSection({ team, canManage }: { team: Team; canManage: boolean }) {
  const addDepartment = useTeamStore((s) => s.addDepartment)
  const removeDepartment = useTeamStore((s) => s.removeDepartment)
  const renameDepartment = useTeamStore((s) => s.renameDepartment)
  const allTasks = useTaskStore((s) => s.tasks)
  const tasksByDept = useMemo(
    () =>
      allTasks.reduce<Record<string, number>>((acc, t) => {
        if (t.departmentId) acc[t.departmentId] = (acc[t.departmentId] ?? 0) + 1
        return acc
      }, {}),
    [allTasks],
  )
  const departments = team.departments ?? []
  const [newTeam, setNewTeam] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const handleAdd = () => {
    if (!canManage) return
    const trimmed = newTeam.trim()
    if (!trimmed) return toast.error('Nama team wajib diisi')
    if (departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('Nama team sudah ada di divisi ini')
    }
    addDepartment(team.id, trimmed)
    setNewTeam('')
    toast.success(`Team "${trimmed}" ditambahkan`)
  }

  const handleRename = (id: string) => {
    if (!canManage) return
    const trimmed = editingName.trim()
    if (!trimmed) return toast.error('Nama tidak boleh kosong')
    renameDepartment(team.id, id, trimmed)
    setEditingId(null)
    setEditingName('')
    toast.success('Nama team diperbarui')
  }

  return (
    <div className="surface rounded-lg p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-pertamina-red" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-primary">
            Team di Divisi Ini
          </span>
          <span className="text-[10px] text-ink-tertiary">· {departments.length} team</span>
        </div>
        {!canManage && (
          <span className="text-[10px] text-ink-tertiary italic">Hanya Super Admin yang dapat mengelola team</span>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        {departments.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle bg-white px-3 py-3 text-center text-[11px] text-ink-tertiary">
            Belum ada team. {canManage ? 'Tambahkan di bawah.' : ''}
          </div>
        ) : (
          departments.map((d) => {
            const count = tasksByDept[d.id] ?? 0
            const isEditing = editingId === d.id
            const isConfirming = confirmDel === d.id
            return (
              <div
                key={d.id}
                className="group flex items-center gap-2 rounded-md border border-border-subtle bg-white px-2.5 py-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(d.id)
                      if (e.key === 'Escape') {
                        setEditingId(null)
                        setEditingName('')
                      }
                    }}
                    className="input-base h-7 py-0 px-2 text-[12px]"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-[12px] text-ink-primary truncate">{d.name}</span>
                    <span className="text-[10px] text-ink-tertiary">{count} tugas</span>
                  </>
                )}

                {canManage && !isEditing && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(d.id)
                        setEditingName(d.name)
                      }}
                      className="rounded p-1 text-ink-tertiary hover:bg-black/[0.05] hover:text-ink-primary opacity-0 group-hover:opacity-100"
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => {
                        if (count > 0 && !isConfirming) {
                          toast.error(`Team "${d.name}" masih dipakai ${count} tugas`)
                          return
                        }
                        if (isConfirming) {
                          removeDepartment(team.id, d.id)
                          toast.success(`Team "${d.name}" dihapus`)
                          setConfirmDel(null)
                        } else {
                          setConfirmDel(d.id)
                          window.setTimeout(() => setConfirmDel((c) => (c === d.id ? null : c)), 2500)
                        }
                      }}
                      className={classNames(
                        'rounded p-1 hover:bg-pertamina-red-50 hover:text-pertamina-red opacity-0 group-hover:opacity-100',
                        isConfirming ? 'opacity-100 text-pertamina-red' : 'text-ink-tertiary',
                      )}
                      title={isConfirming ? 'Klik lagi untuk konfirmasi' : 'Hapus'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={() => handleRename(d.id)}
                      className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                      title="Simpan"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditingName('')
                      }}
                      className="rounded p-1 text-ink-tertiary hover:bg-black/[0.05]"
                      title="Batal"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-2">
          <input
            className="input-base h-8 text-[12px]"
            placeholder='Nama team baru (mis. "Backend", "Network Ops")'
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <button
            className="btn-primary h-8 px-3 py-0 text-[12px]"
            onClick={handleAdd}
            disabled={!newTeam.trim()}
          >
            <Plus size={12} /> Tambah Team
          </button>
        </div>
      )}
    </div>
  )
}

function HandoffRequirementsLink({ team }: { team: Team }) {
  const openModal = useUIStore((s) => s.openModal)
  const { can } = usePermissions()
  const perm = can('team.editHandoffRequirements', { teamId: team.id })
  const count = team.handoffRequirements?.length ?? 0
  const requiredCount = (team.handoffRequirements ?? []).filter((f) => f.required).length

  return (
    <div className="surface rounded-lg p-3 flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-pertamina-red-50 text-pertamina-red shrink-0">
        <ClipboardCheck size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-ink-primary">Syarat Handoff Masuk</div>
        <div className="text-[11px] text-ink-tertiary">
          {count === 0
            ? 'Belum ada syarat — divisi lain bisa langsung handoff ke sini.'
            : `${count} syarat (${requiredCount} wajib) harus diisi divisi pengirim.`}
        </div>
      </div>
      {perm.allowed ? (
        <button
          className="btn-ghost text-[12px]"
          onClick={() => openModal({ type: 'handoff-requirements', teamId: team.id })}
        >
          <ClipboardCheck size={12} /> Atur Syarat
        </button>
      ) : (
        <span className="text-[10px] text-ink-tertiary italic">Tidak punya akses edit</span>
      )}
    </div>
  )
}
