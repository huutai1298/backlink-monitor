import React from 'react'

export default function StatCard({ title, value, color, icon }) {
  return (
    <div className="bg-white rounded-card shadow p-5 flex items-center gap-4">
      {icon && <span className="text-3xl">{icon}</span>}
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${color || 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  )
}
