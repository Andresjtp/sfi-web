/**
 * api.js — SFI Engine API client
 *
 * All communication with the sfi-engine FastAPI backend lives here.
 * Base URL is proxied via Vite in dev (/api → http://localhost:8000).
 * In production, set VITE_API_BASE env var.
 */

import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function fetchProjects() {
  return request('/projects')
}

export async function fetchProject(projectId) {
  return request(`/projects/${projectId}`)
}

export async function createProject(name) {
  return request('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * POST /projects/:id/analyses
 * Upload a schedule file scoped to a project.
 */
export async function analyzeSchedule(file, opts = {}, projectId = null) {
  const form = new FormData()
  form.append('file', file)
  if (opts.top)        form.append('top', String(opts.top))
  if (opts.strict)     form.append('strict', 'true')
  if (opts.statusDate) form.append('status_date', opts.statusDate)

  const path = projectId
    ? `/projects/${projectId}/analyses`
    : '/analyze'
  return request(path, { method: 'POST', body: form })
}

export async function fetchFullAnalysis(projectId, analysisId) {
  return request(`/projects/${projectId}/analyses/${analysisId}`)
}

export async function fetchSchedule(projectId, analysisId) {
  return request(`/projects/${projectId}/analyses/${analysisId}/schedule`)
}

export async function fetchScheduleSummary(projectId, analysisId) {
  return request(`/projects/${projectId}/analyses/${analysisId}/schedule-summary`, {
    method: 'POST',
  })
}

export async function fetchTaskExplain(projectId, analysisId, taskId) {
  return request(
    `/projects/${projectId}/analyses/${analysisId}/task-explain?task_id=${encodeURIComponent(taskId)}`,
    { method: 'POST' }
  )
}

export async function fetchDriftSummary(projectId, idA, idB, regenerate = false) {
  const params = new URLSearchParams({ id_a: idA, id_b: idB });
  if (regenerate) params.set("regenerate", "true");
  return request(
    `/projects/${projectId}/analyses/drift-summary?${params.toString()}`,
    { method: "POST" }
  );
}

export async function fetchRecovery(projectId, analysisId) {
  return request(`/projects/${projectId}/analyses/${analysisId}/recovery`)
}

// ─── Narrative ───────────────────────────────────────────────────────────────

/**
 * POST /projects/:projectId/analyses/:analysisId/narrative
 * Generate (or return cached) AI narrative for an existing analysis.
 */
export async function fetchNarrative(projectId, analysisId, bypassCache = false) {
  return request(`/projects/${projectId}/analyses/${analysisId}/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bypass_cache: bypassCache }),
  })
}

// ─── History ─────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/analyses
 * Returns list of analyses for a specific project.
 */
export async function fetchProjectHistory(projectId) {
  return request(`/projects/${projectId}/analyses`)
}

/**
 * GET /history
 * Returns global paginated list of analyses (legacy).
 */
export async function fetchHistory(page = 1, limit = 50) {
  return request(`/history?page=${page}&limit=${limit}`)
}

export async function deleteAnalysis(projectId, analysisId) {
  return request(`/projects/${projectId}/analyses/${analysisId}`, {
    method: 'DELETE',
  })
}

// ─── Monitor: Trend + Drift ───────────────────────────────────────────────────

/**
 * GET /projects/:id/trend
 * Returns the Schedule Health Pulse — SFI timeline + per-metric trends.
 */
export async function fetchProjectTrend(projectId, limit = 50) {
  return request(`/projects/${projectId}/trend?limit=${limit}`)
}

/**
 * GET /projects/:id/analyses/compare?id_a=&id_b=
 * Returns the full Critical Path Drift report between two analyses.
 */
export async function compareAnalyses(projectId, idA, idB) {
  return request(`/projects/${projectId}/analyses/compare?id_a=${idA}&id_b=${idB}`)
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function healthCheck() {
  return request('/health')
}