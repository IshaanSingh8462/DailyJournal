// Workout plan: day types, repeating schedule, exercises.
// Local-first (localStorage) with sync to the Supabase table `workout_plan`.
import { sb } from './supabase.js'
import { daysBetween } from './dates.js'

const KEY = 'workout-plan-v1'
const DKEY = 'workout-plan-dirty'

export const COLORS = ['#ff7a59', '#59a5ff', '#7ddc82', '#8a8a8e', '#c78bff', '#ffd166']

// types:     [{ id, name, color }]
// schedules: [{ from: 'YYYY-MM-DD', start: 'YYYY-MM-DD', pattern: [typeId, ...] }]  (newest "from" wins)
// exercises: [{ id, name, sets, reps, bodyPart, instructions, dayIds: [typeId], video: {path,name}|null }]
export const plan = { types: [], schedules: [], exercises: [] }

let dirty = false, rev = 0, timer
let status = () => {}
export const onStatus = fn => { status = fn }
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

function adopt(o) {
  plan.types = Array.isArray(o && o.types) ? o.types : []
  plan.schedules = (Array.isArray(o && o.schedules) ? o.schedules : []).slice().sort((a, b) => a.from.localeCompare(b.from))
  plan.exercises = Array.isArray(o && o.exercises) ? o.exercises : []
}
const hasContent = () => plan.types.length || plan.schedules.length || plan.exercises.length

try { adopt(JSON.parse(localStorage.getItem(KEY) || '{}')) } catch (e) {}
dirty = localStorage.getItem(DKEY) === '1'

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan))
    localStorage.setItem(DKEY, dirty ? '1' : '0')
  } catch (e) {}
}

export function savePlan() {
  rev++; dirty = true; persist()
  status('Saving…')
  clearTimeout(timer)
  timer = setTimeout(flushPlan, 600)
}

export async function flushPlan() {
  if (!sb || !dirty) return
  if (!navigator.onLine) { status('Offline – saved on this device'); return }
  const snap = rev
  const body = JSON.parse(JSON.stringify(plan))
  const { error } = await sb.from('workout_plan').upsert(
    { data: body, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) { console.error(error); status('Not synced – saved on this device'); return }
  if (snap === rev) { dirty = false; persist(); status('Saved ✓') }
  else timer = setTimeout(flushPlan, 300)
}

export async function pullPlan() {
  if (!sb || !navigator.onLine) return false
  const { data: row, error } = await sb.from('workout_plan').select('data').maybeSingle()
  if (error) { console.error(error); return false }
  if (row && row.data && !dirty) { adopt(row.data); persist() }
  else if (!row && hasContent()) { dirty = true; persist() }
  if (dirty) flushPlan()
  return true
}

// ---- lookups
export const typeById = id => plan.types.find(t => t.id === id) || null
export const latestSchedule = () => plan.schedules[plan.schedules.length - 1] || null

// s = { start, pattern } -> the type on date k (null if none)
export function typeForSchedule(s, k) {
  const n = s && s.pattern ? s.pattern.length : 0
  if (!n || !s.start) return null
  const pos = ((daysBetween(s.start, k) % n) + n) % n
  return typeById(s.pattern[pos])
}

export function dayTypeFor(k) {
  let s = null
  for (const x of plan.schedules) if (x.from <= k) s = x
  return typeForSchedule(s, k)
}
