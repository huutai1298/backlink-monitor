import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function Websites() {
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showDead, setShowDead] = useState(false)
  const [page, setPage] = useState(1)
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [crawlingId, setCrawlingId] = useState(null)

  const fetchData = () => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (showDead) params.is_dead = true
    api.get('/websites', { params }).then(r => {
      setWebsites(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [search, showDead])

  useEffect(() => { setPage(1) }, [search, showDead])

  const paginated = websites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(websites.length / PAGE_SIZE)

  const openEdit = (item) => {
    setEditItem(item)
    setEditForm({
      price_monthly: item.price_monthly || '',
      category: item.category || '',
      note: item.note || '',
    })
  }

  const saveEdit = async () => {
    await api.put(`/websites/${editItem.id}`, editForm)
    setEditItem(null)
    fetchData()
  }

  const deleteItem = async (id) => {
    if (!confirm('Xóa website này?')) return
    await api.delete(`/websites/${id}`)
    fetchData()
  }

  const crawlSingle = async (id) => {
    setCrawlingId(id)
    try {
      await api.post(`/websites/${id}/crawl`)
    } finally {
      setCrawlingId(null)
      fetchData()
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Websites</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm domain..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-60"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showDead}
            onChange={e => setShowDead(e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          Chỉ hiển thị website chết
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Giá/tháng</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : websites.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : paginated.map((w, index) => (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{w.domain}</td>
                  <td className="px-5 py-3 text-gray-600">{w.price_monthly ? Number(w.price_monthly).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{w.category || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.is_dead ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {w.is_dead ? 'Dead' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{w.note || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Sửa">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => crawlSingle(w.id)}
                        disabled={crawlingId === w.id}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-40"
                        title="Crawl"
                      >
                        <RefreshCw size={14} className={crawlingId === w.id ? 'animate-spin' : ''} />
                      </button>
                      <button onClick={() => deleteItem(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {websites.length} kết quả • Trang {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1.5 rounded-lg text-xs hover:bg-gray-100 disabled:opacity-40">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >{p}</button>
                )
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1.5 rounded-lg text-xs hover:bg-gray-100 disabled:opacity-40">»</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Chỉnh sửa website</h2>
            <p className="text-sm text-gray-500 mb-4">{editItem.domain}</p>
            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Danh mục</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea
                  value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
