import { api } from './client'

export interface AuthUser {
  id: string; name: string; email: string; plan: string; avatar: string | null
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<{ data: { user: AuthUser; access: string; refresh: string } }>(
    '/auth/login', { email, password },
  )
  localStorage.setItem('ph_access',  res.data.access)
  localStorage.setItem('ph_refresh', res.data.refresh)
  localStorage.setItem('ph_user',    JSON.stringify(res.data.user))
  return res.data.user
}

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await api.post<{ data: { user: AuthUser; access: string; refresh: string } }>(
    '/auth/register', { name, email, password },
  )
  localStorage.setItem('ph_access',  res.data.access)
  localStorage.setItem('ph_refresh', res.data.refresh)
  localStorage.setItem('ph_user',    JSON.stringify(res.data.user))
  return res.data.user
}

export function logout() {
  localStorage.removeItem('ph_access')
  localStorage.removeItem('ph_refresh')
  localStorage.removeItem('ph_user')
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('ph_user')
  return raw ? JSON.parse(raw) : null
}
