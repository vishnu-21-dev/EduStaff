require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const express = require('express')
const path = require('path')
const cors = require('cors')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// serve static files: prefer project-root/public, fall back to backend/public
const publicCandidates = [
  path.join(__dirname, '..', 'public'), // project root public
  path.join(__dirname, 'public')        // backend/public fallback
]
const publicDir = publicCandidates.find(dir => fs.existsSync(dir))
if (publicDir) {
  app.use(express.static(publicDir))
  console.log('Serving static files from', publicDir)
} else {
  console.warn('Warning: no public directory found in candidates:', publicCandidates)
}

// serve uploads: prefer backend/uploads then project-root/uploads
const uploadsCandidates = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, '..', 'uploads')
]
const uploadsDir = uploadsCandidates.find(dir => fs.existsSync(dir))
if (uploadsDir) {
  app.use('/uploads', express.static(uploadsDir))
  console.log('Serving uploads from', uploadsDir)
} else {
  console.warn('Warning: no uploads directory found in candidates:', uploadsCandidates)
}

function safeRequire(p, opts = {}) {
  try {
    // prefer resolving relative to this file's dir
    const resolved = path.resolve(__dirname, p)
    return require(resolved)
  } catch (err1) {
    try {
      // fallback to plain require (for node modules or absolute paths)
      return require(p)
    } catch (err2) {
      if (!opts.silent) {
        console.warn(`Warning: module ${p} could not be loaded:`, err2.message)
      }
      return null
    }
  }
}

let ensureAdmin = null

// auth (may export router and ensureAdmin)
const auth = safeRequire('./routes/auth')
if (auth) {
  app.use('/api/auth', auth)
  if (typeof auth.ensureAdmin === 'function') ensureAdmin = auth.ensureAdmin
}

// helper to mount routes optionally protected by ensureAdmin
function mountRoute(routePath, requirePath, protect = false, optional = false) {
  const r = safeRequire(requirePath, { silent: !!optional })
  if (!r) return
  if (protect && typeof ensureAdmin === 'function') {
    app.use(routePath, ensureAdmin, r)
  } else {
    app.use(routePath, r)
  }
}

// mount other routes; mark protected routes that should use ensureAdmin
mountRoute('/api/hods', './routes/hods', true)
mountRoute('/api/teachers', './routes/teachers', false)
mountRoute('/api/schedules', './routes/schedule', true)
mountRoute('/api/users', './routes/users', true)
mountRoute('/api/syllabus', './routes/syllabus', true)
// optional: uploads/utils or others (silence warnings if missing)
mountRoute('/api/uploads', './routes/uploads', false, true)
mountRoute('/api/utils', './routes/utils', false, true)

// root redirect to login (login.html should be in public root)
app.get('/', (req, res) => {
  res.redirect('/login.html')
})

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
