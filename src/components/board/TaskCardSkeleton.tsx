export function TaskCardSkeleton() {
  return (
    <div className="surface relative overflow-hidden rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-2/3 rounded bg-black/[0.06]" />
        <div className="h-4 w-6 rounded bg-black/[0.06]" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2 w-full rounded bg-black/[0.06]" />
        <div className="h-2 w-4/5 rounded bg-black/[0.06]" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-4 w-12 rounded-full bg-black/[0.06]" />
        <div className="h-4 w-12 rounded-full bg-black/[0.06]" />
      </div>
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.05] to-transparent"
        style={{ backgroundSize: '1000px 100%' }}
      />
    </div>
  )
}
