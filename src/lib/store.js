import { sb } from './supabase.js'
import { todayK, yestK } from './dates.js'
import { setStatus } from './ui.js'

const KEY = 'daily-log-v1'
const DKEY = 'daily-log-dirty'

export const TPL = '<div><b>Tdy:</b></div><ul><li><br></li></ul><div><br></div><div><b>Tmr:</b></div><ul><li><br></li></ul><div><br></div>'

// data: { 'YYYY-MM-DD': html }   dirty: days not yet synced to Supabase
export const data = {}
export const dirty = new Set()
export const state = { pulled: false }
let timer

try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch (e) {}
try { JSON.parse(localStorage.getItem(DKEY) || '[]').forEach(k => dirty.add(k)) } catch (e) {}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    localStorage.setItem(DKEY, JSON.stringify([...dirty]))
  } catch (e) {}
}

export function touch(k, html) {
  data[k] = html
  dirty.add(k)
  persist()
  setStatus('Editing…')
  clearTimeout(timer)
  timer = setTimeout(flush, 700)
}

export function cancelPendingFlush() { clearTimeout(timer) }

export async function flush() {
  if (!sb) return
  const ks = [...dirty].filter(k => data[k] != null)
  if (!ks.length) { setStatus('Saved ✓'); return }
  if (!navigator.onLine) { setStatus('Offline – saved on this device'); return }
  setStatus('Saving…')
  const snap = ks.map(k => [k, data[k]])
  const { error } = await sb.from('entries').upsert(
    snap.map(([day, content]) => ({ day, content, updated_at: new Date().toISOString() })),
    { onConflict: 'user_id,day' }
  )
  if (error) { setStatus('Not synced – saved on this device'); console.error(error); return }
  snap.forEach(([k, c]) => { if (data[k] === c) dirty.delete(k) })
  persist()
  setStatus(dirty.size ? 'Saving…' : 'Saved ✓')
  if (dirty.size) timer = setTimeout(flush, 700)
}

export async function pull() {
  const { data: rows, error } = await sb.from('entries').select('day,content').limit(5000)
  if (error) { console.error(error); return false }
  const remote = new Set()
  rows.forEach(r => { remote.add(r.day); if (!dirty.has(r.day)) data[r.day] = r.content })
  Object.keys(data).forEach(k => { if (!remote.has(k)) dirty.add(k) }) // local-only days get uploaded, never dropped
  persist()
  return true
}

export function ensureTemplates() {
  [todayK, yestK].forEach(k => { if (data[k] == null) { data[k] = TPL; dirty.add(k) } })
  persist()
}
