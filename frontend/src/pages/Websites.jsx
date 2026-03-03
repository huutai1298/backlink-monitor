import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

export default function Websites() {
  const [websites, setWebsites] = useState([])
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const fetchWebsites = async () => {
    try {
      const params = {}
      if (search) params.domain = search
      const res = await api.get('/websites', { params })
      setWebsites(res.data?.items || res.data || [])
    } catch {
      setWebsites([])
    }
  }

  useEffect(() => { fetchWebsites() }, [search])

  const openEdit = (site) => {
    setEditModal(site)
    setEditForm({
      price_monthly: site.price_monthly,
      category: site.category || '',
      note: site.note || '',
      is_active: site.is_active,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/websites/${editModal.id}`, editForm)
      setEditModal(null)
      fetchWebsites()
    } catch {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCrawl = async (id) => {
    try {
      await api.post(`/websites/${id}/crawl`)
      showToast('✅ Crawl completed!')
    } catch {
      showToast('❌ Crawl failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this website?')) return
    await api.delete(`/websites/${id}`)
    fetchWebsites()
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Websites</h1>
        {toast && (
          <span className="text-sm bg-white shadow rounded-lg px-4 py-2">{toast}</span>
        )}
      </div>

      <div className="bg-white rounded-card shadow p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search domain..."
          className="border rounded-lg px-3 py-2 text-sm w-72"
        />
      </div>

      <div className="bg-white rounded-card shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Domain', 'Price (VND)', 'Category', 'Note', 'Status', 'Dead', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {websites.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">No websites found.</td>
              </tr>
            ) : websites.map((site) => (
              <tr key={site.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{site.domain}</td>
                <td className="px-4 py-3">{site.price_monthly?.toLocaleString()}</td>
                <td className="px-4 py-3">{site.category || '—'}</td>
                <td className="px-4 py-3 max-w-xs truncate">{site.note || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.is_dead ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {site.is_dead ? 'Dead' : 'OK'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(site)} className="p-1 text-slate-500 hover:text-primary" title="Edit">✏️</button>
                    <button onClick={() => handleCrawl(site.id)} className="p-1 text-slate-500 hover:text-success" title="Crawl">🕷️</button>
                    <button onClick={() => handleDelete(site.id)} className="p-1 text-slate-500 hover:text-danger" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Website">
        {editModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (VND/month)</label>
              <input
                type="number"
                value={editForm.price_monthly || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={editForm.category || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
              <textarea
                value={editForm.note || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active || false}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-indigo-600 disabled:opacity-60"
              >{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
