import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2, ChevronRight, AlertTriangle } from 'lucide-react'
import { listProjects, createProject, deleteProject } from '../lib/api.js'
import { sfiRiskBand } from '../lib/utils.js'
import clsx from 'clsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const project = await createProject({ name: name.trim(), description: desc.trim() })
      onCreate(project)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div>
          <p className="label-mono mb-1">New Project</p>
          <h2 className="font-mono text-lg font-medium text-text-primary">
            Create a Project
          </h2>
          <p className="font-mono text-xs text-text-dim mt-1">
            Group your CSV uploads and track schedule risk over time.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-xs text-text-secondary">
              Project Name <span className="text-critical">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Channel 7 News Facility"
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm
                         text-text-primary placeholder:text-text-dim
                         focus:outline-none focus:border-amber transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-text-secondary">
              Description <span className="text-text-dim">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Miami, FL — Miller Construction"
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm
                         text-text-primary placeholder:text-text-dim resize-none
                         focus:outline-none focus:border-amber transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-critical">
            <AlertTriangle size={13} />
            <p className="font-mono text-xs">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [deleting, setDeleting]       = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects()
      setProjects(data.projects ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreated = (project) => {
    setShowModal(false)
    // Navigate straight into the new project
    navigate(`/projects/${project.id}`)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this project and all its analyses? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert(`Could not delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label-mono mb-1">Schedule Risk Intelligence</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            Projects
          </h1>
          <p className="text-text-secondary text-sm mt-2 max-w-lg">
            Each project tracks its own schedule uploads and SFI trend over time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="panel p-12 flex items-center justify-center">
          <p className="font-mono text-sm text-text-dim animate-pulse">Loading projects…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="panel p-6 border border-critical/30 bg-critical/5">
          <p className="font-mono text-sm text-critical">{error}</p>
          <p className="font-mono text-xs text-text-dim mt-1">
            Make sure the API backend is running on port 8000.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="panel p-16 flex flex-col items-center justify-center gap-4 text-center">
          <FolderOpen size={40} className="text-text-dim" />
          <div>
            <p className="font-mono text-sm text-text-secondary">No projects yet</p>
            <p className="font-mono text-xs text-text-dim mt-1 max-w-xs">
              Create a project for each construction job to keep schedules and history organized.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 mt-2"
          >
            <Plus size={14} />
            Create your first project
          </button>
        </div>
      )}

      {/* Projects table */}
      {!loading && !error && projects.length > 0 && (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Project', 'Description', 'Analyses', 'Latest SFI', 'Risk', 'Last Run', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-xs text-text-secondary whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const band = project.latest_sfi_score != null
                  ? sfiRiskBand(project.latest_sfi_score)
                  : null

                return (
                  <tr
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="border-b border-border/50 hover:bg-panel/50 transition-colors cursor-pointer group"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-text-primary group-hover:text-amber transition-colors">
                        {project.name}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 font-mono text-xs text-text-dim max-w-[200px] truncate">
                      {project.description || '—'}
                    </td>

                    {/* Analysis count */}
                    <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                      {project.analysis_count ?? 0}
                    </td>

                    {/* Latest SFI */}
                    <td className="px-4 py-3">
                      {project.latest_sfi_score != null ? (
                        <span className={clsx('font-mono text-sm font-medium', band?.text)}>
                          {project.latest_sfi_score.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-text-dim">—</span>
                      )}
                    </td>

                    {/* Risk label */}
                    <td className="px-4 py-3">
                      {project.latest_sfi_label ? (
                        <span className={clsx(
                          'font-mono text-xs px-2 py-0.5 rounded border',
                          band?.text,
                          'border-current/40 bg-current/5'
                        )}>
                          {project.latest_sfi_label}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-text-dim">No runs yet</span>
                      )}
                    </td>

                    {/* Last run date */}
                    <td className="px-4 py-3 font-mono text-xs text-text-dim whitespace-nowrap">
                      {formatDate(project.latest_analyzed_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          disabled={deleting === project.id}
                          className="text-text-dim hover:text-critical transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                          title="Delete project"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight
                          size={15}
                          className="text-text-dim group-hover:text-amber transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New project modal */}
      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  )
}
