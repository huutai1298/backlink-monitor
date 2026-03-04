import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_BADGE = {
  live: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
  expired: 'bg-orange-50 text-orange-700',
  inactive: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS = {
  live: 'Còn sống',
  lost: 'Đã mất',
  pending: 'Chờ xử lý',
  expired: 'Hết hạn',
  inactive: 'Tạm dừng',
}

const PAGE_SIZE = 20

export default function Backlinks() {
  const [backlinks, setBacklinks] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchData = () => {
    setLoading(true)
    const params = {}
    if (filterCustomer) params.customer_id = filterCustomer
    if (filterStatus) params.status = filterStatus
    if (search) params.search = search
    api.get('/backlinks', { params }).then(r => {
      setBacklinks(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data))
  }, [])

  useEffect(() => {
    fetchData()
  }, [filterCustomer, filterStatus, search])

  const paginated = backlinks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(backlinks.length / PAGE_SIZE)

  const openEdit = (item) => {
    setEditItem(item)
    setEditForm({
      customer_id: item.customer_id || '',
      price_monthly: item.price_monthly || '',
      date_payment: item.date_payment || '',
    })
  }

  const saveEdit = async () => {
    await api.put(`/backlinks/${editItem.id}`, editForm)
    setEditItem(null)
    fetchData()
  }

  const setStatus = async (id, action) => {
    await api.patch(`/backlinks/${id}/${action}`)
    fetchData()
  }

  const deleteItem = async (id) => {
    if (!confirm('Xóa backlink này?')) return
    await api.delete(`/backlinks/${id}`)
    fetchData()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Backlinks</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={filterCustomer}
          onChange={e => { setFilterCustomer(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả khách hàng</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tìm kiếm domain, anchor..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-60"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Anchor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Giá/tháng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ngày thêm</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Hết hạn</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : paginated.map(bl => (
                <tr key={bl.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{bl.domain}</td>
                  <td className="px-5 py-3 text-gray-600">{bl.anchor_text || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{bl.customer_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{bl.price_monthly ? Number(bl.price_monthly).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[bl.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[bl.status] || bl.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{bl.created_at ? new Date(bl.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{bl.date_payment || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(bl)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Sửa">
                        <Pencil size={14} />
                      </button>
                      {bl.status !== 'inactive' && (
                        <button onClick={() => setStatus(bl.id, 'inactive')} className="px-2 py-1 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 text-gray-600">
                          Tạm dừng
                        </button>
                      )}
                      {bl.status !== 'expired' && (
                        <button onClick={() => setStatus(bl.id, 'expired')} className="px-2 py-1 rounded-lg text-xs bg-orange-50 hover:bg-orange-100 text-orange-600">
                          Hết hạn
                        </button>
                      )}
                      <button onClick={() => deleteItem(bl.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{backlinks.length} kết quả</span>
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

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Chỉnh sửa backlink</h2>
            <p className="text-sm text-gray-500 mb-4 truncate">{editItem.source_url || editItem.domain}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Khách hàng</label>
                <select
                  value={editForm.customer_id}
                  onChange={e => setEditForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Không có —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Giá/tháng (VND)</label>
                <input
                  type="number"
                  value={editForm.price_monthly}
                  onChange={e => setEditForm(f => ({ ...f, price_monthly: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày hết hạn</label>
                <input
                  type="date"
                  value={editForm.date_payment}
                  onChange={e => setEditForm(f => ({ ...f, date_payment: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={saveEdit} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
