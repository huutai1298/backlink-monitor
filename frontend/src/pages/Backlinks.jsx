import React, { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'

const statusColors = {
  live: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
  expired: 'bg-slate-100 text-slate-500',
  inactive: 'bg-yellow-100 text-yellow-700',
}

export default function Backlinks() {
  const [backlinks, setBacklinks] = useState([])
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  const [filters, setFilters] = useState({
    customer_id: '',
    status_filter: '',
    domain: '',
    keyword: '',
  })

  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/customers')
      .then((res) => setCustomers(res.data?.items || res.data || []))
      .catch(() => setCustomers([]))
  }, [])

  const fetchBacklinks = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...filters, page, limit }
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k]
      })
      const res = await api.get('/backlinks', { params })
      setBacklinks(res.data.items || res.data)
      setTotal(res.data.total || 0)
    } catch {
      setBacklinks([])
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchBacklinks()
  }, [fetchBacklinks])

  const handleFilter = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(1)
  }

  const openEdit = (bl) => {
    setEditModal(bl)
    setEditForm({
      customer_id: bl.customer_id,
      price: bl.price_monthly,
      date_payment: bl.date_payment,
    })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await api.put(`/backlinks/${editModal.id}`, editForm)
      setEditModal(null)
      fetchBacklinks()
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleInactive = async (id) => {
    if (!window.confirm('Set this backlink as inactive?')) return
    await api.patch(`/backlinks/${id}/inactive`)
    fetchBacklinks()
  }

  const handleExpired = async (id) => {
    if (!window.confirm('Set this backlink as expired?')) return
    await api.patch(`/backlinks/${id}/expired`)
    fetchBacklinks()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this backlink? This cannot be undone.')) return
    await api.delete(`/backlinks/${id}`)
    fetchBacklinks()
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Backlinks</h1>

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
          name="status_filter"
          value={filters.status_filter}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {['live', 'lost', 'pending', 'expired', 'inactive'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          name="domain"
          placeholder="Domain..."
          value={filters.domain}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          name="keyword"
          placeholder="Keyword..."
          value={filters.keyword}
          onChange={handleFilter}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-card shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Customer', 'Domain', 'Anchor', 'Status', 'Date Placed', 'Payment Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backlinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">No backlinks found.</td>
                </tr>
              ) : backlinks.map((bl) => (
                <tr key={bl.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">{bl.customer_name}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{bl.domain}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{bl.anchor_text}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[bl.status] || ''}`}>
                      {bl.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{bl.date_placed}</td>
                  <td className="px-4 py-3">{bl.date_payment}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(bl)}
                        title="Edit"
                        className="p-1 text-slate-500 hover:text-primary"
                      >✏️</button>
                      <button
                        onClick={() => handleInactive(bl.id)}
                        title="Set Inactive"
                        className="p-1 text-slate-500 hover:text-warning"
                      >⏸️</button>
                      <button
                        onClick={() => handleExpired(bl.id)}
                        title="Set Expired"
                        className="p-1 text-slate-500 hover:text-slate-700"
                      >⏹️</button>
                      <button
                        onClick={() => handleDelete(bl.id)}
                        title="Delete"
                        className="p-1 text-slate-500 hover:text-danger"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Backlink">
        {editModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domain (readonly)</label>
              <input
                value={editModal.domain || ''}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Anchor Text (readonly)</label>
              <input
                value={editModal.anchor_text || ''}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
              <select
                value={editForm.customer_id || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, customer_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (VND)</label>
              <input
                type="number"
                value={editForm.price || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={editForm.date_payment || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, date_payment: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={handleSaveEdit}
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
