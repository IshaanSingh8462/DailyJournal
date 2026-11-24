// Top bar: page tabs always visible; formatting row appears while typing; Settings pop-up.
import { $ } from '../lib/ui.js'

export function openSettings() { $('settings').hidden = false; document.body.classList.add('modal-open') }
export function closeSettings() { $('settings').hidden = true; document.body.classList.remove('modal-open') }

export function setupTopbar() {
  const fmt = $('fmt')

  // formatting + emoji row: shows once you type in an entry, hides when you leave the editors
  document.addEventListener('input', e => {
    if (e.target.closest && e.target.closest('.ed')) fmt.hidden = false
  })
  document.addEventListener('focusout', () => setTimeout(() => {
    const a = document.activeElement
    if (!(a && a.closest && (a.closest('.ed') || a.closest('#fmt')))) fmt.hidden = true
  }, 0))

  $('setBtn').onclick = openSettings
  $('sClose').onclick = closeSettings
  $('settings').addEventListener('mousedown', e => { if (e.target === $('settings')) closeSettings() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('settings').hidden) closeSettings() })
}
