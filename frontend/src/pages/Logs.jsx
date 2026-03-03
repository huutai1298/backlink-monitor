import React, { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import Pagination from '../components/Pagination'

const typeBadgeColors = {
  lost: 'bg-red-100 text-red-700',
  live: 'bg-green-100 text-green-700',
  inactive_still_live: 'bg-orange-100 text-orange-700',
  website_die: 'bg-red-100 text-red-700',
  website_alive: 'bg-green-100 text-green-700',
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState([])
  const [expanded, setExpanded] = useState({})
  const limit = 20

  const [filters, setFilters] = useState({
    customer_id: '',
    type: '',
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    api.get('/customers')
      .then((res) => setCustomers(res.data?.items || res.data || []))
      .catch(() => setCustomers([]))
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const params = { ...filters, page, limit }
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
      const res = await api.get('/logs', { params })
      setLogs(res.data?.items || res.data || [])
      setTotal(res.data?.total || 0)
    } catch {
      setLogs([])
    }
  }, [filters, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleFilter = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Logs</h1>

      <div className="bg-white rounded-card shadow p-4 flex flex-wrap gap-3">
        <select
          name="customer_id"
          value={filters.customer_id}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          name="type"
          value={filters.type}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {['lost', 'live', 'inactive_still_live', 'website_die', 'website_alive'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          name="date_from"
          type="date"
          value={filters.date_from}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          name="date_to"
          type="date"
          value={filters.date_to}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-card shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Time', 'Type', 'Customer', 'Website Domain', 'Message'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">No logs found.</td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">{log.sent_at?.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[log.type] || ''}`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-4 py-3">{log.customer_name || '—'}</td>
                <td className="px-4 py-3">{log.domain || '—'}</td>
                <td className="px-4 py-3 max-w-xs">
                  <span
                    className="cursor-pointer"
                    onClick={() => setExpanded((e) => ({ ...e, [log.id]: !e[log.id] }))}
                  >
                    {expanded[log.id]
                      ? log.message
                      : (log.message?.length > 100 ? log.message.slice(0, 100) + '...' : log.message)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
