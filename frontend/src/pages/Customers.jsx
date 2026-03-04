import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Plus, Pencil, Trash2, UserX } from 'lucide-react'

const emptyForm = { name: '', telegram_group_id: '', telegram_group_url: '', note: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const fetchData = () => {
    setLoading(true)
    api.get('/customers').then(r => {
      setCustomers(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name || '',
      telegram_group_id: item.telegram_group_id || '',
      telegram_group_url: item.telegram_group_url || '',
      note: item.note || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editItem) {
      await api.put(`/customers/${editItem.id}`, form)
    } else {
      await api.post('/customers', form)
    }
    setShowModal(false)
    fetchData()
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Tạm dừng khách hàng này?')) return
    await api.patch(`/customers/${id}/deactivate`)
    fetchData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa khách hàng này?')) return
    await api.delete(`/customers/${id}`)
    fetchData()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Khách hàng</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Thêm khách hàng
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Telegram Group URL</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Group ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Chưa có khách hàng nào</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                    {c.telegram_group_url ? (
                      <a href={c.telegram_group_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {c.telegram_group_url}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.telegram_group_id || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.is_active !== false ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{c.note || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Sửa">
                        <Pencil size={14} />
                      </button>
                      {c.is_active !== false && (
                        <button onClick={() => handleDeactivate(c.id)} className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600" title="Tạm dừng">
                          <UserX size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {editItem ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telegram Group ID</label>
                <input
                  type="text"
                  value={form.telegram_group_id}
                  onChange={e => setForm(f => ({ ...f, telegram_group_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telegram Group URL</label>
                <input
                  type="text"
                  value={form.telegram_group_url}
                  onChange={e => setForm(f => ({ ...f, telegram_group_url: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                {editItem ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
