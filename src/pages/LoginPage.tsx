import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useRoleStore } from '../store/useRoleStore'
import { classNames } from '../utils/helpers'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { email: 'admin@pertamina.id', password: 'admin123', label: 'Super Admin' },
  { email: 'aditya@pertamina.id', password: 'itd123', label: 'Admin Tim ITD' },
  { email: 'bayu@pertamina.id', password: 'net123', label: 'Admin Tim NET' },
  { email: 'rina@pertamina.id', password: 'member123', label: 'Member ITD' },
  { email: 'sari@pertamina.id', password: 'member123', label: 'Member BIZ' },
  { email: 'tamu@pertamina.id', password: 'tamu123', label: 'Viewer' },
]

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const loginError = useAuthStore((s) => s.loginError)
  const users = useAuthStore((s) => s.users)
  const roles = useRoleStore((s) => s.roles)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      const ok = login(email.trim(), password)
      if (ok) {
        const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        toast.success(`Selamat datang, ${u?.name ?? 'Pengguna'}!`)
      }
      setSubmitting(false)
    }, 200)
  }

  const fillDemo = (e: { email: string; password: string }) => {
    setEmail(e.email)
    setPassword(e.password)
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-white">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-pertamina-red/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full bg-pertamina-blue/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.65 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 grid w-[920px] max-w-[95vw] grid-cols-1 lg:grid-cols-[1.05fr_1fr] overflow-hidden rounded-2xl bg-white shadow-modal border border-border-subtle"
      >
        {/* Left brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-8 bg-gradient-to-br from-pertamina-red via-pertamina-red-dark to-pertamina-red-700 text-white overflow-hidden">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-pertamina-red font-bold text-lg shadow-md">F</div>
            <div>
              <div className="text-base font-semibold tracking-tight">FlowDesk</div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">PGN COM · Backlog Suite</div>
            </div>
          </div>

          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-80 mb-2">Project Backlog Manager</div>
            <h1 className="text-2xl font-semibold leading-tight">
              Selaraskan tim,<br />percepat eksekusi.
            </h1>
            <p className="mt-3 text-[13px] opacity-90 leading-relaxed">
              Kelola pekerjaan lintas divisi dalam satu papan kerja terpadu — dengan akses berjenjang yang aman untuk Super Admin, Admin Tim, Member, hingga Viewer.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {[...roles].sort((a, b) => b.rank - a.rank).slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-md bg-white/15 backdrop-blur px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 border border-white/20">
                  <ShieldCheck size={12} />
                  {r.name}
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-[11px] opacity-80">© {new Date().getFullYear()} Pertamina · Internal use</div>
        </div>

        {/* Right form panel */}
        <div className="p-8 lg:p-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-ink-primary">Masuk ke FlowDesk</h2>
            <p className="mt-1 text-[12px] text-ink-tertiary">Gunakan email & password korporat Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Email</span>
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pertamina.id"
                className="input-base"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">Password</span>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-tertiary hover:bg-black/[0.05] hover:text-ink-primary"
                  aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-pertamina-red/30 bg-pertamina-red-50 px-3 py-2 text-[12px] text-pertamina-red"
              >
                {loginError}
              </motion.div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <LogIn size={14} />
              {submitting ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">Akun Demo</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => {
                const u = users.find((x) => x.email === a.email)
                const role = u ? roles.find((r) => r.id === u.role) : undefined
                const color = role?.color ?? '#64748B'
                return (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fillDemo(a)}
                    className={classNames(
                      'rounded-lg border bg-white px-2.5 py-2 text-left hover:border-pertamina-red/40 hover:bg-pertamina-red-50/40 transition',
                      'border-border-subtle',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-ink-primary">{u?.name ?? a.label}</span>
                      <span
                        className="chip text-[9px] border"
                        style={{
                          backgroundColor: `${color}1a`,
                          color,
                          borderColor: `${color}55`,
                        }}
                      >
                        {role?.name ?? a.label}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-ink-tertiary font-mono">{a.email}</div>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 text-[10px] text-ink-tertiary text-center">
              Klik kartu untuk mengisi form. Password setiap akun ada di atas.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
