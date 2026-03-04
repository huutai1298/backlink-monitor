import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Link2, Search, Globe, Users, MessageSquare, ScrollText, LogOut
} from 'lucide-react'
import useAuthStore from '../store/authStore'

const menuGroups = [
  {
    label: null,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Bảng điều khiển' },
    ]
  },
  {
    label: 'QUẢN LÝ',
    items: [
      { to: '/backlinks', icon: Link2, label: 'Backlinks' },
      { to: '/crawl', icon: Search, label: 'Crawl Domain' },
      { to: '/websites', icon: Globe, label: 'Websites' },
      { to: '/customers', icon: Users, label: 'Khách hàng' },
    ]
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { to: '/blacklist', icon: MessageSquare, label: 'Gửi tin nhắn' },
      { to: '/logs', icon: ScrollText, label: 'Nhật ký thông báo' },
    ]
  },
]

export default function Sidebar() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-blue-600 tracking-tight">🔗 Backlink Monitor</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuGroups.map((group, gi) => (
          <div key={gi} className="mb-2">
            {group.label && (
              <p className="text-xs font-semibold text-gray-400 px-3 mb-1 mt-3 tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={17} strokeWidth={1.8} />
          Đăng xuất
        </button>
      </div>
    </div>
  )
}
