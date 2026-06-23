import { useState } from 'react'
import { CalendarDays, CheckCircle2, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Textarea } from '../ui/Input'
import { useProjectStore } from '../../store/useProjectStore'
import { usePermissions } from '../../hooks/usePermissions'
import type { Project } from '../../types'
import { classNames, relativeTime } from '../../utils/helpers'

interface Props {
  project: Project
  /** Callback ke modal parent untuk mark step approved setelah save. */
  onApproved: () => void
  /** Callback batal. */
  onCancel: () => void
}

export function KickoffPanel({ project, onApproved, onCancel }: Props) {
  const { user } = usePermissions()
  const setKickoff = useProjectStore((s) => s.setKickoff)
  const existing = project.kickoffMeeting

  const [meetingDate, setMeetingDate] = useState(
    existing?.meetingDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  )
  const [location, setLocation] = useState(existing?.location ?? '')
  const [attendees, setAttendees] = useState<string[]>(existing?.attendees ?? [])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [agenda, setAgenda] = useState(existing?.agenda ?? '')
  const [decisions, setDecisions] = useState(existing?.decisions ?? '')
  const [actionItems, setActionItems] = useState(existing?.actionItems ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const valid = meetingDate && agenda.trim().length > 0 && attendees.length > 0

  const submit = () => {
    if (!user) return
    if (!valid) {
      toast.error('Tanggal, agenda, dan minimal 1 attendee wajib')
      return
    }
    const result = setKickoff(project.id, {
      meetingDate: new Date(meetingDate).toISOString(),
      location,
      attendees,
      agenda,
      decisions,
      actionItems,
      notes,
      recordedByUserId: user.id,
      recordedByName: user.name,
    })
    if (!result.ok) {
      toast.error(result.error ?? 'Gagal simpan kickoff')
      return
    }
    toast.success('Kickoff Meeting tercatat')
    onApproved()
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <CalendarDays size={14} className="text-blue-700" />
        <span className="text-[12px] font-semibold text-blue-800">Catat Kickoff Meeting</span>
        {existing && (
          <span className="ml-auto text-[10px] text-ink-tertiary">
            Direkam sebelumnya {relativeTime(existing.recordedAt)} oleh {existing.recordedByName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <Input
          label="Tanggal Meeting *"
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
        />
        <Input
          label="Lokasi / Link"
          placeholder="Ruang Rapat 3F / zoom.com/..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <span className="mb-1.5 block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
          <Users size={11} /> Attendees *
        </span>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {attendees.length === 0 && (
            <span className="text-[11px] text-ink-tertiary italic">Belum ada attendee</span>
          )}
          {attendees.map((a) => (
            <span key={a} className="pill border border-blue-200 bg-white text-blue-700">
              {a}
              <button onClick={() => setAttendees(attendees.filter((x) => x !== a))} className="ml-1 text-blue-300 hover:text-pertamina-red">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <input
          className="input-base"
          placeholder="Ketik nama attendee lalu Enter"
          value={attendeeInput}
          onChange={(e) => setAttendeeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && attendeeInput.trim()) {
              e.preventDefault()
              if (!attendees.includes(attendeeInput.trim())) setAttendees([...attendees, attendeeInput.trim()])
              setAttendeeInput('')
            }
          }}
        />
      </div>

      <Textarea
        label="Agenda *"
        placeholder="Daftar agenda (1 per baris): scope review, timeline alignment, resource confirmation..."
        rows={3}
        value={agenda}
        onChange={(e) => setAgenda(e.target.value)}
      />
      <div className="mt-2">
        <Textarea
          label="Keputusan Utama"
          placeholder="Keputusan yang diambil di meeting (scope freeze, resource allocation, dll)"
          rows={2}
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <Textarea
          label="Action Items"
          placeholder="Tindak lanjut + PIC (mis: Andi - finalize BOQ minggu depan)"
          rows={2}
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <Textarea
          label="Catatan / Notulen Tambahan"
          placeholder="Catatan bebas..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Batal
        </button>
        <button
          onClick={submit}
          disabled={!valid}
          className={classNames('btn-primary inline-flex items-center gap-1.5', !valid && 'opacity-50 cursor-not-allowed')}
        >
          <CheckCircle2 size={14} />
          Simpan & Tandai Selesai
        </button>
      </div>
    </div>
  )
}
