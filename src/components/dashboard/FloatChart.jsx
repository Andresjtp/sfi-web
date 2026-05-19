import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

/**
 * FloatChart — renders a float distribution bar chart.
 *
 * Accepts two data shapes:
 *   1. data prop — pre-bucketed array from the API:
 *      [{ bucket: "0", count: 34 }, { bucket: "1–5", count: 28 }, ...]
 *
 *   2. tasks prop — raw task array (legacy):
 *      [{ total_float: 0 }, { total_float: 3 }, ...]
 *      (buckets them internally — used by the old ReportPage flow)
 *
 * Always prefers `data` over `tasks` if both are provided.
 */

// Bucket labels and colors in display order
const BUCKETS = [
  { key: '0',     label: '0d',      color: '#ef4444' },  // critical — red
  { key: '1',     label: '1d',      color: '#f97316' },  // orange
  { key: '1–5',   label: '1–5d',    color: '#f97316' },  // orange (API shape)
  { key: '2-3',   label: '2–3d',    color: '#f59e0b' },  // amber
  { key: '4-7',   label: '4–7d',    color: '#eab308' },  // yellow
  { key: '6–10',  label: '6–10d',   color: '#eab308' },  // yellow (API shape)
  { key: '8-14',  label: '8–14d',   color: '#22c55e' },  // green
  { key: '11–20', label: '11–20d',  color: '#22c55e' },  // green (API shape)
  { key: '15+',   label: '15d+',    color: '#3b82f6' },  // blue
  { key: '20+',   label: '20d+',    color: '#3b82f6' },  // blue (API shape)
]

const COLOR_MAP = Object.fromEntries(BUCKETS.map(b => [b.key, b.color]))
const LABEL_MAP = Object.fromEntries(BUCKETS.map(b => [b.key, b.label]))

function bucketFromTasks(tasks) {
  const counts = { '0': 0, '1': 0, '2-3': 0, '4-7': 0, '8-14': 0, '15+': 0 }
  tasks.forEach(t => {
    const f = t.total_float ?? t.TF ?? 0
    if      (f === 0) counts['0']++
    else if (f === 1) counts['1']++
    else if (f <= 3)  counts['2-3']++
    else if (f <= 7)  counts['4-7']++
    else if (f <= 14) counts['8-14']++
    else              counts['15+']++
  })
  return Object.entries(counts).map(([key, count]) => ({ key, count }))
}

function normalizeData(data, tasks) {
  // Prefer pre-bucketed API data
  if (data && data.length > 0) {
    return data.map(d => ({
      key:   d.bucket ?? d.key,
      label: LABEL_MAP[d.bucket ?? d.key] ?? d.bucket ?? d.key,
      count: d.count ?? 0,
      color: COLOR_MAP[d.bucket ?? d.key] ?? '#6b7280',
    }))
  }

  // Fall back to raw tasks array
  if (tasks && tasks.length > 0) {
    return bucketFromTasks(tasks).map(({ key, count }) => ({
      key,
      label: LABEL_MAP[key] ?? key,
      count,
      color: COLOR_MAP[key] ?? '#6b7280',
    }))
  }

  return []
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-panel border border-border rounded px-3 py-2 shadow-lg">
      <p className="font-mono text-xs text-text-secondary">{d.label}</p>
      <p className="font-mono text-sm font-medium text-text-primary">{d.count} tasks</p>
    </div>
  )
}

export default function FloatChart({ data = [], tasks = [] }) {
  const chartData = normalizeData(data, tasks)

  if (chartData.length === 0 || chartData.every(d => d.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-[180px]">
        <p className="font-mono text-xs text-text-dim">No float data available</p>
        <p className="font-mono text-xs text-text-dim opacity-50">Re-upload the schedule to generate this chart</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        barSize={32}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <XAxis
          dataKey="label"
          tick={{ fontFamily: 'DM Mono', fontSize: 11, fill: '#8b92a5' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontFamily: 'DM Mono', fontSize: 11, fill: '#555d6e' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(37,42,51,0.5)' }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}