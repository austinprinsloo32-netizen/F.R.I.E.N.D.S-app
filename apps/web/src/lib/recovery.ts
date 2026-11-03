import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * Password reset: the email link signs the person in briefly and Supabase announces PASSWORD_RECOVERY.
 * We remember that here so the app can show "Choose a new password" instead of the normal screens.
 */
let recovering =
  typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)
const listeners = new Set<() => void>()

function set(next: boolean) {
  if (recovering === next) return
  recovering = next
  listeners.forEach((l) => l())
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') set(true)
  if (event === 'SIGNED_OUT') set(false)
})

export function finishRecovery() {
  set(false)
}

export function useRecovering(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => recovering,
    () => false,
  )
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  const clean = email.trim()
  if (!clean) return 'Type your email address first.'
  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: `${window.location.origin}/`,
  })
  if (error) {
    return /rate limit/i.test(error.message)
      ? 'Too many emails were sent just now. Please wait a little and try again.'
      : error.message
  }
  return null
}

export async function saveNewPassword(password: string): Promise<string | null> {
  if (password.length < 6) return 'Use at least 6 characters.'
  const { error } = await supabase.auth.updateUser({ password })
  return error ? error.message : null
}
