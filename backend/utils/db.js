// backend/utils/db.js
// Tiny JSON-file "DB" for local persistence.
// Usage:
//   const DB = require('../utils/db')
//   await DB.insert('teachers', { id: 123, name: 'X' })
//   const teachers = await DB.read('teachers')

const fs = require('fs').promises
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')

// ensure data dir exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (e) {
    // ignore
  }
}

// get full path for collection file
function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`)
}

// read raw JSON file, return array (default [])
async function read(collection) {
  await ensureDataDir()
  const fp = filePath(collection)
  try {
    const txt = await fs.readFile(fp, 'utf8')
    const data = JSON.parse(txt)
    if (!Array.isArray(data)) return []
    return data
  } catch (err) {
    // file not found or invalid -> return empty array
    return []
  }
}

// write array to file atomically (write tmp then rename)
async function write(collection, arr) {
  await ensureDataDir()
  const fp = filePath(collection)
  const tmp = fp + '.tmp'
  const txt = JSON.stringify(arr, null, 2)
  await fs.writeFile(tmp, txt, 'utf8')
  await fs.rename(tmp, fp)
  return true
}

// helper: insert item (will set id if missing)
async function insert(collection, item) {
  const arr = await read(collection)
  let id = item.id
  if (id == null) {
    // simple id generation: max existing + 1, or timestamp fallback
    const max = arr.reduce((m, x) => (x && x.id && x.id > m ? x.id : m), 0)
    id = max ? max + 1 : Date.now()
  }
  const newItem = Object.assign({}, item, { id })
  arr.push(newItem)
  await write(collection, arr)
  return newItem
}

// helper: find item by id
async function findById(collection, id) {
  const arr = await read(collection)
  return arr.find(x => Number(x.id) === Number(id)) || null
}

// helper: update item by id (partial merge)
async function updateById(collection, id, patch) {
  const arr = await read(collection)
  const idx = arr.findIndex(x => Number(x.id) === Number(id))
  if (idx === -1) return null
  arr[idx] = Object.assign({}, arr[idx], patch, { id: arr[idx].id })
  await write(collection, arr)
  return arr[idx]
}

// helper: replace item by id (full replace except preserve id)
async function replaceById(collection, id, newObj) {
  const arr = await read(collection)
  const idx = arr.findIndex(x => Number(x.id) === Number(id))
  if (idx === -1) return null
  newObj.id = arr[idx].id
  arr[idx] = newObj
  await write(collection, arr)
  return arr[idx]
}

// helper: delete by id
async function deleteById(collection, id) {
  const arr = await read(collection)
  const idx = arr.findIndex(x => Number(x.id) === Number(id))
  if (idx === -1) return false
  arr.splice(idx, 1)
  await write(collection, arr)
  return true
}

// helper: replace entire collection (useful for migrations)
async function replaceAll(collection, arr) {
  if (!Array.isArray(arr)) throw new Error('arr must be array')
  await write(collection, arr)
  return true
}

module.exports = {
  read,
  write,
  insert,
  findById,
  updateById,
  replaceById,
  deleteById,
  replaceAll,
  // expose data dir for convenience/debugging
  DATA_DIR,
}
