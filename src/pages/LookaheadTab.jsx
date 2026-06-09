import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, Calendar, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { fetchProjectHistory, fetchLookahead } from '../lib/api.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

function daysUntil(dateStr, statusDate) {
  if (!dateStr || !statusDate) return null
  const target = new Date(dateStr)
  const base   = new Date(statusDate)
  const diff   = Math.round((target - base) / (1000 * 60 * 60 * 24))
  return diff
}

function FloatBadge({ float, isCritical }) {
  if (isCritical || float === 0) {
    return (
      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-critical/15 text-critical">
        CRITICAL
      </span>
    )
  }
  if (float <= 5) {
    return (
      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber/15 text-amber">
        {float}d float
      </span>
    )
  }
  return (
    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-stable/10 text-stable">
      {float}d float
    </span>
  )
}

function UrgencyBar({ daysAway, windowDays }) {
  // Fills left-to-right: tasks starting sooner fill more of the bar
  const pct = windowDays > 0
    ? Math.max(0, Math.min(100, ((windowDays - daysAway) / windowDays) * 100))
    : 0
  const color =
    daysAway <= 7  ? 'bg-critical' :
    daysAway <= 14 ? 'bg-amber' :
    'bg-text-dim/40'

  return (
    <div className="w-12 h-1 bg-border/40 rounded-full overflow-hidden">
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const WINDOWS = [
  { days: 30,  label: '30 days' },
  { days: 60,  label: '60 days' },
  { days: 90,  label: '90 days' },
]

export default function LookaheadTab({ projectId }) {
  // Analysis selection
  const [snapshots, setSnapshots]     = useState([])
  const [selectedId, setSelectedId]   = useState(null)
  const [snapsLoading, setSnapsLoading] = useState(true)

  // Lookahead params
  const [statusDate, setStatusDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [windowDays, setWindowDays]   = useState(30)

  // Results
  const [tasks, setTasks]             = useState(null)
  const [meta, setMeta]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  // Load snapshot list on mount
  useEffect(() => {
    fetchProjectHistory(projectId)
      .then(data => {
        const items = data.items ?? data ?? []
        setSnapshots(items)
        if (items.length > 0) setSelectedId(items[0].id)
      })
      .catch(() => {})
      .finally(() => setSnapsLoading(false))
  }, [projectId])

  // Auto-run when params are ready
  useEffect(() => {
    if (selectedId && statusDate) run()
  }, [selectedId, statusDate, windowDays])

  const run = async () => {
    if (!selectedId || !statusDate) return
    setLoading(true)
    setError(null)
    setTasks(null)
    try {
      const data = await fetchLookahead(projectId, selectedId, statusDate, windowDays)
      setTasks(data.tasks ?? [])
      setMeta(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const criticalCount  = tasks?.filter(t => t.is_critical).length ?? 0
  const nearCritCount  = tasks?.filter(t => !t.is_critical && t.total_float <= 5).length ?? 0
  const startingSoon   = tasks?.filter(t => {
    const d = daysUntil(t.planned_start, statusDate)
    return d !== null && d <= 7
  }).length ?? 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="label-mono mb-1">Lookahead Risk Window</p>
        <p className="font-body text-sm text-text-secondary max-w-lg">
          Tasks starting within your selected window, ranked by risk.
          Focus here for weekly look-ahead meetings and proactive schedule management.
        </p>
      </div>

      {/* Controls */}
      <div className="panel px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">

          {/* Analysis selector */}
          <div>
            <p className="font-mono text-xs text-text-dim mb-2">Schedule Snapshot</p>
            {snapsLoading ? (
              <div className="h-8 bg-border/20 rounded animate-pulse" />
            ) : (
              <select
                value={selectedId ?? ''}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded px-3 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-amber/50"
              >
                {snapshots.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i === 0 ? '★ ' : ''}{s.analyzed_at
                      ? new Date(s.analyzed_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : s.id.slice(0, 8)}
                    {' '}— SFI {s.sfi_score?.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status date */}
          <div>
            <p className="font-mono text-xs text-text-dim mb-2">Status Date</p>
            <input
              type="date"
              value={statusDate}
              onChange={e => setStatusDate(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded px-3 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-amber/50"
            />
          </div>

          {/* Window selector */}
          <div>
            <p className="font-mono text-xs text-text-dim mb-2">Lookahead Window</p>
            <div className="flex items-center gap-1">
              {WINDOWS.map(w => (
                <button
                  key={w.days}
                  onClick={() => setWindowDays(w.days)}
                  className={clsx(
                    'flex-1 py-1.5 rounded font-mono text-xs transition-colors',
                    windowDays === w.days
                      ? 'bg-amber text-bg-primary'
                      : 'bg-bg-secondary border border-border text-text-dim hover:text-text-secondary',
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {tasks && tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Tasks in Window', value: tasks.length,    color: 'text-text-primary' },
            { label: 'Critical',        value: criticalCount,   color: 'text-critical' },
            { label: 'Near-Critical',   value: nearCritCount,   color: 'text-amber' },
            { label: 'Starting ≤7d',    value: startingSoon,    color: startingSoon > 0 ? 'text-critical' : 'text-text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="panel px-4 py-3">
              <p className="font-mono text-xs text-text-dim mb-1">{label}</p>
              <p className={clsx('font-mono text-xl font-medium tabular-nums', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel p-12 flex items-center justify-center gap-3">
          <RefreshCw size={15} className="text-text-dim animate-spin" />
          <p className="font-mono text-sm text-text-dim">Scanning schedule…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="panel p-5 border-critical/30 bg-critical/5 flex items-start gap-3">
          <AlertTriangle size={14} className="text-critical mt-0.5 shrink-0" />
          <div>
            <p className="font-mono text-sm text-critical font-medium">Failed to load lookahead</p>
            <p className="font-mono text-xs text-text-dim mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks && tasks.length === 0 && !loading && (
        <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-stable/10 flex items-center justify-center">
            <Calendar size={18} className="text-stable" />
          </div>
          <p className="font-mono text-sm text-text-secondary">No tasks in this window</p>
          <p className="font-mono text-xs text-text-dim max-w-sm">
            No tasks are scheduled to start between {formatDate(statusDate)} and{' '}
            {formatDate(new Date(new Date(statusDate).getTime() + windowDays * 86400000).toISOString().slice(0, 10))}.
            Try a wider window or a different status date.
          </p>
        </div>
      )}

      {/* Task list */}
      {tasks && tasks.length > 0 && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} starting within {windowDays} days of {formatDate(statusDate)}
            </p>
          </div>

          <div className="panel divide-y divide-border/40">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5">
              <span className="col-span-1 font-mono text-xs text-text-dim">#</span>
              <span className="col-span-4 font-mono text-xs text-text-dim">Task</span>
              <span className="col-span-2 font-mono text-xs text-text-dim">Starts</span>
              <span className="col-span-1 font-mono text-xs text-text-dim text-center">In</span>
              <span className="col-span-2 font-mono text-xs text-text-dim">Duration</span>
              <span className="col-span-2 font-mono text-xs text-text-dim text-right">Risk</span>
            </div>

            {tasks.map((task, i) => {
              const days = daysUntil(task.planned_start, statusDate)
              const isUrgent = days !== null && days <= 7
              const isPast   = days !== null && days < 0

              return (
                <div
                  key={task.task_id ?? i}
                  className={clsx(
                    'grid grid-cols-12 gap-3 px-4 py-3.5 items-center transition-colors hover:bg-panel/40',
                    task.is_critical && 'bg-critical/3',
                    isUrgent && !isPast && 'bg-amber/3',
                  )}
                >
                  {/* Rank */}
                  <span className="col-span-1 font-mono text-xs text-text-dim">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Task info */}
                  <div className="col-span-4 min-w-0">
                    <p className="font-mono text-xs text-text-primary truncate">{task.task_name}</p>
                    <p className="font-mono text-xs text-text-dim mt-0.5">{task.task_id}</p>
                  </div>

                  {/* Start date */}
                  <div className="col-span-2">
                    <p className="font-mono text-xs text-text-secondary">
                      {task.planned_start ? formatDate(task.planned_start) : `Day ${task.es}`}
                    </p>
                    <UrgencyBar daysAway={days ?? windowDays} windowDays={windowDays} />
                  </div>

                  {/* Days until */}
                  <div className="col-span-1 text-center">
                    {days === null ? (
                      <span className="font-mono text-xs text-text-dim">—</span>
                    ) : isPast ? (
                      <span className="font-mono text-xs text-critical">started</span>
                    ) : days === 0 ? (
                      <span className="font-mono text-xs text-critical font-medium">today</span>
                    ) : (
                      <span className={clsx(
                        'font-mono text-xs font-medium tabular-nums',
                        days <= 7  ? 'text-critical' :
                        days <= 14 ? 'text-amber' :
                        'text-text-secondary'
                      )}>
                        {days}d
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-text-dim shrink-0" />
                      <span className="font-mono text-xs text-text-dim tabular-nums">
                        {task.duration}d
                      </span>
                    </div>
                  </div>

                  {/* Risk badge */}
                  <div className="col-span-2 flex justify-end">
                    <FloatBadge float={task.total_float} isCritical={task.is_critical} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-critical" />
              <span className="font-mono text-xs text-text-dim">Starting ≤7 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber" />
              <span className="font-mono text-xs text-text-dim">Starting 8–14 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-text-dim/40" />
              <span className="font-mono text-xs text-text-dim">Starting 15+ days</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}