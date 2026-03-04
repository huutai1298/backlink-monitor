import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute() {
  const { isLoggedIn } = useAuthStore()
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />
}
