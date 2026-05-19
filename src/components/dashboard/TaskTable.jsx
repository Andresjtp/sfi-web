import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const COLS = [
  { key: 'task_id',      label: 'ID',        sortable: true  },
  { key: 'task_name',    label: 'Task Name',  sortable: false },
  { key: 'duration',     label: 'Duration',   sortable: true  },
  { key: 'es',           label: 'ES',         sortable: true  },
  { key: 'ef',           label: 'EF',         sortable: true  },
  { key: 'total_float',  label: 'Float',      sortable: true  },
  { key: 'is_critical',  label: 'Critical',   sortable: true  },
]

export default function TaskTable({ tasks = [] }) {
  const [sortKey, setSortKey]   = useState('total_float')
  const [sortDir, setSortDir]   = useState('asc')
  const [filter, setFilter]     = useState('')
  const [critOnly, setCritOnly] = useState(false)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = tasks
    .filter(t =>
      (!critOnly || t.is_critical) &&
      (!filter ||
        t.task_name.toLowerCase().includes(filter.toLowerCase()) ||
        t.task_id.toLowerCase().includes(filter.toLowerCase())
      )
    )
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'boolean') av = av ? 1 : 0
      if (typeof bv === 'boolean') bv = bv ? 1 : 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p className="label-mono">Task Schedule</p>
        <div className="flex items-center gap-3">
          {/* Critical filter */}
          <button
            onClick={() => setCritOnly(c => !c)}
            className={clsx(
              'font-mono text-xs px-3 py-1.5 rounded border transition-colors',
              critOnly
                ? 'bg-critical/10 border-critical/30 text-critical'
                : 'border-border text-text-dim hover:text-text-secondary'
            )}
          >
            Critical only
          </button>
          {/* Search */}
          <input
            type="text"
            placeholder="Filter tasks…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-void border border-border rounded px-3 py-1.5 font-mono text-sm text-text-primary
                       placeholder:text-text-dim focus:outline-none focus:border-amber w-48 transition-colors"
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={clsx(
                      'px-4 py-3 text-left font-mono text-xs text-text-secondary',
                      col.sortable && 'cursor-pointer hover:text-text-primary select-none'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc'
                          ? <ChevronUp size={11} className="text-amber" />
                          : <ChevronDown size={11} className="text-amber" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-8 text-center font-mono text-sm text-text-dim">
                    {tasks.length === 0
                      ? 'Task detail is only available for newly analyzed schedules — re-upload to view.'
                      : 'No tasks match filter'}
                  </td>
                </tr>
              ) : (
                filtered.map((task, i) => (
                  <tr
                    key={task.task_id}
                    className={clsx(
                      'border-b border-border/50 transition-colors hover:bg-panel/50',
                      task.is_critical && 'bg-critical/3'
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{task.task_id}</td>
                    <td className="px-4 py-2.5 font-body text-sm text-text-primary max-w-xs truncate">{task.task_name}</td>
                    <td className="px-4 py-2.5 font-mono text-sm text-text-primary">{task.duration}d</td>
                    <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">{task.es}</td>
                    <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">{task.ef}</td>
                    <td className="px-4 py-2.5">
                      <span className={clsx(
                        'font-mono text-sm font-medium',
                        task.total_float === 0 ? 'text-critical' :
                        task.total_float <= 2   ? 'text-warning' : 'text-text-primary'
                      )}>
                        {task.total_float}d
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {task.is_critical
                        ? <span className="tag-critical">CRITICAL</span>
                        : <span className="font-mono text-xs text-text-dim">—</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border">
          <p className="font-mono text-xs text-text-dim">
            {filtered.length} of {tasks.length} tasks
          </p>
        </div>
      </div>
    </div>
  )
}