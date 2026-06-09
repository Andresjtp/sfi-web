import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Sparkles, RefreshCw, AlertCircle, Zap, TrendingDown, Users } from 'lucide-react'
import SFIGauge from '../components/dashboard/SFIGauge.jsx'
import MetricsGrid from '../components/dashboard/MetricsGrid.jsx'
import FloatChart from '../components/dashboard/FloatChart.jsx'
import ProgressPanel from '../components/dashboard/ProgressPanel.jsx'
import { fetchNarrative, fetchRecovery } from '../lib/api.js'

// ── Recovery Panel component ──────────────────────────────────────────────────
function RecoveryPanel({ recommendations = [] }) {
  if (!recommendations || recommendations.length === 0) return null

  const top = recommendations[0]
  const rest = recommendations.slice(1)

  return (
    <div className="space-y-3">
      <p className="label-mono">Schedule Recovery</p>

      {/* Primary action card */}
      <div className="panel p-5 border-amber/25 bg-amber/5">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-amber/15 flex items-center justify-center shrink-0 mt-0.5">
            <Zap size={15} className="text-amber" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-xs text-amber uppercase tracking-wider">Priority Action</p>
              {top.project_days_saved > 0 && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-stable/15 text-stable">
                  -{top.project_days_saved}d project duration
                </span>
              )}
            </div>
            <p className="font-mono text-sm font-medium text-text-primary mb-3 truncate">
              {top.task_name}
            </p>
            <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
              Completing this task <span className="text-amber font-medium">{top.simulate_days_early} days early</span> would
              recover <span className="text-stable font-medium">{top.float_days_recovered} float-days</span> across{" "}
              <span className="text-text-primary font-medium">{top.affected_task_count} downstream tasks</span>,
              reducing cascade risk in this part of the schedule.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <TrendingDown size={11} className="text-stable" />
                <span className="font-mono text-xs text-text-dim">
                  Current float: <span className="text-text-secondary">{top.current_float}d</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={11} className="text-text-dim" />
                <span className="font-mono text-xs text-text-dim">
                  Task ID: <span className="text-text-secondary">{top.task_id}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary recommendations */}
      {rest.length > 0 && (
        <div className="panel divide-y divide-border/40">
          <div className="grid grid-cols-12 gap-2 px-4 py-2">
            <span className="col-span-5 font-mono text-xs text-text-dim">Task</span>
            <span className="col-span-2 font-mono text-xs text-text-dim text-right">Float</span>
            <span className="col-span-2 font-mono text-xs text-text-dim text-right">Recovered</span>
            <span className="col-span-3 font-mono text-xs text-text-dim text-right">Affects</span>
          </div>
          {rest.map((rec, i) => (
            <div key={rec.task_id ?? i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
              <div className="col-span-5 min-w-0">
                <p className="font-mono text-xs text-text-primary truncate">{rec.task_name}</p>
                <p className="font-mono text-xs text-text-dim">{rec.task_id}</p>
              </div>
              <span className="col-span-2 font-mono text-xs text-text-dim text-right tabular-nums">
                {rec.current_float}d
              </span>
              <span className="col-span-2 font-mono text-xs text-stable text-right tabular-nums">
                +{rec.float_days_recovered}d
              </span>
              <span className="col-span-3 font-mono text-xs text-text-dim text-right tabular-nums">
                {rec.affected_task_count} tasks
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Narrative section parser ──────────────────────────────────────────────────
// The LLM returns a plain-text report with three labeled sections.
// This splits it into structured blocks for clean rendering.
function parseNarrative(text) {
  const sections = []
  const pattern = /(\d+\.\s+[A-Z][A-Z\s]+?)(?:\n)([\s\S]*?)(?=\n\d+\.\s+[A-Z]|$)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    sections.push({
      title: match[1].trim(),
      body:  match[2].trim(),
    })
  }
  // Fallback — if parsing fails, return the whole text as one block
  return sections.length > 0 ? sections : [{ title: null, body: text.trim() }]
}

// ── Narrative panel component ─────────────────────────────────────────────────
function NarrativePanel({ projectId, analysisId }) {
  const [state, setState]     = useState('idle')   // idle | loading | success | error
  const [narrative, setNarrative] = useState(null)
  const [meta, setMeta]       = useState(null)
  const [error, setError]     = useState(null)

  const generate = async (bypassCache = false) => {
    setState('loading')
    setError(null)
    try {
      const data = await fetchNarrative(projectId, analysisId, bypassCache)
      setNarrative(data.narrative)
      setMeta({
        provider:    data.model_provider,
        generatedAt: data.generated_at,
        fromCache:   data.from_cache,
      })
      setState('success')
    } catch (err) {
      setError(err.message ?? 'Failed to generate narrative.')
      setState('error')
    }
  }

  // ── Idle state — prompt to generate ──────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="panel p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles size={18} className="text-accent" />
        </div>
        <div>
          <p className="font-mono text-sm font-medium text-text-primary mb-1">
            AI Narrative Report
          </p>
          <p className="font-body text-sm text-text-dim max-w-sm">
            Generate a plain-language summary of this analysis — risk drivers,
            cascade exposure, and recommended actions.
          </p>
        </div>
        <button
          onClick={() => generate(false)}
          className="btn-primary flex items-center gap-2"
        >
          <Sparkles size={13} />
          Generate Report
        </button>
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="panel p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
          <Sparkles size={18} className="text-accent" />
        </div>
        <p className="font-mono text-sm text-text-dim">Analyzing schedule data…</p>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="panel p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-critical">
          <AlertCircle size={15} />
          <p className="font-mono text-sm font-medium">Narrative generation failed</p>
        </div>
        <p className="font-body text-sm text-text-dim">{error}</p>
        <button
          onClick={() => generate(false)}
          className="btn-ghost self-start flex items-center gap-2 text-sm"
        >
          <RefreshCw size={13} /> Try again
        </button>
      </div>
    )
  }

  // ── Success state — render narrative ──────────────────────────────────────
  const sections = parseNarrative(narrative)

  return (
    <div className="panel p-6 space-y-6">

      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent" />
          <p className="label-mono">AI Narrative Report</p>
        </div>
        <div className="flex items-center gap-3">
          {meta?.fromCache && (
            <span className="font-mono text-xs text-text-dim">cached</span>
          )}
          <span className="font-mono text-xs text-text-dim capitalize">
            {meta?.provider}
          </span>
          <button
            onClick={() => generate(true)}
            className="btn-ghost flex items-center gap-1.5 text-xs"
            title="Regenerate (bypasses cache)"
          >
            <RefreshCw size={11} /> Regenerate
          </button>
        </div>
      </div>

      {/* Narrative sections */}
      <div className="space-y-5 divide-y divide-border/40">
        {sections.map((section, i) => (
          <div key={i} className={i > 0 ? 'pt-5' : ''}>
            {section.title && (
              <p className="label-mono mb-3">{section.title}</p>
            )}
            <div className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {section.body}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

// ── Main ReportPage ───────────────────────────────────────────────────────────
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

  const { sfi_score, project_duration, task_count: total_tasks, metrics, near_critical_tasks: topTasks = [], recovery_recommendations: recoveryRecs = [], progress, status_date } = result
  const safeRecs = Array.isArray(recoveryRecs) ? recoveryRecs : []
  const analysisId    = result.id
  const criticalCount = result.critical_path_length ?? 0

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `sfi-report-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const backPath  = projectId ? `/projects/${projectId}` : '/'
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

      {/* Recovery recommendations — actionable next step */}
      {safeRecs.length > 0 && (
        <RecoveryPanel recommendations={safeRecs} />
      )}

      {/* AI Narrative — sits between metrics and float chart */}
      {projectId && analysisId && (
        <NarrativePanel projectId={projectId} analysisId={analysisId} />
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="panel p-4">
          <p className="label-mono mb-4">Float Distribution</p>
          <FloatChart data={result.float_distribution ?? []} />
        </div>

        <div>
          <p className="label-mono mb-4">Top Risk Tasks</p>
          <div className="panel divide-y divide-border/50">
            {topTasks.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-mono text-xs text-text-dim">No near-critical tasks found</p>
              </div>
            ) : (
              topTasks
                .slice()
                .sort((a, b) => (a.total_float ?? 0) - (b.total_float ?? 0))
                .slice(0, 8)
                .map((task, i) => (
                  <div key={task.task_id ?? i} className="flex items-center justify-between px-4 py-3">
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
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}