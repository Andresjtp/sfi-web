/**
 * api.js  —  SFI Web API Client
 *
 * Drop this file into:  sfi-web/src/api.js
 *
 * Every function in this file maps 1-to-1 with a backend route.
 * Vite's dev proxy (vite.config.js) forwards /api → http://localhost:8000
 * so no CORS issues in development.
 */

const BASE = "/api/v1";

// ─── Shared fetch wrapper ────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(path, options);

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch (_) {}
    throw new Error(message);
  }

  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * Ping the backend.
 * @returns {{ status: string, service: string }}
 */
export async function checkHealth() {
  return apiFetch("/health");
}

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * Upload a CSV file and run a full SFI analysis.
 *
 * @param {File}   file         - The CSV File object from an <input type="file">
 * @param {Object} [opts]
 * @param {string} [opts.projectName] - Human-readable project label
 * @param {string} [opts.statusDate]  - ISO date string, e.g. "2026-04-03"
 * @param {Function} [opts.onProgress] - (percent: number) => void  (0–100)
 *
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeSchedule(file, { projectName = "", statusDate = "", onProgress } = {}) {
  const form = new FormData();
  form.append("file", file);
  form.append("project_name", projectName);
  form.append("status_date", statusDate);

  // XHR used instead of fetch so we can track upload progress
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/analyze`);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let detail = `Server error ${xhr.status}`;
          try { detail = JSON.parse(xhr.responseText).detail; } catch (_) {}
          reject(new Error(detail));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.send(form);
    });
  }

  // Simple path — no progress tracking needed
  return apiFetch(`${BASE}/analyze`, { method: "POST", body: form });
}

/**
 * Retrieve a previously stored analysis by ID.
 *
 * @param {string} id
 * @returns {Promise<AnalysisResult>}
 */
export async function getAnalysis(id) {
  return apiFetch(`${BASE}/analyze/${encodeURIComponent(id)}`);
}

// ─── History ─────────────────────────────────────────────────────────────────

/**
 * List past analyses, newest first.
 *
 * @param {Object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @param {string} [opts.project]   - Optional partial-match filter
 *
 * @returns {Promise<{ items: AnalysisSummary[], total: number }>}
 */
export async function listHistory({ page = 1, pageSize = 20, project = "" } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize });
  if (project) params.set("project", project);
  return apiFetch(`${BASE}/history?${params}`);
}

/**
 * Load the full record for one historical analysis.
 *
 * @param {string} id
 * @returns {Promise<AnalysisResult>}
 */
export async function getHistoryItem(id) {
  return apiFetch(`${BASE}/history/${encodeURIComponent(id)}`);
}

/**
 * Compare two analyses for schedule drift.
 *
 * @param {string} idA  - Earlier analysis ID
 * @param {string} idB  - Later analysis ID
 * @returns {Promise<DriftReport>}
 */
export async function compareAnalyses(idA, idB) {
  const params = new URLSearchParams({ id_a: idA, id_b: idB });
  return apiFetch(`${BASE}/history/compare?${params}`);
}

/**
 * Delete a stored analysis.
 *
 * @param {string} id
 * @returns {Promise<{ deleted: string }>}
 */
export async function deleteHistoryItem(id) {
  return apiFetch(`${BASE}/history/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── JSDoc type hints (no TypeScript required) ───────────────────────────────

/**
 * @typedef {Object} AnalysisResult
 * @property {string}   id
 * @property {string}   project_name
 * @property {string}   filename
 * @property {string}   analyzed_at
 * @property {number}   task_count
 * @property {number}   critical_path_length
 * @property {number}   sfi_score
 * @property {string}   sfi_label
 * @property {Object}   metrics
 * @property {string}   risk_trend
 * @property {Object[]} near_critical_tasks
 * @property {Object[]} float_distribution
 * @property {string[]} warnings
 * @property {boolean}  engine_connected
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {string} id
 * @property {string} project_name
 * @property {string} filename
 * @property {string} analyzed_at
 * @property {number} sfi_score
 * @property {string} sfi_label
 * @property {number} task_count
 * @property {string} risk_trend
 */
