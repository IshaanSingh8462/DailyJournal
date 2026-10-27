import '../styles/base.css'
import '../styles/workouts.css'

import { sb, configured } from '../lib/supabase.js'
import { $, toast, esc } from '../lib/ui.js'
import { mountNav } from '../lib/nav.js'
import { todayK, addDays, mondayOf, shortLabel } from '../lib/dates.js'
import {
  plan, savePlan, pullPlan, onStatus, uid, COLORS,
  typeById, latestSchedule, typeForSchedule, dayTypeFor, syncError
} from '../lib/plan.js'

const BUCKET = 'exercise-videos'
const MAX_MB = 50
const PARTS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Cardio']

let tab = 'all', tabTouched = false
let draft = null, draftTouched = false      // schedule being edited
let exForm = null, busy = false             // exercise form being edited
const openCards = new Set()
const urlCache = new Map()

const hex = c => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#8a8a8e')
const chip = t => `<span class="chip" style="--c:${hex(t.color)}">${esc(t.name)}</span>`

// ───────────── top line
function renderTop() {
  document.querySelectorAll('#todayLine + .banner').forEach(x => x.remove())
  const t = dayTypeFor(todayK)
  $('todayLine').innerHTML = t
    ? `Today is <span class="badge wk" style="--c:${hex(t.color)}">${esc(t.name)}</span>`
    : '<span class="hint">No workout set for today yet – make your days and schedule below.</span>'
  if (t && /rest/i.test(t.name)) $('todayLine').insertAdjacentHTML('afterend', '<a class="banner" href="/pages/routine.html#posture"><b>Rest day</b><span>Do Posture Block A and B today</span><i>›</i></a>')
}

// ───────────── 1. day types
function renderTypes() {
  const rows = plan.types.map(t => `
    <div class="row" data-id="${t.id}">
      <input type="color" class="tc" value="${hex(t.color)}">
      <input type="text" class="tn" value="${esc(t.name)}">
      <button class="ghost tdel">delete</button>
    </div>`).join('')
  const quick = plan.types.length ? '' :
    '<p><button id="quick" class="pri">Quick start: Push · Pull · Legs · Rest</button></p>'
  $('typesBox').innerHTML = quick + rows + `
    <div class="row">
      <input type="color" id="newTypeColor" value="${COLORS[plan.types.length % COLORS.length]}">
      <input type="text" id="newTypeName" class="tn" placeholder="New day, e.g. Push">
      <button id="addType">+ Add</button>
    </div>`
}

function quickStart() {
  const names = [['Push', COLORS[0]], ['Pull', COLORS[1]], ['Legs', COLORS[2]], ['Rest', COLORS[3]]]
  const ids = names.map(([name, color]) => {
    const t = { id: uid(), name, color }
    plan.types.push(t)
    return t.id
  })
  plan.schedules = [{ from: '0000-01-01', start: mondayOf(todayK), pattern: ids }]
  savePlan(); initDraft(); renderAll()
}

// ───────────── 2. schedule
function initDraft() {
  const s = latestSchedule()
  draft = { pattern: s ? [...s.pattern] : [], start: s ? s.start : mondayOf(todayK), mode: 'future' }
  draftTouched = false
}

function renderSched() {
  draft.pattern = draft.pattern.filter(typeById)
  const opts = sel => plan.types.map(t => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${esc(t.name)}</option>`).join('')
  const last = draft.pattern.length - 1
  const slots = draft.pattern.map((id, i) => `
    <div class="slot" data-i="${i}">
      <span class="n">${i + 1}</span>
      <select class="sl">${opts(id)}</select>
      <button class="ghost up"${i ? '' : ' disabled'}>↑</button>
      <button class="ghost dn"${i < last ? '' : ' disabled'}>↓</button>
      <button class="ghost rm">✕</button>
    </div>`).join('')

  const preview = Array.from({ length: 14 }, (_, i) => {
    const k = addDays(todayK, i), t = typeForSchedule(draft, k)
    return `<div class="pv${i === 0 ? ' today' : ''}"><span>${shortLabel(k)}</span>${t ? `<b style="--c:${hex(t.color)}">${esc(t.name)}</b>` : '<b style="--c:#8a8a8e">–</b>'}</div>`
  }).join('')

  const modes = plan.schedules.length ? `
    <div class="sched-opts modes">
      <label><input type="radio" name="mode" value="future"${draft.mode === 'future' ? ' checked' : ''}> Apply from today on (past days keep their old pattern)</label>
      <label><input type="radio" name="mode" value="all"${draft.mode === 'all' ? ' checked' : ''}> Apply to every day, including the past</label>
    </div>` : ''

  $('schedBox').innerHTML = !plan.types.length
    ? '<p class="empty">Create at least one workout day above first.</p>'
    : `${slots || '<p class="empty">Your pattern is empty – add the first day.</p>'}
       <button id="addSlot">+ Add day to pattern</button>
       <div class="sched-opts">
         <label>Day 1 of the pattern falls on <input type="date" id="schStart" value="${esc(draft.start)}"></label>
       </div>
       ${modes}
       <button id="saveSched" class="pri">Save schedule</button>
       <div class="preview">${preview}</div>`
}

function saveSchedule() {
  if (!draft.pattern.length) return toast('Add at least one day to the pattern')
  if (!draft.start) return toast('Pick the start date')
  const v = { start: draft.start, pattern: [...draft.pattern] }
  if (!plan.schedules.length || draft.mode === 'all') {
    plan.schedules = [{ from: '0000-01-01', ...v }]
  } else {
    const keep = plan.schedules.filter(s => s.from < todayK)
    keep.push({ from: keep.length ? todayK : '0000-01-01', ...v })
    plan.schedules = keep
  }
  savePlan(); initDraft(); renderAll(); toast('Schedule saved')
}

// ───────────── 3. exercises
const blankForm = () => ({
  id: null, name: '', sets: '', reps: '', bodyPart: '', instructions: '',
  dayIds: tab !== 'all' && typeById(tab) ? [tab] : [], video: null, file: null
})

function exCard(x) {
  const isOpen = openCards.has(x.id)
  const days = x.dayIds.map(typeById).filter(Boolean).map(chip).join('')
  const meta = x.sets || x.reps ? `${esc(x.sets || '–')} × ${esc(x.reps || '–')}` : ''
  const body = !isOpen ? '' : `
    <div class="cb">
      ${x.instructions ? `<p class="ins">${esc(x.instructions)}</p>` : ''}
      ${x.video ? `<video controls playsinline preload="metadata" data-path="${esc(x.video.path)}"></video>` : ''}
      ${!x.instructions && !x.video ? '<p class="hint">No instructions or video added yet.</p>' : ''}
      <div class="acts"><button class="ghost ed">Edit</button><button class="ghost xdel">Delete</button></div>
    </div>`
  return `
    <div class="card" data-id="${x.id}">
      <div class="ch">
        <strong>${esc(x.name)}</strong>
        <span class="meta">${meta}</span>
        ${x.bodyPart ? `<span class="tag">${esc(x.bodyPart)}</span>` : ''}
        ${days}
        <span class="chev">${isOpen ? '▾' : '▸'}</span>
      </div>${body}
    </div>`
}

function formHTML(f) {
  const parts = [...new Set([...PARTS, ...plan.exercises.map(x => x.bodyPart).filter(Boolean)])]
  const days = plan.types.length
    ? plan.types.map(t => `<label class="chk"><input type="checkbox" data-day="${t.id}"${f.dayIds.includes(t.id) ? ' checked' : ''}> ${esc(t.name)}</label>`).join('')
    : '<span class="hint">Create a workout day first.</span>'
  return `
    <div class="form">
      <h3>${f.id ? 'Edit exercise' : 'New exercise'}</h3>
      <label class="f">Name<input type="text" data-f="name" value="${esc(f.name)}" placeholder="e.g. Dips"></label>
      <div class="two">
        <label class="f">Sets<input type="number" min="1" data-f="sets" value="${esc(f.sets)}" placeholder="3"></label>
        <label class="f">Reps<input type="text" data-f="reps" value="${esc(f.reps)}" placeholder="12, 8-10, 30s…"></label>
      </div>
      <label class="f">Body part<input type="text" list="parts" data-f="bodyPart" value="${esc(f.bodyPart)}" placeholder="Tricep, back…"></label>
      <datalist id="parts">${parts.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <div><div class="hint">Which days?</div><div class="days">${days}</div></div>
      <label class="f">Instructions (optional)<textarea data-f="instructions" placeholder="How to do it, form cues…">${esc(f.instructions)}</textarea></label>
      <div>
        <div class="hint">Video (optional, up to ${MAX_MB} MB)</div>
        <div class="vid">
          ${f.video ? `<span>🎬 ${esc(f.video.name)}</span><button class="ghost" id="rmVid">Remove</button>` : ''}
          ${f.file ? `<span>Selected: ${esc(f.file.name)}</span>` : ''}
          <input type="file" id="vidFile" accept="video/*">
        </div>
      </div>
      <div class="acts"><button id="saveEx" class="pri">Save exercise</button><button id="cancelEx" class="ghost">Cancel</button></div>
    </div>`
}

function renderEx() {
  const tabs = `<div class="tabs"><button class="tab${tab === 'all' ? ' on' : ''}" data-t="all">All</button>` +
    plan.types.map(t => `<button class="tab${tab === t.id ? ' on' : ''}" data-t="${t.id}" style="--c:${hex(t.color)}">${esc(t.name)}${dayTypeFor(todayK) && dayTypeFor(todayK).id === t.id ? '<small>today</small>' : ''}</button>`).join('') +
    '</div>'
  const list = plan.exercises.filter(x => tab === 'all' || x.dayIds.includes(tab))
  const tt = typeById(tab)
  const rest = tt && /rest/i.test(tt.name)
    ? '<a class="banner" href="/pages/routine.html#posture"><b>Rest day</b><span>Do Posture Block A and B</span><i>›</i></a>' : ''
  $('exBox').innerHTML = tabs + rest +
    (exForm ? formHTML(exForm) : '<button id="newEx">+ New exercise</button>') +
    (list.length ? list.map(exCard).join('') : '<p class="empty">No exercises here yet.</p>')
  loadVideos()
}

async function loadVideos() {
  for (const v of document.querySelectorAll('video[data-path]')) {
    const p = v.dataset.path
    let url = urlCache.get(p)
    if (!url) {
      if (!sb || !navigator.onLine) continue
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(p, 3600)
      if (error) { console.error(error); continue }
      url = data.signedUrl; urlCache.set(p, url)
    }
    v.src = url
  }
}

const dropVideo = path => { if (sb && path) sb.storage.from(BUCKET).remove([path]).catch(() => {}) }

async function saveEx() {
  const f = exForm
  if (busy) return
  if (!f.name.trim()) return toast('Give the exercise a name')
  const old = f.id ? plan.exercises.find(x => x.id === f.id) : null
  const id = f.id || uid()
  let video = f.video

  if (f.file) {
    if (!sb || !navigator.onLine) return toast('Go online to upload a video')
    if (f.file.size > MAX_MB * 1024 * 1024) return toast('Video is over ' + MAX_MB + ' MB')
    busy = true; $('saveEx').textContent = 'Uploading…'
    const { data: { session } } = await sb.auth.getSession()
    const ext = (f.file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${session.user.id}/${id}-${Date.now()}.${ext}`
    const { error } = await sb.storage.from(BUCKET).upload(path, f.file, { contentType: f.file.type || undefined })
    busy = false
    if (error) { console.error(error); renderEx(); return toast('Video upload failed (is the storage bucket set up?)') }
    video = { path, name: f.file.name }
  }
  if (old && old.video && (!video || video.path !== old.video.path)) dropVideo(old.video.path)

  const ex = {
    id, name: f.name.trim(), sets: String(f.sets || '').trim(), reps: f.reps.trim(),
    bodyPart: f.bodyPart.trim(), instructions: f.instructions.trim(),
    dayIds: f.dayIds.filter(typeById), video
  }
  const i = plan.exercises.findIndex(x => x.id === id)
  if (i >= 0) plan.exercises[i] = ex; else plan.exercises.push(ex)
  exForm = null
  savePlan(); renderEx(); toast('Exercise saved')
}

// ───────────── events
function bind() {
  // day types
  $('typesBox').addEventListener('change', e => {
    const row = e.target.closest('.row[data-id]'); if (!row) return
    const t = typeById(row.dataset.id); if (!t) return
    if (e.target.classList.contains('tn')) {
      const v = e.target.value.trim()
      if (!v) { e.target.value = t.name; return }
      t.name = v
    } else if (e.target.classList.contains('tc')) t.color = e.target.value
    else return
    savePlan(); renderAll()
  })
  $('typesBox').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'newTypeName') $('addType').click() })
  $('typesBox').addEventListener('click', e => {
    const el = e.target
    if (el.id === 'quick') return quickStart()
    if (el.id === 'addType') {
      const name = $('newTypeName').value.trim()
      if (!name) return toast('Name the day first')
      plan.types.push({ id: uid(), name, color: $('newTypeColor').value })
      savePlan(); renderAll()
    } else if (el.classList.contains('tdel')) {
      const t = typeById(el.closest('.row').dataset.id)
      const s = latestSchedule()
      if (s && s.pattern.includes(t.id) || draft.pattern.includes(t.id)) return toast('Remove it from the schedule pattern first')
      if (!confirm(`Delete "${t.name}"? Exercises keep existing but lose this day.`)) return
      plan.types = plan.types.filter(x => x.id !== t.id)
      plan.exercises.forEach(x => { x.dayIds = x.dayIds.filter(d => d !== t.id) })
      if (tab === t.id) tab = 'all'
      savePlan(); renderAll()
    }
  })

  // schedule
  $('schedBox').addEventListener('click', e => {
    const el = e.target, slot = el.closest('.slot'), i = slot ? +slot.dataset.i : -1, p = draft.pattern
    if (el.id === 'addSlot') p.push(p.length ? p[p.length - 1] : plan.types[0].id)
    else if (el.id === 'saveSched') return saveSchedule()
    else if (el.classList.contains('up') && i > 0) [p[i - 1], p[i]] = [p[i], p[i - 1]]
    else if (el.classList.contains('dn') && i < p.length - 1) [p[i + 1], p[i]] = [p[i], p[i + 1]]
    else if (el.classList.contains('rm')) p.splice(i, 1)
    else return
    draftTouched = true; renderSched()
  })
  $('schedBox').addEventListener('change', e => {
    const el = e.target
    if (el.classList.contains('sl')) draft.pattern[+el.closest('.slot').dataset.i] = el.value
    else if (el.id === 'schStart') draft.start = el.value
    else if (el.name === 'mode') draft.mode = el.value
    else return
    draftTouched = true; renderSched()
  })

  // exercises
  $('exBox').addEventListener('click', e => {
    const el = e.target
    const card = el.closest('.card'), x = card && plan.exercises.find(a => a.id === card.dataset.id)
    if (el.closest('.tab')) { tab = el.closest('.tab').dataset.t; tabTouched = true; return renderEx() }
    if (el.id === 'newEx') { exForm = blankForm(); renderEx(); return $('exBox').querySelector('.form input').focus() }
    if (el.id === 'cancelEx') { exForm = null; return renderEx() }
    if (el.id === 'saveEx') return saveEx()
    if (el.id === 'rmVid') { exForm.video = null; return renderEx() }
    if (!x) return
    if (el.classList.contains('ed')) {
      exForm = { ...x, dayIds: [...x.dayIds], file: null }
      renderEx(); return $('exBox').querySelector('.form').scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (el.classList.contains('xdel')) {
      if (!confirm(`Delete "${x.name}"?`)) return
      dropVideo(x.video && x.video.path)
      plan.exercises = plan.exercises.filter(a => a.id !== x.id)
      savePlan(); return renderEx()
    }
    if (el.closest('.ch')) { openCards.has(x.id) ? openCards.delete(x.id) : openCards.add(x.id); renderEx() }
  })
  $('exBox').addEventListener('input', e => {
    const f = e.target.dataset.f
    if (f && exForm) exForm[f] = e.target.value
  })
  $('exBox').addEventListener('change', e => {
    const el = e.target
    if (el.dataset.day && exForm) {
      const s = new Set(exForm.dayIds)
      el.checked ? s.add(el.dataset.day) : s.delete(el.dataset.day)
      exForm.dayIds = [...s]
    } else if (el.id === 'vidFile' && exForm) {
      const file = el.files[0]
      if (file && file.size > MAX_MB * 1024 * 1024) { el.value = ''; return toast('Video is over ' + MAX_MB + ' MB') }
      exForm.file = file || null
      renderEx()
    }
  })
}

function renderAll() { renderTop(); renderTypes(); renderSched(); renderEx() }

async function init() {
  mountNav('workouts')
  onStatus(t => { $('status').textContent = t })
  if (configured) {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { $('app').hidden = true; $('gate').hidden = false; return }
  }
  tab = (dayTypeFor(todayK) || {}).id || 'all'
  initDraft(); bind(); renderAll()

  const ok = await pullPlan()
  if (ok) {
    if (!draftTouched) initDraft()
    if (!tabTouched) tab = (dayTypeFor(todayK) || {}).id || 'all'
    if (tab !== 'all' && !typeById(tab)) tab = 'all'
    renderAll()
    $('status').textContent = 'Saved ✓'
  } else {
    $('status').textContent = syncError ? 'Cloud sync failed: ' + syncError : 'Offline – saved on this device'
  }
}
init()
