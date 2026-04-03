import { Info } from 'lucide-react'
import { useState } from 'react'
import {
  METRIC_LABELS,
  METRIC_DESCRIPTIONS,
  pct,
  fmt,
  days,
} from '../../lib/utils.js'

const METRIC_ORDER = [
  'zero_float_density',
  'critical_chain_length_ratio',
  'average_float',
  'float_variance',
  'dependency_density',
  'task_compression_ratio',
]

function formatMetricValue(key, value) {
  switch (key) {
    case 'zero_float_density':
    case 'critical_chain_length_ratio':
    case 'task_compression_ratio':
      return pct(value)
    case 'average_float':
      return days(value)
    case 'float_variance':
      return `${fmt(value)} days²`
    case 'dependency_density':
      return fmt(value)
    default:
      return fmt(value)
  }
}

function MetricCard({ metricKey, value }) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div className="panel p-4 space-y-3 hover:border-muted transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="label-mono">{METRIC_LABELS[metricKey]}</p>
        <button
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          className="text-text-dim hover:text-text-secondary transition-colors flex-shrink-0 relative"
        >
          <Info size={13} />
          {showTip && (
            <div className="absolute right-0 top-5 w-56 bg-panel border border-border rounded p-2.5 z-10 text-left shadow-panel">
              <p className="font-mono text-xs text-text-secondary leading-relaxed">
                {METRIC_DESCRIPTIONS[metricKey]}
              </p>
            </div>
          )}
        </button>
      </div>
      <p className="metric-value">{formatMetricValue(metricKey, value)}</p>
    </div>
  )
}

export default function MetricsGrid({ metrics }) {
  return (
    <div>
      <p className="label-mono mb-4">Component Metrics</p>
      <div className="grid grid-cols-3 gap-3">
        {METRIC_ORDER.map((key) => (
          <MetricCard key={key} metricKey={key} value={metrics[key]} />
        ))}
      </div>
    </div>
  )
}
