import React, { useState, useEffect } from 'react'
import api from '../api/axios'

export default function Blacklist() {
  const [items, setItems] = useState([])
  const [toast, setToast] = useState('')

  const fetchBlacklist = async () => {
    try {
      const res = await api.get('/blacklist')
      setItems(res.data?.items || res.data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { fetchBlacklist() }, [])

  const handleRestore = async (id) => {
    try {
      await api.patch(`/blacklist/${id}/restore`)
      setItems((prev) => prev.filter((item) => item.id !== id))
      showToast('Link restored and will reappear in crawl results')
    } catch {
      showToast('Failed to restore link')
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Blacklist</h1>
        {toast && (
          <span className="text-sm bg-white shadow rounded-lg px-4 py-2">{toast}</span>
        )}
      </div>

      <div className="bg-white rounded-card shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Source Domain', 'Full Href', 'Anchor Text', 'Date Added', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">No blacklisted links.</td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">{item.source_url}</td>
                <td className="px-4 py-3 max-w-xs truncate">{item.href}</td>
                <td className="px-4 py-3">{item.anchor_text || '—'}</td>
                <td className="px-4 py-3">{item.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="px-3 py-1 text-xs bg-green-50 text-success border border-green-200 rounded-lg hover:bg-green-100"
                  >Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
