import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Backlinks from './pages/Backlinks'
import Crawl from './pages/Crawl'
import Websites from './pages/Websites'
import Customers from './pages/Customers'
import Blacklist from './pages/Blacklist'
import Logs from './pages/Logs'

function ProtectedLayout() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/backlinks" element={<Backlinks />} />
          <Route path="/crawl" element={<Crawl />} />
          <Route path="/websites" element={<Websites />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/blacklist" element={<Blacklist />} />
          <Route path="/logs" element={<Logs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
