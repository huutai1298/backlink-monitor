import { useEffect, useState } from 'react'
import api from '../api/axios'
import { RefreshCw, TrendingUp, AlertTriangle, Clock, XCircle, DollarSign } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [deadWebsites, setDeadWebsites] = useState([])
  const [crawling, setCrawling] = useState(false)

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data))
    api.get('/dashboard/expiring').then(r => setExpiring(r.data))
    api.get('/dashboard/dead-websites').then(r => setDeadWebsites(r.data))
  }, [])

  const handleCrawlAll = async () => {
    setCrawling(true)
    try {
      await api.post('/crawl/all')
      setTimeout(() => setCrawling(false), 3000)
    } catch {
      setCrawling(false)
    }
  }

  const statCards = stats ? [
    { label: 'Còn sống', value: stats.live, color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp },
    { label: 'Đã mất', value: stats.lost, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
    { label: 'Chờ xử lý', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
    { label: 'Hết hạn', value: stats.expired, color: 'text-orange-600', bg: 'bg-orange-50', icon: XCircle },
    { label: 'Doanh thu/tháng', value: `${Number(stats.monthly_revenue).toLocaleString('vi-VN')} ₫`, color: 'text-blue-600', bg: 'bg-blue-50', icon: DollarSign },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Bảng điều khiển</h1>
        <button
          onClick={handleCrawlAll}
          disabled={crawling}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} className={crawling ? 'animate-spin' : ''} />
          {crawling ? 'Đang crawl...' : 'Crawl All Now'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Expiring Links */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">⏰ Link sắp hết hạn (7 ngày tới)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Khách hàng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Anchor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Ngày hết hạn</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {expiring.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Không có link nào sắp hết hạn</td></tr>
              ) : expiring.map(bl => (
                <tr key={bl.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{bl.domain}</td>
                  <td className="px-5 py-3 text-gray-600">{bl.customer_name}</td>
                  <td className="px-5 py-3 text-gray-600">{bl.anchor_text || '—'}</td>
                  <td className="px-5 py-3 text-orange-600 font-medium">{bl.date_payment}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-700">{bl.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dead Websites */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">🔴 Website không truy cập được</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Chết từ</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Backlinks bị ảnh hưởng</th>
              </tr>
            </thead>
            <tbody>
              {deadWebsites.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400 text-sm">Tất cả website đang hoạt động bình thường</td></tr>
              ) : deadWebsites.map(w => (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{w.domain}</td>
                  <td className="px-5 py-3 text-red-500">{w.dead_since ? new Date(w.dead_since).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{w.affected_backlinks} links</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
