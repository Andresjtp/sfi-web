import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, AlertTriangle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { analyzeSchedule } from '../lib/api.js'

export default function UploadPage({ projectId = null, onAnalyzed = null }) {
  const navigate = useNavigate()

  const [file, setFile]             = useState(null)
  const [dragging, setDragging]     = useState(false)
  const [statusDate, setStatusDate] = useState('')
  const [topN, setTopN]             = useState(10)
  const [strict, setStrict]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const inputRef = useRef()

  const accept = '.csv,.xer'

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xer'))) setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeSchedule(file, {
        top: topN,
        strict,
        statusDate: statusDate || undefined,
      }, projectId)

      if (result) {
        sessionStorage.setItem('sfi_result', JSON.stringify(result))
        if (projectId) {
          // Stay in project context
          if (onAnalyzed) onAnalyzed(result)
          navigate(`/projects/${projectId}/report`)
        } else {
          navigate('/report')
        }
      }
    } catch (err) {
      setError(err.message ?? 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header — only shown when used standalone (no projectId) */}
      {!projectId && (
        <div>
          <p className="label-mono mb-2">Schedule Analysis</p>
          <h1 className="font-mono text-2xl font-medium text-text-primary">
            Upload Schedule File
          </h1>
          <p className="text-text-secondary text-sm mt-2 font-body max-w-lg">
            Upload a Primavera XER or CSV schedule export to compute the Critical Path,
            float distribution, and Schedule Fragility Index.
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && inputRef.current.click()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer',
          dragging
            ? 'border-amber bg-amber/5 shadow-amber-glow'
            : file
            ? 'border-stable/40 bg-stable/5 cursor-default'
            : 'border-border hover:border-muted hover:bg-panel/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="flex items-center justify-center gap-4">
            <FileText size={24} className="text-stable flex-shrink-0" />
            <div className="text-left">
              <p className="font-mono text-sm text-text-primary">{file.name}</p>
              <p className="font-mono text-xs text-text-dim mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="ml-4 text-text-dim hover:text-critical transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={28} className="text-text-dim" />
            <div>
              <p className="font-mono text-sm text-text-secondary">Drop your CSV or XER here</p>
              <p className="font-mono text-xs text-text-dim mt-1">or click to browse</p>
            </div>
            <p className="font-mono text-xs text-text-dim/60">
              Supported formats: .csv · .xer (Primavera P6)
            </p>
          </div>
        )}
      </div>

      {/* Analysis options */}
      <div className="panel p-6 space-y-5">
        <p className="label-mono">Analysis Options</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-xs text-text-secondary mb-1.5 block">
              Status Date <span className="text-text-dim">(optional)</span>
            </label>
            <input
              type="date"
              value={statusDate}
              onChange={(e) => setStatusDate(e.target.value)}
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm text-text-primary focus:border-amber focus:outline-none transition-colors"
            />
            <p className="font-mono text-xs text-text-dim mt-1">
              Enables overdue &amp; late-start progress tracking
            </p>
          </div>

          <div>
            <label className="font-mono text-xs text-text-secondary mb-1.5 block">
              Top Risk Tasks
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm text-text-primary focus:border-amber focus:outline-none transition-colors"
            />
            <p className="font-mono text-xs text-text-dim mt-1">
              Lowest-float tasks displayed in the report
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
          <button
            role="switch"
            aria-checked={strict}
            onClick={() => setStrict(v => !v)}
            className={clsx(
              'relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
              strict ? 'bg-amber' : 'bg-border'
            )}
          >
            <span className={clsx(
              'absolute top-0.5 w-4 h-4 rounded-full bg-void transition-transform duration-200',
              strict ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </button>
          <span className="font-mono text-sm text-text-secondary">
            Strict validation
          </span>
          <span className="font-mono text-xs text-text-dim">
            — reject duplicate IDs &amp; missing predecessors
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="panel p-4 border-critical/30 bg-critical/5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-critical flex-shrink-0 mt-0.5" />
          <p className="font-mono text-sm text-critical">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className={clsx(
            'flex items-center gap-2 px-6 py-2.5 rounded font-mono text-sm font-medium transition-all duration-200',
            file && !loading
              ? 'bg-amber text-void hover:bg-amber/90 shadow-amber-glow'
              : 'bg-panel text-text-dim cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              Run Analysis
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}