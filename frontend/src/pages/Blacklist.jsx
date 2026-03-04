import { useEffect, useState } from 'react'
import api from '../api/axios'
import { RotateCcw } from 'lucide-react'

export default function Blacklist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    api.get('/blacklist').then(r => {
      setItems(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleRestore = async (id) => {
    if (!confirm('Khôi phục domain này khỏi blacklist?')) return
    await api.patch(`/blacklist/${id}/restore`)
    fetchData()
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Blacklist</h1>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Anchor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ngày thêm</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Blacklist trống</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.website_domain || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{item.blacklist_url || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{item.anchor_text || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700"
                    >
                      <RotateCcw size={12} />
                      Khôi phục
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}