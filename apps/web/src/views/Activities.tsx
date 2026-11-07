import { useState, type FormEvent } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import { initialsOf } from '../lib/utils'
import {
  PLAN_DETAILS_MAX,
  PLAN_MAX_SPOTS,
  PLAN_PLACE_MAX,
  PLAN_TITLE_MAX,
  planTime,
  spotsLeft,
  type Plan,
} from '../lib/plans'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import SafetyActions from '../components/SafetyActions'

const IDEAS = [
  { emoji: '☕', title: 'Coffee and a chat' },
  { emoji: '🥾', title: 'Walk or hike' },
  { emoji: '🎲', title: 'Games night' },
  { emoji: '⚽', title: 'Kick-about in the park' },
  { emoji: '📚', title: 'Read or study together' },
  { emoji: '🍲', title: 'Share a meal' },
]

function PlanCard({ plan }: { plan: Plan }) {
  const { user, me, memberById, joinPlan, leavePlan, cancelPlan, notify } = useApp()
  const [busy, setBusy] = useState(false)

  const mine = plan.host_id === user?.id
  const host = mine ? undefined : memberById(plan.host_id)
  const hostName = mine ? 'You' : (host?.name ?? 'A friend')
  const joined = plan.members.some((m) => m.user_id === user?.id)
  const left = spotsLeft(plan)
  const names = plan.members.map((m) =>
    m.user_id === user?.id ? 'You' : (memberById(m.user_id)?.name ?? 'A friend'),
  )

  async function run(action: () => Promise<string | null>, success: string) {
    if (busy) return
    setBusy(true)
    const error = await action()
    setBusy(false)
    notify(error ?? success, error ? 'error' : 'success')
  }

  function cancel() {
    if (!window.confirm('Cancel this plan? People who joined will no longer see it.')) return
    void run(() => cancelPlan(plan.id), 'Plan canceled.')
  }

  return (
    <li className="plan-card">
      <header className="plan-head">
        <Avatar
          id={plan.host_id}
          name={hostName}
          initials={mine ? initialsOf(me.displayName || 'You') : (host?.initials ?? '?')}
          src={mine ? me.avatarUrl || undefined : host?.avatarUrl}
          size={40}
        />
        <span className="mini-main">
          <strong>{plan.title}</strong>
          <small>{mine ? 'You are hosting' : `Hosted by ${hostName}`}</small>
        </span>
        {!mine && host && <SafetyActions member={host} />}
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
        {mine ? (
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={cancel}>
            Cancel plan
          </button>
        ) : (
          <>
            {joined ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy}
                onClick={() => void run(() => leavePlan(plan.id), 'You left the plan.')}
              >
                Leave plan
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy || left === 0}
                onClick={() => void run(() => joinPlan(plan.id), 'You’re in. See you there!')}
              >
                {left === 0 ? 'Full' : 'I’m in'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => navigate(`messages/${plan.host_id}`)}
            >
              <Icon name="message" size={15} /> Message host
            </button>
          </>
        )}
      </footer>
    </li>
  )
}

export default function Activities() {
  const { user, friends, plans, plansLoading, plansError, reloadPlans, createPlan, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [spots, setSpots] = useState(4)
  const [details, setDetails] = useState('')
  const [posting, setPosting] = useState(false)

  function startWith(idea: string) {
    setTitle(idea)
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mine = plans.filter((p) => p.host_id === user?.id)
  const others = plans.filter((p) => p.host_id !== user?.id)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (posting) return
    setPosting(true)
    const error = await createPlan({ title, place, details, startsAt, spots })
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
    notify('Plan posted. Your friends can see it now.', 'success')
  }

  if (plansError === 'setup') {
    return (
      <div className="page page-narrow">
        <section className="panel">
          <header className="panel-head">
            <h3>Activities</h3>
          </header>
          <p className="muted panel-empty">
            Plans need a one-time database setup. Open <strong>supabase/plans.sql</strong>, paste it into the Supabase
            SQL Editor and run it, then refresh this page.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <h2 className="page-title">Activities</h2>
          <p className="lead">Plans from you and your friends. Join one, or host your own.</p>
        </div>
        <button type="button" className="btn btn-md btn-primary" onClick={() => setOpen((v) => !v)}>
          <Icon name="plus" size={17} /> {open ? 'Close' : 'Host a plan'}
        </button>
      </header>

      <section className="panel plan-hero">
        <h3>Friendship grows when you do things together</h3>
        <p className="muted">
          A plan can be as small as a coffee. Post one, and the friends you have made can say “I’m in”. Pick an idea to
          start:
        </p>
        <div className="chips" role="list">
          {IDEAS.map((idea) => (
            <button
              key={idea.title}
              type="button"
              role="listitem"
              className="chip chip-btn"
              onClick={() => startWith(idea.title)}
            >
              {idea.emoji} {idea.title}
            </button>
          ))}
        </div>
      </section>

      {open && (
        <form className="panel plan-form" onSubmit={(event) => void submit(event)}>
          <h3>Host a plan</h3>
          <p className="muted">
            Only your friends can see it and tap “I’m in”. Meet in a public place and tell someone you trust where you
            are going. See the{' '}
            <button type="button" className="link-btn" onClick={() => navigate('rules')}>
              community rules
            </button>
            .
          </p>

          <label className="field">
            <span>What are you doing?</span>
            <input
              value={title}
              maxLength={PLAN_TITLE_MAX}
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
              <span>Spots for friends</span>
              <input
                type="number"
                min={1}
                max={PLAN_MAX_SPOTS}
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
              maxLength={PLAN_PLACE_MAX}
              placeholder="Café in town, the park by the river…"
              onChange={(event) => setPlace(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Anything else? (optional)</span>
            <textarea
              rows={3}
              value={details}
              maxLength={PLAN_DETAILS_MAX}
              placeholder="What to bring, how long it lasts, who it suits"
              onChange={(event) => setDetails(event.target.value)}
            />
            <small>
              {details.length}/{PLAN_DETAILS_MAX}
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

      {plansError && (
        <p className="muted panel-empty">
          {plansError}{' '}
          <button type="button" className="link-btn" onClick={() => void reloadPlans()}>
            Try again
          </button>
        </p>
      )}

      {mine.length > 0 && (
        <section className="plan-section">
          <h3>Your plans</h3>
          <ul className="plan-list">
            {mine.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </ul>
        </section>
      )}

      <section className="plan-section">
        <h3>Friends’ plans</h3>
        {others.length > 0 ? (
          <ul className="plan-list">
            {others.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </ul>
        ) : (
          <div className="empty plan-empty">
            <span className="empty-icon">
              <Icon name="calendar" size={26} />
            </span>
            {plansLoading ? (
              <h3>Loading plans…</h3>
            ) : friends.length === 0 ? (
              <>
                <h3>Plans start with friends</h3>
                <p>
                  Add a few friends first, then their plans appear here and yours reach them. Say hello to someone who
                  shares your interests.
                </p>
                <button type="button" className="btn btn-md btn-primary" onClick={() => navigate('discover')}>
                  Find people
                </button>
              </>
            ) : (
              <>
                <h3>Nothing planned yet. You could start something.</h3>
                <p>Most meet-ups begin with one person saying “anyone keen?”. Be that person. It only takes a minute.</p>
                <button type="button" className="btn btn-md btn-primary" onClick={() => startWith('Coffee and a chat')}>
                  <Icon name="plus" size={17} /> Host the first plan
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
