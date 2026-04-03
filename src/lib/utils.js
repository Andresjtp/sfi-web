/**
 * Returns Tailwind color class and label based on SFI score.
 * 0–3: Low risk (green), 4–6: Medium (amber), 7–10: High (red)
 */
export function sfiRiskBand(score) {
  if (score <= 3) return { color: 'text-stable',   bg: 'bg-stable/10',  border: 'border-stable/30',  label: 'LOW RISK'    }
  if (score <= 6) return { color: 'text-amber',    bg: 'bg-amber/10',   border: 'border-amber/30',   label: 'MODERATE'    }
  return           { color: 'text-critical', bg: 'bg-critical/10', border: 'border-critical/30', label: 'HIGH RISK'   }
}

/**
 * Format a float metric as a percentage string.
 */
export function pct(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a number with fixed decimals.
 */
export function fmt(value, decimals = 2) {
  if (value == null) return '—'
  return Number(value).toFixed(decimals)
}

/**
 * Format days value.
 */
export function days(value) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)} days`
}

/**
 * Return a human-readable metric label.
 */
export const METRIC_LABELS = {
  zero_float_density:          'Zero-Float Density',
  critical_chain_length_ratio: 'Critical Chain Ratio',
  average_float:               'Average Float',
  float_variance:              'Float Variance',
  dependency_density:          'Dependency Density',
  task_compression_ratio:      'Task Compression Ratio',
}

export const METRIC_DESCRIPTIONS = {
  zero_float_density:          'Fraction of tasks with zero total float — directly on the critical path.',
  critical_chain_length_ratio: 'Length of the longest critical path relative to total task count.',
  average_float:               'Mean slack across all tasks. Lower values mean less scheduling buffer.',
  float_variance:              'Variance of total float. High variance signals uneven risk distribution.',
  dependency_density:          'Edges per task — measures how tightly coupled the schedule is.',
  task_compression_ratio:      'Fraction of tasks with float ≤ 1 day. High values indicate compression.',
}
