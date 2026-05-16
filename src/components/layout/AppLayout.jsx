import { NavLink, Outlet } from 'react-router-dom'
import { FolderOpen, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AppLayout() {
  const { signOut, user } = useAuth()

  return (
    <div className="flex min-h-screen bg-void text-text-primary">

      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <p className="font-mono text-xs text-text-dim tracking-widest uppercase mb-1">
            Schedule Risk
          </p>
          <p className="font-mono text-lg font-semibold text-amber leading-none">
            SFI Engine
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/projects"
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-sm transition-colors',
              isActive
                ? 'bg-amber/10 text-amber'
                : 'text-text-secondary hover:text-text-primary hover:bg-panel'
            )}
          >
            <FolderOpen size={15} />
            Projects
          </NavLink>
        </nav>

        {/* User + Sign Out */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          <p className="font-mono text-xs text-text-dim truncate" title={user?.email}>
            {user?.email}
          </p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                       font-mono text-sm text-text-secondary border border-border
                       hover:text-critical hover:border-critical/40 hover:bg-critical/5
                       transition-colors duration-150"
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <p className="font-mono text-xs text-text-dim">v2.0.0</p>
        </div>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}