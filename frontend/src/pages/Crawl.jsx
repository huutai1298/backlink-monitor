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
  const [assignments, setAssignments] = useState({})   // href -> customer_id
  const [blacklists, setBlacklists] = useState({})     // href -> boolean
  const [websiteId, setWebsiteId] = useState(null)

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data))
  }, [])

  const handleCrawl = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return
    setLoading(true)
    setResult(null)
    setSelected([])
    setWebsiteId(null)
    try {
      const res = await api.post('/crawl', { domain: domain.trim() })
      setResult(res.data)
      const wsRes = await api.get('/websites', { params: { domain: domain.trim() } })
      if (wsRes.data && wsRes.data.length > 0) {
        setWebsiteId(wsRes.data[0].id)
      }
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
    const initAssign = {}
    const initBlack = {}
    selected.forEach(href => {
      initAssign[href] = ''
      initBlack[href] = false
    })
    setAssignments(initAssign)
    setBlacklists(initBlack)
    setShowModal(true)
  }

  const handleSaveGroup = async () => {
    const toBlacklist = selected.filter(href => blacklists[href])
    const toAdd = selected.filter(href => !blacklists[href])

    let wid = websiteId
    if (toBlacklist.length > 0 && !wid) {
      const wsRes = await api.get('/websites', { params: { domain: domain.trim() } })
      if (wsRes.data && wsRes.data.length > 0) {
        wid = wsRes.data[0].id
        setWebsiteId(wid)
      }
    }

    // Xử lý blacklist
    const blacklistedLinks = []
    for (const href of toBlacklist) {
      const link = result.new_links.find(l => l.href === href)
      if (!wid) {
        alert('Website chưa có trong hệ thống. Hãy thêm ít nhất 1 backlink trước để tạo website, sau đó mới blacklist được.')
        continue
      }
      try {
        await api.post('/blacklist', {
          website_id: wid,
          blacklist_url: href,
          anchor_text: link?.anchor_text || null,
        })
        blacklistedLinks.push(link || { href })
      } catch (err) {
        alert('Blacklist thất bại: ' + (err?.response?.data?.detail || err.message))
      }
    }

    // Xử lý thêm backlinks
    let movedLinks = []
    if (toAdd.length > 0) {
      const newLinks = result.new_links.filter(l => toAdd.includes(l.href))
      const payload = newLinks.map(l => ({
        backlink_url: l.href,
        anchor_text: l.anchor_text || null,
        customer_id: assignments[l.href] ? parseInt(assignments[l.href]) : null,
        domain: domain.trim(),
      }))
      await api.post('/backlinks/bulk', { items: payload })
      if (!wid) {
        const wsRes = await api.get('/websites', { params: { domain: domain.trim() } })
        if (wsRes.data && wsRes.data.length > 0) {
          wid = wsRes.data[0].id
          setWebsiteId(wid)
        }
      }
      const addedSet = new Set(toAdd)
      movedLinks = result.new_links.filter(l => addedSet.has(l.href)).map(l => ({
        ...l,
        status: 'live',
        customer_name: customers.find(c => String(c.id) === String(assignments[l.href]))?.name || '',
      }))
    }

    const allHandled = new Set(selected)
    setResult(prev => ({
      ...prev,
      new_links: prev.new_links.filter(l => !allHandled.has(l.href)),
      existing_links: [...(prev.existing_links || []), ...movedLinks],
      blacklisted_links: [...(prev.blacklisted_links || []), ...blacklistedLinks],
    }))
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
              ) : result.existing_links.map((link, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{link.href || link.backlink_url}</p>
                    {link.customer_name && <p className="text-xs text-gray-400 mt-0.5">Khách: {link.customer_name}</p>}
                  </div>
                  {link.status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[link.status] || 'bg-gray-100 text-gray-600'}`}>{link.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blacklisted */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">🚫 Blacklisted ({result.blacklisted_links?.length || 0})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!result.blacklisted_links?.length ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Không có link nào trong blacklist</p>
              ) : result.blacklisted_links.map((link, i) => (
                <div key={i} className="px-5 py-3 hover:bg-gray-50">
                  <p className="text-sm text-gray-800 truncate">{link.href}</p>
                  {link.anchor_text && <p className="text-xs text-gray-400 mt-0.5">Anchor: {link.anchor_text}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal xử lý nhóm */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Xử lý nhóm links</h2>
            <p className="text-xs text-gray-400 mb-4">Chọn khách hàng để thêm backlink, hoặc đánh dấu Blacklist để loại bỏ.</p>
            <div className="overflow-y-auto flex-1 space-y-3">
              {selected.map(href => {
                const link = result.new_links.find(l => l.href === href)
                const isBlacklisted = blacklists[href]
                return (
                  <div key={href} className={`border rounded-lg p-3 ${isBlacklisted ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}> 
                    <p className="text-xs text-gray-500 truncate mb-1">{href}</p>
                    {link?.anchor_text && <p className="text-xs text-gray-400 mb-2">Anchor: {link.anchor_text}</p>}
                    <div className="flex items-center gap-2">
                      <select
                        value={assignments[href] || ''}
                        onChange={e => setAssignments(a => ({ ...a, [href]: e.target.value }))}
                        disabled={isBlacklisted}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:bg-gray-100"
                      >
                        <option value="">— Chọn khách hàng —</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs font-medium text-red-600">
                        <input
                          type="checkbox"
                          checked={isBlacklisted}
                          onChange={e => setBlacklists(b => ({ ...b, [href]: e.target.checked }))}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        Blacklist
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy 
              </button>
              <button onClick={handleSaveGroup} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}