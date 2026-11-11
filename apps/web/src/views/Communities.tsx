import { useState, type FormEvent } from 'react'
import { useApp } from '../state/context'
import { useCommunities, useCommunityDetail } from '../state/useCommunities'
import { initialsOf } from '../lib/utils'
import { planTime } from '../lib/plans'
import {
  COMMUNITY_CODE_MIN,
  COMMUNITY_PLAN_DETAILS_MAX,
  COMMUNITY_PLAN_MAX_SPOTS,
  COMMUNITY_PLAN_PLACE_MAX,
  COMMUNITY_PLAN_TITLE_MAX,
  COMMUNITY_POST_MAX,
  communitySpotsLeft,
  type Community,
  type CommunityPerson,
  type CommunityPlan,
} from '../lib/communities'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

type Detail = ReturnType<typeof useCommunityDetail>
type Tab = 'plans' | 'news' | 'members'

function personName(people: Record<string, CommunityPerson>, id: string, myId: string | undefined) {
  if (id === myId) return 'You'
  return people[id]?.display_name?.trim() || 'A member'
}

function PersonAvatar({ person, id, size }: { person: CommunityPerson | undefined; id: string; size: number }) {
  const name = person?.display_name?.trim() || 'Member'
  return <Avatar id={id} name={name} initials={initialsOf(name)} src={person?.avatar_url || undefined} size={size} />
}

/* ---------------------------------------------------------------- plans */

function CommunityPlanCard({ plan, detail }: { plan: CommunityPlan; detail: Detail }) {
  const { user, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const mine = plan.host_id === user?.id
  const isCommunityHost = detail.myRole === 'host'
  const joined = plan.members.some((m) => m.user_id === user?.id)
  const left = communitySpotsLeft(plan)
  const names = plan.members.map((m) => personName(detail.people, m.user_id, user?.id))

  async function run(action: () => Promise<string | null>, success: string) {
    if (busy) return
    setBusy(true)
    const error = await action()
    setBusy(false)
    notify(error ?? success, error ? 'error' : 'success')
  }

  function cancel() {
    if (!window.confirm('Cancel this plan? People who joined will no longer see it.')) return
    void run(() => detail.cancelPlan(plan.id), 'Plan canceled.')
  }

  return (
    <li className="plan-card">
      <header className="plan-head">
        <PersonAvatar person={detail.people[plan.host_id]} id={plan.host_id} size={40} />
        <span className="mini-main">
          <strong>{plan.title}</strong>
          <small>{mine ? 'You are hosting' : `Hosted by ${personName(detail.people, plan.host_id, user?.id)}`}</small>
        </span>
      </header>

      <p className="plan-line">
        <Icon name="calendar" size={15} /> {planTime(plan.starts_at)}
      </p>
      {plan.place && (
        <p className="plan-line">
          <Icon name="pin" size={15} /> {plan.place}
        </p>
      )}
      {plan.details && <p className="plan-details">{plan.details}</p>}

      <p className="plan-spots">
        <span className={`status-pill ${left === 0 ? '' : 'pill-open'}`}>
          {left === 0 ? 'Full' : `${left} of ${plan.spots} spot${plan.spots === 1 ? '' : 's'} left`}
        </span>
        {names.length > 0 && <small className="muted">In: {names.join(', ')}</small>}
      </p>

      <footer className="plan-actions">
        {mine || isCommunityHost ? (
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={cancel}>
            Cancel plan
          </button>
        ) : null}
        {!mine &&
          (joined ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => void run(() => detail.leavePlan(plan.id), 'You left the plan.')}
            >
              Leave plan
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || left === 0}
              onClick={() => void run(() => detail.joinPlan(plan.id), 'You’re in. See you there!')}
            >
              {left === 0 ? 'Full' : 'I’m in'}
            </button>
          ))}
      </footer>
    </li>
  )
}

function PlansTab({ detail }: { detail: Detail }) {
  const { notify } = useApp()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [spots, setSpots] = useState(4)
  const [details, setDetails] = useState('')
  const [posting, setPosting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (posting) return
    setPosting(true)
    const error = await detail.createPlan({ title, place, details, startsAt, spots })
    setPosting(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setTitle('')
    setPlace('')
    setStartsAt('')
    setSpots(4)
    setDetails('')
    setOpen(false)
    notify('Plan posted. Members can see it now.', 'success')
  }

  return (
    <>
      <div className="plan-actions">
        <button type="button" className="btn btn-md btn-primary" onClick={() => setOpen((v) => !v)}>
          <Icon name="plus" size={17} /> {open ? 'Close' : 'Host a plan'}
        </button>
      </div>

      {open && (
        <form className="panel plan-form" onSubmit={(event) => void submit(event)}>
          <h3>Host a plan</h3>
          <p className="muted">
            Everyone in this community can see it and tap “I’m in”. You may not know them yet, so meet in a public place
            and tell someone you trust where you are going.
          </p>
          <label className="field">
            <span>What are you doing?</span>
            <input
              value={title}
              maxLength={COMMUNITY_PLAN_TITLE_MAX}
              placeholder="Coffee and a walk, board games, Sunday hike…"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <div className="plan-form-row">
            <label className="field">
              <span>When</span>
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
            </label>
            <label className="field">
              <span>Spots</span>
              <input
                type="number"
                min={1}
                max={COMMUNITY_PLAN_MAX_SPOTS}
                value={spots}
                onChange={(event) => setSpots(Number(event.target.value))}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Where (a public place or general area)</span>
            <input
              value={place}
              maxLength={COMMUNITY_PLAN_PLACE_MAX}
              placeholder="Café in town, the park by the river…"
              onChange={(event) => setPlace(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Anything else? (optional)</span>
            <textarea
              rows={3}
              value={details}
              maxLength={COMMUNITY_PLAN_DETAILS_MAX}
              onChange={(event) => setDetails(event.target.value)}
            />
            <small>
              {details.length}/{COMMUNITY_PLAN_DETAILS_MAX}
            </small>
          </label>
          <div className="plan-actions">
            <button type="submit" className="btn btn-md btn-primary" disabled={posting || !title.trim() || !startsAt}>
              {posting ? 'Posting…' : 'Post plan'}
            </button>
            <button type="button" className="btn btn-md btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {detail.plans.length > 0 ? (
        <ul className="plan-list">
          {detail.plans.map((plan) => (
            <CommunityPlanCard key={plan.id} plan={plan} detail={detail} />
          ))}
        </ul>
      ) : (
        <div className="empty plan-empty">
          <span className="empty-icon">
            <Icon name="calendar" size={26} />
          </span>
          <h3>No plans yet</h3>
          <p>Most meet-ups begin with one person saying “anyone keen?”. Be that person.</p>
        </div>
      )}
    </>
  )
}

/* ----------------------------------------------------------------- news */

function NewsTab({ detail }: { detail: Detail }) {
  const { notify } = useApp()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const isHost = detail.myRole === 'host'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (posting) return
    setPosting(true)
    const error = await detail.postAnnouncement(text)
    setPosting(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setText('')
    notify('Posted.', 'success')
  }

  return (
    <>
      {isHost && (
        <form className="panel plan-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Share news with the community</span>
            <textarea
              rows={3}
              value={text}
              maxLength={COMMUNITY_POST_MAX}
              placeholder="This week’s plan, a reminder, a welcome…"
              onChange={(event) => setText(event.target.value)}
            />
            <small>
              {text.length}/{COMMUNITY_POST_MAX}
            </small>
          </label>
          <div className="plan-actions">
            <button type="submit" className="btn btn-md btn-primary" disabled={posting || !text.trim()}>
              {posting ? 'Posting…' : 'Post news'}
            </button>
          </div>
        </form>
      )}

      {detail.posts.length > 0 ? (
        <ul className="plan-list">
          {detail.posts.map((post) => (
            <li key={post.id} className="plan-card">
              <header className="plan-head">
                <PersonAvatar person={detail.people[post.author_id]} id={post.author_id} size={36} />
                <span className="mini-main">
                  <strong>{detail.people[post.author_id]?.display_name?.trim() || 'Host'}</strong>
                  <small>{planTime(post.created_at)}</small>
                </span>
              </header>
              <p className="plan-details">{post.body}</p>
              {isHost && (
                <footer className="plan-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      if (!window.confirm('Delete this post?')) return
                      void detail.deletePost(post.id).then((error) => {
                        if (error) notify(error, 'error')
                      })
                    }}
                  >
                    Delete
                  </button>
                </footer>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty plan-empty">
          <h3>No news yet</h3>
          <p>{isHost ? 'Welcome people with a first post.' : 'Your host will post updates here.'}</p>
        </div>
      )}
    </>
  )
}

/* -------------------------------------------------------------- members */

function MembersTab({ detail }: { detail: Detail }) {
  const { user, notify } = useApp()
  const isHost = detail.myRole === 'host'
  const hasMore = detail.membersHasMore

  function remove(person: CommunityPerson) {
    const name = person.display_name?.trim() || 'this member'
    if (!window.confirm(`Remove ${name}? They won’t be able to rejoin with the invite code.`)) return
    void detail.removeMember(person.user_id).then((error) => {
      notify(error ?? `${name} was removed.`, error ? 'error' : 'success')
    })
  }

  return (
    <>
      <p className="muted">
        Members see each other’s name and photo only. To get to know someone, say hello at a plan and then send a friend
        request.
      </p>
      <ul className="plan-list">
        {detail.memberList.map((person) => (
          <li key={person.user_id} className="plan-card">
            <header className="plan-head">
              <PersonAvatar person={person} id={person.user_id} size={40} />
              <span className="mini-main">
                <strong>{person.user_id === user?.id ? 'You' : person.display_name?.trim() || 'A member'}</strong>
                <small>{person.role === 'host' ? 'Host' : 'Member'}</small>
              </span>
              {isHost && person.role !== 'host' && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => remove(person)}>
                  Remove
                </button>
              )}
            </header>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="plan-actions">
          <button
            type="button"
            className="btn btn-md btn-ghost"
            disabled={detail.membersLoadingMore}
            onClick={() => void detail.loadMoreMembers()}
          >
            {detail.membersLoadingMore ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------- community page */

function CommunityPage({
  community,
  onBack,
  onLeave,
}: {
  community: Community
  onBack: () => void
  onLeave: (id: string) => Promise<string | null>
}) {
  const { user, notify } = useApp()
  const detail = useCommunityDetail(community.id, user?.id)
  const [tab, setTab] = useState<Tab>('plans')

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(community.invite_code)
      notify('Invite code copied.', 'success')
    } catch {
      notify(`Your invite code is ${community.invite_code}`, 'success')
    }
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/communities/${community.invite_code}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      notify('Invite link copied. Send it to someone you’d like to join.', 'success')
    } catch {
      notify(`Share this invite link: ${inviteUrl}`, 'info')
    }
  }

  async function leave() {
    if (!window.confirm(`Leave ${community.name}? You can rejoin later with the invite code.`)) return
    const error = await onLeave(community.id)
    if (error) notify(error, 'error')
    else {
      notify('You left the community.', 'success')
      onBack()
    }
  }

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <button type="button" className="link-btn" onClick={onBack}>
            All communities
          </button>
          <h2 className="page-title">{community.name}</h2>
          {community.description && <p className="lead">{community.description}</p>}
        </div>
      </header>

      <section className="panel">
        <p className="muted">
          {detail.memberCount} of {community.max_members} members
          {!community.joining_open && ' · not accepting new members right now'}
        </p>
        {community.guidelines && <p className="plan-details">{community.guidelines}</p>}
        <div className="plan-actions">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void copyInviteLink()}>
            <Icon name="link" size={15} /> Copy invite link
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyCode()}>
            Copy invite code
          </button>
          {detail.myRole === 'member' && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void leave()}>
              Leave community
            </button>
          )}
        </div>
      </section>

      <div className="chips" role="tablist">
        {(['plans', 'news', 'members'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`chip chip-btn ${tab === key ? 'chip-on' : ''}`}
            onClick={() => setTab(key)}
          >
            {key === 'plans' ? 'Plans' : key === 'news' ? 'News' : 'Members'}
          </button>
        ))}
      </div>

      {detail.error && detail.error !== 'setup' && (
        <p className="muted panel-empty">
          {detail.error}{' '}
          <button type="button" className="link-btn" onClick={() => void detail.reload()}>
            Try again
          </button>
        </p>
      )}

      {detail.error === 'setup' && (
        <section className="panel">
          <h3>Community details aren’t set up yet</h3>
          <p className="muted">Communities are temporarily unavailable. Please try again later.</p>
        </section>
      )}

      {detail.loading ? (
        <p className="muted panel-empty">Loading…</p>
      ) : (
        <section className="plan-section">
          {tab === 'plans' && <PlansTab detail={detail} />}
          {tab === 'news' && <NewsTab detail={detail} />}
          {tab === 'members' && <MembersTab detail={detail} />}
        </section>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- page */

/**
 * Communities home: your communities, and a box for an invite code.
 * `initialCode` pre-fills the code when someone opens an invite link.
 */
export default function Communities({ initialCode = '' }: { initialCode?: string }) {
  const { user, notify } = useApp()
  const { communities, loading, error, reload, joinByCode, leaveCommunity } = useCommunities(user?.id)
  const [code, setCode] = useState(initialCode)
  const [joining, setJoining] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = communities.find((c) => c.id === activeId)

  async function join(event: FormEvent) {
    event.preventDefault()
    if (joining) return
    setJoining(true)
    const result = await joinByCode(code)
    setJoining(false)
    if (result.error) {
      notify(result.error, 'error')
      return
    }
    if (!result.id) {
      notify('The community joined, but could not be opened. Refresh and try again.', 'error')
      await reload()
      return
    }
    setCode('')
    setActiveId(result.id)
    notify('You’re in. Say hello!', 'success')
  }

  if (error === 'setup') {
    return (
      <div className="page page-narrow">
        <section className="panel">
          <header className="panel-head">
            <h3>Communities</h3>
          </header>
          <p className="muted panel-empty">
            Communities are temporarily unavailable. Please try again later.
          </p>
        </section>
      </div>
    )
  }

  if (active) {
    return <CommunityPage community={active} onBack={() => setActiveId(null)} onLeave={leaveCommunity} />
  }

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <h2 className="page-title">Communities</h2>
          <p className="lead">Small groups run by a host, for people who already share a place or a passion.</p>
        </div>
      </header>

      <form className="panel plan-form" onSubmit={(event) => void join(event)}>
        <h3>Have an invite code?</h3>
        <p className="muted">Your host or a member can share one. Communities are private, so they only appear once you join.</p>
        <label className="field">
          <span>Invite code</span>
          <input
            value={code}
            maxLength={24}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="For example, RIVERSIDE-7K2Q"
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <div className="plan-actions">
          <button
            type="submit"
            className="btn btn-md btn-primary"
            disabled={joining || code.trim().length < COMMUNITY_CODE_MIN}
          >
            {joining ? 'Joining…' : 'Join community'}
          </button>
        </div>
      </form>

      {error && (
        <p className="muted panel-empty">
          {error}{' '}
          <button type="button" className="link-btn" onClick={() => void reload()}>
            Try again
          </button>
        </p>
      )}

      <section className="plan-section">
        <h3>Your communities</h3>
        {communities.length > 0 ? (
          <ul className="plan-list">
            {communities.map((community) => (
              <li key={community.id} className="plan-card">
                <header className="plan-head">
                  <span className="mini-main">
                    <strong>{community.name}</strong>
                    <small>{community.description || 'A private community'}</small>
                  </span>
                </header>
                <footer className="plan-actions">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setActiveId(community.id)}>
                    Open
                  </button>
                </footer>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty plan-empty">
            <span className="empty-icon">
              <Icon name="circles" size={26} />
            </span>
            {loading ? (
              <h3>Loading…</h3>
            ) : (
              <>
                <h3>You haven’t joined a community yet</h3>
                <p>Ask a host for an invite code, then enter it above.</p>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
