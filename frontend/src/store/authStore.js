import { create } from 'zustand'

const useAuthStore = create((set) => ({
  isLoggedIn: !!localStorage.getItem('access_token'),
  login: (access_token, refresh_token) => {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    set({ isLoggedIn: true })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ isLoggedIn: false })
  },
}))

export default useAuthStore
