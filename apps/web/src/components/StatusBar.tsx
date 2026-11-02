import { useMemo, useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import { initialsOf, shortTime } from '../lib/utils'
import {
  STATUS_OPTIONS,
  STATUS_TEXT_MAX,
  statusLine,
  statusOption,
  type StatusKind,
} from '../lib/feed'
import Avatar from './Avatar'
import SafetyActions from './SafetyActions'

/** "Friends right now": a row of friends' 24-hour statuses, plus your own. */
export default function StatusBar() {
  const { me, user, friends, myStatus, statusOf, setMyStatus, clearMyStatus, notify, feedError } =
    useApp()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<StatusKind>('free')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const active = useMemo(
    () =>
      friends
        .flatMap((member) => {
          const status = statusOf(member.id)
          return status ? [{ member, status }] : []
        })
        .sort((a, b) => Date.parse(b.status.updated_at) - Date.parse(a.status.updated_at)),
    [friends, statusOf],
  )

  if (feedError === 'setup') return null

  const myName = me.displayName.trim() || 'You'
  const myId = user?.id ?? 'me'

  const viewing = active.find((item) => item.member.id === viewingId)

  function toggleView(id: string) {
    setOpen(false)
    setViewingId((current) => (current === id ? null : id))
  }

  function openEditor() {
    setViewingId(null)
    setKind(myStatus?.kind ?? 'free')
    setText(myStatus?.text ?? '')
    setOpen(true)
  }

  async function save() {
    if (busy) return
    setBusy(true)
    const error = await setMyStatus(kind, text)
    setBusy(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setOpen(false)
    notify('Status shared with your friends for 24 hours.', 'success')
  }

  async function clear() {
    if (busy) return
    setBusy(true)
    const error = await clearMyStatus()
    setBusy(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setOpen(false)
    notify('Status cleared.', 'info')
  }

  return (
    <section className="panel status-panel" aria-label="Friends right now">
      <header className="panel-head">
        <h3>Friends right now</h3>
        <button type="button" className="link-btn" onClick={open ? () => setOpen(false) : openEditor}>
          {open ? 'Close' : myStatus ? 'Update my status' : 'Set my status'}
        </button>
      </header>

      <ul className="status-row">
        <li>
          <button type="button" className="status-item" onClick={openEditor}>
            <span className="status-ring" data-kind={myStatus?.kind ?? 'none'}>
              <Avatar id={myId} name={myName} initials={initialsOf(myName)} src={me.avatarUrl || undefined} size={56} />
            </span>
            <strong>You</strong>
            <small>{myStatus ? statusLine(myStatus) : 'Add status'}</small>
          </button>
        </li>
        {active.map(({ member, status }) => (
          <li key={member.id}>
            <button
              type="button"
              className="status-item"
              aria-pressed={viewingId === member.id}
              onClick={() => toggleView(member.id)}
              title={`${member.name}: ${statusLine(status)}`}
            >
              <span className="status-ring" data-kind={status.kind}>
                <Avatar id={member.id} name={member.name} initials={member.initials} src={member.avatarUrl} size={56} />
              </span>
              <strong>{member.name.split(/\s+/)[0]}</strong>
              <small>
                {statusOption(status.kind).emoji} {statusLine(status)}
              </small>
            </button>
          </li>
        ))}
      </ul>

      {viewing && (
        <div className="status-detail" role="region" aria-label={`${viewing.member.name}'s status`}>
          <Avatar
            id={viewing.member.id}
            name={viewing.member.name}
            initials={viewing.member.initials}
            src={viewing.member.avatarUrl}
            size={48}
          />
          <div className="status-detail-main">
            <strong>{viewing.member.name}</strong>
            <span className="status-detail-kind" data-kind={viewing.status.kind}>
              {statusOption(viewing.status.kind).emoji} {statusOption(viewing.status.kind).label}
            </span>
            {viewing.status.text.trim() && <p>{viewing.status.text}</p>}
            <small className="muted">Updated {shortTime(viewing.status.updated_at)} · lasts 24 hours</small>
          </div>
          <div className="status-detail-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => navigate(`messages/${viewing.member.id}`)}
            >
              Message {viewing.member.name.split(/\s+/)[0]}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setViewingId(null)}>
              Close
            </button>
            <SafetyActions member={viewing.member} onDone={() => setViewingId(null)} />
          </div>
        </div>
      )}

      {active.length === 0 && !open && (
        <p className="muted panel-empty">
          {friends.length === 0
            ? 'Once you have friends, you’ll see what they’re up to here.'
            : 'None of your friends have a status right now. Set yours to get things started.'}
        </p>
      )}

      {open && (
        <div className="status-editor">
          <div className="chips" role="radiogroup" aria-label="Status">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={kind === option.kind}
                className={`chip chip-btn ${kind === option.kind ? 'chip-on' : ''}`}
                onClick={() => setKind(option.kind)}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Add a few words (optional)</span>
            <input
              value={text}
              maxLength={STATUS_TEXT_MAX}
              placeholder={statusOption(kind).hint}
              onChange={(event) => setText(event.target.value)}
            />
            <small>
              {text.length}/{STATUS_TEXT_MAX} · Visible to your friends for 24 hours
            </small>
          </label>
          <div className="status-actions">
            <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void save()}>
              Share status
            </button>
            {myStatus && (
              <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void clear()}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
