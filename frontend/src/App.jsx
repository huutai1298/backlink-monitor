import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Backlinks from './pages/Backlinks'
import Crawl from './pages/Crawl'
import Websites from './pages/Websites'
import Customers from './pages/Customers'
import Blacklist from './pages/Blacklist'
import Logs from './pages/Logs'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/backlinks" element={<Backlinks />} />
            <Route path="/crawl" element={<Crawl />} />
            <Route path="/websites" element={<Websites />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/blacklist" element={<Blacklist />} />
            <Route path="/logs" element={<Logs />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
