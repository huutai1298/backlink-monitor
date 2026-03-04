import { useEffect, useState } from 'react'
import api from '../api/axios'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const TYPE_BADGE = {
  lost: 'bg-red-50 text-red-700',
  live: 'bg-green-50 text-green-700',
  website_die: 'bg-red-100 text-red-800',
  website_alive: 'bg-green-50 text-green-700',
  inactive_still_live: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS = {
  lost: 'Mất link',
  live: 'Còn sống',
  website_die: 'Website chết',
  website_alive: 'Website sống',
  inactive_still_live: 'Inactive còn sống',
}

const PAGE_SIZE = 20

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filterCustomer) params.customer_id = filterCustomer
    if (filterType) params.type = filterType
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    api.get('/logs', { params }).then(r => {
      setLogs(r.data)
      setPage(1)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filterCustomer, filterType, dateFrom, dateTo])

  const paginated = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(logs.length / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Nhật ký thông báo</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={filterCustomer}
          onChange={e => setFilterCustomer(e.target.value)}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả khách hàng</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Từ ngày"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Đến ngày"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Không có nhật ký</td></tr>
              ) : paginated.map(log => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[log.type] || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[log.type] || log.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{log.domain || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{log.customer_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs">
                    {log.message ? log.message.substring(0, 80) + (log.message.length > 80 ? '...' : '') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{logs.length} bản ghi</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
