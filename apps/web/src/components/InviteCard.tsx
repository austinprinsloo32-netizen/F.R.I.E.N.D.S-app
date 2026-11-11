import { useApp } from '../state/context'
import Icon from './Icon'

const INVITE_MESSAGE =
  'Join me on F.R.I.E.N.D.S, a friendship-first app for meeting people through shared interests and making simple plans.'

/** Share a clean app link, or copy it to send in any chat. */
export default function InviteCard() {
  const { notify } = useApp()
  const url = `${window.location.origin}${window.location.pathname}`

  async function shareInvite() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'F.R.I.E.N.D.S', text: INVITE_MESSAGE, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(`${INVITE_MESSAGE} ${url}`)
      notify('Invite message copied. Paste it into a chat.', 'success')
    } catch {
      notify(`Share this invite link: ${url}`, 'info')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      notify('Invite link copied. Send it to a friend.', 'success')
    } catch {
      notify(`Share this invite link: ${url}`, 'info')
    }
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h3>Invite a friend</h3>
      </header>
      <p className="muted panel-empty">
        F.R.I.E.N.D.S is better when people you know are here. Share the link with someone you’d like to connect with.
      </p>
      <div className="invite-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => void shareInvite()}>
          <Icon name="send" size={15} /> Share invite
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyLink()}>
          <Icon name="link" size={15} /> Copy link
        </button>
      </div>
    </section>
  )
}
