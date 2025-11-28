// public/assets/js/auth-client.js
(function(global){
  const TOKEN_KEY = 'hrd_token' // Admin JWT token

  function setToken(t){ try { localStorage.setItem(TOKEN_KEY, t) } catch(e) {} }
  function getToken(){ try { return localStorage.getItem(TOKEN_KEY) } catch(e) { return null } }
  function clearToken(){ try { localStorage.removeItem(TOKEN_KEY) } catch(e) {} }

  async function api(path, opts = {}) {
    opts.headers = opts.headers || {}
    const t = getToken()
    if (t) opts.headers['Authorization'] = 'Bearer ' + t

    const res = await fetch(path, opts)
    const raw = await res.text()
    let body
    try { body = JSON.parse(raw) } catch(e) { body = raw }
    if (res.status === 401 || res.status === 403) {
      clearToken()
      // consumer can decide what to do on auth loss
    }
    return { ok: res.ok, status: res.status, body }
  }

  async function adminLogin(username, password){
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: username, password })
    })
    const txt = await res.text()
    let body
    try { body = JSON.parse(txt) } catch(e) { body = { error: txt } }
    if (!res.ok) throw new Error(body.error || 'login failed')
    if (!body.token) throw new Error('no token returned')
    setToken(body.token)
    return body
  }

  global.HRDAuth = {
    api,
    adminLogin,
    getToken,
    setToken,
    clearToken
  }
})(window)
