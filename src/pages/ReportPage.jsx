import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import SFIGauge from '../components/dashboard/SFIGauge.jsx'
import MetricsGrid from '../components/dashboard/MetricsGrid.jsx'
import TaskTable from '../components/dashboard/TaskTable.jsx'
import FloatChart from '../components/dashboard/FloatChart.jsx'
import ProgressPanel from '../components/dashboard/ProgressPanel.jsx'

export default function ReportPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [result, setResult] = useState(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('sfi_result')
    if (stored) {
      try { setResult(JSON.parse(stored)) }
      catch { navigate(projectId ? `/projects/${projectId}` : '/') }
    } else {
      navigate(projectId ? `/projects/${projectId}` : '/')
    }
  }, [navigate, projectId])

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

  const backPath = projectId ? `/projects/${projectId}` : '/'
  const backLabel = projectId ? 'Back to Project' : 'Back to Upload'

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-3"
          >
            <ArrowLeft size={12} /> {backLabel}
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
        <div className="panel p-6 flex flex-col items-center justify-center col-span-1">
          <p className="label-mono mb-4">Fragility Index</p>
          <SFIGauge score={sfi_score} />
        </div>

        <div className="col-span-3 grid grid-cols-3 gap-3">
          {[
            { label: 'Project Duration', value: `${project_duration}`, unit: 'days' },
            { label: 'Total Tasks',      value: `${total_tasks}`,      unit: 'tasks' },
            { label: 'Critical Tasks',   value: `${criticalCount}`,    unit: 'tasks' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="panel p-5">
              <p className="label-mono mb-3">{label}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-medium text-text-primary">{value ?? '—'}</span>
                <span className="font-mono text-sm text-text-dim">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {progress && (
        <ProgressPanel progress={progress} statusDate={status_date} />
      )}

      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-2 gap-6">
        <FloatChart tasks={tasks} />

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

      <TaskTable tasks={tasks} />
    </div>
  )
}