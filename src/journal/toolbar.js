import { sb } from '../lib/supabase.js'
import { data, dirty, persist, flush } from '../lib/store.js'
import { todayK } from '../lib/dates.js'
import { $, toast } from '../lib/ui.js'
import { render, jump, addDay } from './entries.js'

// Remember the last selection inside an editor, so toolbar buttons still work
// when the browser moves focus to the button (common on touch devices).
let saved = null
document.addEventListener('selectionchange', () => {
  const sel = getSelection()
  if (!sel.rangeCount || !sel.anchorNode) return
  const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement
  const ed = el && el.closest && el.closest('.ed')
  if (ed) { saved = sel.getRangeAt(0).cloneRange(); window.lastEd = ed }
})

function restoreSelection() {
  const le = window.lastEd
  if (!le || !saved) return
  const sel = getSelection()
  if (document.activeElement !== le) le.focus({ preventScroll: true })
  if (!(sel.rangeCount && le.contains(sel.anchorNode))) {
    sel.removeAllRanges()
    sel.addRange(saved)
  }
}

function size(d) {
  const le = window.lastEd
  if (!le) return
  restoreSelection()
  const cur = parseInt(document.queryCommandValue('fontSize')) || 3
  document.execCommand('fontSize', false, Math.max(1, Math.min(7, cur + d)))
  le.dispatchEvent(new Event('input'))
}

export function setupToolbar() {
  // keep editor focus when clicking toolbar buttons
  document.querySelectorAll('.bar button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()))

  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    restoreSelection()
    document.execCommand(b.dataset.c)
    if (window.lastEd) window.lastEd.dispatchEvent(new Event('input'))
  })

  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    restoreSelection()
    const e = b.dataset.e, sel = getSelection(), le = window.lastEd
    if (le && sel.rangeCount && le.contains(sel.anchorNode)) document.execCommand('insertText', false, e)
    try { navigator.clipboard.writeText(e).then(() => toast('Copied ' + e), () => toast('Inserted ' + e)) }
    catch (x) { toast('Inserted ' + e) }
  })

  $('szDn').onclick = () => size(-1)
  $('szUp').onclick = () => size(1)
  $('goToday').onclick = () => jump(todayK)

  $('addDay').onclick = () => {
    const v = $('newDate').value
    if (!v) return toast('Pick a date first')
    addDay(v)
  }

  $('exp').onclick = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    a.download = 'daily-log-backup-' + todayK + '.json'
    a.click()
  }

  $('imp').onclick = () => $('file').click()
  $('file').onchange = e => {
    const f = e.target.files[0]
    if (!f) return
    f.text().then(t => {
      try {
        const o = JSON.parse(t)
        Object.keys(o).forEach(k => { data[k] = o[k]; dirty.add(k) })
        persist(); render(true); flush(); toast('Imported')
      } catch (x) { toast('Bad file') }
    })
  }

  $('out').onclick = async () => {
    if (dirty.size && !confirm('Some changes are not synced yet. Log out anyway?')) return
    await sb.auth.signOut()
    location.reload()
  }
}
