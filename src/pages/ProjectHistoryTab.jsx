import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingDown, TrendingUp, Minus, RefreshCw, ChevronRight } from 'lucide-react'
import { fetchProjectHistory, fetchFullAnalysis } from '../lib/api.js'
import { sfiRiskBand } from '../lib/utils.js'
import clsx from 'clsx'

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus size={13} className="text-text-dim" />
  if (current < previous) return <TrendingDown size={13} className="text-stable" />
  if (current > previous) return <TrendingUp size={13} className="text-critical" />
  return <Minus size={13} className="text-text-dim" />
}

export default function ProjectHistoryTab({ projectId }) {
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjectHistory(projectId)
      // API returns { items: [], total, page, page_size }
      setSnapshots(data.items ?? data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const handleViewReport = async (snapshot) => {
  try {
    const full = await fetchFullAnalysis(snapshot.project_id, snapshot.id)
    sessionStorage.setItem('sfi_result', JSON.stringify(full))
    navigate(`/projects/${projectId}/report`)
  } catch (e) {
    setError('Could not load report: ' + e.message)
  }
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-mono mb-1">Analysis History</p>
          <p className="text-text-secondary text-sm font-body max-w-lg">
            All analyses run for this project. Click any row to view the full report.
          </p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="panel p-12 flex items-center justify-center">
          <p className="font-mono text-sm text-text-dim animate-pulse">Loading history…</p>
        </div>
      )}

      {error && (
        <div className="panel p-6 border-critical/30 bg-critical/5">
          <p className="font-mono text-sm text-critical">{error}</p>
          <p className="font-mono text-xs text-text-dim mt-1">
            Make sure the backend is running and this project has analyses saved.
          </p>
        </div>
      )}

      {!loading && !error && snapshots.length === 0 && (
        <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Clock size={32} className="text-text-dim" />
          <p className="font-mono text-sm text-text-secondary">No analyses yet</p>
          <p className="font-mono text-xs text-text-dim max-w-sm">
            Run your first analysis on the Analyze tab to start building a history.
          </p>
        </div>
      )}

      {!loading && !error && snapshots.length > 0 && (
        <div className="panel divide-y divide-border/50">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5">
            <span className="col-span-1 font-mono text-xs text-text-dim">#</span>
            <span className="col-span-3 font-mono text-xs text-text-dim">Date</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">SFI Score</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">Risk</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">Tasks</span>
            <span className="col-span-1 font-mono text-xs text-text-dim">Trend</span>
            <span className="col-span-1" />
          </div>

          {snapshots.map((snap, i) => {
            const band = sfiRiskBand(snap.sfi_score)
            const prev = snapshots[i - 1]
            return (
              <button
                key={snap.id ?? i}
                onClick={() => handleViewReport(snap)}
                className="w-full grid grid-cols-12 gap-4 px-4 py-3.5 hover:bg-panel/60 transition-colors text-left group"
              >
                <span className="col-span-1 font-mono text-xs text-text-dim">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="col-span-3 font-mono text-xs text-text-secondary">
                  {snap.analyzed_at
                    ? new Date(snap.analyzed_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </span>
                <span className="col-span-2 font-mono text-sm font-medium text-text-primary">
                  {snap.sfi_score?.toFixed(2) ?? '—'}
                </span>
                <span className={clsx(
                  'col-span-2 font-mono text-xs px-2 py-0.5 rounded self-center w-fit',
                  band.label === 'LOW RISK'  && 'bg-stable/15 text-stable',
                  band.label === 'MODERATE'  && 'bg-amber/15 text-amber',
                  band.label === 'HIGH RISK' && 'bg-critical/15 text-critical',
                )}>
                  {band.label}
                </span>
                <span className="col-span-2 font-mono text-xs text-text-secondary">
                  {snap.task_count != null ? `${snap.task_count} tasks` : '—'}
                </span>
                <span className="col-span-1 flex items-center">
                  <TrendIcon current={snap.sfi_score} previous={prev?.sfi_score} />
                </span>
                <span className="col-span-1 flex items-center justify-end">
                  <ChevronRight size={14} className="text-text-dim group-hover:text-text-secondary transition-colors" />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}