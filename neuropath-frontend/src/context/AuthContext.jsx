import { createContext, useContext, useState, useCallback } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('neuropath_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const saveSession = useCallback((data) => {
    localStorage.setItem('neuropath_access_token', data.access)
    localStorage.setItem('neuropath_refresh_token', data.refresh)
    localStorage.setItem('neuropath_user', JSON.stringify(data.teacher))
    setUser(data.teacher)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('neuropath_access_token')
    localStorage.removeItem('neuropath_refresh_token')
    localStorage.removeItem('neuropath_user')
    setUser(null)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login({ email, password })
    saveSession(data)
    return data
  }, [saveSession])

  const register = useCallback(async (payload) => {
    const data = await authAPI.register(payload)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('neuropath_refresh_token')
      if (refresh) await authAPI.logout(refresh)
    } catch (_) { /* silent */ }
    clearSession()
  }, [clearSession])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
