// backend/routes/syllabus.js
const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const router = express.Router()

// uploads directory (project root /uploads)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

// ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// multer storage (save original filename; if collision, prefix timestamp)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_')
    const dest = path.join(UPLOAD_DIR, safeName)
    if (fs.existsSync(dest)) {
      const stamp = Date.now()
      cb(null, `${stamp}_${safeName}`)
    } else {
      cb(null, safeName)
    }
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files allowed'))
    }
    cb(null, true)
  }
})

// GET /api/syllabus  -> list files
router.get('/', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'could not read uploads' })
    const list = files.map(fname => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, fname))
      return { filename: fname, uploaded: stat.mtime.toISOString().slice(0,10) }
    })
    res.json(list)
  })
})

// POST /api/syllabus  -> upload (form field: file)
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required (PDF)' })
  return res.status(201).json({ ok: true, filename: req.file.filename, uploaded: new Date().toISOString().slice(0,10) })
})

// DELETE /api/syllabus/:filename  -> delete file
router.delete('/:filename', (req, res) => {
  const fname = req.params.filename
  if (!fname) return res.status(400).json({ error: 'filename required' })
  const full = path.join(UPLOAD_DIR, fname)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'file not found' })
  try {
    fs.unlinkSync(full)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'delete failed' })
  }
})

module.exports = router
