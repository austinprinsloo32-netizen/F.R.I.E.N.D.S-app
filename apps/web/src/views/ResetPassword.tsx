import { useState, type FormEvent } from 'react'
import { finishRecovery, saveNewPassword } from '../lib/recovery'
import { navigate } from '../lib/route'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password !== again) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    const message = await saveNewPassword(password)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    finishRecovery()
    navigate('dashboard')
  }

  return (
    <main className="auth">
      <section className="auth-panel" style={{ margin: '0 auto' }}>
        <form className="auth-card" onSubmit={submit}>
          <h2>Choose a new password</h2>
          <p className="muted">You will be logged in as soon as it is saved.</p>

          <label className="field">
            <span>New password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label className="field">
            <span>Type it again</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
          </label>

          {error && (
            <p className="form-note form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={busy}>
            {busy ? 'Please wait…' : 'Save new password'}
          </button>
        </form>
      </section>
    </main>
  )
}
