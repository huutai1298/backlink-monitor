import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Search, CheckSquare, Square, Plus } from 'lucide-react'

const STATUS_BADGE = {
  live: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
  expired: 'bg-orange-50 text-orange-700',
  inactive: 'bg-gray-100 text-gray-600',
}

export default function Crawl() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [assignments, setAssignments] = useState({})

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data))
  }, [])

  const handleCrawl = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return
    setLoading(true)
    setResult(null)
    setSelected([])
    try {
      const res = await api.post('/crawl', { domain: domain.trim() })
      setResult(res.data)
    } catch {
      setResult({ error: 'Crawl thất bại. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (href) => {
    setSelected(prev => prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href])
  }

  const selectAll = () => {
    if (!result?.new_links) return
    const allHrefs = result.new_links.map(l => l.href)
    setSelected(selected.length === allHrefs.length ? [] : allHrefs)
  }

  const openAddGroup = () => {
    const init = {}
    selected.forEach(href => { init[href] = '' })
    setAssignments(init)
    setShowModal(true)
  }

  const handleAddGroup = async () => {
    const newLinks = result.new_links.filter(l => selected.includes(l.href))
    const payload = newLinks.map(l => ({
      source_url: l.href,
      anchor_text: l.anchor,
      customer_id: assignments[l.href] || null,
      domain: domain.trim(),
    }))
    await api.post('/backlinks/bulk', payload)
    const addedHrefs = new Set(selected)
    const movedLinks = result.new_links.filter(l => addedHrefs.has(l.href)).map(l => ({
      ...l,
      status: 'pending',
      customer_name: customers.find(c => String(c.id) === String(assignments[l.href]))?.name || '',
    }))
    setResult(prev => ({
      ...prev,
      new_links: prev.new_links.filter(l => !addedHrefs.has(l.href)),
      existing: [...(prev.existing || []), ...movedLinks],
    }))
    setSelected([])
    setShowModal(false)
  }

  const handleBlacklist = async (link) => {
    if (!confirm(`Thêm "${link.href}" vào blacklist?`)) return
    await api.post('/blacklist', { source_url: link.href, anchor_text: link.anchor })
    setResult(prev => ({
      ...prev,
      new_links: prev.new_links.filter(l => l.href !== link.href),
      blacklisted: [...(prev.blacklisted || []), link],
    }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Crawl Domain</h1>

      {/* Input */}
      <form onSubmit={handleCrawl} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-3">
        <input
          type="text"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="Nhập domain cần crawl (vd: example.com)"
          className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search size={15} />
          {loading ? 'Đang crawl...' : 'Crawl'}
        </button>
      </form>

      {result?.error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{result.error}</div>
      )}

      {result && !result.error && (
        <div className="space-y-5">
          {/* New Links */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">🆕 New Links ({result.new_links?.length || 0})</h2>
              <div className="flex items-center gap-2">
                {result.new_links?.length > 0 && (
                  <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                    {selected.length === result.new_links.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    Chọn tất cả
                  </button>
                )}
                {selected.length > 0 && (
                  <button
                    onClick={openAddGroup}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={13} />
                    Add Group ({selected.length})
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {!result.new_links?.length ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Không có link mới</p>
              ) : result.new_links.map(link => (
                <div key={link.href} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <button onClick={() => toggleSelect(link.href)} className="flex-shrink-0 text-blue-500">
                    {selected.includes(link.href) ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{link.href}</p>
                    {link.anchor && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor}</p>}
                  </div>
                  <button
                    onClick={() => handleBlacklist(link)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600"
                  >
                    Blacklist
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Already in DB */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">✅ Đã có trong DB ({result.existing?.length || 0})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!result.existing?.length ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Không có link nào đã tồn tại</p>
              ) : result.existing.map((link, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{link.href || link.source_url}</p>
                    {link.customer_name && <p className="text-xs text-gray-400 mt-0.5">Khách: {link.customer_name}</p>}
                  </div>
                  {link.status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[link.status] || 'bg-gray-100 text-gray-600'}`}>
                      {link.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blacklisted */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">🚫 Blacklisted ({result.blacklisted?.length || 0})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!result.blacklisted?.length ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Không có link nào trong blacklist</p>
              ) : result.blacklisted.map((link, i) => (
                <div key={i} className="px-5 py-3 hover:bg-gray-50">
                  <p className="text-sm text-gray-800 truncate">{link.href || link.source_url}</p>
                  {link.anchor && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Thêm nhóm backlinks</h2>
            <div className="overflow-y-auto flex-1 space-y-3">
              {selected.map(href => {
                const link = result.new_links.find(l => l.href === href)
                return (
                  <div key={href} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 truncate mb-2">{href}</p>
                    {link?.anchor && <p className="text-xs text-gray-400 mb-2">Anchor: {link.anchor}</p>}
                    <select
                      value={assignments[href] || ''}
                      onChange={e => setAssignments(a => ({ ...a, [href]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Chọn khách hàng —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleAddGroup} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
