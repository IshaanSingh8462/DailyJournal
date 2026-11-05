const LINKS = [
  ['journal', 'Journal', '/'],
  ['notes', 'Notes', '/pages/notes.html'],
  ['workouts', 'Workouts', '/pages/workouts.html'],
  ['routine', 'Routine', '/pages/routine.html']
]

// fills <nav id="nav" class="nav"> with the site-wide page switcher
export function mountNav(current) {
  const el = document.getElementById('nav')
  if (!el) return
  el.innerHTML = LINKS.map(([k, t, h]) =>
    `<a href="${h}"${k === current ? ' class="on" aria-current="page"' : ''}>${t}</a>`).join('')
}
