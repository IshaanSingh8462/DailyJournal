import { sb } from '../lib/supabase.js'
import { data, dirty, persist, touch, flush, TPL } from '../lib/store.js'
import { todayK, yestK, label, nextKey } from '../lib/dates.js'
import { $, toast, esc } from '../lib/ui.js'
import { dayTypeFor } from '../lib/plan.js'

const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#8a8a8e')

// little card showing which workout day it is (set up on the Workouts page)
function wkHTML(k) {
  const t = dayTypeFor(k)
  return t ? '<span class="badge wk" style="--c:' + safeColor(t.color) + '">' + esc(t.name) + '</span>' : ''
}

export function updateBadges() {
  document.querySelectorAll('details').forEach(d => {
    const sum = d.querySelector('summary')
    sum.querySelectorAll('.wk').forEach(x => x.remove())
    sum.querySelector('.del').insertAdjacentHTML('beforebegin', wkHTML(d.dataset.k))
  })
}

export function render(keepOpen) {
  const open = new Set([...document.querySelectorAll('details[open]')].map(d => d.dataset.k))
  const list = $('list')
  list.innerHTML = ''
  Object.keys(data).sort().forEach(k => {
    const det = document.createElement('details')
    det.dataset.k = k
    if (k === todayK) det.className = 'today'
    det.open = keepOpen ? open.has(k) : (k === todayK || k === yestK)

    const sum = document.createElement('summary')
    sum.innerHTML = '<span>' + label(k) + '</span>' + (k === todayK ? '<span class="badge">TODAY</span>' : '') + wkHTML(k)

    const del = document.createElement('button')
    del.className = 'del'
    del.textContent = 'delete'
    let armed = 0
    del.onclick = async e => {
      e.preventDefault(); e.stopPropagation()
      if (!armed) {
        armed = 1; del.textContent = 'click again to delete'; del.classList.add('sure')
        setTimeout(() => { armed = 0; del.textContent = 'delete'; del.classList.remove('sure') }, 3000)
        return
      }
      if (!navigator.onLine) return toast('Go online to delete')
      const { error } = await sb.from('entries').delete().eq('day', k)
      if (error) return toast('Delete failed – try again')
      delete data[k]; dirty.delete(k); persist(); render(true); toast('Deleted')
    }
    sum.appendChild(del)

    const ed = document.createElement('div')
    ed.className = 'ed'
    ed.contentEditable = 'true'
    ed.spellcheck = true
    ed.innerHTML = data[k]
    ed.oninput = e => {
      const sel = getSelection(), n = sel.anchorNode
      // typing "- " at the start of a line turns it into a bullet list
      if (e && e.inputType === 'insertText' && n && n.nodeType === 3 && /^[-–]\s$/.test(n.textContent) &&
          !n.previousSibling && !n.nextSibling && !(n.parentNode.closest && n.parentNode.closest('li'))) {
        const rg = document.createRange()
        rg.selectNodeContents(n); sel.removeAllRanges(); sel.addRange(rg)
        document.execCommand('delete'); document.execCommand('insertUnorderedList')
      }
      touch(k, ed.innerHTML)
    }
    ed.onfocus = () => { window.lastEd = ed }
    ed.onkeydown = e => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault(); document.execCommand('strikeThrough')
      }
      if (e.key === 'Tab') {
        e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent')
      }
    }
    det.append(sum, ed)
    list.appendChild(det)
  })

  // button at the very end: adds the day after the last one in the list
  const keys = Object.keys(data).sort()
  const next = keys.length ? nextKey(keys[keys.length - 1]) : todayK
  const btn = document.createElement('button')
  btn.className = 'next'
  btn.textContent = '+ Add ' + label(next)
  btn.onclick = () => addDay(next)
  list.appendChild(btn)
}

export function addDay(k) {
  if (data[k] == null) { data[k] = TPL; dirty.add(k); persist(); render(true); flush() }
  jump(k)
}

export function jump(k, b) {
  const d = document.querySelector('[data-k="' + k + '"]')
  if (d) { d.open = true; d.scrollIntoView({ behavior: b || 'smooth', block: 'start' }) }
}
