import { useEffect, useState } from 'react'
import { RefreshCw, Table } from 'lucide-react'
import TaskTable from '../components/dashboard/TaskTable.jsx'
import { fetchProjectHistory, fetchFullAnalysis } from '../lib/api.js'

export default function ScheduleTab({ projectId }) {
  const [tasks, setTasks]       = useState(null)   // null = not loaded yet
  const [meta, setMeta]         = useState(null)   // { filename, analyzed_at, task_count }
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load the most recent analysis for this project
      const history = await fetchProjectHistory(projectId)
      const items   = history.items ?? history ?? []

      if (items.length === 0) {
        setTasks([])
        setLoading(false)
        return
      }

      const latest = items[0]
      const full   = await fetchFullAnalysis(latest.project_id ?? projectId, latest.id)

      setTasks(full.tasks ?? [])
      setMeta({
        filename:    full.filename,
        analyzed_at: full.analyzed_at,
        task_count:  full.task_count,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="panel p-12 flex items-center justify-center">
        <p className="font-mono text-sm text-text-dim animate-pulse">Loading schedule…</p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="panel p-6 border-critical/30 bg-critical/5">
        <p className="font-mono text-sm text-critical">{error}</p>
        <button onClick={load} className="btn-ghost flex items-center gap-2 mt-3 text-sm">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    )
  }

  // ── No analyses yet ───────────────────────────────────────────────────────
  if (tasks !== null && tasks.length === 0) {
    return (
      <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
        <Table size={32} className="text-text-dim" />
        <p className="font-mono text-sm text-text-secondary">No schedule data yet</p>
        <p className="font-mono text-xs text-text-dim max-w-sm">
          Run an analysis on the Analyze tab to populate the schedule.
        </p>
      </div>
    )
  }

  // ── No task-level data (historical analysis pre-dates the tasks field) ────
  if (tasks !== null && tasks.length === 0 && meta) {
    return (
      <div className="panel p-8 flex flex-col items-center justify-center gap-3 text-center">
        <p className="font-mono text-sm text-text-secondary">
          Task detail not available for this analysis
        </p>
        <p className="font-mono text-xs text-text-dim max-w-sm">
          Re-upload the schedule file on the Analyze tab to populate the full task list.
        </p>
      </div>
    )
  }

  // ── Schedule table ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Meta row */}
      {meta && (
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono mb-0.5">Task Schedule</p>
            <p className="font-mono text-xs text-text-dim">
              {meta.filename}
              {meta.analyzed_at && (
                <span className="ml-3">
                  analyzed {new Date(meta.analyzed_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="font-mono text-xs">Refresh</span>
          </button>
        </div>
      )}

      <TaskTable tasks={tasks} />
    </div>
  )
}