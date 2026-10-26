export const $ = id => document.getElementById(id)

export const setStatus = t => { $('status').textContent = t }

export function toast(t) {
  const el = $('toast')
  el.textContent = t
  el.classList.add('on')
  setTimeout(() => el.classList.remove('on'), 1600)
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
