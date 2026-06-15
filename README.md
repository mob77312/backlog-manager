# FlowDesk - Project Backlog Manager

Aplikasi enterprise multi-team untuk mengelola backlog tugas, didesain dengan tema premium dark mirip Linear/Vercel Dashboard. Dibuat dengan React 18 + TypeScript + Vite + Tailwind CSS.

## Cara Install & Menjalankan

```bash
npm install
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`. Build production:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

## Fitur Utama

- **Kanban Board 4 kolom** (Backlog / Dikerjakan / Review / Selesai) dengan drag & drop antar kolom (`@hello-pangea/dnd`), kolom collapsible, dan animasi spring saat kartu dilepas.
- **Task Card premium** dengan badge prioritas (Kritis/Tinggi/Sedang/Rendah), badge tim berwarna kustom, story points fibonacci, deadline relatif (Hari ini / Besok / Terlambat), avatar assignees bertumpuk, indikator handoff, attachment, dan komentar.
- **Task Detail Modal** layout 2 kolom: judul & deskripsi inline-edit, sub-task checklist, komentar, dropdown status & prioritas, deadline, assignees, story points, riwayat handoff lengkap, tombol "Tandai Selesai" dan "Serahkan ke Tim Lain".
- **Handoff Modal** dengan grid pilih tim tujuan, alasan, nama pemberi tugas, animasi konfirmasi & toast.
- **Manajemen Tim**: tambah / edit / hapus tim, akronim auto-generate, 12 warna preset, jumlah anggota, deskripsi, preview live, konfirmasi delete dengan warning bila masih ada tugas aktif.
- **Dashboard Analytics**: 5 metric card, Burndown Chart (ideal vs aktual 30 hari), Team Workload stacked bar, Priority Distribution donut, Recent Activity, Top Overdue Tasks.
- **Filter & Search global**: search box (Cmd/Ctrl+K), filter chips multi-select prioritas / tim / status, sidebar filter per tim, reset filter satu klik.
- **Activity Log Panel** slide-in dari kanan, max 200 entri, filter per tipe, export CSV, animasi spring.
- **Keyboard Shortcuts**: Cmd/Ctrl+K (search), Cmd/Ctrl+N (tugas baru), Cmd/Ctrl+B (board), Cmd/Ctrl+D (dashboard), Esc (tutup modal), `?` (cheat sheet).
- **Persistensi localStorage** otomatis (Zustand `persist`) dengan seed data 4 tim default + 12 contoh tugas + 10 entri aktivitas.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v3 (dark mode + custom palette + glass utility)
- Zustand + middleware persist
- @hello-pangea/dnd (drag & drop)
- Framer Motion (animasi)
- Recharts (grafik)
- date-fns (tanggal)
- Lucide React (icon)
- React Hot Toast (notifikasi)
- Headless UI (modal, accessible)
- Inter + JetBrains Mono (Google Fonts)

## Struktur Folder

```
src/
├── components/
│   ├── layout/           AppShell, Sidebar, Header
│   ├── board/            KanbanBoard, KanbanColumn, TaskCard, TaskCardSkeleton
│   ├── modals/           AddTask, EditTask, TaskDetail, Handoff, AddTeam, DeleteTeam, Shortcuts, ModalsRoot
│   ├── dashboard/        StatsOverview, BurndownChart, TeamWorkloadChart, PriorityDistribution, RecentActivity, TopOverdueTasks
│   ├── log/              ActivityLog (slide panel)
│   └── ui/               Badge, Avatar, Button, Input, Select, Tooltip, ProgressBar, Modal
├── store/                useTaskStore, useTeamStore, useLogStore, useUIStore, seed
├── types/                Tipe domain
├── hooks/                useLocalStorage, useFilteredTasks, useKeyboardShortcuts
├── utils/                colors, helpers
└── pages/                BoardPage, DashboardPage
```

## Catatan

- Semua teks UI dalam Bahasa Indonesia.
- Data dipersist otomatis ke `localStorage` dengan key `flowdesk:tasks`, `flowdesk:teams`, `flowdesk:logs`. Untuk reset: `localStorage.clear()` atau Application > Storage.
- Pertama kali dijalankan, aplikasi akan menyemai 4 tim default (ITD, NET, BIZ, QAT) dengan 12 contoh tugas tersebar di semua kolom.
