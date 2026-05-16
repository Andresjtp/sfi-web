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

// ─── Health ──────────────────────────────────────────────────────────────────

export async function healthCheck() {
  return request('/health')
}