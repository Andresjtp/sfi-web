import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Upload, FileText, X, AlertTriangle, ChevronRight,
  Clock, TrendingDown, TrendingUp, Minus, RefreshCw,
  Trash2, ArrowLeft
} from 'lucide-react'
import clsx from 'clsx'
import { getProject, analyzeSchedule, listAnalyses, deleteAnalysis } from '../lib/api.js'
import { sfiRiskBand } from '../lib/utils.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

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

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({ projectId, onAnalysisComplete }) {
  const navigate  = useNavigate()
  const inputRef  = useRef()
  const [file, setFile]             = useState(null)
  const [dragging, setDragging]     = useState(false)
  const [statusDate, setStatusDate] = useState('')
  const [strict, setStrict]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [progress, setProgress]     = useState(0)

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xer'))) { setFile(f); setError(null) }
    else if (f) setError('Please upload a .csv or .xer file.')
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true); setError(null); setProgress(0)
    try {
      const result = await analyzeSchedule(projectId, file, {
        statusDate: statusDate || undefined,
        strict,
        onProgress: setProgress,
      })
      if (result) {
        sessionStorage.setItem('sfi_result', JSON.stringify(result))
        sessionStorage.setItem('sfi_project_id', projectId)
        onAnalysisComplete()
        navigate('/report')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current.click()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer',
          dragging  ? 'border-amber bg-amber/5 shadow-amber-glow'
          : file    ? 'border-stable/40 bg-stable/5 cursor-default'
          :           'border-border hover:border-muted hover:bg-panel/50'
        )}
      >
        <input ref={inputRef} type="file" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText size={28} className="text-stable" />
            <div>
              <p className="font-mono text-text-primary font-medium">{file.name}</p>
              <p className="font-mono text-xs text-text-secondary mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="flex items-center gap-1 text-xs font-mono text-text-dim hover:text-critical transition-colors"
            >
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={28} className="text-text-dim" />
            <div>
              <p className="font-mono text-text-primary">Drop your CSV here</p>
              <p className="font-mono text-xs text-text-secondary mt-1">or click to browse</p>
            </div>
            <p className="font-mono text-xs text-text-dim">
              Required columns: task_id · task_name · duration_days · predecessors
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {loading && progress > 0 && (
        <div className="w-full bg-border rounded-full h-1">
          <div
            className="bg-amber h-1 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Options */}
      <div className="panel p-5 space-y-4">
        <p className="label-mono">Analysis Options</p>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="font-mono text-xs text-text-secondary">
              Status Date <span className="text-text-dim">(optional)</span>
            </label>
            <input type="date" value={statusDate}
              onChange={(e) => setStatusDate(e.target.value)}
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm
                         text-text-primary focus:outline-none focus:border-amber transition-colors" />
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={() => setStrict(s => !s)}
              className={clsx('relative w-10 h-5 rounded-full transition-colors duration-200',
                strict ? 'bg-amber' : 'bg-muted')}>
              <span className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-void transition-transform duration-200',
                strict && 'translate-x-5')} />
            </button>
            <span className="font-mono text-sm text-text-secondary">Strict validation</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 border border-critical/30 bg-critical/5 rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="text-critical mt-0.5 flex-shrink-0" />
          <p className="font-mono text-sm text-critical">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={!file || loading}
          className="btn-primary flex items-center gap-2">
          {loading
            ? <><span className="animate-pulse">Analyzing</span><span className="font-mono text-void/60">...</span></>
            : <>Run Analysis <ChevronRight size={15} /></>
          }
        </button>
      </div>
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ projectId }) {
  const navigate = useNavigate()
  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await listAnalyses(projectId, { pageSize: 50 })
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Remove this analysis from history?')) return
    setDeleting(id)
    try {
      await deleteAnalysis(projectId, id)
      setItems(prev => prev.filter(i => i.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert(`Could not delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return (
    <div className="panel p-12 flex items-center justify-center">
      <p className="font-mono text-sm text-text-dim animate-pulse">Loading history…</p>
    </div>
  )

  if (error) return (
    <div className="panel p-6 border border-critical/30 bg-critical/5">
      <p className="font-mono text-sm text-critical">{error}</p>
    </div>
  )

  if (items.length === 0) return (
    <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
      <Clock size={32} className="text-text-dim" />
      <p className="font-mono text-sm text-text-secondary">No analyses yet for this project</p>
      <p className="font-mono text-xs text-text-dim">
        Upload a CSV from the Analyze tab to get started.
      </p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Mini trend chart */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="label-mono">SFI Over Time</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs text-text-dim">{total} runs</p>
            <button onClick={load} className="btn-ghost text-xs flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
        <div className="flex items-end gap-1" style={{ height: '72px' }}>
          {[...items].reverse().map((item) => {
            const band = sfiRiskBand(item.sfi_score)
            const heightPct = (item.sfi_score / 10) * 100
            return (
              <div key={item.id} className="flex-1 flex flex-col items-center gap-1 group"
                title={`${item.filename} — SFI ${item.sfi_score}`}>
                <div className="relative w-full flex items-end" style={{ height: '60px' }}>
                  <div className={clsx('w-full rounded-t border transition-all duration-300', band.bg, band.border)}
                    style={{ height: `${Math.max(heightPct, 4)}%` }} />
                </div>
                <span className="font-mono text-xs text-text-dim truncate w-full text-center">
                  {item.sfi_score}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['File', 'Date', 'Tasks', 'SFI', 'Risk', 'Trend', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-xs text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const prev = items[i + 1]
              const band = sfiRiskBand(item.sfi_score)
              return (
                <tr key={item.id}
                  onClick={() => navigate(`/report?projectId=${projectId}&analysisId=${item.id}`)}
                  className="border-b border-border/50 hover:bg-panel/50 transition-colors cursor-pointer group">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary max-w-[180px] truncate">
                    {item.filename}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-dim whitespace-nowrap">
                    {formatDate(item.analyzed_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-primary">
                    {item.task_count ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('font-mono text-sm font-medium', band.text)}>
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
                    <button onClick={(e) => handleDelete(item.id, e)}
                      disabled={deleting === item.id}
                      className="text-text-dim hover:text-critical transition-colors disabled:opacity-40"
                      title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate      = useNavigate()
  const [project, setProject]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('analyze')   // 'analyze' | 'history'
  const [historyKey, setHistoryKey] = useState(0)       // bump to refresh history

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProject(projectId)
        setProject(data)
      } catch {
        navigate('/projects')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  if (loading) return (
    <div className="panel p-12 flex items-center justify-center">
      <p className="font-mono text-sm text-text-dim animate-pulse">Loading project…</p>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <button onClick={() => navigate('/projects')}
          className="flex items-center gap-1 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-3">
          <ArrowLeft size={12} /> All Projects
        </button>
        <p className="label-mono mb-1">Project</p>
        <h1 className="font-mono text-2xl font-medium text-text-primary">
          {project?.name}
        </h1>
        {project?.description && (
          <p className="font-mono text-sm text-text-dim mt-1">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'analyze', label: 'Analyze' },
          { id: 'history', label: 'History' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'font-mono text-sm px-4 py-2 border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-amber text-text-primary'
                : 'border-transparent text-text-dim hover:text-text-secondary'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'analyze' && (
        <UploadTab
          projectId={projectId}
          onAnalysisComplete={() => {
            setHistoryKey(k => k + 1)
            setTab('history')
          }}
        />
      )}
      {tab === 'history' && (
        <HistoryTab key={historyKey} projectId={projectId} />
      )}
    </div>
  )
}