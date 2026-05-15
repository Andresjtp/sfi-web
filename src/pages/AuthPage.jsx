import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthPage() {
  const navigate        = useNavigate()
  const { signIn, signUp } = useAuth()

  const [mode, setMode]       = useState('login')   // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)

  const isLogin    = mode === 'login'
  const isRegister = mode === 'register'

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (isRegister && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) {
        setError(error.message)
      } else {
        navigate('/')
      }
    } else {
      const { error } = await signUp(email, password)
      setLoading(false)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Account created. You can now sign in.')
        setMode('login')
        setPassword('')
        setConfirm('')
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">

      {/* Background grid */}
      <div
        className="fixed inset-0 bg-grid-pattern bg-grid-sm opacity-30 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-slide-up">

        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <p className="label-mono mb-2">Schedule Intelligence</p>
          <h1 className="font-mono text-3xl font-medium text-text-primary tracking-tight">
            SFI Engine
          </h1>
          <p className="text-text-dim font-mono text-xs mt-2">
            Schedule Fragility Index · Risk Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="panel p-8 shadow-panel">

          {/* Mode toggle */}
          <div className="flex mb-8 border border-border rounded overflow-hidden">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
              className={`flex-1 font-mono text-sm py-2.5 transition-colors duration-150 ${
                isLogin
                  ? 'bg-amber text-void font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
              className={`flex-1 font-mono text-sm py-2.5 transition-colors duration-150 ${
                isRegister
                  ? 'bg-amber text-void font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Register
            </button>
          </div>

          {/* Success banner */}
          {success && (
            <div className="mb-5 px-4 py-3 rounded border border-stable/30 bg-stable/10">
              <p className="font-mono text-xs text-stable">{success}</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded border border-critical/30 bg-critical/10 flex items-start gap-2">
              <AlertTriangle size={14} className="text-critical mt-0.5 shrink-0" />
              <p className="font-mono text-xs text-critical">{error}</p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="label-mono block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@company.com"
                className="w-full bg-surface border border-border rounded px-3 py-2.5
                           font-mono text-sm text-text-primary placeholder:text-text-dim
                           focus:outline-none focus:border-amber transition-colors duration-150"
              />
            </div>

            <div>
              <label className="label-mono block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="w-full bg-surface border border-border rounded px-3 py-2.5
                           font-mono text-sm text-text-primary placeholder:text-text-dim
                           focus:outline-none focus:border-amber transition-colors duration-150"
              />
            </div>

            {isRegister && (
              <div className="animate-fade-in">
                <label className="label-mono block mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border rounded px-3 py-2.5
                             font-mono text-sm text-text-primary placeholder:text-text-dim
                             focus:outline-none focus:border-amber transition-colors duration-150"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={15} />
              </>
            )}
          </button>

        </div>

        {/* Footer note */}
        <p className="text-center font-mono text-xs text-text-dim mt-6">
          SFI Engine · Confidential
        </p>

      </div>
    </div>
  )
}