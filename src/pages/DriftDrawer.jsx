import { useEffect, useState, useCallback } from 'react'
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, GitCompare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { compareAnalyses, fetchDriftSummary } from '../lib/api.js'

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

// ─── AI Summary skeleton ───────────────────────────────────────────────────────

function NarrativeSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-border/40 rounded w-3/4" />
      <div className="h-3 bg-border/40 rounded w-full" />
      <div className="h-3 bg-border/40 rounded w-5/6" />
      <div className="h-3 bg-border/30 rounded w-2/3 mt-3" />
      <div className="h-3 bg-border/30 rounded w-full" />
      <div className="h-3 bg-border/30 rounded w-4/5" />
    </div>
  )
}

// ─── AI Summary panel ─────────────────────────────────────────────────────────

// Parses the three-section narrative text into { driftSummary, rootCause, actions }
// Handles both "1. DRIFT SUMMARY" header styles and plain paragraph fallback.
function parseNarrativeSections(text) {
  if (!text) return { driftSummary: '', rootCause: '', actions: '' }

  const section = (label) => {
    // Match numbered headers like "1. DRIFT SUMMARY" or "## DRIFT SUMMARY"
    const re = new RegExp(
      `(?:^|\\n)(?:\\d+\\.\\s*|#{1,3}\\s*)?${label}[:\\s]*\\n([\\s\\S]*?)(?=\\n(?:\\d+\\.\\s*|#{1,3}\\s*)?(?:ROOT CAUSE|RECOMMENDED|$))`,
      'i'
    )
    const m = text.match(re)
    return m ? m[1].trim() : ''
  }

  const driftSummary = section('DRIFT SUMMARY')
  const rootCause    = section('ROOT CAUSE')
  const actions      = section('RECOMMENDED')

  // Fallback: if parsing failed, show raw text in the first section
  if (!driftSummary && !rootCause && !actions) {
    return { driftSummary: text, rootCause: '', actions: '' }
  }

  return { driftSummary, rootCause, actions }
}

// Renders a block that may contain bullet lines (lines starting with - or •)
function NarrativeBlock({ text }) {
  if (!text) return null
  const lines = text.split('\n').filter(l => l.trim())
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isBullet = /^[-•*]/.test(line.trim())
        const content  = isBullet ? line.trim().replace(/^[-•*]\s*/, '') : line.trim()
        return isBullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-amber mt-0.5 shrink-0 font-mono text-xs">—</span>
            <p className="font-mono text-xs text-text-secondary leading-relaxed">{content}</p>
          </div>
        ) : (
          <p key={i} className="font-mono text-xs text-text-secondary leading-relaxed">{content}</p>
        )
      })}
    </div>
  )
}

function AISummaryPanel({ projectId, idA, idB, driftReady }) {
  const [summary, setSummary]         = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [expanded, setExpanded]       = useState(true)
  const [everLoaded, setEverLoaded]   = useState(false)

  const load = useCallback(async (regenerate = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDriftSummary(projectId, idA, idB, regenerate)
      setSummary(data)
      setEverLoaded(true)
      setExpanded(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, idA, idB])

  // Auto-load once the drift comparison data is ready
  useEffect(() => {
    if (driftReady && !everLoaded) {
      load(false)
    }
  }, [driftReady, everLoaded, load])

  const sections = summary ? parseNarrativeSections(summary.text) : null

  const borderColor =
    summary?.direction === 'worsening' ? 'border-critical/25' :
    summary?.direction === 'improving' ? 'border-stable/25'   :
    'border-amber/20'

  const headerAccent =
    summary?.direction === 'worsening' ? 'text-critical' :
    summary?.direction === 'improving' ? 'text-stable'   :
    'text-amber'

  return (
    <div className={clsx('panel border rounded-lg overflow-hidden', borderColor, 'bg-bg-secondary/40')}>

      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => !loading && setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={13} className={clsx('shrink-0', loading ? 'text-text-dim animate-pulse' : headerAccent)} />
          <span className="font-mono text-xs font-medium text-text-primary">AI Drift Analysis</span>
          {summary?.from_cache && (
            <span className="font-mono text-xs text-text-dim px-1.5 py-0.5 rounded bg-border/30">cached</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Regenerate button — only shown once loaded */}
          {summary && !loading && (
            <button
              onClick={e => { e.stopPropagation(); load(true) }}
              className="btn-ghost p-1 rounded flex items-center gap-1 text-text-dim hover:text-text-secondary"
              title="Regenerate narrative"
            >
              <RefreshCw size={11} />
              <span className="font-mono text-xs">Regenerate</span>
            </button>
          )}
          {!loading && (
            expanded
              ? <ChevronUp size={13} className="text-text-dim" />
              : <ChevronDown size={13} className="text-text-dim" />
          )}
        </div>
      </div>

      {/* Panel body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">

          {/* Loading skeleton */}
          {loading && (
            <div className="pt-3">
              <NarrativeSkeleton />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="pt-3 flex items-start gap-2">
              <AlertTriangle size={12} className="text-critical mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-xs text-critical">Could not generate narrative</p>
                <p className="font-mono text-xs text-text-dim mt-0.5">{error}</p>
                <button
                  onClick={() => load(false)}
                  className="font-mono text-xs text-amber hover:text-amber/80 mt-2 underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Narrative content */}
          {sections && !loading && (
            <div className="pt-3 space-y-4">

              {/* Drift Summary */}
              {sections.driftSummary && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">Drift Summary</p>
                  <NarrativeBlock text={sections.driftSummary} />
                </div>
              )}

              {/* Root Cause Analysis */}
              {sections.rootCause && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">Root Cause Analysis</p>
                  <NarrativeBlock text={sections.rootCause} />
                </div>
              )}

              {/* Recommended Actions */}
              {sections.actions && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">Recommended Actions</p>
                  <NarrativeBlock text={sections.actions} />
                </div>
              )}

              {/* Footer — model + timestamp */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="font-mono text-xs text-text-dim">
                  {summary.model_provider === 'anthropic' ? 'Claude' : 'GPT-4o'}
                </span>
                <span className="font-mono text-xs text-text-dim">
                  {summary.generated_at ? new Date(summary.generated_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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

          {/* ── AI Drift Summary panel ─────────────────────────────────────── */}
          {/* Mounts immediately; internally waits for driftReady before calling the API */}
          <AISummaryPanel
            projectId={projectId}
            idA={idA}
            idB={idB}
            driftReady={!loading && !!drift}
          />

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