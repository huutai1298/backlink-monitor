const handleAddGroup = async () => {
    const newLinks = result.new_links.filter(l => selected.includes(l.href))
    const payload = newLinks.map(l => ({
      backlink_url: l.href,
      anchor_text: l.anchor_text || l.anchor || null,
      customer_id: assignments[l.href] ? parseInt(assignments[l.href]) : null,
      domain: domain.trim(),
    }))
    await api.post('/backlinks/bulk', { items: payload })
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