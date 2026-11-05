import '../styles/base.css'
import '../styles/notes.css'

import { sb, configured } from '../lib/supabase.js'
import { mountNav } from '../lib/nav.js'
import { $, esc } from '../lib/ui.js'
import {
  notes, createNote, updateNote, removeNote, pullNotes, flushNotes, onNotesStatus, notesError
} from '../lib/notes.js'

let curId = null
let listTimer, saved = null
const plainCache = new Map()
const wide = () => matchMedia('(min-width:721px)').matches

// ───────────── helpers
function plain(n) {
  const c = plainCache.get(n.id)
  if (c && c.u === n.updated) return c.t
  const t = n.html ? new DOMParser().parseFromString(n.html, 'text/html').body.textContent.replace(/\s+/g, ' ').trim() : ''
  plainCache.set(n.id, { u: n.updated, t })
  return t
}
const isEmpty = n => !n.title.trim() && !plain(n)
const alive = () => Object.values(notes).filter(n => !n.deleted)

function when(n) {
  const d = new Date(n.updated)
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}
const fullDate = iso => new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const ORDER = ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older']
function bucket(n) {
  if (n.pinned) return 'Pinned'
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(new Date()) - day(new Date(n.updated))) / 864e5)
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff <= 7 ? 'Previous 7 days' : diff <= 30 ? 'Previous 30 days' : 'Older'
}

// ───────────── list
function row(n) {
  const text = plain(n)
  const title = n.title.trim() || text.slice(0, 60) || 'New note'
  const snip = n.title.trim() ? text : text.slice(60)
  return `<div class="nr${n.id === curId ? ' on' : ''}" data-id="${n.id}"><b>${esc(title)}</b><span><i>${esc(when(n))}</i>${esc((snip || 'No additional text').slice(0, 90))}</span></div>`
}

function renderList() {
  const q = $('search').value.trim().toLowerCase()
  const list = alive()
    .filter(n => !q || n.title.toLowerCase().includes(q) || plain(n).toLowerCase().includes(q))
    .sort((a, b) => b.updated.localeCompare(a.updated))
  if (!list.length) { $('nlist').innerHTML = `<p class="nempty">${q ? 'No results' : 'No notes yet'}</p>`; return }
  const g = {}
  list.forEach(n => { (g[bucket(n)] = g[bucket(n)] || []).push(n) })
  $('nlist').innerHTML = ORDER.filter(k => g[k]).map(k => `<div class="cap">${k}</div><div class="ng">${g[k].map(row).join('')}</div>`).join('')
}

// ───────────── editor
function showEditor(on) { $('ed').hidden = !on; $('empty').hidden = on; $('nt').classList.toggle('editing', on) }

function cleanupEmpty(id) { if (id && notes[id] && !notes[id].deleted && isEmpty(notes[id])) removeNote(id) }

function openNote(id) {
  if (id !== curId) cleanupEmpty(curId)
  const n = notes[id]; if (!n) return
  curId = id
  $('ntitle').value = n.title
  $('nbody').innerHTML = n.html
  $('ndate').textContent = fullDate(n.updated)
  $('pin').textContent = n.pinned ? 'Unpin' : 'Pin'
  showEditor(true)
  renderList()
}

function closeNote() {
  cleanupEmpty(curId)
  curId = null
  showEditor(false)
  renderList()
}

function save() {
  if (!curId || !notes[curId]) return
  updateNote(curId, { title: $('ntitle').value, html: $('nbody').innerHTML })
  $('ndate').textContent = fullDate(notes[curId].updated)
  clearTimeout(listTimer)
  listTimer = setTimeout(renderList, 250)
}

// keep the selection so toolbar buttons work even when focus moves (touch devices)
document.addEventListener('selectionchange', () => {
  const s = getSelection()
  if (s.rangeCount && s.anchorNode && $('nbody').contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange()
})
function restore() {
  const b = $('nbody'), s = getSelection()
  if (s.rangeCount && b.contains(s.anchorNode)) return
  b.focus({ preventScroll: true })
  if (saved) { s.removeAllRanges(); s.addRange(saved) }
}
const cmd = (c, v) => { restore(); document.execCommand(c, false, v); save() }
const blockEl = () => {
  const n = getSelection().anchorNode
  return n && (n.nodeType === 1 ? n : n.parentElement)
}

function checklist() {
  restore()
  const el = blockEl(), ul = el && el.closest('ul')
  if (ul && ul.classList.contains('cl')) document.execCommand('insertUnorderedList')
  else if (ul) ul.classList.add('cl')
  else {
    document.execCommand('insertUnorderedList')
    const e2 = blockEl(), u2 = e2 && e2.closest('ul')
    if (u2) u2.classList.add('cl')
  }
  save()
}

function size(d) {
  restore()
  const cur = parseInt(document.queryCommandValue('fontSize')) || 3
  document.execCommand('fontSize', false, Math.max(1, Math.min(7, cur + d)))
  save()
}

// ───────────── events
function bind() {
  $('newBtn').onclick = () => { const n = createNote(); $('search').value = ''; openNote(n.id); $('ntitle').focus() }
  $('search').oninput = renderList
  $('nlist').addEventListener('click', e => { const r = e.target.closest('.nr'); if (r) openNote(r.dataset.id) })
  $('back').onclick = closeNote

  $('pin').onclick = () => {
    const n = notes[curId]; if (!n) return
    updateNote(curId, { pinned: !n.pinned }, false)
    $('pin').textContent = n.pinned ? 'Unpin' : 'Pin'
    renderList()
  }
  $('del').onclick = () => {
    if (!curId || !confirm('Delete this note?')) return
    removeNote(curId); curId = null; renderList()
    const next = wide() && alive().sort((a, b) => b.updated.localeCompare(a.updated))[0]
    next ? openNote(next.id) : showEditor(false)
  }

  // toolbar (mousedown keeps the text selected)
  document.querySelectorAll('.et button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()))
  document.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => cmd(b.dataset.c) })
  $('check').onclick = checklist
  $('szDn').onclick = () => size(-1)
  $('szUp').onclick = () => size(1)
  $('clear').onclick = () => { restore(); document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'div'); save() }
  $('fmt').onchange = e => { const v = e.target.value; e.target.value = ''; if (v) cmd('formatBlock', v) }

  $('ntitle').oninput = save
  $('ntitle').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('nbody').focus() } }

  const body = $('nbody')
  body.oninput = e => {
    const sel = getSelection(), n = sel.anchorNode
    // typing "- " at the start of a line starts a bullet list
    if (e && e.inputType === 'insertText' && n && n.nodeType === 3 && /^[-–]\s$/.test(n.textContent) &&
        !n.previousSibling && !n.nextSibling && !(n.parentNode.closest && n.parentNode.closest('li'))) {
      const rg = document.createRange()
      rg.selectNodeContents(n); sel.removeAllRanges(); sel.addRange(rg)
      document.execCommand('delete'); document.execCommand('insertUnorderedList')
    }
    save()
  }
  body.onkeydown = e => {
    const el = blockEl(), li = el && el.closest && el.closest('li')
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') { e.preventDefault(); document.execCommand('strikeThrough'); save() }
    if (e.key === 'Tab' && li) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); save() }
    if (e.key === 'Enter' && li && li.classList.contains('done')) {
      setTimeout(() => { const e2 = blockEl(), l2 = e2 && e2.closest('li'); if (l2) { l2.classList.remove('done'); save() } }, 0)
    }
  }
  // tick a checklist item by clicking its circle
  body.addEventListener('click', e => {
    const li = e.target.closest('li')
    if (li && li.parentElement.classList.contains('cl') && e.clientX - li.getBoundingClientRect().left < 30) {
      li.classList.toggle('done'); save()
    }
  })
  // paste as plain text so styles from other sites don't sneak in
  body.addEventListener('paste', e => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
  })
}

// ───────────── start
async function refresh() {
  if (!(await pullNotes())) return false
  if (curId && !notes[curId]) { curId = null; showEditor(false) }
  else if (curId) {
    const n = notes[curId], active = document.activeElement
    if (active !== $('nbody') && active !== $('ntitle') && (n.html !== $('nbody').innerHTML || n.title !== $('ntitle').value)) {
      $('ntitle').value = n.title; $('nbody').innerHTML = n.html
    }
  }
  renderList()
  return true
}

async function init() {
  mountNav('notes')
  onNotesStatus(t => { $('status').textContent = t })
  if (configured) {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { $('app').hidden = true; $('gate').hidden = false; return }
  }
  document.execCommand('defaultParagraphSeparator', false, 'div')
  bind(); renderList()
  const first = wide() && alive().sort((a, b) => b.updated.localeCompare(a.updated))[0]
  if (first) openNote(first.id)

  if (await refresh()) {
    $('status').textContent = 'Saved ✓'
    if (!curId && wide()) { const f = alive().sort((a, b) => b.updated.localeCompare(a.updated))[0]; if (f) openNote(f.id) }
  } else if (sb) {
    $('status').textContent = notesError ? 'Cloud sync failed: ' + notesError : 'Offline – saved on this device'
  }
}

window.addEventListener('online', refresh)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() })
window.addEventListener('beforeunload', () => { cleanupEmpty(curId); flushNotes() })
init()
