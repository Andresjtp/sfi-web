import { useState, useEffect } from 'react'
import { RefreshCw, TrendingDown, TrendingUp, Minus, Activity, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import clsx from 'clsx'
import { fetchProjectTrend } from '../lib/api.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS = {
  zero_float_density:   'Zero-float density',
  critical_chain_ratio: 'Critical chain ratio',
  dependency_density:   'Dependency density',
  float_variance:       'Float variance',
  task_compression:     'Task compression',
  non_fs_ratio:         'Non-FS ratio',
  low_float_ratio:      'Low-float ratio',
}

// SFI risk band thresholds → color tokens
const sfiColor = score => {
  if (score <= 3.0) return '#4ade80'   // green / stable
  if (score <= 5.5) return '#f59e0b'   // amber
  if (score <= 7.5) return '#fb923c'   // orange
  return '#f87171'                      // red / critical
}

const directionConfig = {
  improving: { icon: TrendingDown, colorClass: 'text-stable',   bgClass: 'bg-stable/10',   label: 'Improving' },
  worsening: { icon: TrendingUp,   colorClass: 'text-critical', bgClass: 'bg-critical/10', label: 'Worsening' },
  stable:    { icon: Minus,        colorClass: 'text-amber',    bgClass: 'bg-amber/10',    label: 'Stable' },
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function DirectionBadge({ direction }) {
  const cfg = directionConfig[direction] ?? directionConfig.stable
  const Icon = cfg.icon
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-medium',
      cfg.colorClass, cfg.bgClass,
    )}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className="panel px-4 py-3 flex flex-col gap-1">
      <span className="font-mono text-xs text-text-dim uppercase tracking-wider">{label}</span>
      <span className={clsx(
        'font-mono text-2xl font-medium tabular-nums',
        highlight ?? 'text-text-primary',
      )}>
        {value}
      </span>
      {sub && <span className="font-mono text-xs text-text-dim">{sub}</span>}
    </div>
  )
}

// Sparkline for a single metric
function MetricSparkline({ label, series }) {
  if (!series || series.length < 2) return null
  const values = series.map(p => p.value)
  const first = values[0]
  const last  = values[values.length - 1]
  const delta = last - first
  const dir   = delta > 0.02 ? 'worsening' : delta < -0.02 ? 'improving' : 'stable'
  const lineColor = dir === 'worsening' ? '#f87171' : dir === 'improving' ? '#4ade80' : '#6b7280'

  const data = series.map((p, i) => ({ i, value: p.value }))

  return (
    <div className="panel px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-text-secondary truncate">{label}</p>
        <p className="font-mono text-xs text-text-dim mt-0.5">
          {first.toFixed(3)} → {last.toFixed(3)}
          <span className={clsx(
            'ml-2',
            dir === 'worsening' ? 'text-critical' : dir === 'improving' ? 'text-stable' : 'text-text-dim',
          )}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
          </span>
        </p>
      </div>
      <div style={{ width: 80, height: 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Custom tooltip for the main SFI chart
function SFITooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="panel px-3 py-2 text-xs font-mono space-y-0.5 shadow-lg">
      <p className="text-text-dim">{d.dateLabel}</p>
      <p className="text-text-primary">
        SFI <span style={{ color: sfiColor(d.sfi_score) }}>{d.sfi_score?.toFixed(2)}</span>
      </p>
      <p className="text-text-dim">{d.filename}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrendTab({ projectId }) {
  const [trend, setTrend]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchProjectTrend(projectId)
      .then(setTrend)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center gap-2 text-text-dim font-mono text-sm py-12">
      <RefreshCw size={14} className="animate-spin" /> Loading trend data…
    </div>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="panel p-6 border-critical/30 bg-critical/5 space-y-1">
      <p className="font-mono text-sm text-critical">Failed to load trend data</p>
      <p className="font-mono text-xs text-text-dim">{error}</p>
    </div>
  )

  // ── No data / insufficient ─────────────────────────────────────────────────
  if (!trend || trend.snapshots === 0) return (
    <div className="panel p-12 flex flex-col items-center gap-3 text-center">
      <Activity size={32} className="text-text-dim" />
      <p className="font-mono text-sm text-text-secondary">No trend data yet</p>
      <p className="font-mono text-xs text-text-dim max-w-sm">
        Run at least two analyses on the Analyze tab to start tracking schedule health over time.
      </p>
    </div>
  )

  if (!trend.sufficient_data) return (
    <div className="panel p-8 flex flex-col items-center gap-3 text-center">
      <AlertTriangle size={24} className="text-amber" />
      <p className="font-mono text-sm text-text-secondary">Need one more analysis</p>
      <p className="font-mono text-xs text-text-dim max-w-sm">
        Upload another schedule to start seeing trend direction and drift detection.
      </p>
    </div>
  )

  // ── Prepare chart data ─────────────────────────────────────────────────────
  const chartData = trend.timeline.map(pt => ({
    ...pt,
    dateLabel: pt.analyzed_at
      ? new Date(pt.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—',
    color: sfiColor(pt.sfi_score),
  }))

  // Risk band reference lines
  const refLines = [
    { y: 3.0, label: 'Low',      color: '#4ade8060' },
    { y: 5.5, label: 'Moderate', color: '#f59e0b60' },
    { y: 7.5, label: 'High',     color: '#fb923c60' },
  ]

  // Metric sparklines — only show metrics that have ≥2 data points
  const sparklineMetrics = Object.entries(trend.metric_trends ?? {})
    .filter(([, series]) => series.length >= 2)
    .sort(([a], [b]) => (METRIC_LABELS[a] ?? a).localeCompare(METRIC_LABELS[b] ?? b))

  const deltaPctLabel = trend.sfi_delta_pct != null
    ? `${trend.sfi_delta_pct > 0 ? '+' : ''}${trend.sfi_delta_pct.toFixed(1)}%`
    : null

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label-mono mb-1">Schedule Health Pulse</p>
          <p className="text-text-secondary text-sm font-body max-w-lg">
            SFI score over time across {trend.snapshots} {trend.snapshots === 1 ? 'analysis' : 'analyses'}.
            Track whether fragility is improving or worsening as the project progresses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DirectionBadge direction={trend.direction} />
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Current SFI"
          value={trend.latest_sfi.toFixed(2)}
          highlight={sfiColor(trend.latest_sfi) !== '#6b7280' ? undefined : 'text-text-primary'}
          sub="latest analysis"
        />
        <StatCard
          label="Starting SFI"
          value={trend.earliest_sfi.toFixed(2)}
          sub="first analysis"
        />
        <StatCard
          label="Total drift"
          value={`${trend.sfi_delta >= 0 ? '+' : ''}${trend.sfi_delta.toFixed(2)}`}
          sub={deltaPctLabel ?? 'across all snapshots'}
          highlight={trend.sfi_delta > 0.15 ? 'text-critical' : trend.sfi_delta < -0.15 ? 'text-stable' : 'text-text-primary'}
        />
        <StatCard
          label="Snapshots"
          value={trend.snapshots}
          sub="total uploads"
        />
      </div>

      {/* Worst metric callout */}
      {trend.worst_metric && (
        <div className="panel px-4 py-3 border-amber/20 bg-amber/5 flex items-center gap-3">
          <AlertTriangle size={14} className="text-amber shrink-0" />
          <p className="font-mono text-xs text-text-secondary">
            <span className="text-amber font-medium">{trend.worst_metric.label}</span>
            {' '}has worsened the most — up {trend.worst_metric.delta.toFixed(3)}
            {trend.worst_metric.delta_pct != null && (
              <span className="text-text-dim"> ({trend.worst_metric.delta_pct > 0 ? '+' : ''}{trend.worst_metric.delta_pct.toFixed(1)}%)</span>
            )}
            {' '}since the first analysis.
          </p>
        </div>
      )}

      {/* SFI timeline chart */}
      <div className="panel px-4 pt-4 pb-2">
        <p className="font-mono text-xs text-text-dim mb-4 uppercase tracking-wider">SFI score over time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            {refLines.map(r => (
              <ReferenceLine
                key={r.y}
                y={r.y}
                stroke={r.color}
                strokeDasharray="4 4"
                label={{
                  value: r.label,
                  position: 'insideTopRight',
                  style: { fontSize: 10, fontFamily: 'monospace', fill: r.color },
                }}
              />
            ))}
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-dim, #6b7280)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-dim, #6b7280)' }}
              axisLine={false}
              tickLine={false}
              tickCount={6}
            />
            <Tooltip content={<SFITooltip />} />
            <Line
              type="monotone"
              dataKey="sfi_score"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props
                return (
                  <circle
                    key={`dot-${payload.analysis_id}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={sfiColor(payload.sfi_score)}
                    stroke="var(--color-bg, #0f1117)"
                    strokeWidth={1.5}
                  />
                )
              }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-metric sparklines */}
      {sparklineMetrics.length > 0 && (
        <div>
          <p className="label-mono mb-3">Metric trends</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sparklineMetrics.map(([key, series]) => (
              <MetricSparkline
                key={key}
                label={METRIC_LABELS[key] ?? key}
                series={series}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}