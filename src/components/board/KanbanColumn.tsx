import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Lock } from 'lucide-react'
import { TaskCard } from './TaskCard'
import type { KanbanColumn as KanbanColumnDef, Task } from '../../types'
import { classNames } from '../../utils/helpers'
import { useUIStore } from '../../store/useUIStore'
import { usePermissions } from '../../hooks/usePermissions'
import { Tooltip } from '../ui/Tooltip'
import toast from 'react-hot-toast'

interface KanbanColumnProps {
  column: KanbanColumnDef
  tasks: Task[]
}

/**
 * Layout: horizontal row (accordion). Header full-width + toggle chevron.
 * Body: cards mengalir horizontal scrollable kalau melebihi viewport.
 */
export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false)
  const openModal = useUIStore((s) => s.openModal)
  const projectId = useUIStore((s) => s.filters.projectId)
  const stageCtx = useUIStore((s) => s.boardStageContext)
  const sidebarTeamId = useUIStore((s) => s.sidebarTeamFilter)
  const { can } = usePermissions()
  const createPerm = can('task.create')
  const hex = column.color

  return (
    <div className="flex flex-col rounded-xl border border-border-subtle bg-bg-column overflow-hidden shadow-card transition">
      {/* Header (full width, klik untuk toggle) */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle text-left"
        style={{ background: `linear-gradient(90deg, ${hex}20, ${hex}05)` }}
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-ink-tertiary shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-ink-tertiary shrink-0" />
        )}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}80` }}
        />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-primary truncate">
          {column.label}
        </span>
        {column.isSystem && (
          <Tooltip content="Kolom universal (tidak dapat dihapus)">
            <Lock size={9} className="text-ink-tertiary shrink-0" />
          </Tooltip>
        )}
        <span className="rounded-full bg-white border border-border-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
          {tasks.length}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {createPerm.allowed ? (
            <span
              onClick={(e) => {
                e.stopPropagation()
                openModal({
                  type: 'add-task',
                  defaultStatus: column.key,
                  defaultProjectId: projectId ?? undefined,
                  defaultStage: stageCtx ?? undefined,
                })
              }}
              className="rounded-md p-1 text-ink-tertiary hover:bg-black/[0.06] hover:text-pertamina-red transition cursor-pointer"
              title="Tambah tugas"
            >
              <Plus size={13} />
            </span>
          ) : (
            <Tooltip content={createPerm.reason ?? ''}>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  toast.error(createPerm.reason ?? 'Tidak diizinkan membuat tugas')
                }}
                className="rounded-md p-1 text-ink-tertiary opacity-40 cursor-not-allowed"
              >
                <Plus size={13} />
              </span>
            </Tooltip>
          )}
        </span>
      </button>

      {/* Body: horizontal scrollable strip of cards */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <Droppable droppableId={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={classNames(
                    'p-2.5 transition flex flex-col gap-1.5',
                    snapshot.isDraggingOver && 'bg-pertamina-red-50/60',
                  )}
                  style={{ minHeight: tasks.length === 0 ? '80px' : 'auto' }}
                >
                  <AnimatePresence>
                    {tasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(p, ds) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            style={p.draggableProps.style}
                            className="w-full"
                          >
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                            >
                              <TaskCard task={task} isDragging={ds.isDragging} />
                            </motion.div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                  {tasks.length === 0 && !snapshot.isDraggingOver && (
                    createPerm.allowed ? (
                      <button
                        onClick={() =>
                          openModal({
                            type: 'add-task',
                            defaultStatus: column.key,
                            defaultProjectId: projectId ?? undefined,
                            defaultStage: stageCtx ?? undefined,
                          })
                        }
                        className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-border bg-white text-[11px] text-ink-tertiary hover:text-pertamina-red hover:border-pertamina-red/40 hover:bg-pertamina-red-50 transition"
                      >
                        <Plus size={14} className="mr-1" /> Tambah tugas
                      </button>
                    ) : (
                      <div
                        onClick={() => toast.error(createPerm.reason ?? 'Tidak diizinkan membuat tugas')}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white text-[11px] text-ink-tertiary cursor-help px-3 text-center"
                        title={createPerm.reason ?? ''}
                      >
                        <span>Belum ada tugas</span>
                        <span className="text-[10px] text-pertamina-red opacity-70">⚠ Tidak ada izin tambah</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </Droppable>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
