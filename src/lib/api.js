/**
 * api.js — SFI Engine API client
 *
 * All communication with the sfi-engine FastAPI backend lives here.
 * Base URL is proxied via Vite in dev (/api → http://localhost:8000).
 * In production, set VITE_API_BASE env var.
 *
 * Every request automatically attaches the Supabase JWT as a Bearer token
 * so the FastAPI auth middleware can verify the user.
 */

import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
  }
}

async function request(path, options = {}) {
  const authHeaders = await getAuthHeaders()

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

/**
 * POST /api/v1/projects/{project_id}/analyses
 * Upload a schedule CSV/XER and receive the full SFI report.
 */
export async function analyzeSchedule(projectId, file, opts = {}) {
  const authHeaders = await getAuthHeaders()
  const form = new FormData()
  form.append('file', file)
  if (opts.strict)     form.append('strict', 'true')
  if (opts.statusDate) form.append('status_date', opts.statusDate)

  const res = await fetch(`${BASE}/v1/projects/${projectId}/analyses`, {
    method: 'POST',
    headers: authHeaders,
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Analysis failed')
  }
  return res.json()
}

/**
 * GET /api/v1/projects
 * List all projects for the current user.
 */
export async function fetchProjects() {
  return request('/v1/projects')
}

/**
 * POST /api/v1/projects
 * Create a new project.
 */
export async function createProject(name, description = '') {
  return request('/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
}

/**
 * PATCH /api/v1/projects/{id}
 * Update a project's name or description.
 */
export async function updateProject(projectId, updates) {
  return request(`/v1/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

/**
 * DELETE /api/v1/projects/{id}
 */
export async function deleteProject(projectId) {
  return request(`/v1/projects/${projectId}`, { method: 'DELETE' })
}

/**
 * GET /api/v1/projects/{id}/analyses
 * List analyses for a project.
 */
export async function fetchAnalyses(projectId, page = 1, pageSize = 20) {
  return request(`/v1/projects/${projectId}/analyses?page=${page}&page_size=${pageSize}`)
}

/**
 * GET /api/v1/projects/{id}/analyses/{aid}
 * Get a single full analysis.
 */
export async function fetchAnalysis(projectId, analysisId) {
  return request(`/v1/projects/${projectId}/analyses/${analysisId}`)
}

/**
 * DELETE /api/v1/projects/{id}/analyses/{aid}
 */
export async function deleteAnalysis(projectId, analysisId) {
  return request(`/v1/projects/${projectId}/analyses/${analysisId}`, { method: 'DELETE' })
}

/**
 * GET /api/v1/history
 * Cross-project analysis history for the current user.
 */
export async function fetchHistory(page = 1, pageSize = 20, project = '') {
  return request(`/v1/history?page=${page}&page_size=${pageSize}&project=${encodeURIComponent(project)}`)
}

/**
 * GET /health
 * Public health check — no auth required.
 */
export async function healthCheck() {
  const res = await fetch(`${BASE.replace('/api', '')}/health`)
  return res.json()
}