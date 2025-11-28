// backend/routes/auth.js
const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()

const SECRET = process.env.JWT_SECRET || 'changeme'
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass'
const TOKEN_EXPIRES = process.env.TOKEN_EXPIRES_IN || '8h'

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { empId, password } = req.body || {}
  if (!empId || !password) return res.status(400).json({ error: 'empId and password required' })

  // Admin credentials are read from .env
  if (empId === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ sub: empId, role: 'admin' }, SECRET, { expiresIn: TOKEN_EXPIRES })
    return res.json({
      token,
      user: {
        empId: ADMIN_USER,
        name: 'Administrator',
        fullName: 'Administrator',
        role: 'admin',
        dept: 'HRD'
      }
    })
  }

  return res.status(401).json({ error: 'invalid credentials' })
})

// middleware to protect admin routes
function ensureAdmin(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'missing authorization' })
  const parts = auth.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid authorization format' })
  const token = parts[1]
  try {
    const payload = jwt.verify(token, SECRET)
    if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' })
  }
}

module.exports = router
module.exports.ensureAdmin = ensureAdmin
