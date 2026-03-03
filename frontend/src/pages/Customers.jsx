import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchCustomers = async () => {
    try {
      const params = {}
      if (search) params.name = search
      if (statusFilter !== '') params.is_active = statusFilter
      const res = await api.get('/customers', { params })
      setCustomers(res.data?.items || res.data || [])
    } catch {
      setCustomers([])
    }
  }

  useEffect(() => { fetchCustomers() }, [search, statusFilter])

  const openAdd = () => {
    setModal('add')
    setForm({ name: '', telegram_group_id: '', telegram_group_url: '', note: '' })
  }

  const openEdit = (c) => {
    setModal(c)
    setForm({
      name: c.name,
      telegram_group_id: c.telegram_group_id || '',
      telegram_group_url: c.telegram_group_url || '',
      note: c.note || '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/customers', form)
      } else {
        await api.put(`/customers/${modal.id}`, form)
      }
      setModal(null)
      fetchCustomers()
    } catch {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this customer?')) return
    await api.patch(`/customers/${id}/deactivate`)
    fetchCustomers()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return
    await api.delete(`/customers/${id}`)
    fetchCustomers()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <button
          onClick={openAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600"
        >+ Add Customer</button>
      </div>

      <div className="bg-white rounded-card shadow p-4 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name..."
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-card shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Name', 'Telegram Group URL', 'Link Count', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">No customers found.</td>
              </tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {c.telegram_group_url ? (
                    <a href={c.telegram_group_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {c.telegram_group_url}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">{c.link_count ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1 text-slate-500 hover:text-primary" title="Edit">✏️</button>
                    <button onClick={() => handleDeactivate(c.id)} className="p-1 text-slate-500 hover:text-warning" title="Deactivate">⏸️</button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 text-slate-500 hover:text-danger" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Customer' : 'Edit Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Group ID</label>
            <input
              type="text"
              value={form.telegram_group_id || ''}
              onChange={(e) => setForm((f) => ({ ...f, telegram_group_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Group URL</label>
            <input
              type="text"
              value={form.telegram_group_url || ''}
              onChange={(e) => setForm((f) => ({ ...f, telegram_group_url: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
            <textarea
              value={form.note || ''}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-indigo-600 disabled:opacity-60"
            >{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
