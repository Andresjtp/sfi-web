import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, AlertTriangle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAnalysis } from '../hooks/useAnalysis.js'

export default function UploadPage() {
  const navigate = useNavigate()
  const { analyze, loading, error } = useAnalysis()

  const [file, setFile]           = useState(null)
  const [dragging, setDragging]   = useState(false)
  const [statusDate, setStatusDate] = useState('')
  const [topN, setTopN]           = useState(10)
  const [strict, setStrict]       = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (f) setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const handleSubmit = async () => {
    if (!file) return
    const result = await analyze(file, {
      top: topN,
      strict,
      statusDate: statusDate || undefined,
    })
    // Store result in sessionStorage so ReportPage can access it
    if (result) {
      sessionStorage.setItem('sfi_result', JSON.stringify(result))
      navigate('/report')
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page header */}
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
          
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText size={32} className="text-stable" />
            <div>
              <p className="font-mono text-text-primary font-medium">{file.name}</p>
              <p className="font-mono text-xs text-text-secondary mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="flex items-center gap-1 text-xs font-mono text-text-dim hover:text-critical transition-colors"
            >
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-text-dim" />
            <div>
              <p className="font-mono text-text-primary">
                Drop your CSV or XER here
              </p>
              <p className="font-mono text-xs text-text-secondary mt-1">
                or click to browse
              </p>
            </div>
            <p className="font-mono text-xs text-text-dim">
              Required columns: task_id · task_name · duration_days · predecessors
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="panel p-6 space-y-5">
        <p className="label-mono">Analysis Options</p>

        <div className="grid grid-cols-2 gap-6">
          {/* Status date */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-secondary">
              Status Date <span className="text-text-dim">(optional)</span>
            </label>
            <input
              type="date"
              value={statusDate}
              onChange={(e) => setStatusDate(e.target.value)}
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm text-text-primary
                         focus:outline-none focus:border-amber transition-colors"
            />
            <p className="font-mono text-xs text-text-dim">
              Enables overdue &amp; late-start progress tracking
            </p>
          </div>

          {/* Top N */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-text-secondary">
              Top Risk Tasks
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full bg-void border border-border rounded px-3 py-2 font-mono text-sm text-text-primary
                         focus:outline-none focus:border-amber transition-colors"
            />
            <p className="font-mono text-xs text-text-dim">
              Lowest-float tasks displayed in the report
            </p>
          </div>
        </div>

        {/* Strict toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStrict(s => !s)}
            className={clsx(
              'relative w-10 h-5 rounded-full transition-colors duration-200',
              strict ? 'bg-amber' : 'bg-muted'
            )}
          >
            <span className={clsx(
              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-void transition-transform duration-200',
              strict && 'translate-x-5'
            )} />
          </button>
          <span className="font-mono text-sm text-text-secondary">
            Strict validation
          </span>
          <span className="font-mono text-xs text-text-dim">
            — reject duplicate IDs &amp; missing predecessors
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 border border-critical/30 bg-critical/5 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-critical mt-0.5 flex-shrink-0" />
          <p className="font-mono text-sm text-critical">{error.message}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-pulse">Analyzing</span>
              <span className="font-mono text-void/60">...</span>
            </>
          ) : (
            <>
              Run Analysis
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}