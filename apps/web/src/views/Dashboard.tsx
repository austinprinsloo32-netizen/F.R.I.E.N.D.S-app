import { useMemo, useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import {
  describeShared,
  greeting,
  profileChecks,
  shortTime,
  sharedInterests,
} from '../lib/utils'
import Avatar from '../components/Avatar'
import Icon, { type IconName } from '../components/Icon'
import RelationButton from '../components/RelationButton'
import StatusBar from '../components/StatusBar'
import Feed from '../components/Feed'

const roadmap: { view: 'communities' | 'activities' | 'support'; icon: IconName; label: string; text: string }[] = [
  { view: 'communities', icon: 'circles', label: 'Communities', text: 'Groups around shared interests' },
  { view: 'activities', icon: 'calendar', label: 'Activities', text: 'Meet up in real life' },
  { view: 'support', icon: 'heart', label: 'Support', text: 'Guided listening' },
]

export default function Dashboard() {
  const {
    me,
    members,
    friends,
    incoming,
    outgoing,
    threads,
    totalUnread,
    relationOf,
    respondToRequest,
    notify,
    statusOf,
  } = useApp()
  const [busyId, setBusyId] = useState<string | null>(null)

  const checks = profileChecks(me)
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
  const firstName = me.displayName.trim().split(/\s+/)[0]

  const suggestions = useMemo(
    () =>
      members
        .filter((m) => relationOf(m.id).status === 'none')
        .map((member) => ({ member, shared: sharedInterests(me.interests, member.interests) }))
        .sort((a, b) => b.shared.length - a.shared.length || a.member.name.localeCompare(b.member.name))
        .slice(0, 4),
    [members, me.interests, relationOf],
  )

  const steps = [
    {
      label: 'Complete your profile',
      hint: 'Name, photo, bio and interests',
      done: percent === 100,
      go: 'profile',
      icon: 'user' as IconName,
    },
    {
      label: 'Send your first friend request',
      hint: 'Find someone in Discover',
      done: friends.length + outgoing.length + incoming.length > 0,
      go: 'discover',
      icon: 'userPlus' as IconName,
    },
    {
      label: 'Make your first friend',
      hint: 'Once a request is accepted',
      done: friends.length > 0,
      go: 'friends',
      icon: 'users' as IconName,
    },
    {
      label: 'Start a conversation',
      hint: 'Say hello to a friend',
      done: threads.some((t) => t.last),
      go: 'messages',
      icon: 'message' as IconName,
    },
  ]
  const stepsDone = steps.filter((s) => s.done).length
  const friendsWithStatus = friends.filter((f) => statusOf(f.id)).length

  const subtitle =
    incoming.length > 0
      ? `You have ${incoming.length} friend request${incoming.length === 1 ? '' : 's'} waiting.`
      : totalUnread > 0
        ? `You have ${totalUnread} unread message${totalUnread === 1 ? '' : 's'}.`
        : 'Here’s what’s happening in your circle.'

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

  const stats: { label: string; value: number | string; icon: IconName; go: string; alert?: boolean }[] = [
    { label: 'Friends', value: friends.length, icon: 'users', go: 'friends' },
    { label: 'Requests', value: incoming.length, icon: 'userPlus', go: 'friends/requests', alert: incoming.length > 0 },
    { label: 'Unread', value: totalUnread, icon: 'message', go: 'messages', alert: totalUnread > 0 },
    { label: 'Profile', value: `${percent}%`, icon: 'user', go: 'profile' },
  ]

  return (
    <div className="page">
      <section className="dash-hero">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h2>{firstName ? `Welcome back, ${firstName}` : 'Welcome to F.R.I.E.N.D.S'}</h2>
          <p>{subtitle}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-md btn-accent" onClick={() => navigate('discover')}>
              <Icon name="compass" size={17} /> Find people
            </button>
            <button type="button" className="btn btn-md btn-outline-light" onClick={() => navigate('messages')}>
              <Icon name="message" size={17} /> Open messages
            </button>
          </div>
        </div>
        <div className="hero-meter">
          <small>Profile strength</small>
          <strong>{percent}%</strong>
          <div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent}%` }} />
          </div>
          {percent < 100 && (
            <button type="button" className="link-btn" onClick={() => navigate('profile')}>
              Finish your profile
            </button>
          )}
        </div>
      </section>

      <StatusBar />

      <section className="stats" aria-label="Your summary">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className={`stat-card ${stat.alert ? 'stat-alert' : ''}`}
            onClick={() => navigate(stat.go)}
          >
            <span className="stat-top">
              {stat.label}
              <Icon name={stat.icon} size={18} />
            </span>
            <span className="stat-value">{stat.value}</span>
          </button>
        ))}
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          <Feed />

          {incoming.length > 0 && (
            <section className="panel">
              <header className="panel-head">
                <h3>Requests waiting</h3>
                <button type="button" className="link-btn" onClick={() => navigate('friends/requests')}>
                  See all
                </button>
              </header>
              <ul className="mini-list">
                {incoming.slice(0, 3).map(({ request, member }) => (
                  <li key={request.id} className="mini-row">
                    <Avatar id={member.id} name={member.name} initials={member.initials} src={member.avatarUrl} size={42} />
                    <span className="mini-main">
                      <strong>{member.name}</strong>
                      <small>{member.location || 'Wants to connect'}</small>
                    </span>
                    <span className="mini-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === request.id}
                        onClick={() => void decide(request.id, member.name, 'accepted')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busyId === request.id}
                        onClick={() => void decide(request.id, member.name, 'declined')}
                        aria-label={`Decline ${member.name}`}
                      >
                        <Icon name="x" size={15} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel">
            <header className="panel-head">
              <h3>Recent conversations</h3>
              <button type="button" className="link-btn" onClick={() => navigate('messages')}>
                Open inbox
              </button>
            </header>
            {threads.filter((t) => t.last).length === 0 ? (
              <p className="muted panel-empty">
                {friends.length === 0
                  ? 'Once you’ve connected with someone, your conversations will show up here.'
                  : 'No conversations yet. Say hello to one of your friends.'}
              </p>
            ) : (
              <ul className="mini-list">
                {threads
                  .filter((t) => t.last)
                  .slice(0, 4)
                  .map((thread) => (
                    <li key={thread.conversationId}>
                      <button
                        type="button"
                        className="mini-row mini-button"
                        onClick={() => navigate(`messages/${thread.member.id}`)}
                      >
                        <Avatar
                          id={thread.member.id}
                          name={thread.member.name}
                          initials={thread.member.initials}
                          src={thread.member.avatarUrl}
                          size={42}
                        />
                        <span className="mini-main">
                          <strong>{thread.member.name}</strong>
                          <small>{thread.last?.content}</small>
                        </span>
                        <span className="mini-side">
                          {thread.last && <time>{shortTime(thread.last.created_at)}</time>}
                          {thread.unread > 0 && (
                            <span className="count count-alert">{thread.unread > 9 ? '9+' : thread.unread}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>People you might click with</h3>
              <button type="button" className="link-btn" onClick={() => navigate('discover')}>
                Discover more
              </button>
            </header>
            {suggestions.length === 0 ? (
              <p className="muted panel-empty">
                No new suggestions right now. Add more interests to your profile to see better matches.
              </p>
            ) : (
              <ul className="mini-list">
                {suggestions.map(({ member, shared }) => (
                  <li key={member.id} className="mini-row">
                    <Avatar id={member.id} name={member.name} initials={member.initials} src={member.avatarUrl} size={42} />
                    <span className="mini-main">
                      <strong>{member.name}</strong>
                      <small>{shared.length ? describeShared(shared) : member.location || 'New member'}</small>
                    </span>
                    <RelationButton member={member} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="dash-col">
          {stepsDone < steps.length ? (
            <section className="panel">
              <header className="panel-head">
                <h3>Getting started</h3>
                <span className="muted">
                  {stepsDone} of {steps.length}
                </span>
              </header>
              <div className="meter">
                <span style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
              </div>
              <ul className="mini-list">
                {steps.map((step) => (
                  <li key={step.label}>
                    <button
                      type="button"
                      className={`step-row ${step.done ? 'done' : ''}`}
                      onClick={() => navigate(step.go)}
                    >
                      <span className="tick">{step.done && <Icon name="check" size={12} />}</span>
                      <span className="mini-main">
                        <strong>{step.label}</strong>
                        <small>{step.hint}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="panel">
              <header className="panel-head">
                <h3>Keep it going</h3>
              </header>
              <p className="muted panel-empty">
                {friendsWithStatus > 0
                  ? `${friendsWithStatus} of your friends ${friendsWithStatus === 1 ? 'has' : 'have'} a status right now. Tap one above to see it, or say hi.`
                  : 'You’re all set up. Share your status or an update to get things moving in your circle.'}
              </p>
              <div className="hero-actions">
                <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('messages')}>
                  <Icon name="message" size={15} /> Say hi to a friend
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('discover')}>
                  <Icon name="compass" size={15} /> Find more people
                </button>
              </div>
            </section>
          )}

          <section className="panel">
            <header className="panel-head">
              <h3>Coming next</h3>
            </header>
            <ul className="mini-list">
              {roadmap.map((item) => (
                <li key={item.view}>
                  <button type="button" className="mini-row mini-button" onClick={() => navigate(item.view)}>
                    <span className="soon-icon">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="mini-main">
                      <strong>{item.label}</strong>
                      <small>{item.text}</small>
                    </span>
                    <span className="status-pill">Soon</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
