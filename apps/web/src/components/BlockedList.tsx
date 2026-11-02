import { useState } from 'react'
import { useApp } from '../state/context'
import Avatar from './Avatar'

/** "Blocked people" panel for the profile page, with Unblock. */
export default function BlockedList() {
  const { blockedIds, memberById, unblockMember, notify } = useApp()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function unblock(id: string, name: string) {
    if (busyId) return
    setBusyId(id)
    const error = await unblockMember(id)
    setBusyId(null)
    notify(
      error ?? `${name} is unblocked. You’ll need to send a new friend request if you want to reconnect.`,
      error ? 'error' : 'success',
    )
  }

  return (
    <section className="card blocked-card">
      <h3>Blocked people</h3>
      {blockedIds.length === 0 ? (
        <p className="muted">You haven’t blocked anyone.</p>
      ) : (
        <ul className="mini-list">
          {blockedIds.map((id) => {
            const member = memberById(id)
            const name = member?.name ?? 'Member'
            return (
              <li key={id} className="mini-row">
                <Avatar id={id} name={name} initials={member?.initials ?? '?'} src={member?.avatarUrl} size={40} />
                <span className="mini-main">
                  <strong>{name}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={busyId === id}
                  onClick={() => void unblock(id, name)}
                >
                  Unblock
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
