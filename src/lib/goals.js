// Goals store: local-first (localStorage) with sync to the Supabase table `goals`.
// goals: { 'YYYY': text, 'YYYY-MM': text }
import { sb } from './supabase.js'

const KEY = 'goals-v1'
const DKEY = 'goals-dirty'

export const goals = {}
export const dirty = new Set()
export let goalsError = ''
const rev = {}
let timer
let status = () => {}
export const onGoalsStatus = fn => { status = fn }

try { Object.assign(goals, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch (e) {}
try { JSON.parse(localStorage.getItem(DKEY) || '[]').forEach(p => dirty.add(p)) } catch (e) {}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(goals))
    localStorage.setItem(DKEY, JSON.stringify([...dirty]))
  } catch (e) {}
}

function describe(e) {
  const m = (e && e.message) || String(e)
  if ((e && (e.code === 'PGRST205' || e.code === '42P01')) || /does not exist|schema cache|not find the table/i.test(m))
    return 'table goals not found – run supabase/goals.sql in the Supabase SQL Editor'
  if ((e && e.code === '42501') || /permission denied|row-level security/i.test(m))
    return 'permission denied – re-run supabase/goals.sql (it includes the access grants)'
  return m
}

export const getGoals = period => goals[period] || ''

export function setGoals(period, text) {
  goals[period] = text
  rev[period] = (rev[period] || 0) + 1
  dirty.add(period); persist()
  status('Saving…')
  clearTimeout(timer)
  timer = setTimeout(flushGoals, 700)
}

export async function flushGoals() {
  clearTimeout(timer)
  if (!sb || !dirty.size) return
  if (!navigator.onLine) { status('Offline – saved on this device'); return }
  const ps = [...dirty]
  const snap = Object.fromEntries(ps.map(p => [p, rev[p] || 0]))
  status('Saving…')
  const { error } = await sb.from('goals').upsert(
    ps.map(period => ({ period, content: goals[period] || '', updated_at: new Date().toISOString() })),
    { onConflict: 'user_id,period' }
  )
  if (error) { console.error(error); goalsError = describe(error); status('Not synced: ' + goalsError); return }
  goalsError = ''
  ps.forEach(p => { if ((rev[p] || 0) === snap[p]) dirty.delete(p) })
  persist()
  status(dirty.size ? 'Saving…' : 'Saved ✓')
  if (dirty.size) timer = setTimeout(flushGoals, 300)
}

export async function pullGoals() {
  if (!sb || !navigator.onLine) return false
  const { data: rows, error } = await sb.from('goals').select('period,content').limit(1000)
  if (error) { console.error(error); goalsError = describe(error); return false }
  goalsError = ''
  rows.forEach(r => { if (!dirty.has(r.period)) goals[r.period] = r.content })
  persist()
  if (dirty.size) flushGoals()
  return true
}
