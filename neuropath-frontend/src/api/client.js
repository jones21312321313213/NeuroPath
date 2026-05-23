// Base URL — change for production
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Core fetch wrapper. Attaches Bearer token if present.
 * Throws structured errors for easy handling in components.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('neuropath_access_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    // Flatten DRF validation errors into a readable string
    const errors = data.errors || data.detail || data
    let message = 'Something went wrong.'
    if (typeof errors === 'string') {
      message = errors
    } else if (typeof errors === 'object') {
      const msgs = Object.values(errors).flat()
      message = msgs[0] || message
    }
    throw new Error(message)
  }

  return data
}

// ── Auth endpoints ────────────────────────────────────────────────────────

export const authAPI = {
  register: (payload) =>
    request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request('/auth/me/'),

  logout: (refreshToken) =>
    request('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    }),

  refreshToken: (refresh) =>
    request('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),
}
