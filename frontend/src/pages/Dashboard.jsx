import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import StatCard from '../components/StatCard'

const statusColors = {
  live: 'bg-green-100 text-success',
  lost: 'bg-red-100 text-danger',
  pending: 'bg-orange-100 text-warning',
  expired: 'bg-slate-100 text-slate-500',
  inactive: 'bg-yellow-100 text-yellow-700',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [inactiveAlive, setInactiveAlive] = useState([])
  const [deadWebsites, setDeadWebsites] = useState([])
  const [crawling, setCrawling] = useState(false)
  const [crawlMsg, setCrawlMsg] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [statsRes, expiringRes, inactiveRes, deadRes] = await Promise.allSettled([
      api.get('/dashboard/stats'),
      api.get('/dashboard/expiring'),
      api.get('/dashboard/inactive-alive'),
      api.get('/dashboard/dead-websites'),
    ])
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
    if (expiringRes.status === 'fulfilled') setExpiring(expiringRes.value.data)
    if (inactiveRes.status === 'fulfilled') setInactiveAlive(inactiveRes.value.data)
    if (deadRes.status === 'fulfilled') setDeadWebsites(deadRes.value.data)
  }

  const handleCrawlAll = async () => {
    setCrawling(true)
    setCrawlMsg('')
    try {
      await api.post('/crawl/all')
      setCrawlMsg('✅ Crawl completed successfully!')
      fetchAll()
    } catch {
      setCrawlMsg('❌ Crawl failed. Please try again.')
    } finally {
      setCrawling(false)
    }
  }

  const fmt = (n) => (n !== undefined && n !== null ? n.toLocaleString() : '—')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          {crawlMsg && <span className="text-sm">{crawlMsg}</span>}
          <button
            onClick={handleCrawlAll}
            disabled={crawling}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {crawling && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {crawling ? 'Crawling...' : '🕷️ Crawl All Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Live" value={fmt(stats?.live)} color="text-success" icon="✅" />
        <StatCard title="Lost" value={fmt(stats?.lost)} color="text-danger" icon="⚠️" />
        <StatCard title="Pending" value={fmt(stats?.pending)} color="text-warning" icon="⏳" />
        <StatCard title="Expired" value={fmt(stats?.expired)} color="text-slate-500" icon="⏰" />
        <StatCard
          title="Monthly Revenue"
          value={stats ? `${fmt(stats.monthly_revenue)} VND` : '—'}
          color="text-primary"
          icon="💰"
        />
      </div>

      <div className="bg-white rounded-card shadow p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">⚠️ Links Expiring Within 7 Days</h2>
        {expiring.length === 0 ? (
          <p className="text-slate-400 text-sm">No links expiring soon.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Domain</th>
                <th className="pb-2 pr-4">Anchor</th>
                <th className="pb-2 pr-4">Payment Date</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2 pr-4">{row.customer_name}</td>
                  <td className="py-2 pr-4">{row.domain}</td>
                  <td className="py-2 pr-4">{row.anchor_text}</td>
                  <td className="py-2 pr-4">{row.date_payment}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[row.status] || ''}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-card shadow p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">💡 Inactive Links Still Alive</h2>
        {inactiveAlive.length === 0 ? (
          <p className="text-slate-400 text-sm">No inactive links still alive.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Domain</th>
                <th className="pb-2 pr-4">Anchor</th>
                <th className="pb-2">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {inactiveAlive.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2 pr-4">{row.customer_name}</td>
                  <td className="py-2 pr-4">{row.domain}</td>
                  <td className="py-2 pr-4">{row.anchor_text}</td>
                  <td className="py-2">{row.date_payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-card shadow p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">🔴 Dead Websites</h2>
        {deadWebsites.length === 0 ? (
          <p className="text-slate-400 text-sm">No dead websites.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 pr-4">Domain</th>
                <th className="pb-2 pr-4">Dead Since</th>
                <th className="pb-2">Affected Backlinks</th>
              </tr>
            </thead>
            <tbody>
              {deadWebsites.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2 pr-4">{row.domain}</td>
                  <td className="py-2 pr-4">{row.dead_since}</td>
                  <td className="py-2">{row.affected_backlinks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
