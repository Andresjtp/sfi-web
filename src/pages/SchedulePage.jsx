import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Search, Filter, Sparkles, RefreshCw,
  AlertCircle, ChevronUp, ChevronDown, Minus, Info, X, Link,
} from 'lucide-react'
import clsx from 'clsx'
import { fetchSchedule, fetchScheduleSummary, fetchTaskExplain } from '../lib/api.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function floatColor(float, isCritical) {
  if (isCritical || float === 0) return 'text-critical'
  if (float <= 5)  return 'text-warning'
  if (float <= 10) return 'text-amber'
  return 'text-text-secondary'
}

function floatBg(float, isCritical) {
  if (isCritical || float === 0) return 'bg-critical/10 border-critical/20'
  if (float <= 5)  return 'bg-amber/8 border-amber/15'
  return 'bg-transparent border-transparent'
}

function DurationBar({ duration, maxDuration }) {
  const pct = maxDuration > 0 ? Math.min((duration / maxDuration) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-text-dim/60 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-dim tabular-nums">{duration}d</span>
    </div>
  )
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <Minus size={10} className="text-border" />
  return sortDir === 'asc'
    ? <ChevronUp size={10} className="text-amber" />
    : <ChevronDown size={10} className="text-amber" />
}

// ─── AI Summary panel ─────────────────────────────────────────────────────────

function parseScheduleSections(text) {
  if (!text) return { overview: '', phases: '', watchlist: '' }

  const stripHeaders = (content) =>
    content
      .split('\n')
      .filter(line => !/^\*{1,2}(PROJECT OVERVIEW|KEY PHASES|WHAT TO WATCH)[^*]*\*{0,2}$/i.test(line.trim()))
      .join('\n')
      .trim()

  const section = (label) => {
    const re = new RegExp(
      `(?:^|\\n)(?:\\d+\\.\\s*|#{1,3}\\s*)?${label}[:\\s]*\\n([\\s\\S]*?)(?=\\n(?:\\d+\\.\\s*|#{1,3}\\s*)?(?:KEY PHASES|WHAT TO WATCH|$))`,
      'i'
    )
    const m = text.match(re)
    return m ? stripHeaders(m[1]) : ''
  }

  const overview   = section('PROJECT OVERVIEW')
  const phases     = section('KEY PHASES')
  const watchlist  = section('WHAT TO WATCH')

  if (!overview && !phases && !watchlist) {
    return { overview: text, phases: '', watchlist: '' }
  }
  return { overview, phases, watchlist }
}

function NarrativeBlock({ text }) {
  if (!text) return null
  const lines = text.split('\n').filter(l => l.trim())
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isBullet = /^[-•*]/.test(line.trim())
        const content  = isBullet ? line.trim().replace(/^[-•*]\s*/, '') : line.trim()
        return isBullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-amber mt-0.5 shrink-0 font-mono text-xs">—</span>
            <p className="font-mono text-xs text-text-secondary leading-relaxed">{content}</p>
          </div>
        ) : (
          <p key={i} className="font-mono text-xs text-text-secondary leading-relaxed">{content}</p>
        )
      })}

    </div>
  )
}

function AISummaryPanel({ projectId, analysisId, taskCount }) {
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [expanded, setExpanded] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setExpanded(true)
    try {
      const data = await fetchScheduleSummary(projectId, analysisId)
      setSummary(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const sections = summary ? parseScheduleSections(summary.text) : null

  // Idle — not yet generated
  if (!summary && !loading && !error) {
    return (
      <div className="panel p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Sparkles size={14} className="text-accent" />
          </div>
          <div>
            <p className="font-mono text-xs font-medium text-text-primary">Plain-Language Explanation</p>
            <p className="font-mono text-xs text-text-dim mt-0.5">
              Explain this {taskCount}-task schedule in plain English for non-schedulers
            </p>
          </div>
        </div>
        <button onClick={generate} className="btn-primary flex items-center gap-2 text-xs">
          <Sparkles size={12} /> Explain Schedule
        </button>
      </div>
    )
  }

  return (
    <div className="panel border-amber/20 bg-amber/3 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer"
        onClick={() => !loading && setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={13} className={clsx('shrink-0', loading ? 'text-text-dim animate-pulse' : 'text-amber')} />
          <span className="font-mono text-xs font-medium text-text-primary">Plain-Language Explanation</span>
          {summary?.model_provider && !loading && (
            <span className="font-mono text-xs text-text-dim">
              {summary.model_provider === 'anthropic' ? '· Claude' : '· GPT-4o'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {summary && !loading && (
            <button
              onClick={e => { e.stopPropagation(); generate() }}
              className="btn-ghost p-1 rounded flex items-center gap-1 text-text-dim hover:text-text-secondary"
            >
              <RefreshCw size={11} />
              <span className="font-mono text-xs">Regenerate</span>
            </button>
          )}
          {!loading && (expanded
            ? <ChevronUp size={13} className="text-text-dim" />
            : <ChevronDown size={13} className="text-text-dim" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border/30 space-y-4">
          {loading && (
            <div className="pt-4 space-y-2 animate-pulse">
              <div className="h-3 bg-border/40 rounded w-3/4" />
              <div className="h-3 bg-border/40 rounded w-full" />
              <div className="h-3 bg-border/30 rounded w-5/6" />
              <div className="h-3 bg-border/25 rounded w-2/3 mt-3" />
              <div className="h-3 bg-border/25 rounded w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="pt-4 flex items-start gap-2">
              <AlertCircle size={12} className="text-critical mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-xs text-critical">Could not generate explanation</p>
                <p className="font-mono text-xs text-text-dim mt-0.5">{error}</p>
                <button onClick={generate} className="font-mono text-xs text-amber hover:text-amber/80 mt-2 underline underline-offset-2">
                  Try again
                </button>
              </div>
            </div>
          )}

          {sections && !loading && (
            <div className="pt-4 space-y-4">
              {sections.overview && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">Project Overview</p>
                  <NarrativeBlock text={sections.overview} />
                </div>
              )}
              {sections.phases && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">Key Phases & Milestones</p>
                  <NarrativeBlock text={sections.phases} />
                </div>
              )}
              {sections.watchlist && (
                <div>
                  <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">What to Watch</p>
                  <NarrativeBlock text={sections.watchlist} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}


// ─── Task popup ───────────────────────────────────────────────────────────────

function TaskPopup({ task, projectId, analysisId, onClose }) {
  const [explain, setExplain]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleExplain = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTaskExplain(projectId, analysisId, task.task_id)
      setExplain(data.text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const floatStatus = task.is_critical
    ? { label: 'Critical', color: 'text-critical', bg: 'bg-critical/10' }
    : task.total_float <= 5
    ? { label: `${task.total_float}d float`, color: 'text-amber', bg: 'bg-amber/10' }
    : { label: `${task.total_float}d float`, color: 'text-stable', bg: 'bg-stable/10' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-md panel bg-bg-primary shadow-2xl rounded-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-mono text-xs text-text-dim mb-1">{task.task_id}</p>
            <p className="font-mono text-sm font-medium text-text-primary leading-snug">{task.task_name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 rounded shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-border/30 border-b border-border">
          {[
            { label: 'Duration',  value: `${task.duration}d` },
            { label: 'Start',     value: task.planned_start ? new Date(task.planned_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${task.es}` },
            { label: 'Finish',    value: task.planned_finish ? new Date(task.planned_finish).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${task.ef}` },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 bg-bg-primary">
              <p className="font-mono text-xs text-text-dim mb-0.5">{label}</p>
              <p className="font-mono text-xs font-medium text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Risk status */}
          <div className="flex items-center gap-2">
            <span className={clsx('font-mono text-xs px-2 py-0.5 rounded', floatStatus.bg, floatStatus.color)}>
              {floatStatus.label}
            </span>
            {task.is_critical && (
              <span className="font-mono text-xs text-text-dim">Any delay directly affects project completion</span>
            )}
          </div>

          {/* Predecessors */}
          {task.predecessors && task.predecessors.length > 0 ? (
            <div>
              <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">
                Depends On ({task.predecessors.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {task.predecessors.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-bg-secondary/50">
                    <Link size={10} className="text-text-dim shrink-0" />
                    <span className="font-mono text-xs text-text-dim">{p.id}</span>
                    <span className="font-mono text-xs text-text-secondary truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs text-text-dim">No predecessors — can start independently</p>
          )}

          {/* AI Explanation */}
          {!explain && !loading && !error && (
            <button
              onClick={handleExplain}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-border hover:border-amber/40 hover:bg-amber/5 transition-colors"
            >
              <Sparkles size={12} className="text-amber" />
              <span className="font-mono text-xs text-text-secondary">Explain this task</span>
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-2 py-1">
              <RefreshCw size={11} className="text-text-dim animate-spin" />
              <span className="font-mono text-xs text-text-dim">Generating explanation…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2">
              <AlertCircle size={11} className="text-critical mt-0.5 shrink-0" />
              <div>
                <p className="font-mono text-xs text-critical">{error}</p>
                <button onClick={handleExplain} className="font-mono text-xs text-amber underline mt-1">Retry</button>
              </div>
            </div>
          )}

          {explain && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={11} className="text-amber" />
                <p className="font-mono text-xs text-text-dim uppercase tracking-wider">AI Explanation</p>
                <button onClick={handleExplain} className="ml-auto">
                  <RefreshCw size={10} className="text-text-dim hover:text-text-secondary transition-colors" />
                </button>
              </div>
              <p className="font-mono text-xs text-text-secondary leading-relaxed">{explain}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── Grouping logic ───────────────────────────────────────────────────────────

// Phase keywords mapped to readable labels — checked against task names
const PHASE_KEYWORDS = [
  { keywords: ['mobiliz', 'site prep', 'survey', 'permit', 'demolit'],       label: 'Site Preparation' },
  { keywords: ['excavat', 'earthwork', 'grading', 'cut', 'fill'],            label: 'Earthwork & Excavation' },
  { keywords: ['foundation', 'footing', 'pile', 'caisson', 'grade beam'],    label: 'Foundation' },
  { keywords: ['concrete', 'slab', 'pour', 'cast'],                          label: 'Concrete Work' },
  { keywords: ['formwork', 'rft', 'reinforc', 'rebar', 'steel'],             label: 'Formwork & Reinforcement' },
  { keywords: ['structural', 'frame', 'column', 'beam', 'floor', 'roof'],    label: 'Structural Frame' },
  { keywords: ['masonry', 'brick', 'block', 'cmu'],                          label: 'Masonry' },
  { keywords: ['mep', 'mechanical', 'electrical', 'plumbing', 'hvac', 'fire', 'sprinkler'], label: 'MEP Systems' },
  { keywords: ['window', 'door', 'glazing', 'curtain wall', 'facade', 'exterior'], label: 'Exterior & Envelope' },
  { keywords: ['interior', 'partition', 'drywall', 'ceiling', 'flooring', 'finish', 'paint', 'tile'], label: 'Interior Finishes' },
  { keywords: ['landscape', 'hardscape', 'paving', 'parking'],               label: 'Sitework & Landscaping' },
  { keywords: ['commissioning', 'testing', 'inspect', 'punch', 'closeout', 'substantial', 'handover'], label: 'Commissioning & Closeout' },
]

function detectPhaseLabel(tasks) {
  // Count keyword hits across all task names in this group
  const name = tasks.map(t => (t.task_name || '').toLowerCase()).join(' ')
  let best = null
  let bestScore = 0
  for (const { keywords, label } of PHASE_KEYWORDS) {
    const score = keywords.filter(k => name.includes(k)).length
    if (score > bestScore) { bestScore = score; best = label }
  }
  return best
}

function getIdPrefix(taskId) {
  // Extract the letter prefix + thousands digit: "A1610" → "A1", "B2030" → "B2"
  // Falls back to first 2 chars for non-standard IDs
  if (!taskId) return 'Other'
  const match = taskId.match(/^([A-Za-z]*)(\d+)/)
  if (!match) return taskId.slice(0, 2) || 'Other'
  const letters = match[1] || ''
  const digits  = match[2] || ''
  // Group by letter(s) + first digit of the thousands: A1xxx, A2xxx, B1xxx etc.
  const thousands = digits.length >= 4
    ? digits.slice(0, digits.length - 3)   // e.g. "1" from "1610"
    : digits.slice(0, 1)                    // short IDs
  return letters + thousands
}

function groupTasks(tasks) {
  // 1. Group by ID prefix
  const prefixMap = new Map()
  for (const task of tasks) {
    const prefix = getIdPrefix(task.task_id)
    if (!prefixMap.has(prefix)) prefixMap.set(prefix, [])
    prefixMap.get(prefix).push(task)
  }

  // 2. Sort each group by ES (dependency chain order)
  const groups = []
  for (const [prefix, groupTasks] of prefixMap) {
    const sorted = [...groupTasks].sort((a, b) => (a.es ?? 0) - (b.es ?? 0))

    // 3. Detect phase label from task names; fall back to prefix
    const phaseLabel = detectPhaseLabel(sorted)

    // 4. Compute group summary stats
    const critCount  = sorted.filter(t => t.is_critical).length
    const nearCount  = sorted.filter(t => !t.is_critical && t.total_float <= 5).length
    const startDate  = sorted[0]?.planned_start ?? null
    const endDate    = sorted[sorted.length - 1]?.planned_finish ?? null

    groups.push({
      prefix,
      label:     phaseLabel || `Phase ${prefix}`,
      tasks:     sorted,
      critCount,
      nearCount,
      startDate,
      endDate,
    })
  }

  // 5. Sort groups by their earliest ES value so phases flow chronologically
  groups.sort((a, b) => {
    const aEs = Math.min(...a.tasks.map(t => t.es ?? 0))
    const bEs = Math.min(...b.tasks.map(t => t.es ?? 0))
    return aEs - bEs
  })

  return groups
}

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

// ─── Group header row ────────────────────────────────────────────────────────

function GroupHeader({ group, isOpen, onToggle }) {
  return (
    <tr
      className="cursor-pointer select-none bg-bg-secondary/60 hover:bg-bg-secondary/80 transition-colors border-b border-border/60"
      onClick={onToggle}
    >
      <td colSpan={7} className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={clsx(
              'transition-transform duration-150',
              isOpen ? 'rotate-0' : '-rotate-90'
            )}>
              <ChevronDown size={13} className="text-text-dim" />
            </span>
            <div>
              <span className="font-mono text-sm font-medium text-text-primary">
                {group.label}
              </span>
              {group.startDate && group.endDate && (
                <span className="font-mono text-xs text-text-dim ml-3">
                  {formatDate(group.startDate)} → {formatDate(group.endDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-dim">
              {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
            </span>
            {group.critCount > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-critical/15 text-critical">
                {group.critCount} critical
              </span>
            )}
            {group.nearCount > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber/15 text-amber">
                {group.nearCount} near-crit
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Main SchedulePage ────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all',      label: 'All Tasks' },
  { value: 'critical', label: 'Critical Only' },
  { value: 'near',     label: 'Near-Critical (≤5d)' },
  { value: 'float',    label: 'Has Float (>0d)' },
]

export default function SchedulePage() {
  const navigate    = useNavigate()
  const { projectId, analysisId } = useParams()

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Filter / search state
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')

  // Track which groups are collapsed — all open by default
  const [collapsed, setCollapsed] = useState(new Set())
  const [activeTask, setActiveTask] = useState(null)

  useEffect(() => {
    if (!projectId || !analysisId) return
    setLoading(true)
    setError(null)
    fetchSchedule(projectId, analysisId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId, analysisId])

  const maxDuration = useMemo(() => {
    if (!data?.tasks) return 1
    return Math.max(...data.tasks.map(t => t.duration ?? 0), 1)
  }, [data])

  // Apply filter + search, then group
  const groups = useMemo(() => {
    if (!data?.tasks) return []
    let tasks = data.tasks

    if (filter === 'critical') tasks = tasks.filter(t => t.is_critical)
    else if (filter === 'near') tasks = tasks.filter(t => !t.is_critical && t.total_float <= 5)
    else if (filter === 'float') tasks = tasks.filter(t => t.total_float > 0)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      tasks = tasks.filter(t =>
        t.task_name?.toLowerCase().includes(q) ||
        t.task_id?.toLowerCase().includes(q)
      )
    }

    return groupTasks(tasks)
  }, [data, filter, search])

  const totalFiltered = groups.reduce((s, g) => s + g.tasks.length, 0)

  const toggleGroup = (prefix) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(prefix) ? next.delete(prefix) : next.add(prefix)
      return next
    })
  }

  const collapseAll = () => setCollapsed(new Set(groups.map(g => g.prefix)))
  const expandAll   = () => setCollapsed(new Set())

  const criticalCount = data?.tasks?.filter(t => t.is_critical).length ?? 0
  const nearCritCount = data?.tasks?.filter(t => !t.is_critical && t.total_float <= 5).length ?? 0

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-3"
          >
            <ArrowLeft size={12} /> Back to Project
          </button>
          <p className="label-mono mb-1">Schedule View</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            Full Task Schedule
          </h1>
          {data && (
            <p className="font-mono text-xs text-text-dim mt-1">
              {data.filename} · {data.task_count} tasks · {data.project_duration}d duration
            </p>
          )}
        </div>
      </div>

      {/* AI Summary panel */}
      {data && (
        <AISummaryPanel
          projectId={projectId}
          analysisId={analysisId}
          taskCount={data.task_count}
        />
      )}

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks',    value: data.task_count,            color: 'text-text-primary' },
            { label: 'Critical Tasks', value: criticalCount,               color: 'text-critical' },
            { label: 'Near-Critical',  value: nearCritCount,               color: 'text-amber' },
            { label: 'Phases',         value: groups.length || '—',       color: 'text-text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="panel px-4 py-3">
              <p className="font-mono text-xs text-text-dim mb-1">{label}</p>
              <p className={clsx('font-mono text-xl font-medium tabular-nums', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {data && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 panel px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search size={12} className="text-text-dim shrink-0" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent font-mono text-xs text-text-primary placeholder-text-dim outline-none flex-1"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-dim hover:text-text-secondary">
                <Minus size={11} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Filter size={11} className="text-text-dim" />
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={clsx(
                  'font-mono text-xs px-2.5 py-1 rounded transition-colors',
                  filter === opt.value
                    ? 'bg-amber text-bg-primary'
                    : 'text-text-dim hover:text-text-secondary hover:bg-panel/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="font-mono text-xs text-text-dim">
              {totalFiltered} task{totalFiltered !== 1 ? 's' : ''}
            </span>
            <button onClick={expandAll}   className="font-mono text-xs text-text-dim hover:text-text-secondary transition-colors">Expand all</button>
            <span className="text-border">·</span>
            <button onClick={collapseAll} className="font-mono text-xs text-text-dim hover:text-text-secondary transition-colors">Collapse all</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel p-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={18} className="text-text-dim animate-spin" />
          <p className="font-mono text-sm text-text-dim">Parsing schedule…</p>
          <p className="font-mono text-xs text-text-dim">Large schedules may take a few seconds</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="panel p-6 border-critical/30 bg-critical/5 flex items-start gap-3">
          <AlertCircle size={14} className="text-critical mt-0.5 shrink-0" />
          <div>
            <p className="font-mono text-sm text-critical font-medium">Failed to load schedule</p>
            <p className="font-mono text-xs text-text-dim mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Grouped task table */}
      {!loading && !error && data && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-bg-secondary/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-28">ID</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim min-w-[200px]">Task Name</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-32">Duration</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-28">Start</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-28">Finish</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-24">Float</th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs text-text-dim w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center font-mono text-xs text-text-dim">
                      No tasks match your filters
                    </td>
                  </tr>
                ) : (
                  groups.map(group => (
                    <>
                      <GroupHeader
                        key={`header-${group.prefix}`}
                        group={group}
                        isOpen={!collapsed.has(group.prefix)}
                        onToggle={() => toggleGroup(group.prefix)}
                      />
                      {!collapsed.has(group.prefix) && group.tasks.map((task, i) => (
                        <tr
                          key={task.task_id ?? i}
                          className={clsx(
                            'border-b border-border/30 transition-colors hover:bg-panel/40 group/row',
                            task.is_critical && 'bg-critical/3',
                          )}
                        >
                          <td className="px-4 py-2.5 pl-10">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-text-dim">{task.task_id}</span>
                              <button
                                onClick={() => setActiveTask(task)}
                                className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded hover:bg-amber/15"
                                title="View task details"
                              >
                                <Info size={11} className="text-amber" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {i > 0 && (
                                <span className="text-border font-mono text-xs shrink-0">↳</span>
                              )}
                              <p className="font-mono text-xs text-text-primary">{task.task_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <DurationBar duration={task.duration} maxDuration={maxDuration} />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-text-dim tabular-nums">
                              {task.planned_start ? formatDate(task.planned_start) : `d${task.es}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-text-dim tabular-nums">
                              {task.planned_finish ? formatDate(task.planned_finish) : `d${task.ef}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={clsx(
                              'font-mono text-xs font-medium tabular-nums',
                              floatColor(task.total_float, task.is_critical)
                            )}>
                              {task.total_float === 0 ? '0d' : `${task.total_float}d`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {task.is_critical ? (
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-critical/15 text-critical">CRIT</span>
                            ) : task.total_float <= 5 ? (
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber/15 text-amber">NEAR</span>
                            ) : (
                              <span className="font-mono text-xs text-text-dim">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task detail popup */}
      {activeTask && (
        <TaskPopup
          task={activeTask}
          projectId={projectId}
          analysisId={analysisId}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  )
}