/**
 * api.js — SFI Engine API client
 *
 * All communication with the sfi-engine FastAPI backend lives here.
 * Base URL is proxied via Vite in dev (/api → http://localhost:8000).
 * In production, set VITE_API_BASE env var.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

/**
 * POST /analyze
 * Upload a schedule CSV and receive the full SFI report.
 *
 * @param {File}    file        — CSV file object
 * @param {object}  opts
 * @param {number}  opts.top    — Number of top risk tasks to return (default 10)
 * @param {boolean} opts.strict — Enable strict validation
 * @param {string}  opts.statusDate — YYYY-MM-DD status date (optional)
 * @returns {Promise<AnalyzeResult>}
 */
export async function analyzeSchedule(file, opts = {}) {
  const form = new FormData()
  form.append('file', file)
  if (opts.top)        form.append('top', String(opts.top))
  if (opts.strict)     form.append('strict', 'true')
  if (opts.statusDate) form.append('status_date', opts.statusDate)

  return request('/analyze', { method: 'POST', body: form })
}

/**
 * GET /history
 * Returns list of saved snapshots.
 *
 * @returns {Promise<Snapshot[]>}
 */
export async function fetchHistory() {
  return request('/history')
}

/**
 * GET /health
 * Simple health check.
 */
export async function healthCheck() {
  return request('/health')
}

/**
 * ─── Expected response shapes (for reference) ────────────────────────────────
 *
 * AnalyzeResult {
 *   sfi_score:        number          // 0.00–10.00
 *   project_duration: number          // days
 *   total_tasks:      number
 *   metrics: {
 *     zero_float_density:         number
 *     critical_chain_length_ratio: number
 *     average_float:              number
 *     float_variance:             number
 *     dependency_density:         number
 *     task_compression_ratio:     number
 *   }
 *   tasks: Task[]
 *   progress?: ProgressResult        // only if status_date provided
 * }
 *
 * Task {
 *   task_id:      string
 *   task_name:    string
 *   duration_days: number
 *   total_float:  number
 *   es: number; ef: number; ls: number; lf: number
 *   is_critical:  boolean
 *   percent_complete?: number
 *   actual_start?:  string
 *   actual_finish?: string
 * }
 *
 * ProgressResult {
 *   overdue_tasks_count:           number
 *   overdue_critical_tasks_count:  number
 *   late_start_tasks_count:        number
 *   late_start_critical_tasks_count: number
 *   overdue_task_ids:              string[]
 *   overdue_critical_task_ids:     string[]
 * }
 *
 * Snapshot {
 *   index:        number
 *   label:        string
 *   created_at:   string   // ISO datetime
 *   sfi_score:    number
 *   project_duration_days: number
 *   metrics:      object
 * }
 */
