// backend/routes/users.js
const express = require('express')
const router = express.Router()
const DB = require('../utils/db')

// In-memory users were replaced by DB-backed users
// POST /api/users  (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, email, role, dept, courses } = req.body || {}
    if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role required' })
    // ensure unique email
    const all = await DB.read('users')
    if (all.some(u => u.email && String(u.email).toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ error: 'email already exists' })
    }
    const newUser = await DB.insert('users', {
      name,
      email,
      role,
      dept: dept || '',
      courses: Array.isArray(courses) ? courses : (courses ? courses.split(',').map(s=>s.trim()).filter(Boolean) : [])
    })
    return res.status(201).json({ ok: true, user: newUser })
  } catch (err) {
    console.error('users:create error', err)
    return res.status(500).json({ error: 'create failed' })
  }
})

// GET /api/users  (optional)
router.get('/', async (req, res) => {
  try {
    const all = await DB.read('users')
    return res.json(all)
  } catch (err) {
    console.error('users:list error', err)
    return res.status(500).json({ error: 'could not load users' })
  }
})

module.exports = router
