import '../styles/base.css'
import '../styles/routine.css'

import { sb, configured } from '../lib/supabase.js'
import { mountNav } from '../lib/nav.js'
import { $, esc } from '../lib/ui.js'
import { todayK, addDays, daysBetween, shortDate } from '../lib/dates.js'
import { plan, savePlan, pullPlan, onStatus, dayTypeFor } from '../lib/plan.js'
import { SCHEDULE, POSTURE, HYGIENE, FOOD } from '../data/routine.js'

const TABS = ['Schedule', 'Posture', 'Hygiene', 'Food']
let tab = TABS.find(t => t.toLowerCase() === location.hash.slice(1)) || 'Schedule'

const hex = c => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#8e8e93')
const todayType = () => dayTypeFor(todayK)
const isRest = () => /rest/i.test((todayType() || {}).name || '')

function head() {
  const t = todayType()
  $('head').innerHTML = '<h1>Routine</h1>' + (t
    ? `<a class="badge wk" style="--c:${hex(t.color)}" href="/pages/workouts.html">Today · ${esc(t.name)}</a>` : '')
}

function tabs() {
  $('seg').innerHTML = TABS.map(t => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${t}</button>`).join('')
}

// ── Schedule
function schedule() {
  const t = todayType(), rest = isRest()
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes()
  const all = SCHEDULE.flatMap(g => g.items)
  let active = -1
  all.forEach((it, i) => { if (it.at <= m && m < 1350) active = i })
  let i = 0
  return SCHEDULE.map(g => `<div class="cap">${esc(g.name)}</div><div class="grp">` + g.items.map(it => {
    let what = it.what, note = it.note || ''
    if (it.lift) {
      if (rest) { what = 'Rest day'; note = 'Do Posture Block B instead of lifting.' }
      else if (t) what = 'Lift · ' + t.name
    }
    const on = i++ === active
    return `<div class="r${on ? ' now' : ''}"><span class="t">${esc(it.time)}</span>
      <span class="x">${esc(what)}${note ? `<span class="s">${esc(note)}</span>` : ''}</span>${on ? '<span class="p ac">Now</span>' : ''}</div>`
  }).join('') + '</div>').join('')
}

// ── Posture
function posture() {
  const tn = (todayType() || {}).name || ''
  const hint = b => b.id !== 'B' ? '' : isRest() ? 'Rest day today: do Block B.' : /pull/i.test(tn) ? 'Pull day today: use it as a warm-up or finisher.' : ''
  return `<p class="lead">${esc(POSTURE.intro)}</p>` + POSTURE.blocks.map(b => `
    <div class="cap">${esc(b.title)} <span class="sub">· ${esc(b.sub)}</span>${b.tag ? `<span class="tag">${esc(b.tag)}</span>` : ''}</div>
    ${hint(b) ? `<div class="hint ac">${esc(hint(b))}</div>` : ''}
    <div class="grp">${b.items.map(x => `<div class="r"><span class="x">${esc(x[0])}</span><span class="p">${esc(x[1])}</span></div>`).join('')}</div>`).join('')
}

// ── Hygiene (ticks live in plan.checks: item id -> date last done)
function isDone(it, period) {
  const last = plan.checks[it.id]
  if (!last) return false
  return period === 1 ? last === todayK : daysBetween(last, todayK) < period
}

function hygiene() {
  const groups = HYGIENE.groups.map(g => {
    const n = g.items.filter(it => isDone(it, g.period)).length
    return `<div class="cap">${esc(g.name)} <span class="sub">· ${n} of ${g.items.length}</span></div><div class="grp">` + g.items.map(it => {
      const d = isDone(it, g.period), last = plan.checks[it.id]
      let sub = it.sub || ''
      if (g.period > 1 && last) sub = (sub ? sub + ' · ' : '') + (d ? 'Next due ' + shortDate(addDays(last, g.period)) : 'Last done ' + shortDate(last))
      return `<div class="r tap" data-id="${it.id}"><span class="ck${d ? ' on' : ''}">✓</span>
        <span class="x">${esc(it.text)}${sub ? `<span class="s">${esc(sub)}</span>` : ''}</span></div>`
    }).join('') + '</div>'
  }).join('')
  const notes = '<div class="cap">Notes</div><div class="grp">' + HYGIENE.notes.map(n =>
    `<details class="note"><summary>${esc(n.title)}</summary><p>${esc(n.body)}</p></details>`).join('') + '</div>'
  return groups + notes
}

// ── Food
function food() {
  const meals = FOOD.meals.map(m => `<div class="cap">${esc(m.name)}${m.note ? ` <span class="sub">· ${esc(m.note)}</span>` : ''}</div>
    <div class="grp">${m.ideas.map(x => `<div class="r"><span class="x">${esc(x)}</span></div>`).join('')}</div>`).join('')
  const swaps = '<div class="cap">Swaps for your junk food habit</div><div class="grp">' + FOOD.swaps.map(s =>
    `<div class="r"><span class="x">${esc(s[0])}${s[1] ? ` <span class="sub" style="color:var(--mut)">(${esc(s[1].toLowerCase())})</span>` : ''}<span class="s">${esc(s[2])}</span></span></div>`).join('') + '</div>'
  return `<p class="lead">${esc(FOOD.intro)}</p>` + meals + swaps + `<div class="tip"><b>Also helpful</b><br>${esc(FOOD.tip)}</div>`
}

function renderBody() {
  $('body').innerHTML = { Schedule: schedule, Posture: posture, Hygiene: hygiene, Food: food }[tab]()
}
function renderAll() { head(); tabs(); renderBody() }

$('seg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return
  tab = b.dataset.t
  history.replaceState(null, '', '#' + tab.toLowerCase())
  tabs(); renderBody()
})
$('body').addEventListener('click', e => {
  const row = e.target.closest('.r.tap'); if (!row) return
  const id = row.dataset.id
  if (plan.checks[id] && isDone({ id }, HYGIENE.groups.find(g => g.items.some(i => i.id === id)).period)) delete plan.checks[id]
  else plan.checks[id] = todayK
  savePlan(); renderBody()
})
window.addEventListener('hashchange', () => {
  const t = TABS.find(x => x.toLowerCase() === location.hash.slice(1))
  if (t) { tab = t; tabs(); renderBody() }
})
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') renderBody() })

async function init() {
  mountNav('routine')
  onStatus(t => { $('status').textContent = t })
  renderAll()
  if (configured) {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { $('status').textContent = 'Log in on the journal to sync'; return }
  }
  if (await pullPlan()) { renderAll(); $('status').textContent = '' }
}
init()
