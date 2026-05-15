import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader } from 'lucide-react'
import SFIGauge from '../components/dashboard/SFIGauge.jsx'
import MetricsGrid from '../components/dashboard/MetricsGrid.jsx'
import TaskTable from '../components/dashboard/TaskTable.jsx'
import FloatChart from '../components/dashboard/FloatChart.jsx'
import ProgressPanel from '../components/dashboard/ProgressPanel.jsx'
import { fetchAnalysis } from '../lib/api.js'

export default function ReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const projectId  = searchParams.get('projectId')
    const analysisId = searchParams.get('analysisId')

    // ── Path A: loaded from history link (?projectId=...&analysisId=...)
    if (projectId && analysisId) {
      setLoading(true)
      fetchAnalysis(projectId, analysisId)
        .then(data => {
          setResult(data)
          sessionStorage.setItem('sfi_result', JSON.stringify(data))
          sessionStorage.setItem('sfi_project_id', projectId)
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
      return
    }

    // ── Path B: arrived from a fresh analysis run (sessionStorage)
    const stored = sessionStorage.getItem('sfi_result')
    if (stored) {
      try {
        setResult(JSON.parse(stored))
      } catch {
        setError('Could not parse stored result.')
      }
    } else {
      navigate('/projects')
    }
    setLoading(false)
  }, [])

  const handleBack = () => {
    const projectId = searchParams.get('projectId')
                   || sessionStorage.getItem('sfi_project_id')
    if (projectId) {
      navigate(`/projects/${projectId}`)
    } else {
      navigate('/projects')
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `sfi-report-${result?.filename?.replace('.csv', '') ?? 'export'}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 font-mono text-sm text-text-dim">
        <Loader size={16} className="animate-spin" />
        Loading report…
      </div>
    </div>
  )

  if (error) return (
    <div className="space-y-4">
      <button onClick={handleBack}
        className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors">
        <ArrowLeft size={12} /> Back
      </button>
      <div className="panel p-6 border border-critical/30 bg-critical/5">
        <p className="font-mono text-sm text-critical">{error}</p>
        <p className="font-mono text-xs text-text-dim mt-1">
          The analysis may have been deleted or the backend is unreachable.
        </p>
      </div>
    </div>
  )

  if (!result) return null

  const {
    sfi_score, project_duration, task_count, metrics,
    tasks = [], progress, status_date,
    filename, project_name, analyzed_at,
    near_critical_tasks = [], float_distribution = [],
  } = result

  const criticalCount = result.critical_path_length
    ?? tasks.filter(t => t.is_critical).length

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={handleBack}
            className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-3">
            <ArrowLeft size={12} /> Back to Project
          </button>
          <p className="label-mono mb-1">Schedule Fragility Report</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            {project_name || 'Analysis Results'}
          </h1>
          {filename && (
            <p className="font-mono text-xs text-text-dim mt-1">
              {filename}
              {analyzed_at && ` · ${new Date(analyzed_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}`}
            </p>
          )}
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2">
          <Download size={14} /> Export JSON
        </button>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="panel p-6 flex flex-col items-center justify-center col-span-1">
          <p className="label-mono mb-4">Fragility Index</p>
          <SFIGauge score={sfi_score} />
        </div>
        <div className="col-span-3 grid grid-cols-3 gap-3">
          {[
            { label: 'Project Duration', value: project_duration ?? '—', unit: 'days' },
            { label: 'Total Tasks',      value: task_count ?? tasks.length ?? '—', unit: 'tasks' },
            { label: 'Critical Tasks',   value: criticalCount ?? '—', unit: 'tasks' },
            { label: 'SFI Score',        value: sfi_score?.toFixed(2) ?? '—', unit: '/ 10' },
            { label: 'Risk Level',       value: result.sfi_label ?? '—', unit: '' },
            { label: 'Risk Trend',       value: result.risk_trend ?? 'stable', unit: '' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="panel p-4">
              <p className="label-mono mb-2">{label}</p>
              <p className="font-mono text-2xl font-semibold text-text-primary leading-none">
                {value}
                {unit && <span className="text-sm text-text-dim ml-1.5">{unit}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {metrics && <MetricsGrid metrics={metrics} />}

      {float_distribution.length > 0 && (
        <div className="panel p-5 space-y-3">
          <p className="label-mono">Float Distribution</p>
          <FloatChart data={float_distribution} />
        </div>
      )}

      {near_critical_tasks.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="label-mono">Near-Critical Tasks</p>
            <p className="font-mono text-xs text-text-dim mt-0.5">
              Tasks with total float ≤ 5 days — highest delay risk
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['ID', 'Name', 'Total Float', 'Duration'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-xs text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {near_critical_tasks.map((task, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-panel/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-text-dim">{task.id}</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-primary">{task.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-sm font-medium ${
                      task.total_float === 0 ? 'text-critical' :
                      task.total_float <= 2  ? 'text-amber'    : 'text-text-primary'
                    }`}>
                      {task.total_float}d
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">
                    {task.duration}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tasks.length > 0 && <TaskTable tasks={tasks} />}
      {progress && <ProgressPanel progress={progress} statusDate={status_date} />}

    </div>
  )
}