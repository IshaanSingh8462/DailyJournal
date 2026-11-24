// Goals side panel on the Journal page: scrollable list of months (or years), each with its own goals.
import { todayK } from '../lib/dates.js'
import { $ } from '../lib/ui.js'
import { goals, getGoals, setGoals, flushGoals, onGoalsStatus } from '../lib/goals.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const curY = +todayK.slice(0, 4)
const curM = +todayK.slice(5, 7)
const pad = n => String(n).padStart(2, '0')

let mode = 'month'                 // 'month' | 'year'
let extra = 0                      // years added at the end with the "+ Add" button
let openSet = new Set()
try { if (localStorage.getItem('goals-mode') === 'year') mode = 'year' } catch (e) {}

const curKey = () => mode === 'year' ? String(curY) : curY + '-' + pad(curM)

// every period shown, oldest first: all months of each year in range (or the years themselves)
function items() {
  const used = Object.keys(goals).filter(p => goals[p]).map(p => +p.slice(0, 4))
  const min = Math.min(curY, ...used)
  const max = Math.max(curY + (mode === 'year' ? 4 : 1), ...used) + extra
  const out = []
  for (let y = min; y <= max; y++) {
    if (mode === 'year') out.push([String(y), String(y)])
    else for (let m = 1; m <= 12; m++) out.push([y + '-' + pad(m), MONTHS[m - 1] + ' ' + y])
  }
  return out
}

const preview = t => (t.split('\n').map(l => l.replace(/^\s*[-–]\s*/, '').trim()).find(Boolean)) || ''

function fit(ta) {
  ta.style.height = 'auto'
  ta.style.height = Math.max(110, ta.scrollHeight + 2) + 'px'
}

// Enter on a "- " line starts the next "- " line; Enter on an empty one ends the list
function bulletEnter(e) {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
  const t = e.target, pos = t.selectionStart
  const ls = t.value.lastIndexOf('\n', pos - 1) + 1
  const line = t.value.slice(ls, pos)
  const m = /^(\s*[-–]\s)/.exec(line)
  if (!m) return
  e.preventDefault()
  if (/^\s*[-–]\s*$/.test(line)) t.setRangeText('', ls, pos, 'end')
  else t.setRangeText('\n' + m[1], pos, t.selectionEnd, 'end')
  t.dispatchEvent(new Event('input'))
}

function card([key, label]) {
  const det = document.createElement('details')
  det.dataset.p = key
  if (key === curKey()) det.className = 'now'
  det.open = openSet.has(key)

  const sum = document.createElement('summary')
  sum.innerHTML = '<span>' + label + '</span>' + (key === curKey() ? '<span class="badge td">NOW</span>' : '') + '<span class="pv"></span>'
  const pv = sum.querySelector('.pv')

  const ta = document.createElement('textarea')
  ta.value = getGoals(key)
  ta.placeholder = '- '
  ta.spellcheck = true
  pv.textContent = preview(ta.value)
  ta.oninput = () => { setGoals(key, ta.value); pv.textContent = preview(ta.value); fit(ta) }
  ta.onkeydown = bulletEnter

  det.ontoggle = () => { if (det.open) { openSet.add(key); fit(ta) } else openSet.delete(key) }
  det.append(sum, ta)
  return det
}

function render() {
  const list = $('gList')
  list.innerHTML = ''
  items().forEach(it => list.appendChild(card(it)))
  const last = items().pop()[0]
  const btn = document.createElement('button')
  btn.className = 'next'
  btn.textContent = '+ Add ' + (mode === 'year' ? (+last + 1) : (+last.slice(0, 4) + 1))
  btn.onclick = () => { extra++; render() }
  list.appendChild(btn)
  list.querySelectorAll('details[open] textarea').forEach(fit)
}

function scrollToNow() {
  const list = $('gList'), el = list.querySelector('[data-p="' + curKey() + '"]')
  if (el) list.scrollTop = el.offsetTop - 8
}

function setMode(m) {
  mode = m
  try { localStorage.setItem('goals-mode', m) } catch (e) {}
  openSet = new Set([curKey()])
  $('gMode').textContent = m === 'year' ? 'Year' : 'Month'
  render(); scrollToNow()
}

function setOpen(v) {
  $('goals').hidden = !v
  $('goalsBtn').classList.toggle('on', v)
  $('goalsBtn').setAttribute('aria-pressed', v)
  try { localStorage.setItem('goals-open', v ? '1' : '0') } catch (e) {}
  if (v) { setMode(mode) } else flushGoals()
}

// called after goals are pulled from Supabase
export function updateGoals() {
  if ($('goals').hidden) return
  const a = document.activeElement
  if (a && a.closest && a.closest('#gList')) {
    $('gList').querySelectorAll('details').forEach(d => {
      const ta = d.querySelector('textarea')
      if (ta !== a && ta.value !== getGoals(d.dataset.p)) { ta.value = getGoals(d.dataset.p); fit(ta) }
    })
  } else {
    const top = $('gList').scrollTop
    render(); $('gList').scrollTop = top
  }
}

export function setupGoals() {
  onGoalsStatus(t => { $('gStatus').textContent = t })

  // keep the side panel just under the (sticky) top bar
  const top = $('top')
  const setH = () => document.documentElement.style.setProperty('--topH', top.offsetHeight + 'px')
  setH()
  if (window.ResizeObserver) new ResizeObserver(setH).observe(top)
  window.addEventListener('resize', setH)

  $('goalsBtn').onclick = () => setOpen($('goals').hidden)
  $('gClose').onclick = () => setOpen(false)
  // both arrows flip between Month and Year
  const flip = () => setMode(mode === 'month' ? 'year' : 'month')
  $('gPrev').onclick = flip
  $('gNext').onclick = flip

  window.addEventListener('beforeunload', flushGoals)

  $('gMode').textContent = mode === 'year' ? 'Year' : 'Month'
  let wasOpen = false
  try { wasOpen = localStorage.getItem('goals-open') === '1' } catch (e) {}
  if (wasOpen) setOpen(true)
}
