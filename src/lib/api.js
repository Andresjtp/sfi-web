/**
 * api.js  —  SFI Web API Client (v2 — project-scoped)
 * Place in: sfi-web/src/lib/api.js
 */

const BASE = "/api/v1";

async function apiFetch(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try { message = (await res.json()).detail || message; } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function checkHealth() {
  return apiFetch("/health");
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects() {
  return apiFetch(`${BASE}/projects`);
}

export async function createProject({ name, description = "" }) {
  return apiFetch(`${BASE}/projects`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, description }),
  });
}

export async function getProject(projectId) {
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}`);
}

export async function updateProject(projectId, { name, description }) {
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, description }),
  });
}

export async function deleteProject(projectId) {
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

// ─── Analyses (scoped to a project) ─────────────────────────────────────────

export async function analyzeSchedule(projectId, file, { statusDate = "", strict = false, onProgress } = {}) {
  const form = new FormData();
  form.append("file",        file);
  form.append("status_date", statusDate);
  form.append("strict",      strict ? "true" : "false");

  const url = `${BASE}/projects/${encodeURIComponent(projectId)}/analyses`;

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
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

  return apiFetch(url, { method: "POST", body: form });
}

export async function listAnalyses(projectId, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize });
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}/analyses?${params}`);
}

export async function getAnalysis(projectId, analysisId) {
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}`);
}

export async function deleteAnalysis(projectId, analysisId) {
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}`, {
    method: "DELETE",
  });
}

export async function compareAnalyses(projectId, idA, idB) {
  const params = new URLSearchParams({ id_a: idA, id_b: idB });
  return apiFetch(`${BASE}/projects/${encodeURIComponent(projectId)}/analyses/compare?${params}`);
}

// ─── Legacy shims (keep existing pages working during transition) ─────────────
export const listHistory      = () => Promise.resolve({ items: [], total: 0 });
export const deleteHistoryItem = () => Promise.resolve({});
