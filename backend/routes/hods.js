// backend/routes/hods.js
const express = require('express')
const router = express.Router()
const DB = require('../utils/db')

// GET /api/hods
router.get('/', async (req, res) => {
  try {
    const all = await DB.read('hods')
    const safe = all.map(h => ({ id: h.id, name: h.name, dept: h.dept }))
    return res.json(safe)
  } catch (err) {
    console.error('hods:list error', err)
    return res.status(500).json({ error: 'could not load hods' })
  }
})

// POST /api/hods
router.post('/', async (req, res) => {
  try {
    const { name, email, dept, courses, exp } = req.body || {}
    if (!name || !dept) return res.status(400).json({ error: 'name and dept required' })

    const newItem = await DB.insert('hods', {
      name,
      email: email || '',
      dept,
      courses: Array.isArray(courses) ? courses : [],
      exp: exp || 0,
      role: 'hod',
      createdAt: new Date().toISOString()
    })
    return res.status(201).json({ ok: true, hod: newItem })
  } catch (err) {
    console.error('hods:create error', err)
    return res.status(500).json({ error: 'could not create hod' })
  }
})

// GET /api/hods/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const h = await DB.findById('hods', id)
    if (!h) return res.status(404).json({ error: 'Not found' })
    return res.json({
      id: h.id,
      name: h.name,
      dept: h.dept,
      exp: h.exp || null,
      courses: h.courses || []
    })
  } catch (err) {
    console.error('hods:get error', err)
    return res.status(500).json({ error: 'could not load hod' })
  }
})

module.exports = router
