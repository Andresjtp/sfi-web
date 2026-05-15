import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Trash2, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react'
import { fetchProjects, createProject, deleteProject } from '../lib/api.js'
import clsx from 'clsx'

function RiskBadge({ label }) {
  if (!label) return null
  const colors = {
    'Low Risk':      'text-stable border-stable/40 bg-stable/10',
    'Moderate Risk': 'text-amber border-amber/40 bg-amber/10',
    'High Risk':     'text-critical border-critical/40 bg-critical/10',
    'Critical Risk': 'text-critical border-critical/60 bg-critical/20',
  }
  return (
    <span className={clsx(
      'font-mono text-xs px-2 py-0.5 rounded border',
      colors[label] ?? 'text-text-dim border-border'
    )}>
      {label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function ProjectsPage() {
  const navigate = useNavigate()

  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [creating, setCreating]   = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [deleting, setDeleting]   = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjects()
      setProjects(data.projects ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await createProject(name.trim(), description.trim())
      setProjects(prev => [project, ...prev])
      setName('')
      setDesc('')
      setShowForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this project and all its analyses? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      alert(`Could not delete: ${e.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label-mono mb-1">Schedule Intelligence</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">Projects</h1>
          <p className="text-text-secondary text-sm mt-2 max-w-lg">
            Each project holds a schedule and its analysis history. Create a project to get started.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(f => !f)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            New Project
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="panel p-6 space-y-4 animate-fade-in border-amber/20">
          <p className="label-mono">New Project</p>
          <div className="space-y-3">
            <div>
              <label className="label-mono block mb-1.5">Project Name <span className="text-critical">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Channel 7 News Facility — Miami"
                autoFocus
                className="w-full bg-surface border border-border rounded px-3 py-2.5
                           font-mono text-sm text-text-primary placeholder:text-text-dim
                           focus:outline-none focus:border-amber transition-colors duration-150"
              />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Description <span className="text-text-dim">(optional)</span></label>
              <input
                type="text"
                value={description}
                onChange={e => setDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="GC, owner, location, contract type…"
                className="w-full bg-surface border border-border rounded px-3 py-2.5
                           font-mono text-sm text-text-primary placeholder:text-text-dim
                           focus:outline-none focus:border-amber transition-colors duration-150"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {creating ? 'Creating…' : 'Create Project'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setDesc('') }}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="panel p-4 border border-critical/30 bg-critical/5 flex items-start gap-2">
          <AlertTriangle size={14} className="text-critical mt-0.5 shrink-0" />
          <p className="font-mono text-sm text-critical">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="panel p-12 flex items-center justify-center">
          <p className="font-mono text-sm text-text-dim animate-pulse">Loading projects…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && projects.length === 0 && (
        <div className="panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <FolderOpen size={32} className="text-text-dim" />
          <p className="font-mono text-sm text-text-secondary">No projects yet</p>
          <p className="font-mono text-xs text-text-dim max-w-sm">
            Create your first project to start uploading schedules and tracking SFI over time.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-2 flex items-center gap-2">
            <Plus size={14} /> New Project
          </button>
        </div>
      )}

      {/* Project list */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="panel p-5 flex items-center justify-between
                         hover:border-muted cursor-pointer transition-colors duration-150 group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber/10 border border-amber/20
                                flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={16} className="text-amber" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-text-primary truncate">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="font-mono text-xs text-text-dim truncate mt-0.5">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-mono text-xs text-text-dim">
                      {project.analysis_count ?? 0} {project.analysis_count === 1 ? 'analysis' : 'analyses'}
                    </span>
                    <span className="font-mono text-xs text-text-dim">
                      Updated {formatDate(project.updated_at)}
                    </span>
                    {project.latest_sfi_label && (
                      <RiskBadge label={project.latest_sfi_label} />
                    )}
                    {project.latest_sfi_score != null && (
                      <span className="font-mono text-xs text-text-secondary">
                        SFI {project.latest_sfi_score.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  disabled={deleting === project.id}
                  className="text-text-dim hover:text-critical transition-colors
                             disabled:opacity-40 opacity-0 group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-text-dim group-hover:text-text-secondary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}