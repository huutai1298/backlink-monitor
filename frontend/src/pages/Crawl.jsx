import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const statusColors = {
  live: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
  expired: 'bg-slate-100 text-slate-500',
  inactive: 'bg-yellow-100 text-yellow-700',
}

const _extractDomain = (url) => {
  try {
    const h = url.startsWith('http') ? url : 'https://' + url
    let d = new URL(h).hostname.toLowerCase()
    if (d.startsWith('www.')) d = d.slice(4)
    return d
  } catch {
    return url
  }
}

export default function Crawl() {
  const [domain, setDomain] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState([])
  const [customers, setCustomers] = useState([])
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [customerMap, setCustomerMap] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/customers')
      .then((res) => setCustomers(res.data?.items || res.data || []))
      .catch(() => setCustomers([]))
  }, [])

  const handleCrawl = async (e) => {
    e.preventDefault()
    if (!domain.trim()) return
    setCrawling(true)
    setResults(null)
    setSelected([])
    try {
      const res = await api.post('/crawl', { domain: domain.trim() })
      setResults(res.data)
    } catch {
      alert('Crawl failed. Please try again.')
    } finally {
      setCrawling(false)
    }
  }

  const toggleSelect = (href) => {
    setSelected((s) =>
      s.includes(href) ? s.filter((h) => h !== href) : [...s, href]
    )
  }

  const toggleSelectAll = () => {
    if (!results) return
    const allHrefs = results.new_links.map((l) => l.href)
    if (selected.length === allHrefs.length) {
      setSelected([])
    } else {
      setSelected(allHrefs)
    }
  }

  const handleBlacklist = async (link) => {
    try {
      await api.post('/blacklist', {
        source_url: domain.trim(),
        href: link.href,
        anchor_text: link.anchor_text,
      })
      setResults((r) => ({
        ...r,
        new_links: r.new_links.filter((l) => l.href !== link.href),
        blacklisted_links: [...(r.blacklisted_links || []), link],
      }))
      setSelected((s) => s.filter((h) => h !== link.href))
    } catch {
      alert('Failed to blacklist link')
    }
  }

  const openAddGroup = async () => {
    try {
      const res = await api.get('/websites', { params: { domain: domain.trim() } })
      const sites = res.data?.items || res.data || []
      const site = sites.find((s) => s.domain === domain.trim())
      setPrice(site?.price_monthly || '')
    } catch {
      setPrice('')
    }
    const map = {}
    selected.forEach((href) => {
      map[href] = ''
    })
    setCustomerMap(map)
    setAddGroupOpen(true)
  }

  const handleSaveGroup = async () => {
    const links = results.new_links.filter((l) => selected.includes(l.href))

    const missingCustomer = links.filter((l) => !customerMap[l.href] || !parseInt(customerMap[l.href]))
    if (missingCustomer.length > 0) {
      alert('Vui lòng chọn customer cho tất cả các link đã chọn!')
      return
    }

    const payload = links.map((l) => {
      const customer = customers.find((c) => c.id === parseInt(customerMap[l.href]))
      return {
        backlink_url: _extractDomain(l.href),
        anchor_text: l.anchor_text,
        customer_id: parseInt(customerMap[l.href]),
        domain: domain.trim(),
        target_url: customer?.telegram_group_url || '',
      }
    })
    setSaving(true)
    try {
      const res = await api.post('/backlinks/bulk', { items: payload })
      if (parseFloat(price) > 0 && res.data?.created?.length > 0) {
        const websiteId = res.data.created[0].website_id
        await api.put(`/websites/${websiteId}`, { price_monthly: parseFloat(price) })
      }
      const savedHrefs = links.map((l) => l.href)
      const savedLinks = links.map((l) => ({
        ...l,
        customer_name: customers.find((c) => c.id === parseInt(customerMap[l.href]))?.name || '',
        status: 'pending',
      }))
      setResults((r) => ({
        ...r,
        new_links: r.new_links.filter((l) => !savedHrefs.includes(l.href)),
        existing_links: [...(r.existing_links || []), ...savedLinks],
      }))
      setSelected([])
      setAddGroupOpen(false)
    } catch {
      alert('Failed to save backlinks')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Crawl Domain</h1>

      <form onSubmit={handleCrawl} className="flex gap-3">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter domain (e.g. example.com)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={crawling}
          className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60 flex items-center gap-2"
        >
          {crawling && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {crawling ? 'Crawling...' : 'Crawl'}
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-card shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700">
                🆕 New Links ({results.new_links?.length || 0})
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.length === (results.new_links?.length || 0) && selected.length > 0}
                    onChange={toggleSelectAll}
                  />
                  Select All
                </label>
                <button
                  onClick={openAddGroup}
                  disabled={selected.length === 0}
                  className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-indigo-600 disabled:opacity-40"
                >
                  Add Group
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.new_links?.length === 0 ? (
                <p className="text-slate-400 text-sm">No new links found.</p>
              ) : results.new_links?.map((link, i) => (
                <div key={i} className="flex items-start gap-2 border-b pb-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(link.href)}
                    onChange={() => toggleSelect(link.href)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 truncate">{link.href}</p>
                    <p className="text-xs text-slate-400">{link.anchor_text}</p>
                  </div>
                  <button
                    onClick={() => handleBlacklist(link)}
                    className="text-xs text-danger hover:underline flex-shrink-0"
                  >🚫</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-card shadow p-4">
            <h2 className="font-semibold text-slate-700 mb-3">
              ✅ Already in DB ({results.existing_links?.length || 0})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.existing_links?.length === 0 ? (
                <p className="text-slate-400 text-sm">None.</p>
              ) : results.existing_links?.map((link, i) => (
                <div key={i} className="border-b pb-2">
                  <p className="text-xs text-slate-700 truncate">{link.href}</p>
                  <p className="text-xs text-slate-400">{link.anchor_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{link.customer_name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColors[link.status] || ''}`}>
                      {link.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-card shadow p-4">
            <h2 className="font-semibold text-slate-700 mb-3">
              🚫 Blacklisted ({results.blacklisted_links?.length || 0})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.blacklisted_links?.length === 0 ? (
                <p className="text-slate-400 text-sm">None.</p>
              ) : results.blacklisted_links?.map((link, i) => (
                <div key={i} className="border-b pb-2">
                  <p className="text-xs text-slate-700 truncate">{link.href}</p>
                  <p className="text-xs text-slate-400">{link.anchor_text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={addGroupOpen} onClose={() => setAddGroupOpen(false)} title="Add Group">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domain (readonly)</label>
            <input
              value={domain}
              readOnly
              className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price (VND/month)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter price..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2 pr-4">Href</th>
                  <th className="pb-2 pr-4">Anchor</th>
                  <th className="pb-2">Customer</th>
                </tr>
              </thead>
              <tbody>
                {results?.new_links
                  ?.filter((l) => selected.includes(l.href))
                  .map((link, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-4 max-w-xs truncate text-xs">{link.href}</td>
                      <td className="py-2 pr-4 text-xs text-slate-500">{link.anchor_text}</td>
                      <td className="py-2">
                        <select
                          value={customerMap[link.href] || ''}
                          onChange={(e) =>
                            setCustomerMap((m) => ({ ...m, [link.href]: e.target.value }))
                          }
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="">Select...</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAddGroupOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
            >Cancel</button>
            <button
              onClick={handleSaveGroup}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-indigo-600 disabled:opacity-60"
            >{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
