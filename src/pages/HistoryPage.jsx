import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingDown, TrendingUp, Minus, RefreshCw, Trash2, ExternalLink } from 'lucide-react'
import { fetchHistory, deleteAnalysis } from '../lib/api.js'
import { sfiRiskBand } from '../lib/utils.js'
import clsx from 'clsx'

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus size={13} className="text-text-dim" />
  if (current < previous) return <TrendingDown size={13} className="text-stable" />
  if (current > previous) return <TrendingUp size={13} className="text-critical" />
  return <Minus size={13} className="text-text-dim" />
}

function RiskBadge({ label }) {
  const colors = {
    'Low Risk':      'text-stable border-stable/40 bg-stable/10',
    'Moderate Risk': 'text-amber border-amber/40 bg-amber/10',
    'High Risk':     'text-critical border-critical/40 bg-critical/10',
    'Critical Risk': 'text-critical border-critical/60 bg-critical/20',
  }
  return (
    <span className={clsx(
      'font-mono text-xs px-2 py-0.5 rounded border',
      colors[label] ?? 'text-text-dim border-border'
    )}>
      {label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(1, 50)
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (projectId, analysisId, e) => {
    e.stopPropagation()
    if (!window.confirm('Remove this analysis from history?')) return
    setDeleting(analysisId)
    try {
      await deleteAnalysis(projectId, analysisId)
      setItems(prev => prev.filter(item => item.id !== analysisId))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert(`Could not delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

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
            Every analysis you run is saved here. Track SFI drift, schedule
            slippage, and fragility trends across uploads.
          </p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="panel p-12 flex items-center justify-center">
          <p className="font-mono text-sm text-text-dim animate-pulse">
            Loading history…
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="panel p-6 border border-critical/30 bg-critical/5 space-y-1">
          <p className="font-mono text-sm text-critical">{error}</p>
          <p className="font-mono text-xs text-text-dim">
            Make sure the API backend is running on port 8000.
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Clock size={32} className="text-text-dim" />
          <p className="font-mono text-sm text-text-secondary">No analyses yet</p>
          <p className="font-mono text-xs text-text-dim max-w-sm">
            Run your first analysis from the Upload page — it will appear here automatically.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-2 text-sm"
          >
            Upload a Schedule
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && items.length > 0 && (
        <>
          {/* SFI Trend Mini-Chart */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="label-mono">SFI Over Time</p>
              <p className="font-mono text-xs text-text-dim">{total} total runs</p>
            </div>
            <div className="flex items-end gap-1" style={{ height: '80px' }}>
              {[...items].reverse().map((item) => {
                const band = sfiRiskBand(item.sfi_score)
                const heightPct = (item.sfi_score / 10) * 100
                return (
                  <div
                    key={item.id}
                    className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                    title={`${item.project_name} — SFI ${item.sfi_score}`}
                  >
                    <div className="relative w-full flex items-end" style={{ height: '68px' }}>
                      <div
                        className={clsx(
                          'w-full rounded-t transition-all duration-300 border',
                          band.bg, band.border
                        )}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-text-dim truncate w-full text-center">
                      {item.sfi_score}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* History Table */}
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Project', 'File', 'Date', 'Tasks', 'SFI', 'Risk', 'Trend', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-text-secondary whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const prev = items[i + 1]
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-panel/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-text-primary max-w-[140px] truncate">
                        {item.project_name || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary max-w-[140px] truncate">
                        {item.filename}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-dim whitespace-nowrap">
                        {formatDate(item.analyzed_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        {item.task_count ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'font-mono text-sm font-medium',
                          sfiRiskBand(item.sfi_score).text
                        )}>
                          {item.sfi_score?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge label={item.sfi_label} />
                      </td>
                      <td className="px-4 py-3">
                        <TrendIcon current={item.sfi_score} previous={prev?.sfi_score} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/report?projectId=${item.project_id}&analysisId=${item.id}`)}
                            className="text-text-dim hover:text-text-primary transition-colors"
                            title="View report"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.project_id, item.id, e)}
                            disabled={deleting === item.id}
                            className="text-text-dim hover:text-critical transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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