import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Clock, Activity, GitCompare } from 'lucide-react'
import clsx from 'clsx'
import UploadPage from './UploadPage.jsx'
import ProjectHistoryTab from './ProjectHistoryTab.jsx'
import TrendTab from './TrendTab.jsx'
import DriftDrawer from './DriftDrawer.jsx'
import { fetchProject } from '../lib/api.js'

const TABS = [
  { id: 'analyze', label: 'Analyze', icon: Upload },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'trend',    label: 'Trend',    icon: Activity },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]   = useState('analyze')
  const [project, setProject]       = useState(null)

  // Drift drawer state — lifted here so History tab can trigger it
  const [driftIds, setDriftIds]     = useState(null)   // { idA, idB, labelA, labelB } | null

  useEffect(() => {
    fetchProject(projectId)
      .then(setProject)
      .catch(() => {})
  }, [projectId])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Projects
        </button>
        <p className="label-mono mb-1">Project</p>
        <h1 className="font-mono text-2xl font-medium text-text-primary">
          {project?.name ?? projectId}
        </h1>
        {project && (
          <p className="font-mono text-xs text-text-dim mt-1">
            {project.analysis_count ?? 0}{' '}
            {project.analysis_count === 1 ? 'analysis' : 'analyses'}
            {project.latest_sfi_score != null && (
              <span className="ml-3 text-amber">
                SFI {Number(project.latest_sfi_score).toFixed(2)}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 font-mono text-sm transition-all duration-150 border-b-2 -mb-px',
              activeTab === id
                ? 'border-amber text-amber'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'analyze' && (
        <UploadPage
          projectId={projectId}
          onAnalyzed={() => setActiveTab('history')}
        />
      )}
      {activeTab === 'history' && (
        <ProjectHistoryTab
          projectId={projectId}
          onCompare={(idA, idB, labelA, labelB) =>
            setDriftIds({ idA, idB, labelA, labelB })
          }
        />
      )}
      {activeTab === 'trend' && (
        <TrendTab projectId={projectId} />
      )}
      {/* Drift drawer — rendered at page level so it overlays everything */}
      {driftIds && (
        <DriftDrawer
          projectId={projectId}
          idA={driftIds.idA}
          idB={driftIds.idB}
          labelA={driftIds.labelA}
          labelB={driftIds.labelB}
          onClose={() => setDriftIds(null)}
        />
      )}
    </div>
  )
}