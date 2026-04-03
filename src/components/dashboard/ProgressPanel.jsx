import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import clsx from 'clsx'

function StatCard({ label, value, sub, severity }) {
  const colors = {
    critical: 'text-critical',
    warning:  'text-warning',
    stable:   'text-stable',
    neutral:  'text-text-secondary',
  }
  return (
    <div className="panel p-4 space-y-2">
      <p className="label-mono">{label}</p>
      <p className={clsx('font-mono text-2xl font-medium', colors[severity] ?? colors.neutral)}>
        {value}
      </p>
      {sub && <p className="font-mono text-xs text-text-dim">{sub}</p>}
    </div>
  )
}

export default function ProgressPanel({ progress, statusDate }) {
  if (!progress) return null

  const {
    overdue_tasks_count: overdue,
    overdue_critical_tasks_count: overdueCrit,
    late_start_tasks_count: lateStart,
    late_start_critical_tasks_count: lateStartCrit,
    overdue_critical_task_ids: overdueIds = [],
  } = progress

  const hasCriticalIssues = overdueCrit > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-mono">Progress Status</p>
        <span className="font-mono text-xs text-text-dim">
          Status date: {statusDate}
        </span>
      </div>

      {/* Warning banner */}
      {hasCriticalIssues ? (
        <div className="flex items-center gap-3 border border-critical/30 bg-critical/5 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-critical flex-shrink-0" />
          <p className="font-mono text-sm text-critical">
            WARNING: {overdueCrit} critical task{overdueCrit !== 1 ? 's' : ''} behind schedule
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 border border-stable/30 bg-stable/5 rounded-lg px-4 py-3">
          <CheckCircle size={16} className="text-stable flex-shrink-0" />
          <p className="font-mono text-sm text-stable">
            No critical schedule slippage detected as of {statusDate}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Overdue Tasks"
          value={overdue}
          sub="planned finish passed"
          severity={overdue > 0 ? 'warning' : 'stable'}
        />
        <StatCard
          label="Overdue Critical"
          value={overdueCrit}
          sub="on critical path"
          severity={overdueCrit > 0 ? 'critical' : 'stable'}
        />
        <StatCard
          label="Late Starts"
          value={lateStart}
          sub="not yet started"
          severity={lateStart > 0 ? 'warning' : 'stable'}
        />
        <StatCard
          label="Late Start Critical"
          value={lateStartCrit}
          sub="critical & not started"
          severity={lateStartCrit > 0 ? 'critical' : 'stable'}
        />
      </div>

      {/* Overdue critical task IDs */}
      {overdueIds.length > 0 && (
        <div className="panel p-4 space-y-2">
          <p className="label-mono">Overdue Critical Tasks</p>
          <div className="flex flex-wrap gap-2">
            {overdueIds.map(id => (
              <span key={id} className="tag-critical">{id}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
