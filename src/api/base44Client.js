// Adaptador compatível com o código original do Gineco-AI, mas apontando
// para a API própria deste servidor (/api/*). O nome do arquivo foi mantido
// para não precisar reescrever todas as páginas; não há mais SDK Base44.
const TOKEN_KEY = 'ginecoai_token'

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function setTokenValue(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* sem localStorage */ }
}
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Erro ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
function entity(name) {
  return {
    list: async (sort, limit) => {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      const q = params.toString()
      return api(`/api/entities/${name}${q ? `?${q}` : ''}`)
    },
    filter: async (where, sort, limit) => {
      const params = new URLSearchParams({ filter: JSON.stringify(where || {}) })
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      return api(`/api/entities/${name}?${params.toString()}`)
    },
    get: (id) => api(`/api/entities/${name}/${id}`),
    create: (data) => api(`/api/entities/${name}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api(`/api/entities/${name}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => api(`/api/entities/${name}/${id}`, { method: 'DELETE' }),
  }
}

export const base44 = {
  app: {
    getPublicSettings: async () => ({ id: 'gineco-ai', public_settings: {} }),
  },
  auth: {
    isAuthenticated: () => Boolean(getToken()),
    me: async () => api('/api/auth/me'),
    loginViaEmailPassword: async (email, password) => {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setTokenValue(data.token)
      return data
    },
    register: async ({ email, password }) => {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
      setTokenValue(data.token)
      return data
    },
    setToken: (token) => setTokenValue(token),
    logout: async (redirectUrl) => {
      try { await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }) } catch { /* ignora */ }
      setTokenValue(null)
      if (redirectUrl && typeof window !== 'undefined') window.location.href = redirectUrl
    },
    redirectToLogin: (returnTo) => {
      const dest = returnTo && returnTo.startsWith('/') ? returnTo : '/'
      window.location.href = `/Login${dest !== '/' ? `?returnTo=${encodeURIComponent(dest)}` : ''}`
    },
    loginWithProvider: async () => {
      throw new Error('Login com Google não está disponível na versão própria. Use e-mail e senha.')
    },
    verifyOtp: async () => { throw new Error('Verificação por código não existe mais na versão própria.') },
    resendOtp: async () => { throw new Error('Verificação por código não existe mais na versão própria.') },
    resetPasswordRequest: async (email) => api('/api/auth/reset-request', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: async ({ resetToken, newPassword }) => api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) }),
  },
  entities: {
    Protocol: entity('Protocol'),
    Advertisement: entity('Advertisement'),
    SearchHistory: entity('SearchHistory'),
  },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt, response_json_schema }) => {
        const data = await api('/api/ai/invoke', { method: 'POST', body: JSON.stringify({ prompt, response_json_schema: response_json_schema || null }) })
        return data.result
      },
      UploadFile: async ({ file }) => {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getToken() ? { authorization: `Bearer ${getToken()}` } : {},
          body: form,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Upload falhou (${res.status})`)
        return data
      },
      GenerateImage: async ({ prompt }) => {
        const data = await api('/api/ai/image', { method: 'POST', body: JSON.stringify({ prompt }) })
        return data
      },
    },
  },
}
