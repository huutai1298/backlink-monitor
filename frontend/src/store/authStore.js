import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  login: (accessToken, refreshToken) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({ token: accessToken, refreshToken })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    set({ token: null, refreshToken: null })
  },
}))

export default useAuthStore
