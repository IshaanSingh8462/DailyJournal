import { sb } from '../lib/supabase.js'
import { $ } from '../lib/ui.js'

export function showLogin(m) {
  $('app').hidden = true
  $('login').hidden = false
  $('msg').textContent = m || ''
}

export function setupLogin(onSuccess) {
  async function login() {
    $('msg').textContent = ''
    const { error } = await sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value })
    if (error) $('msg').textContent = error.message
    else onSuccess()
  }
  $('go').onclick = login
  $('pw').onkeydown = e => { if (e.key === 'Enter') login() }
}
