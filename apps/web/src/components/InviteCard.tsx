import { useApp } from '../state/context'
import Icon from './Icon'

/** "Invite someone": shares or copies a ready-made message with the app's link. */
export default function InviteCard() {
  const { notify } = useApp()

  async function invite() {
    const url = `${window.location.origin}${window.location.pathname}`
    const text = `Join me on F.R.I.E.N.D.S, a friendship-first app for making real friends through shared interests and small meet-ups: ${url}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'F.R.I.E.N.D.S', text })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('Invite message copied. Paste it into a chat.', 'success')
    } catch {
      notify(`Copy this link and send it: ${url}`, 'info')
    }
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h3>Invite someone</h3>
      </header>
      <p className="muted panel-empty">
        F.R.I.E.N.D.S works best when people you already know are here. Invite one friend today.
      </p>
      <div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => void invite()}>
          <Icon name="send" size={15} /> Share an invite
        </button>
      </div>
    </section>
  )
}
