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

const normalizeDomain = (input) => {
  let d = input.trim()
  // Strip protocol
  d = d.replace(/^https?:\/\//i, '')
  // Strip www.
  d = d.replace(/^www\./i, '')
  // Strip path, query, hash
  d = d.split('/')[0].split('?')[0].split('#')[0]
  return d.toLowerCase()
}

export default function Crawl() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [groupCustomer, setGroupCustomer] = useState('')
  const [groupBlacklist, setGroupBlacklist] = useState(false)

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
      const res = await api.post('/crawl', { domain: normalizeDomain(domain) })
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
    setGroupCustomer('')
    setGroupBlacklist(false)
    setShowModal(true)
  }

  const handleSaveGroup = async () => {
    const selectedLinks = result.new_links.filter(l => selected.includes(l.href))

    if (groupBlacklist) {
      // Blacklist toàn bộ links đã chọn — send domain directly, backend resolves/creates website
      const blacklistedLinks = []
      for (const link of selectedLinks) {
        try {
          await api.post('/blacklist', {
            domain: normalizeDomain(domain),
            blacklist_url: link.href,
            anchor_text: link.anchor_text || null,
          })
          blacklistedLinks.push(link)
        } catch (err) {
          alert('Blacklist thất bại: ' + (err?.response?.data?.detail || err.message))
        }
      }
      const handled = new Set(selected)
      setResult(prev => ({
        ...prev,
        new_links: prev.new_links.filter(l => !handled.has(l.href)),
        blacklisted_links: [...(prev.blacklisted_links || []), ...blacklistedLinks],
      }))
    } else {
      // Thêm backlinks với cùng 1 khách hàng
      const payload = selectedLinks.map(l => ({
        backlink_url: l.href,
        anchor_text: l.anchor_text || null,
        customer_id: groupCustomer ? parseInt(groupCustomer) : null,
        domain: normalizeDomain(domain),
      }))
      await api.post('/backlinks/bulk', { items: payload })
      const customerName = customers.find(c => String(c.id) === String(groupCustomer))?.name || ''
      const movedLinks = selectedLinks.map(l => ({
        ...l,
        status: 'live',
        customer_name: customerName,
      }))
      const handled = new Set(selected)
      setResult(prev => ({
        ...prev,
        new_links: prev.new_links.filter(l => !handled.has(l.href)),
        existing_links: [...(prev.existing_links || []), ...movedLinks],
      }))
    }

    setSelected([])
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Crawl Domain</h1>

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
                    Xử lý ({selected.length})
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
                    {link.anchor_text && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor_text}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Đã có trong DB */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">✅ Đã có trong DB ({result.existing_links?.length || 0})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!result.existing_links?.length ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Không có link nào đã tồn tại</p>
              ) : result.existing_links.map(link => (
                <div key={link.href} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{link.href}</p>
                    {link.anchor_text && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor_text}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {link.customer_name && (
                      <span className="text-xs text-gray-500">{link.customer_name}</span>
                    )}
                    {link.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[link.status] || 'bg-gray-100 text-gray-600'}`}> 
                        {link.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blacklisted */}
          {result.blacklisted_links?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">🚫 Blacklisted ({result.blacklisted_links.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {result.blacklisted_links.map(link => (
                  <div key={link.href} className="px-5 py-3 hover:bg-gray-50">
                    <p className="text-sm text-gray-800 truncate">{link.href}</p>
                    {link.anchor_text && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Xử lý {selected.length} link đã chọn</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupBlacklist}
                  onChange={e => setGroupBlacklist(e.target.checked)}
                  className="rounded border-gray-300 text-red-600"
                />
                <span className="text-sm text-gray-700">Thêm vào Blacklist (không theo dõi)</span>
              </label>

              {!groupBlacklist && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Khách hàng</label>
                  <select
                    value={groupCustomer}
                    onChange={e => setGroupCustomer(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Không gán khách hàng —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleSaveGroup}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white ${groupBlacklist ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {groupBlacklist ? 'Blacklist' : 'Thêm backlinks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}