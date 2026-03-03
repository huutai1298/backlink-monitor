import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const navItems = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Backlinks', path: '/backlinks', icon: '🔗' },
  { label: 'Crawl', path: '/crawl', icon: '🕷️' },
  { label: 'Websites', path: '/websites', icon: '🌐' },
  { label: 'Customers', path: '/customers', icon: '👥' },
  { label: 'Blacklist', path: '/blacklist', icon: '🚫' },
  { label: 'Logs', path: '/logs', icon: '📋' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-64 flex flex-col bg-[#0f172a] text-white h-screen flex-shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-lg font-semibold">🔗 Backlink Monitor</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </div>
  )
}
