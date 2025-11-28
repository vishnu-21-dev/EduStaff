// backend/routes/teachers.js
const express = require('express')
const router = express.Router()
const DB = require('../utils/db')

// GET /api/teachers
// Return admin-safe fields only
router.get('/', async (req, res) => {
  try {
    const all = await DB.read('teachers')
    const safe = all.map(t => ({ id: t.id, name: t.name, dept: t.dept, pct: t.pct || 0, updated: t.updated || 'N/A' }))
    return res.json(safe)
  } catch (err) {
    console.error('teachers:list error', err)
    return res.status(500).json({ error: 'could not load teachers' })
  }
})

// POST /api/teachers
// Create new teacher from signup
router.post('/', async (req, res) => {
  try {
    const { empId, fullName, email, phone, dept, dob, role } = req.body || {}
    if (!empId || !fullName) {
      return res.status(400).json({ error: 'empId and fullName required' })
    }

    // Check for duplicate empId
    const existing = await DB.read('teachers')
    if (existing.find(t => t.empId && t.empId.toLowerCase() === empId.toLowerCase())) {
      return res.status(409).json({ error: 'Employee ID already exists' })
    }

    // Create teacher record
    const teacher = await DB.insert('teachers', {
      empId,
      name: fullName,
      email: email || '',
      phone: phone || '',
      dept: dept || '',
      dob: dob || '',
      role: role || 'teacher',
      pct: 0,
      updated: new Date().toISOString().slice(0, 10),
      courses: [],
      createdAt: new Date().toISOString()
    })

    return res.status(201).json({ ok: true, teacher: { id: teacher.id, empId: teacher.empId, name: teacher.name } })
  } catch (err) {
    console.error('teachers:create error', err)
    return res.status(500).json({ error: 'could not create teacher' })
  }
})

// GET /api/teachers/:id
// Return progress-related information only (no todos)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const t = await DB.findById('teachers', id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    // only expose allowed fields
    return res.json({
      id: t.id,
      name: t.name,
      dept: t.dept,
      pct: t.pct,
      updated: t.updated,
      courses: t.courses || []
    })
  } catch (err) {
    console.error('teachers:get error', err)
    return res.status(500).json({ error: 'could not load teacher' })
  }
})

// PUT /api/teachers/:id/progress  { pct, updated }
// Admin-only endpoint to update progress
router.put('/:id/progress', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { pct, updated } = req.body || {}
    if (pct == null) return res.status(400).json({ error: 'pct required' })
    const existing = await DB.findById('teachers', id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    const updatedObj = await DB.updateById('teachers', id, {
      pct: Number(pct),
      updated: updated || new Date().toISOString().slice(0, 10)
    })
    return res.json({ ok: true, teacher: { id: updatedObj.id, pct: updatedObj.pct, updated: updatedObj.updated } })
  } catch (err) {
    console.error('teachers:updateProgress error', err)
    return res.status(500).json({ error: 'update failed' })
  }
})

// GET /api/teachers/:id/extracurricular
// Returns list of extracurricular activities for a teacher
router.get('/:id/extracurricular', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const t = await DB.findById('teachers', id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const activities = t.extracurricular || []
    return res.json({ id: t.id, activities })
  } catch (err) {
    console.error('teachers:getExtracurricular error', err)
    return res.status(500).json({ error: 'could not load extracurricular' })
  }
})

// PUT /api/teachers/:id/extracurricular
// Replace the list of extracurricular activities for a teacher
router.put('/:id/extracurricular', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { activities } = req.body || {}
    if (!Array.isArray(activities)) return res.status(400).json({ error: 'activities array required' })
    const existing = await DB.findById('teachers', id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    const updatedObj = await DB.updateById('teachers', id, { extracurricular: activities })
    return res.json({ ok: true, teacher: { id: updatedObj.id, activities: updatedObj.extracurricular } })
  } catch (err) {
    console.error('teachers:updateExtracurricular error', err)
    return res.status(500).json({ error: 'update failed' })
  }
})

module.exports = router
