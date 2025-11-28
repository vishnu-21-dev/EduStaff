// public/assets/js/schedule-api.js
// Combined client: server-backed (when authToken present) with localStorage fallback.
// This preserves the full behavior of the original inline script while enabling API mode.
(function(){
  // helpers
  function safeParse(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return v===null?fallback:v }catch(e){ return fallback } }
  function nowISO(){ return new Date().toISOString() }
  function uid(){ return 's_'+Date.now() + '_' + Math.floor(Math.random()*999) }

  // login / role check (same as original)
  const logged = safeParse('loggedInTeacher', null)
  if(!logged){ alert('Not logged in. Redirecting to login.'); location.href = '../teachers/login.html'; return }
  const role = (logged.role||'').toLowerCase()
  if(role !== 'hod' && role !== 'admin'){ alert('Access denied. HOD/Admin only.'); location.href = '../teachers/dashboard.html'; return }

  // DOM elements (same ids as page)
  const form = document.getElementById('form')
  const itemId = document.getElementById('itemId')
  const titleEl = document.getElementById('title')
  const dateEl = document.getElementById('date')
  const timeEl = document.getElementById('time')
  const venueEl = document.getElementById('venue')
  const deptEl = document.getElementById('dept')
  const catEl = document.getElementById('category')
  const detailsEl = document.getElementById('details')
  const formMsg = document.getElementById('formMsg')
  const resetBtn = document.getElementById('resetBtn')
  const seedBtn = document.getElementById('seedBtn')
  const saveBtn = document.getElementById('saveBtn')

  const listArea = document.getElementById('listArea')
  const emptyEl = document.getElementById('empty')
  const filterDept = document.getElementById('filterDept')
  const filterCategory = document.getElementById('filterCategory')
  const applyFilter = document.getElementById('applyFilter')

  const modal = document.getElementById('modal')
  const modalBody = document.getElementById('modalBody')
  const closeModal = document.getElementById('closeModal')
  const confirmDelete = document.getElementById('confirmDelete')
  const confirmCancel = document.getElementById('confirmCancel')

  const API_BASE = '/api'
  function authHeader(){ const t = localStorage.getItem('authToken'); return t ? { 'Authorization': 'Bearer ' + t } : {} }

  // Determine mode: server if token present; we will attempt server ops and fall back to localStorage on failure.
  function hasToken(){ return !!localStorage.getItem('authToken') }

  // ---------- LocalStorage implementations (preserve original behavior) ----------
  function loadScheduleLocal(){ return safeParse('dept_schedule', []) || [] }
  function saveScheduleLocal(arr){ localStorage.setItem('dept_schedule', JSON.stringify(arr)) }

  async function createLocalItem(item){
    const arr = loadScheduleLocal()
    item.createdAt = nowISO()
    item.createdBy = logged.empId
    arr.unshift(item)
    saveScheduleLocal(arr)
    return item
  }
  async function updateLocalItem(id, updates){
    const arr = loadScheduleLocal()
    const idx = arr.findIndex(x => x.id === id)
    if(idx === -1) throw new Error('Item not found')
    arr[idx] = Object.assign({}, arr[idx], updates, { updatedAt: nowISO(), updatedBy: logged.empId })
    saveScheduleLocal(arr)
    return arr[idx]
  }
  async function deleteLocalItem(id){
    const arr = loadScheduleLocal()
    const idx = arr.findIndex(x => x.id === id)
    if(idx !== -1) arr.splice(idx,1)
    saveScheduleLocal(arr)
    return true
  }

  // ---------- Server implementations ----------
  async function fetchJSON(url, opts){
    const res = await fetch(url, opts)
    const text = await res.text()
    try { return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null } }
    catch(e){ return { ok: res.ok, status: res.status, body: text } }
  }

  async function loadScheduleServer(params){
    const q = new URLSearchParams()
    if(params && params.dept) q.set('dept', params.dept)
    if(params && params.category) q.set('category', params.category)
    const r = await fetchJSON(API_BASE + '/schedule?' + q.toString(), { headers: Object.assign({'Accept':'application/json'}, authHeader()) })
    if(!r.ok) throw new Error(r.body && r.body.error ? r.body.error : ('Server Error ' + r.status))
    return r.body || []
  }

  async function createServerItem(item){
    const r = await fetchJSON(API_BASE + '/schedule', {
      method:'POST',
      headers: Object.assign({'Content-Type':'application/json'}, authHeader()),
      body: JSON.stringify(item)
    })
    if(!r.ok) throw new Error(r.body && r.body.error ? r.body.error : ('Server Error ' + r.status))
    return r.body
  }

  async function updateServerItem(id, payload){
    const r = await fetchJSON(API_BASE + '/schedule/' + encodeURIComponent(id), {
      method:'PUT',
      headers: Object.assign({'Content-Type':'application/json'}, authHeader()),
      body: JSON.stringify(payload)
    })
    if(!r.ok) throw new Error(r.body && r.body.error ? r.body.error : ('Server Error ' + r.status))
    return r.body
  }

  async function deleteServerItem(id){
    const r = await fetchJSON(API_BASE + '/schedule/' + encodeURIComponent(id), {
      method:'DELETE',
      headers: authHeader()
    })
    if(!r.ok) throw new Error(r.body && r.body.error ? r.body.error : ('Server Error ' + r.status))
    return true
  }

  // ---------- Wrapper functions: prefer server mode when token provided, otherwise use local ----------
  async function loadSchedule(opts){
    // opts: { dept, category } optional
    if(hasToken()){
      try {
        return await loadScheduleServer(opts)
      } catch(e){
        console.warn('Server load failed, falling back to local:', e)
        return loadScheduleLocalWithFilters(opts)
      }
    } else {
      return loadScheduleLocalWithFilters(opts)
    }
  }

  function loadScheduleLocalWithFilters(opts){
    const arr = loadScheduleLocal() || []
    let list = arr.slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    if(opts && opts.dept) list = list.filter(x => (x.dept||'') === opts.dept)
    if(opts && opts.category) list = list.filter(x => (x.category||'') === opts.category)
    return list
  }

  async function saveScheduleItem(payload, isNew){
    if(hasToken()){
      try {
        return isNew ? await createServerItem(payload) : await updateServerItem(payload.id, payload)
      } catch(err){
        // if server fails due to auth or server error, surface to caller
        throw err
      }
    } else {
      // local
      return isNew ? await createLocalItem(payload) : await updateLocalItem(payload.id, payload)
    }
  }

  async function removeScheduleItem(id){
    if(hasToken()){
      try {
        return await deleteServerItem(id)
      } catch(err){
        // fallback: try local delete as last resort
        console.warn('Server delete failed, attempting local delete', err)
        return deleteLocalItem(id)
      }
    } else {
      return deleteLocalItem(id)
    }
  }

  // ---------- UI utilities ----------
  function niceDate(item){
    const d = item.date || ''
    const t = item.time ? ' ' + item.time : ''
    return (d ? d : '—') + t
  }

  // ---------- Rendering ----------
  async function renderList(){
    const deptFilter = filterDept.value
    const catFilter = filterCategory.value
    const params = {}
    if(deptFilter) params.dept = deptFilter
    if(catFilter) params.category = catFilter

    const list = await loadSchedule(params)
    listArea.innerHTML = ''
    if(!list || list.length === 0){ emptyEl.style.display = 'block'; return }
    emptyEl.style.display = 'none'

    // ensure stable sort: by date ascending (original did localeCompare)
    const sorted = list.slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''))

    sorted.forEach(item => {
      const wrap = document.createElement('div')
      wrap.className = 'item'

      const left = document.createElement('div')
      left.className = 'itemLeft'

      const title = document.createElement('div')
      title.style.fontWeight = '800'
      title.textContent = item.title

      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.innerHTML = `${niceDate(item)} · ${item.venue || '—'}`

      const more = document.createElement('div')
      more.className = 'small'
      more.style.marginTop = '6px'
      more.textContent = (item.details || '').slice(0,220)

      const bottom = document.createElement('div')
      bottom.style.marginTop = '8px'
      bottom.innerHTML = `<span class="tag">${item.category||'General'}</span> <span style="margin-left:8px" class="small">${item.dept||'All'}</span>`

      left.appendChild(title)
      left.appendChild(meta)
      left.appendChild(more)
      left.appendChild(bottom)

      const actions = document.createElement('div')
      actions.className = 'actions'

      const editBtn = document.createElement('button')
      editBtn.className = 'iconBtn'
      editBtn.title = 'Edit'
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>'
      editBtn.addEventListener('click', ()=> loadIntoForm(item.id))

      const delBtn = document.createElement('button')
      delBtn.className = 'iconBtn'
      delBtn.title = 'Delete'
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>'
      delBtn.addEventListener('click', ()=> openDeleteModal(item.id, item.title))

      actions.appendChild(editBtn)
      actions.appendChild(delBtn)

      wrap.appendChild(left)
      wrap.appendChild(actions)

      listArea.appendChild(wrap)
    })
  }

  // load into form for edit
  async function loadIntoForm(id){
    // For server mode we fetched list above; simply read from loadSchedule result
    const list = await loadSchedule({})
    const it = list.find(x=>x.id === id)
    if(!it) return
    itemId.value = it.id
    titleEl.value = it.title || ''
    dateEl.value = it.date || ''
    timeEl.value = it.time || ''
    venueEl.value = it.venue || ''
    deptEl.value = it.dept || ''
    catEl.value = it.category || 'General'
    detailsEl.value = it.details || ''
    formMsg.textContent = 'Editing item. Save to apply changes.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // reset form
  function resetForm(){
    itemId.value = ''
    form.reset()
    formMsg.textContent = ''
  }

  // save (create or update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const id = itemId.value || ''
    const title = titleEl.value.trim()
    const date = dateEl.value
    const time = timeEl.value
    const venue = venueEl.value.trim()
    const dept = deptEl.value
    const category = catEl.value
    const details = detailsEl.value.trim()

    if(!title || !date){
      formMsg.style.color = 'var(--danger)'
      formMsg.textContent = 'Title and date are required'
      return
    }

    const payload = { id: id || uid(), title, date, time, venue, dept, category, details }
    try {
      const result = await saveScheduleItem(payload, !id)
      formMsg.style.color = 'green'
      formMsg.textContent = id ? 'Updated' : 'Saved'
      if(!id) resetForm()
      await renderList()
    } catch(err){
      formMsg.style.color = 'var(--danger)'
      formMsg.textContent = 'Save failed: ' + (err.message || err)
    }
  })

  // delete flow with modal
  let deleteTarget = null
  function openDeleteModal(id, title){
    deleteTarget = id
    modalBody.innerHTML = `<div>Delete <strong>${title}</strong> ? This action cannot be undone.</div>`
    modal.style.display = 'flex'
    modal.setAttribute('aria-hidden','false')
  }
  closeModal.addEventListener('click', ()=> { modal.style.display='none'; modal.setAttribute('aria-hidden','true') })
  confirmCancel.addEventListener('click', ()=> { modal.style.display='none'; modal.setAttribute('aria-hidden','true') })
  confirmDelete.addEventListener('click', async ()=>{
    if(!deleteTarget) return
    try {
      await removeScheduleItem(deleteTarget)
      modal.style.display='none'
      modal.setAttribute('aria-hidden','true')
      deleteTarget = null
      await renderList()
    } catch(err){
      alert('Delete failed: ' + (err.message || err))
    }
  })

  // filters
  applyFilter.addEventListener('click', renderList)
  filterDept.addEventListener('change', renderList)
  filterCategory.addEventListener('change', renderList)

  // reset button
  resetBtn.addEventListener('click', resetForm)

  // seed demo: creates records via server when token present, otherwise local
  seedBtn.addEventListener('click', async ()=>{
    const sample = [
      { id: uid(), title:'Department Meeting', date: new Date().toISOString().slice(0,10), time:'15:00', venue:'Meeting Room', dept:'HRD', category:'Meeting', details:'Discuss semester plans' },
      { id: uid(), title:'Guest Lecture: AI', date: (()=>{
          const d=new Date(); d.setDate(d.getDate()+3); return d.toISOString().slice(0,10)
        })(), time:'11:00', venue:'Seminar Hall', dept:'CSE', category:'Seminar', details:'Prof. X on AI trends' },
      { id: uid(), title:'Internal Exam', date: (()=>{
          const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10)
        })(), time:'09:30', venue:'Main Hall', dept:'All', category:'Examination', details:'Midterm internal exam schedule' }
    ]
    seedBtn.disabled = true
    if(hasToken()){
      // try server create; on failure, fallback to local insertion
      try {
        for(const it of sample) await createServerItem(it)
      } catch(err){
        console.warn('Seed via server failed, falling back to local seed:', err)
        const arr = loadScheduleLocal()
        saveScheduleLocal(sample.concat(arr))
      }
    } else {
      const arr = loadScheduleLocal()
      saveScheduleLocal(sample.concat(arr))
    }
    setTimeout(()=>{ seedBtn.disabled = false; renderList(); }, 150)
  })

  // initial render
  renderList()

  // nav buttons - preserve behavior (they exist in your page header)
  const backBtn = document.getElementById('backBtn')
  const logoutBtn = document.getElementById('logoutBtn')
  if(backBtn) backBtn.addEventListener('click', ()=> location.href = '../teachers/dashboard.html')
  if(logoutBtn) logoutBtn.addEventListener('click', ()=> { localStorage.removeItem('loggedInTeacher'); localStorage.removeItem('authToken'); location.href = '../teachers/login.html' })

})();