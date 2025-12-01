// backend/routes/schedule.js
const express = require('express')
const router = express.Router()
const DB = require('../utils/db')

// Import ensureAdmin middleware if available
let ensureAdmin = null
try {
  const auth = require('./auth')
  if (auth && typeof auth.ensureAdmin === 'function') {
    ensureAdmin = auth.ensureAdmin
  }
} catch (e) {
  console.warn('ensureAdmin middleware not available')
}

// GET /api/schedules - publicly accessible
router.get('/', async (req, res) => {
  try {
    const { dept, category } = req.query
    let items = await DB.read('schedules')

    // Filter by department if provided
    if (dept && dept !== 'All') {
      items = items.filter(i => !i.dept || i.dept === 'All' || i.dept === dept)
    }

    // Filter by category if provided
    if (category && category !== 'All') {
      items = items.filter(i => i.category === category)
    }

    return res.json(items)
  } catch (err) {
    console.error('schedules:list error', err)
    return res.status(500).json({ error: 'could not load schedules' })
  }
})

// GET /api/schedules/:id - publicly accessible
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const s = await DB.findById('schedules', id)
    if (!s) return res.status(404).json({ error: 'Not found' })
    return res.json(s)
  } catch (err) {
    console.error('schedules:get error', err)
    return res.status(500).json({ error: 'could not load schedule' })
  }
})

// POST /api/schedules - admin only
router.post('/', ensureAdmin || ((req, res, next) => next()), async (req, res) => {
  try {
    const { teacherId, course, date, time, room } = req.body || {}
    if (!teacherId || !course || !date || !time) return res.status(400).json({ error: 'teacherId, course, date and time required' })
    const newSched = await DB.insert('schedules', {
      teacherId: Number(teacherId),
      course,
      date,
      time,
      room: room || ''
    })
    return res.status(201).json(newSched)
  } catch (err) {
    console.error('schedules:create error', err)
    return res.status(500).json({ error: 'create failed' })
  }
})

// PUT /api/schedules/:id - admin only
router.put('/:id', ensureAdmin || ((req, res, next) => next()), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { teacherId, course, date, time, room } = req.body || {}
    if (!teacherId || !course || !date || !time) return res.status(400).json({ error: 'teacherId, course, date and time required' })
    const updated = await DB.updateById('schedules', id, {
      teacherId: Number(teacherId),
      course,
      date,
      time,
      room: room || ''
    })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    return res.json(updated)
  } catch (err) {
    console.error('schedules:update error', err)
    return res.status(500).json({ error: 'update failed' })
  }
})

// DELETE /api/schedules/:id - admin only
router.delete('/:id', ensureAdmin || ((req, res, next) => next()), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const ok = await DB.deleteById('schedules', id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('schedules:delete error', err)
    return res.status(500).json({ error: 'delete failed' })
  }
})

module.exports = router
