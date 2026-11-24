// "Goals" pop-up on the Journal page: edit goals for a month or a year.
import { pad, todayK } from '../lib/dates.js'
import { $, toast } from '../lib/ui.js'
import { getGoals, setGoals, flushGoals, pullGoals, onGoalsStatus, goalsError } from '../lib/goals.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

let mode = 'month'                       // 'month' | 'year'
let year = +todayK.slice(0, 4)
let month = +todayK.slice(5, 7)          // 1-12
let opened = false

const period = () => mode === 'year' ? String(year) : year + '-' + pad(month)

function titleText() {
  return mode === 'year' ? String(year) : MONTHS[month - 1] + ' ' + year
}

function load() {
  $('gTitle').textContent = titleText()
  $('gTabMonth').classList.toggle('on', mode === 'month')
  $('gTabYear').classList.toggle('on', mode === 'year')
  $('gText').value = getGoals(period())
  $('gText').placeholder = mode === 'year' ? 'Goals for the year…\n- ' : 'Goals for the month…\n- '
}

function step(d) {
  if (mode === 'year') year += d
  else {
    month += d
    if (month < 1) { month = 12; year-- }
    if (month > 12) { month = 1; year++ }
  }
  load()
}

export function openGoals() {
  $('goals').hidden = false
  document.body.classList.add('modal-open')
  load()
  $('gText').focus()
  if (!opened) {
    opened = true
    pullGoals().then(ok => { if (ok && !$('goals').hidden && document.activeElement !== $('gText')) load() })
  }
}

export function closeGoals() {
  $('goals').hidden = true
  document.body.classList.remove('modal-open')
  flushGoals()
}

export function setupGoals() {
  onGoalsStatus(t => { $('gStatus').textContent = t })

  $('goalsBtn').onclick = openGoals
  $('gClose').onclick = closeGoals
  $('goals').addEventListener('mousedown', e => { if (e.target === $('goals')) closeGoals() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('goals').hidden) closeGoals() })

  $('gTabMonth').onclick = () => { mode = 'month'; load() }
  $('gTabYear').onclick = () => { mode = 'year'; load() }
  $('gPrev').onclick = () => step(-1)
  $('gNext').onclick = () => step(1)
  $('gNow').onclick = () => { year = +todayK.slice(0, 4); month = +todayK.slice(5, 7); load() }

  $('gText').oninput = () => setGoals(period(), $('gText').value)
  $('gText').onkeydown = e => {
    // Enter on a "- " line starts the next "- " line
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
    const t = e.target, pos = t.selectionStart
    const lineStart = t.value.lastIndexOf('\n', pos - 1) + 1
    const line = t.value.slice(lineStart, pos)
    const m = /^(\s*[-–]\s)/.exec(line)
    if (!m) return
    e.preventDefault()
    if (line.trim() === '-' || line.trim() === '–') {
      // empty bullet: drop it and end the list
      t.setRangeText('', lineStart, pos, 'end')
    } else {
      t.setRangeText('\n' + m[1], pos, t.selectionEnd, 'end')
    }
    t.dispatchEvent(new Event('input'))
  }

  window.addEventListener('beforeunload', flushGoals)
  if (goalsError) toast(goalsError)
}
