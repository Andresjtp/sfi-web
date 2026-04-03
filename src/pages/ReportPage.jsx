import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import SFIGauge from '../components/dashboard/SFIGauge.jsx'
import MetricsGrid from '../components/dashboard/MetricsGrid.jsx'
import TaskTable from '../components/dashboard/TaskTable.jsx'
import FloatChart from '../components/dashboard/FloatChart.jsx'
import ProgressPanel from '../components/dashboard/ProgressPanel.jsx'

export default function ReportPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('sfi_result')
    if (stored) {
      try { setResult(JSON.parse(stored)) }
      catch { navigate('/') }
    } else {
      navigate('/')
    }
  }, [navigate])

  if (!result) return null

  const { sfi_score, project_duration, total_tasks, metrics, tasks = [], progress, status_date } = result

  const criticalCount = tasks.filter(t => t.is_critical).length

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `sfi-report-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-3"
          >
            <ArrowLeft size={12} /> Back to Upload
          </button>
          <p className="label-mono mb-1">Schedule Fragility Report</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            Analysis Results
          </h1>
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2">
          <Download size={14} /> Export JSON
        </button>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-4 gap-4">
        {/* SFI Gauge */}
        <div className="panel p-6 flex flex-col items-center justify-center col-span-1">
          <p className="label-mono mb-4">Fragility Index</p>
          <SFIGauge score={sfi_score} />
        </div>

        {/* Summary stats */}
        <div className="col-span-3 grid grid-cols-3 gap-3">
          {[
            { label: 'Project Duration', value: `${project_duration}`, unit: 'days' },
            { label: 'Total Tasks',      value: `${total_tasks}`,       unit: 'tasks' },
            { label: 'Critical Tasks',   value: `${criticalCount}`,     unit: `of ${total_tasks}` },
          ].map(({ label, value, unit }) => (
            <div key={label} className="panel p-4 space-y-2">
              <p className="label-mono">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="metric-value">{value}</span>
                <span className="font-mono text-sm text-text-dim">{unit}</span>
              </div>
            </div>
          ))}

          {/* Dependency density + compression quick stats */}
          {[
            { label: 'Dependency Density',      value: metrics.dependency_density?.toFixed(2),                 unit: 'edges/task' },
            { label: 'Avg Float',                value: metrics.average_float?.toFixed(1),                       unit: 'days' },
            { label: 'Zero-Float Tasks',         value: `${(metrics.zero_float_density * total_tasks).toFixed(0)}`, unit: `of ${total_tasks}` },
          ].map(({ label, value, unit }) => (
            <div key={label} className="panel p-4 space-y-2">
              <p className="label-mono">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="metric-value">{value ?? '—'}</span>
                <span className="font-mono text-sm text-text-dim">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress (only if status_date was provided) */}
      {progress && (
        <ProgressPanel progress={progress} statusDate={status_date} />
      )}

      {/* Metrics grid */}
      <MetricsGrid metrics={metrics} />

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <FloatChart tasks={tasks} />

        {/* Top risk tasks list */}
        <div>
          <p className="label-mono mb-4">Top Risk Tasks</p>
          <div className="panel divide-y divide-border/50">
            {tasks
              .slice()
              .sort((a, b) => a.total_float - b.total_float || a.es - b.es)
              .slice(0, 8)
              .map((task, i) => (
                <div key={task.task_id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-text-dim w-5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-text-primary truncate">{task.task_name}</p>
                      <p className="font-mono text-xs text-text-dim">{task.task_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {task.is_critical && <span className="tag-critical">CRIT</span>}
                    <span className={
                      task.total_float === 0
                        ? 'font-mono text-sm font-medium text-critical'
                        : task.total_float <= 2
                        ? 'font-mono text-sm font-medium text-warning'
                        : 'font-mono text-sm text-text-secondary'
                    }>
                      {task.total_float}d
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Full task table */}
      <TaskTable tasks={tasks} />
    </div>
  )
}
