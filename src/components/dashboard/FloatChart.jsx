import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

/**
 * Buckets tasks by total float into bands and renders a bar chart.
 */
function bucketFloats(tasks) {
  const buckets = {
    '0':     { label: '0d (Critical)', count: 0, color: '#ef4444' },
    '1':     { label: '1d',            count: 0, color: '#f97316' },
    '2-3':   { label: '2–3d',          count: 0, color: '#f59e0b' },
    '4-7':   { label: '4–7d',          count: 0, color: '#eab308' },
    '8-14':  { label: '8–14d',         count: 0, color: '#22c55e' },
    '15+':   { label: '15d+',          count: 0, color: '#3b82f6' },
  }

  tasks.forEach(t => {
    const f = t.total_float
    if      (f === 0)          buckets['0'].count++
    else if (f === 1)          buckets['1'].count++
    else if (f <= 3)           buckets['2-3'].count++
    else if (f <= 7)           buckets['4-7'].count++
    else if (f <= 14)          buckets['8-14'].count++
    else                       buckets['15+'].count++
  })

  return Object.values(buckets)
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-panel border border-border rounded px-3 py-2">
      <p className="font-mono text-xs text-text-secondary">{d.label}</p>
      <p className="font-mono text-sm text-text-primary">{d.count} tasks</p>
    </div>
  )
}

export default function FloatChart({ tasks = [] }) {
  const data = bucketFloats(tasks)

  return (
    <div>
      <p className="label-mono mb-4">Float Distribution</p>
      <div className="panel p-4">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={28} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,42,51,0.5)' }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
