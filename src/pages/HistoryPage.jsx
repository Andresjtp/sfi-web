import { useEffect, useState } from 'react'
import { Clock, TrendingDown, TrendingUp, Minus, RefreshCw } from 'lucide-react'
import { fetchHistory } from '../lib/api.js'
import { sfiRiskBand, pct } from '../lib/utils.js'
import clsx from 'clsx'

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus size={13} className="text-text-dim" />
  if (current < previous) return <TrendingDown size={13} className="text-stable" />
  if (current > previous) return <TrendingUp size={13} className="text-critical" />
  return <Minus size={13} className="text-text-dim" />
}

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory()
      setSnapshots(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label-mono mb-1">Trend Analysis</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            Snapshot History
          </h1>
          <p className="text-text-secondary text-sm mt-2 max-w-lg">
            Saved analysis snapshots over time. Track SFI drift, schedule slippage, and fragility trends across runs.
          </p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="panel p-12 flex items-center justify-center">
          <p className="font-mono text-sm text-text-dim animate-pulse">Loading snapshots…</p>
        </div>
      )}

      {error && (
        <div className="panel p-6 border-critical/30 bg-critical/5">
          <p className="font-mono text-sm text-critical">{error}</p>
          <p className="font-mono text-xs text-text-dim mt-1">
            Make sure the API backend is running and history is enabled.
          </p>
        </div>
      )}

      {!loading && !error && snapshots.length === 0 && (
        <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Clock size={32} className="text-text-dim" />
          <p className="font-mono text-sm text-text-secondary">No snapshots yet</p>
          <p className="font-mono text-xs text-text-dim max-w-sm">
            Run an analysis with history enabled in the API to start building a trend record.
          </p>
        </div>
      )}

      {!loading && snapshots.length > 0 && (
        <>
          {/* SFI trend mini-chart placeholder */}
          <div className="panel p-5 space-y-3">
            <p className="label-mono">SFI Over Time</p>
            <div className="flex items-end gap-1 h-20">
              {snapshots.map((snap, i) => {
                const band = sfiRiskBand(snap.sfi_score)
                const heightPct = (snap.sfi_score / 10) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex items-end" style={{ height: '72px' }}>
                      <div
                        className={clsx('w-full rounded-t transition-all duration-300', band.bg, 'border', band.border)}
                        style={{ height: `${heightPct}%` }}
                        title={`${snap.label}: ${snap.sfi_score}`}
                      />
                    </div>
                    <span className="font-mono text-xs text-text-dim group-hover:text-text-secondary transition-colors truncate w-full text-center">
                      {snap.label ?? `#${i}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Snapshot table */}
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['#', 'Label', 'Date', 'Duration', 'SFI', 'Trend', 'Zero-Float', 'Avg Float'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap, i) => {
                  const band = sfiRiskBand(snap.sfi_score)
                  const prev = snapshots[i - 1]
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-panel/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-text-dim">
                        {String(i).padStart(3, '0')}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        {snap.label ?? '—'}
                        {i === 0 && (
                          <span className="ml-2 font-mono text-xs bg-info/10 text-info border border-info/20 px-1.5 py-0.5 rounded">
                            BASELINE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {snap.created_at ? new Date(snap.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        {snap.project_duration_days ?? '—'}d
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('font-mono text-sm font-medium', band.color)}>
                          {snap.sfi_score?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <TrendIcon
                          current={snap.sfi_score}
                          previous={prev?.sfi_score}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                        {snap.metrics?.zero_float_density != null
                          ? pct(snap.metrics.zero_float_density)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                        {snap.metrics?.average_float != null
                          ? `${snap.metrics.average_float.toFixed(1)}d`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
