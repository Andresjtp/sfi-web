import { useState, useCallback } from 'react'
import { analyzeSchedule } from '../lib/api.js'

/**
 * useAnalysis — manages the lifecycle of a schedule analysis request.
 *
 * Returns:
 *   result    — the AnalyzeResult from the API (null until analyzed)
 *   loading   — boolean, true while request is in-flight
 *   error     — Error object or null
 *   analyze   — (file, opts) => Promise<void>  — trigger the analysis
 *   reset     — clear result and error
 */
export function useAnalysis() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const analyze = useCallback(async (file, opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeSchedule(file, opts)
      setResult(data)
      return data
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, analyze, reset }
}
