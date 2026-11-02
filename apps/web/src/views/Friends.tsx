import { useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import type { Member } from '../lib/types'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import ProfileSheet from '../components/ProfileSheet'

type Tab = 'all' | 'requests' | 'sent'

export default function Friends({ tab: param }: { tab?: string }) {
  const { friends, incoming, outgoing, respondToRequest, notify, membersLoading } = useApp()
  const tab: Tab = param === 'requests' || param === 'sent' ? param : 'all'
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [open, setOpen] = useState<Member | null>(null)

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  async function decide(requestId: string, name: string, decision: 'accepted' | 'declined') {
    if (busyId) return
    setBusyId(requestId)
    const error = await respondToRequest(requestId, decision)
    setBusyId(null)
    notify(
      error ?? (decision === 'accepted' ? `You and ${name} are now friends.` : 'Request declined.'),
      error ? 'error' : 'success',
    )
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: incoming.length },
    { id: 'sent', label: 'Sent', count: outgoing.length },
  ]

  return (
    <div className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">Your circle</p>
          <h2 className="page-title">Friends</h2>
          <p className="muted">The people you’ve connected with, and the introductions waiting on you.</p>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-pill ${tab === t.id ? 'active' : ''}`}
            onClick={() => navigate(t.id === 'all' ? 'friends' : `friends/${t.id}`)}
          >
            {t.label}
            {t.count > 0 && <span className={`count ${t.id === 'requests' ? 'count-alert' : ''}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <>
          {friends.length > 4 && (
            <label className="search search-wide">
              <Icon name="search" size={18} />
              <input
                type="search"
                placeholder="Search your friends"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search your friends"
              />
            </label>
          )}

          {membersLoading && friends.length === 0 ? (
            <div className="grid grid-compact">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="friend-tile skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">
                <Icon name="users" size={26} />
              </span>
              <h3>{friends.length === 0 ? 'No friends yet' : 'No one matches that search'}</h3>
              <p>
                {friends.length === 0
                  ? 'Say hello to someone in Discover. Once they accept, they’ll appear here.'
                  : 'Try a different name.'}
              </p>
              {friends.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={() => navigate('discover')}>
                  Find people
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-compact">
              {filtered.map((friend) => (
                <article key={friend.id} className="friend-tile">
                  <button type="button" className="friend-open" onClick={() => setOpen(friend)}>
                    <Avatar
                      id={friend.id}
                      name={friend.name}
                      initials={friend.initials}
                      src={friend.avatarUrl}
                      size={64}
                    />
                    <strong>{friend.name}</strong>
                    <small>{friend.location || 'Location not set'}</small>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`messages/${friend.id}`)}
                  >
                    <Icon name="message" size={15} /> Message
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' &&
        (incoming.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Icon name="inbox" size={26} />
            </span>
            <h3>You’re all caught up</h3>
            <p>New friend requests will show up here.</p>
          </div>
        ) : (
          <ul className="list">
            {incoming.map(({ request, member }) => (
              <li key={request.id} className="list-row">
                <button type="button" className="row-main" onClick={() => setOpen(member)}>
                  <Avatar
                    id={member.id}
                    name={member.name}
                    initials={member.initials}
                    src={member.avatarUrl}
                    size={52}
                  />
                  <span>
                    <strong>{member.name}</strong>
                    <small>
                      Sent {new Date(request.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      {member.location ? ` · ${member.location}` : ''}
                    </small>
                  </span>
                </button>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busyId === request.id}
                    onClick={() => void decide(request.id, member.name, 'accepted')}
                  >
                    <Icon name="check" size={15} /> Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={busyId === request.id}
                    onClick={() => void decide(request.id, member.name, 'declined')}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'sent' &&
        (outgoing.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Icon name="clock" size={26} />
            </span>
            <h3>No pending requests</h3>
            <p>Requests you send will wait here until the other person responds.</p>
          </div>
        ) : (
          <ul className="list">
            {outgoing.map(({ request, member }) => (
              <li key={request.id} className="list-row">
                <button type="button" className="row-main" onClick={() => setOpen(member)}>
                  <Avatar
                    id={member.id}
                    name={member.name}
                    initials={member.initials}
                    src={member.avatarUrl}
                    size={52}
                  />
                  <span>
                    <strong>{member.name}</strong>
                    <small>
                      Sent {new Date(request.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </small>
                  </span>
                </button>
                <span className="status-pill">Awaiting reply</span>
              </li>
            ))}
          </ul>
        ))}

      {open && <ProfileSheet member={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
