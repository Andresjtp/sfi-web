import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, TrendingDown, TrendingUp, Minus,
  RefreshCw, ChevronRight, GitCompare, X, CalendarDays,
} from 'lucide-react'
import { fetchProjectHistory, fetchFullAnalysis } from '../lib/api.js'
import { sfiRiskBand } from '../lib/utils.js'
import clsx from 'clsx'

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus size={13} className="text-text-dim" />
  if (current < previous) return <TrendingDown size={13} className="text-stable" />
  if (current > previous) return <TrendingUp size={13} className="text-critical" />
  return <Minus size={13} className="text-text-dim" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectHistoryTab({ projectId, onCompare }) {
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Compare-mode: separate flag so entering compare mode doesn't require a selection
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected]       = useState([])   // array of { id, label }

  const load = async () => {
    setLoading(true)
    setError(null)
    setSelected([])
    setCompareMode(false)
    try {
      const data = await fetchProjectHistory(projectId)
      setSnapshots(data.items ?? data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const handleViewReport = async (snapshot) => {
    if (compareMode) return   // row clicks are handled by toggleSelect in compare mode
    try {
      const full = await fetchFullAnalysis(snapshot.project_id, snapshot.id)
      sessionStorage.setItem('sfi_result', JSON.stringify(full))
      navigate(`/projects/${projectId}/report`)
    } catch (e) {
      setError('Could not load report: ' + e.message)
    }
  }

  const toggleSelect = (snap) => {
    const label = snap.analyzed_at
      ? new Date(snap.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : snap.id.slice(0, 8)

    setSelected(prev => {
      const already = prev.findIndex(s => s.id === snap.id)
      if (already !== -1) {
        // Deselect
        return prev.filter(s => s.id !== snap.id)
      }
      if (prev.length >= 2) {
        // Replace the oldest selection with the new one
        return [prev[1], { id: snap.id, label }]
      }
      return [...prev, { id: snap.id, label }]
    })
  }

  const handleCompare = () => {
    if (selected.length !== 2) return
    onCompare(selected[0].id, selected[1].id, selected[0].label, selected[1].label)
  }

  const clearCompare = () => { setSelected([]); setCompareMode(false) }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-mono mb-1">Analysis History</p>
          <p className="text-text-secondary text-sm font-body max-w-lg">
            All analyses run for this project. Click any row to view the full report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <button
                onClick={clearCompare}
                className="btn-ghost flex items-center gap-1.5 text-text-dim"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={handleCompare}
                disabled={selected.length < 2}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-colors',
                  selected.length === 2
                    ? 'bg-amber text-bg-primary hover:bg-amber/90'
                    : 'bg-amber/20 text-amber/50 cursor-not-allowed',
                )}
              >
                <GitCompare size={13} />
                Compare{selected.length === 2 ? '' : ` (${selected.length}/2)`}
              </button>
            </>
          ) : (
            <>
              {snapshots.length >= 2 && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="btn-ghost flex items-center gap-1.5"
                  title="Select two rows to compare"
                >
                  <GitCompare size={14} className="text-text-dim" />
                  <span className="font-mono text-xs text-text-dim">Compare</span>
                </button>
              )}
              <button onClick={load} className="btn-ghost flex items-center gap-2">
                <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div className="panel px-4 py-2.5 border-amber/20 bg-amber/5 flex items-center gap-3">
          <GitCompare size={13} className="text-amber shrink-0" />
          <p className="font-mono text-xs text-text-secondary flex-1">
            {selected.length === 0
              ? 'Select two analyses to compare.'
              : selected.length === 1
              ? 'Select one more analysis to compare.'
              : `Comparing ${selected[0].label} → ${selected[1].label}. Click Compare to view the drift report.`}
          </p>
          <div className="flex items-center gap-2">
            {selected.map(s => (
              <span key={s.id} className="font-mono text-xs px-2 py-0.5 bg-amber/10 text-amber rounded">
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading / error / empty states */}
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

      {/* Snapshot list */}
      {!loading && !error && snapshots.length > 0 && (
        <div className="panel divide-y divide-border/50">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5">
            {compareMode && <span className="col-span-1" />}
            <span className={clsx('font-mono text-xs text-text-dim', compareMode ? 'col-span-1' : 'col-span-1')}>#</span>
            <span className={clsx('font-mono text-xs text-text-dim', compareMode ? 'col-span-3' : 'col-span-3')}>Date</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">SFI Score</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">Risk</span>
            <span className="col-span-2 font-mono text-xs text-text-dim">Tasks</span>
            <span className="col-span-1 font-mono text-xs text-text-dim">Trend</span>
            <span className="col-span-1" />
          </div>

          {snapshots.map((snap, i) => {
            const band     = sfiRiskBand(snap.sfi_score)
            const prev     = snapshots[i - 1]
            const isSelected = selected.some(s => s.id === snap.id)
            const selIdx   = selected.findIndex(s => s.id === snap.id)

            const rowClick = compareMode
              ? () => toggleSelect(snap)
              : () => handleViewReport(snap)

            return (
              <button
                key={snap.id ?? i}
                onClick={rowClick}
                className={clsx(
                  'w-full grid grid-cols-12 gap-4 px-4 py-3.5 transition-colors text-left group',
                  isSelected
                    ? 'bg-amber/8 hover:bg-amber/12'
                    : 'hover:bg-panel/60',
                )}
              >
                {/* Selection indicator in compare mode */}
                {compareMode && (
                  <span className="col-span-1 flex items-center">
                    <span className={clsx(
                      'w-4 h-4 rounded-full border flex items-center justify-center font-mono text-[10px]',
                      isSelected
                        ? 'border-amber bg-amber text-bg-primary'
                        : 'border-border text-text-dim',
                    )}>
                      {isSelected ? selIdx + 1 : ''}
                    </span>
                  </span>
                )}

                <span className={clsx(
                  'font-mono text-xs text-text-dim',
                  compareMode ? 'col-span-1' : 'col-span-1',
                )}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={clsx(
                  'font-mono text-xs text-text-secondary',
                  compareMode ? 'col-span-2' : 'col-span-3',
                )}>
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
                <span className="col-span-1 flex items-center justify-end gap-2">
                  {!compareMode && (
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/projects/${projectId}/analyses/${snap.id}/schedule`) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-panel/60"
                      title="View full schedule"
                    >
                      <CalendarDays size={13} className="text-text-dim hover:text-amber transition-colors" />
                    </button>
                  )}
                  {compareMode
                    ? null
                    : <ChevronRight size={14} className="text-text-dim group-hover:text-text-secondary transition-colors" />
                  }
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Hint for compare mode entry */}
      {!compareMode && snapshots.length >= 2 && (
        <p className="font-mono text-xs text-text-dim text-center">
          Click <GitCompare size={11} className="inline mb-0.5" /> Compare above to select two analyses and run a drift report.
        </p>
      )}
    </div>
  )
}