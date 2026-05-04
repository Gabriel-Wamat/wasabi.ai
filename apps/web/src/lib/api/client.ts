const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ph_access')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ph_refresh')
}

function clearStoredAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('ph_access')
  localStorage.removeItem('ph_refresh')
  localStorage.removeItem('ph_user')
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (!window.location.pathname.startsWith('/auth/login')) {
    window.location.assign('/auth/login')
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: refresh }),
  })

  if (!res.ok) return null
  const json = await res.json() as { data?: { access?: string; refresh?: string } }
  if (!json.data?.access || !json.data?.refresh) return null

  localStorage.setItem('ph_access', json.data.access)
  localStorage.setItem('ph_refresh', json.data.refresh)
  return json.data.access
}

async function request<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const buildRequest = (token: string | null) => ({
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
    ...opts,
  })

  let token = getToken()
  let res = await fetch(`${BASE}${path}`, buildRequest(token))

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    token = await refreshAccessToken()
    if (token) {
      res = await fetch(`${BASE}${path}`, buildRequest(token))
    } else {
      clearStoredAuth()
      redirectToLogin()
    }
  }

  const json = res.status === 204 ? undefined : await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? 'Erro na requisição')
  return json as T
}

export const api = {
  get:    <T>(path: string)                   => request<T>(path),
  post:   <T>(path: string, body: unknown)    => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)    => request<T>(path, { method: 'PUT',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)    => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string)                      => request<void>(path, { method: 'DELETE' }),
}
