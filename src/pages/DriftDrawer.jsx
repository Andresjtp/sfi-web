import { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, GitCompare } from 'lucide-react'
import clsx from 'clsx'
import { compareAnalyses } from '../lib/api.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const directionConfig = {
  improving: { icon: TrendingDown, colorClass: 'text-stable',   bgClass: 'bg-stable/10',   label: 'Improving' },
  worsening: { icon: TrendingUp,   colorClass: 'text-critical', bgClass: 'bg-critical/10', label: 'Worsening' },
  stable:    { icon: Minus,        colorClass: 'text-amber',    bgClass: 'bg-amber/10',    label: 'Stable' },
}

function DirectionBadge({ direction, size = 'md' }) {
  const cfg = directionConfig[direction] ?? directionConfig.stable
  const Icon = cfg.icon
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded font-mono font-medium',
      size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs',
      cfg.colorClass, cfg.bgClass,
    )}>
      <Icon size={size === 'lg' ? 14 : 11} />
      {cfg.label}
    </span>
  )
}

function DeltaValue({ value, inverse = false, suffix = '' }) {
  // inverse=true means a positive delta is good (e.g. gaining float)
  const isNeutral = Math.abs(value) < 0.0001
  const isBad  = inverse ? value < -0.0001 : value > 0.0001
  const isGood = inverse ? value > 0.0001  : value < -0.0001
  return (
    <span className={clsx(
      'font-mono text-xs tabular-nums',
      isNeutral ? 'text-text-dim' : isBad ? 'text-critical' : 'text-stable',
    )}>
      {value >= 0 ? '+' : ''}{typeof value === 'number' ? value.toFixed(3) : value}{suffix}
    </span>
  )
}

function SectionHeader({ children }) {
  return (
    <p className="font-mono text-xs text-text-dim uppercase tracking-wider pt-4 pb-2 border-t border-border/50 first:border-t-0 first:pt-0">
      {children}
    </p>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DriftDrawer({ projectId, idA, idB, labelA, labelB, onClose }) {
  const [drift, setDrift]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!idA || !idB) return
    setLoading(true)
    setError(null)
    setDrift(null)
    compareAnalyses(projectId, idA, idB)
      .then(setDrift)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId, idA, idB])

  // Trap Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={clsx(
        'fixed right-0 top-0 h-full w-full max-w-xl z-50 flex flex-col',
        'bg-bg-primary border-l border-border shadow-2xl',
        'translate-x-0 transition-transform duration-200',
      )}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare size={15} className="text-amber" />
            <span className="font-mono text-sm font-medium text-text-primary">Drift Report</span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Compared snapshots label */}
        <div className="px-5 py-3 border-b border-border/50 shrink-0 flex items-center gap-3 text-xs font-mono">
          <span className="text-text-dim">Baseline</span>
          <span className="text-text-secondary truncate max-w-[120px]">{labelA}</span>
          <span className="text-text-dim">→</span>
          <span className="text-text-dim">Current</span>
          <span className="text-text-secondary truncate max-w-[120px]">{labelB}</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {loading && (
            <div className="flex items-center gap-2 text-text-dim font-mono text-sm py-8">
              <RefreshCw size={14} className="animate-spin" /> Computing drift…
            </div>
          )}

          {error && (
            <div className="panel p-4 border-critical/30 bg-critical/5">
              <p className="font-mono text-sm text-critical">Failed to load drift report</p>
              <p className="font-mono text-xs text-text-dim mt-1">{error}</p>
            </div>
          )}

          {drift && (
            <>
              {/* Overview */}
              <SectionHeader>Overview</SectionHeader>
              <div className="grid grid-cols-2 gap-2">
                {/* SFI change */}
                <div className="panel px-4 py-3 col-span-2 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-text-dim mb-1">SFI score change</p>
                    <p className="font-mono text-xl font-medium tabular-nums">
                      <span className="text-text-dim text-sm mr-1">{drift.baseline_meta.sfi_score.toFixed(2)}</span>
                      <span className="text-text-dim text-sm">→</span>
                      <span className={clsx(
                        'ml-1',
                        drift.overview.direction === 'worsening' ? 'text-critical' :
                        drift.overview.direction === 'improving' ? 'text-stable' : 'text-amber',
                      )}>
                        {drift.current_meta.sfi_score.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <DirectionBadge direction={drift.overview.direction} size="lg" />
                    {drift.overview.sfi_delta_pct != null && (
                      <span className="font-mono text-xs text-text-dim">
                        {drift.overview.sfi_delta_pct > 0 ? '+' : ''}{drift.overview.sfi_delta_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Task delta */}
                <div className="panel px-4 py-3">
                  <p className="font-mono text-xs text-text-dim mb-1">Task count</p>
                  <p className="font-mono text-sm text-text-primary tabular-nums">
                    {drift.overview.task_delta >= 0 ? '+' : ''}{drift.overview.task_delta}
                  </p>
                </div>

                {/* Duration delta */}
                <div className="panel px-4 py-3">
                  <p className="font-mono text-xs text-text-dim mb-1">Duration</p>
                  <p className={clsx(
                    'font-mono text-sm tabular-nums',
                    drift.overview.duration_delta == null ? 'text-text-dim' :
                    drift.overview.duration_delta > 0 ? 'text-critical' :
                    drift.overview.duration_delta < 0 ? 'text-stable' : 'text-text-secondary',
                  )}>
                    {drift.overview.duration_delta == null
                      ? '—'
                      : `${drift.overview.duration_delta >= 0 ? '+' : ''}${drift.overview.duration_delta} days`}
                  </p>
                </div>
              </div>

              {/* Risk summary */}
              {drift.risk_summary && (
                <div className="panel px-4 py-3 border-amber/20 bg-amber/5 flex gap-3">
                  <AlertTriangle size={13} className="text-amber mt-0.5 shrink-0" />
                  <p className="font-mono text-xs text-text-secondary leading-relaxed">{drift.risk_summary}</p>
                </div>
              )}

              {/* Critical path changes */}
              {(drift.critical_path_changes.gained.length > 0 || drift.critical_path_changes.lost.length > 0) && (
                <>
                  <SectionHeader>
                    Critical path changes
                    {drift.critical_path_changes.count_delta !== 0 && (
                      <span className={clsx(
                        'ml-2',
                        drift.critical_path_changes.count_delta > 0 ? 'text-critical' : 'text-stable',
                      )}>
                        ({drift.critical_path_changes.count_delta >= 0 ? '+' : ''}{drift.critical_path_changes.count_delta})
                      </span>
                    )}
                  </SectionHeader>

                  {drift.critical_path_changes.gained.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-critical mb-1.5">Joined critical path</p>
                      {drift.critical_path_changes.gained.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded bg-critical/5 border border-critical/15">
                          <span className="font-mono text-xs text-critical">+</span>
                          <span className="font-mono text-xs text-text-secondary">{t.id}</span>
                          <span className="font-mono text-xs text-text-primary flex-1 truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {drift.critical_path_changes.lost.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="font-mono text-xs text-stable mb-1.5">Cleared from critical path</p>
                      {drift.critical_path_changes.lost.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded bg-stable/5 border border-stable/15">
                          <span className="font-mono text-xs text-stable">−</span>
                          <span className="font-mono text-xs text-text-secondary">{t.id}</span>
                          <span className="font-mono text-xs text-text-primary flex-1 truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Float erosion */}
              {drift.float_erosion.length > 0 && (
                <>
                  <SectionHeader>Float erosion</SectionHeader>
                  <div className="space-y-1">
                    {drift.float_erosion.map((t, i) => (
                      <div key={i} className="panel px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-text-primary truncate">{t.name}</p>
                          <p className="font-mono text-xs text-text-dim mt-0.5">{t.id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs text-text-secondary tabular-nums">
                            {t.baseline_float}d → {t.current_float}d
                          </p>
                          <DeltaValue value={t.delta} suffix=" days" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Metrics delta */}
              <SectionHeader>Metrics delta</SectionHeader>
              <div className="panel divide-y divide-border/40">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2">
                  <span className="col-span-5 font-mono text-xs text-text-dim">Metric</span>
                  <span className="col-span-2 font-mono text-xs text-text-dim text-right">Before</span>
                  <span className="col-span-2 font-mono text-xs text-text-dim text-right">After</span>
                  <span className="col-span-3 font-mono text-xs text-text-dim text-right">Change</span>
                </div>
                {drift.metrics_delta.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center">
                    <span className="col-span-5 font-mono text-xs text-text-secondary truncate">{m.label}</span>
                    <span className="col-span-2 font-mono text-xs text-text-dim text-right tabular-nums">{m.baseline.toFixed(3)}</span>
                    <span className="col-span-2 font-mono text-xs text-text-secondary text-right tabular-nums">{m.current.toFixed(3)}</span>
                    <span className="col-span-3 text-right">
                      <DeltaValue value={m.delta} />
                    </span>
                  </div>
                ))}
              </div>

              {/* Float distribution delta */}
              <SectionHeader>Float distribution shift</SectionHeader>
              <div className="panel divide-y divide-border/40">
                <div className="grid grid-cols-4 gap-2 px-3 py-2">
                  <span className="font-mono text-xs text-text-dim">Bucket</span>
                  <span className="font-mono text-xs text-text-dim text-right">Before</span>
                  <span className="font-mono text-xs text-text-dim text-right">After</span>
                  <span className="font-mono text-xs text-text-dim text-right">Δ</span>
                </div>
                {drift.float_dist_delta.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2.5">
                    <span className="font-mono text-xs text-text-secondary">{row.bucket} days</span>
                    <span className="font-mono text-xs text-text-dim text-right tabular-nums">{row.baseline_count}</span>
                    <span className="font-mono text-xs text-text-secondary text-right tabular-nums">{row.current_count}</span>
                    <span className={clsx(
                      'font-mono text-xs text-right tabular-nums',
                      row.delta > 0 && row.bucket === '0' ? 'text-critical' :
                      row.delta > 0 ? 'text-text-dim' :
                      row.delta < 0 && row.bucket === '0' ? 'text-stable' :
                      'text-text-dim',
                    )}>
                      {row.delta >= 0 ? '+' : ''}{row.delta}
                    </span>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </div>
    </>
  )
}