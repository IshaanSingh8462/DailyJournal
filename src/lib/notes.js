// Notes store: local-first (localStorage) with sync to the Supabase table `notes`.
import { sb } from './supabase.js'

const KEY = 'notes-v1'
const DKEY = 'notes-dirty'

// id -> { id, title, html, pinned, created, updated, deleted? }
export const notes = {}
export const dirty = new Set()
export let notesError = ''
const rev = {}
let timer
let status = () => {}
export const onNotesStatus = fn => { status = fn }

try { Object.assign(notes, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch (e) {}
try { JSON.parse(localStorage.getItem(DKEY) || '[]').forEach(id => dirty.add(id)) } catch (e) {}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes))
    localStorage.setItem(DKEY, JSON.stringify([...dirty]))
  } catch (e) {}
}

function describe(e) {
  const m = (e && e.message) || String(e)
  if ((e && (e.code === 'PGRST205' || e.code === '42P01')) || /does not exist|schema cache|not find the table/i.test(m))
    return 'table notes not found – run supabase/notes.sql in the Supabase SQL Editor'
  if ((e && e.code === '42501') || /permission denied|row-level security/i.test(m))
    return 'permission denied – re-run supabase/notes.sql (it includes the access grants)'
  return m
}

function mark(id) {
  rev[id] = (rev[id] || 0) + 1
  dirty.add(id); persist()
  status('Saving…')
  clearTimeout(timer)
  timer = setTimeout(flushNotes, 700)
}

export function createNote() {
  const t = new Date().toISOString()
  const n = { id: crypto.randomUUID(), title: '', html: '', pinned: false, created: t, updated: t }
  notes[n.id] = n
  mark(n.id)
  return n
}

// bump = false keeps the "last edited" time (used for pinning)
export function updateNote(id, patch, bump = true) {
  if (!notes[id]) return
  Object.assign(notes[id], patch)
  if (bump) notes[id].updated = new Date().toISOString()
  mark(id)
}

export function removeNote(id) {
  if (!notes[id]) return
  notes[id].deleted = true
  mark(id)
}

const toRow = n => ({ id: n.id, title: n.title, content: n.html, pinned: n.pinned, created_at: n.created, updated_at: n.updated })

export async function flushNotes() {
  if (!sb || !dirty.size) return
  if (!navigator.onLine) { status('Offline – saved on this device'); return }
  const ids = [...dirty]
  const snap = Object.fromEntries(ids.map(id => [id, rev[id] || 0]))
  const up = ids.map(id => notes[id]).filter(n => n && !n.deleted)
  const del = ids.filter(id => notes[id] && notes[id].deleted)
  status('Saving…')
  let err = null
  if (up.length) err = (await sb.from('notes').upsert(up.map(toRow), { onConflict: 'id' })).error
  if (!err && del.length) err = (await sb.from('notes').delete().in('id', del)).error
  if (err) { console.error(err); notesError = describe(err); status('Not synced: ' + notesError); return }
  notesError = ''
  ids.forEach(id => {
    if ((rev[id] || 0) !== snap[id]) return
    dirty.delete(id)
    if (notes[id] && notes[id].deleted) delete notes[id]
  })
  persist()
  status(dirty.size ? 'Saving…' : 'Saved ✓')
  if (dirty.size) timer = setTimeout(flushNotes, 300)
}

export async function pullNotes() {
  if (!sb || !navigator.onLine) return false
  const { data: rows, error } = await sb.from('notes').select('id,title,content,pinned,created_at,updated_at').limit(5000)
  if (error) { console.error(error); notesError = describe(error); return false }
  notesError = ''
  const remote = new Set()
  rows.forEach(r => {
    remote.add(r.id)
    if (!dirty.has(r.id)) notes[r.id] = { id: r.id, title: r.title, html: r.content, pinned: r.pinned, created: r.created_at, updated: r.updated_at }
  })
  // not on the server and not waiting to upload = deleted on another device
  Object.keys(notes).forEach(id => { if (!remote.has(id) && !dirty.has(id)) delete notes[id] })
  persist()
  if (dirty.size) flushNotes()
  return true
}
