import { useState, type FormEvent } from 'react'
import { useApp } from '../state/context'
import Icon, { type IconName } from '../components/Icon'

const promises: { icon: IconName; title: string; text: string }[] = [
  { icon: 'compass', title: 'Meet people who fit', text: 'Discover members through shared interests, not follower counts.' },
  { icon: 'message', title: 'Start real conversations', text: 'Introduce yourself, then chat privately with the people you connect with.' },
  { icon: 'shield', title: 'On your terms', text: 'You choose who you connect with, at your own pace.' },
]

export default function AuthScreen() {
  const { signIn, signUp } = useApp()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setInfo('')

    if (mode === 'login') {
      const message = await signIn(email, password)
      if (message) setError(message)
    } else {
      const result = await signUp(email, password)
      if (result.error) setError(result.error)
      else if (result.needsConfirmation) {
        setInfo('Account created. Check your email for a confirmation link, then log in.')
        setPassword('')
      }
    }
    setBusy(false)
  }

  return (
    <main className="auth">
      <section className="auth-hero">
        <div className="brand brand-light">
          <span className="brand-mark">f.</span>
          <span>F.R.I.E.N.D.S</span>
        </div>

        <div className="auth-hero-copy">
          <p className="eyebrow">Friendship first</p>
          <h1>
            Find your people.
            <br />
            <em>Keep them.</em>
          </h1>
          <p className="lead">
            A friendship-first community for adults who want to meet people, find belonging and turn
            shared interests into shared experiences.
          </p>
        </div>

        <ul className="promises">
          {promises.map((p) => (
            <li key={p.title}>
              <span className="promise-icon">
                <Icon name={p.icon} size={18} />
              </span>
              <span>
                <strong>{p.title}</strong>
                <small>{p.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            {mode === 'signup'
              ? 'It takes a minute. You can finish your profile afterwards.'
              : 'Log in to pick up your conversations.'}
          </p>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          {error && (
            <p className="form-note form-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="form-note form-info" role="status">
              {info}
            </p>
          )}

          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>

          <p className="auth-switch">
            {mode === 'signup' ? 'Already a member?' : 'New to F.R.I.E.N.D.S?'}{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup')
                setError('')
                setInfo('')
              }}
            >
              {mode === 'signup' ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}
