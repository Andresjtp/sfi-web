import { NavLink, Outlet } from 'react-router-dom'
import { Upload, BarChart2, Clock, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',        label: 'Analyze',  icon: Upload   },
  { to: '/report',  label: 'Report',   icon: BarChart2 },
  { to: '/history', label: 'History',  icon: Clock    },
]

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-void">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-surface flex flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber" />
            <span className="font-mono text-sm font-medium text-text-primary tracking-wider">
              SFI ENGINE
            </span>
          </div>
          <p className="font-mono text-xs text-text-dim mt-1">
            Schedule Fragility Index
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition-all duration-150',
                  isActive
                    ? 'bg-amber/10 text-amber border border-amber/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="font-mono text-xs text-text-dim">v0.1.0 · V1 Engine</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-void bg-grid-pattern bg-grid-sm">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
