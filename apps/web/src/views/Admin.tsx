import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/context'
import { shortTime } from '../lib/utils'
import {
  REASON_LABELS,
  ago,
  fullTime,
  interestCount,
  percent,
  type AdminData,
  type AdminReport,
} from '../lib/admin'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="stat-card admin-tile">
      <span className="stat-top">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = percent(value, total)
  return (
    <li className="funnel-row">
      <span className="funnel-label">{label}</span>
      <span className="funnel-track" aria-hidden="true">
        <span className="funnel-bar" style={{ width: `${pct}%` }} />
      </span>
      <span className="funnel-value">
        {value} <small>({pct}%)</small>
      </span>
    </li>
  )
}

export default function Admin() {
  const { isAdmin, loadAdmin, setReportStatus, reviewPhoto, memberById, notify } = useApp()
  const [data, setData] = useState<AdminData | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [find, setFind] = useState('')

  const refresh = useCallback(async () => {
    setData(await loadAdmin())
  }, [loadAdmin])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    void loadAdmin().then((result) => {
      if (active) setData(result)
    })
    return () => {
      active = false
    }
  }, [isAdmin, loadAdmin])

  const shownMembers = useMemo(() => {
    const q = find.trim().toLowerCase()
    const all = data?.members ?? []
    if (!q) return all
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        m.place.toLowerCase().includes(q),
    )
  }, [data, find])

  if (!isAdmin) {
    return (
      <div className="page page-narrow">
        <section className="panel">
          <h3>Admin</h3>
          <p className="muted panel-empty">This page is only for the F.R.I.E.N.D.S team.</p>
        </section>
      </div>
    )
  }

  async function changeStatus(report: AdminReport, status: AdminReport['status']) {
    if (busyId) return
    setBusyId(report.id)
    const error = await setReportStatus(report.id, status)
    setBusyId(null)
    if (error) notify(error, 'error')
    else await refresh()
  }

  async function review(userId: string, name: string, approved: boolean) {
    if (busyId) return
    setBusyId(userId)
    const error = await reviewPhoto(userId, approved)
    setBusyId(null)
    if (error) {
      notify(error, 'error')
      return
    }
    notify(approved ? `${name} now has the Photo checked badge.` : `Request from ${name} declined.`, 'success')
    await refresh()
  }

  const metrics = data?.metrics

  return (
    <div className="page admin">
      <header className="page-head">
        <div>
          <h2 className="page-title">Admin</h2>
          <p className="lead">Is it working? Connection numbers, reports and photo checks.</p>
        </div>
        <button type="button" className="btn btn-md btn-ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      <section className="panel admin-help">
        <h3>How to read this page</h3>
        <ul>
          <li><strong>Who has joined</strong> lists every member: when they signed up, where they are, and what they have done.</li>
          <li><strong>Plans</strong> shows every plan, who hosts it and who joined.</li>
          <li><strong>The first-week check</strong> tells you whether new people make a friend and chat. If they don’t, that is the thing to fix.</li>
          <li><strong>Reports and photo checks</strong> are things waiting for you to decide.</li>
        </ul>
        <p className="muted">Times are shown in your own time zone. Treat what you see here as private.</p>
      </section>

      {!data && <p className="muted">Loading…</p>}
      {data?.error && (
        <section className="panel">
          <p className="muted panel-empty">{data.error}</p>
        </section>
      )}

      {metrics && (
        <>
          <section className="panel">
            <header className="panel-head">
              <h3>Did new members connect in their first week?</h3>
            </header>
            {metrics.cohort_size === 0 ? (
              <p className="muted panel-empty">
                Nobody has been a member for a full week yet. These numbers appear once someone has.
              </p>
            ) : (
              <>
                <ul className="funnel">
                  <FunnelRow label="Joined at least 7 days ago" value={metrics.cohort_size} total={metrics.cohort_size} />
                  <FunnelRow label="Sent a friend request" value={metrics.cohort_sent_request} total={metrics.cohort_size} />
                  <FunnelRow label="Made a friend" value={metrics.cohort_got_friend} total={metrics.cohort_size} />
                  <FunnelRow label="Had a real conversation" value={metrics.cohort_conversation} total={metrics.cohort_size} />
                </ul>
                <p className="muted">
                  Each row counts what people did within 7 days of joining. A conversation means one person wrote and
                  the other wrote back. With under about 30 people, treat the percentages as rough.
                </p>
              </>
            )}
          </section>

          <section className="stats admin-stats" aria-label="Numbers">
            <Tile label="Members" value={metrics.members_total} hint={`${metrics.members_new_7d} new this week`} />
            <Tile
              label="Active, last 7 days"
              value={metrics.active_7d}
              hint={`${metrics.active_prev_7d} the week before`}
            />
            <Tile label="Friendships" value={metrics.friendships} />
            <Tile label="Messages, 7 days" value={metrics.messages_7d} />
            <Tile label="Updates, 7 days" value={metrics.updates_7d} />
            <Tile label="Upcoming plans" value={metrics.plans_upcoming} hint={`${metrics.plan_joins_total} joins so far`} />
          </section>
        </>
      )}

      {data && !data.error && (
        <>
          <section className="panel">
            <header className="panel-head">
              <h3>Who has joined</h3>
              <span className="muted">{data.members.length} {data.members.length === 1 ? 'member' : 'members'}</span>
            </header>
            {data.peopleError === 'setup' ? (
              <p className="muted panel-empty">
                The member list needs a one-time setup. Open <strong>supabase/admin_members.sql</strong>, paste it into
                the Supabase SQL Editor, run it, then press Refresh.
              </p>
            ) : data.peopleError ? (
              <p className="muted panel-empty">{data.peopleError}</p>
            ) : (
              <>
                <label className="search search-wide">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    placeholder="Find by name, email or place"
                    value={find}
                    onChange={(event) => setFind(event.target.value)}
                    aria-label="Find a member"
                  />
                </label>
                <ul className="admin-list">
                  {shownMembers.map((m) => (
                    <li key={m.member_id} className="admin-item admin-member">
                      <div className="admin-item-head">
                        <strong>{m.name || 'No name yet'}</strong>
                        <span className="muted">Joined {ago(m.joined_at)}</span>
                      </div>
                      <p className="muted">{m.email ?? 'No email'}</p>
                      <dl className="admin-facts">
                        <div><dt>Joined</dt><dd>{fullTime(m.joined_at)}</dd></div>
                        <div><dt>Last signed in</dt><dd>{m.last_sign_in ? `${fullTime(m.last_sign_in)} (${ago(m.last_sign_in)})` : 'never'}</dd></div>
                        <div><dt>Location</dt><dd>{m.place || 'Not set'}</dd></div>
                        <div><dt>Profile</dt><dd>{m.bio ? 'Bio added' : 'No bio'}, {interestCount(m.interests)} interests</dd></div>
                      </dl>
                      <div className="chips">
                        <span className="chip">{m.friends} {m.friends === 1 ? 'friend' : 'friends'}</span>
                        <span className="chip">{m.messages_sent} messages sent</span>
                        <span className="chip">{m.plans_hosted} plans hosted</span>
                        <span className="chip">{m.plans_joined} plans joined</span>
                      </div>
                    </li>
                  ))}
                  {shownMembers.length === 0 && <li className="muted panel-empty">No one matches that search.</li>}
                </ul>
              </>
            )}
          </section>

          {!data.peopleError && (
            <section className="panel">
              <header className="panel-head">
                <h3>Plans</h3>
                <span className="muted">{data.plans.length}</span>
              </header>
              {data.plans.length === 0 ? (
                <p className="muted panel-empty">No plans have been posted yet.</p>
              ) : (
                <ul className="admin-list">
                  {data.plans.map((plan) => (
                    <li key={plan.plan_id} className="admin-item">
                      <div className="admin-item-head">
                        <strong>{plan.title}</strong>
                        <span className={`status-pill ${plan.canceled ? '' : 'pill-open'}`}>
                          {plan.canceled ? 'canceled' : `${plan.joined} of ${plan.spots} joined`}
                        </span>
                      </div>
                      <p className="muted">
                        Hosted by {plan.host_name} · {fullTime(plan.starts_at)}
                        {plan.place ? ` · ${plan.place}` : ''}
                      </p>
                      <p className="muted">
                        {plan.joined_names ? `Joined: ${plan.joined_names}` : 'Nobody has joined yet'} · posted{' '}
                        {ago(plan.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="panel">
            <header className="panel-head">
              <h3>Reports</h3>
              <span className="muted">{metrics ? `${metrics.reports_open} open` : ''}</span>
            </header>
            {data.reports.length === 0 ? (
              <p className="muted panel-empty">No reports. Check back daily during the first weeks.</p>
            ) : (
              <ul className="admin-list">
                {data.reports.map((report) => (
                  <li key={report.id} className="admin-item">
                    <div className="admin-item-head">
                      <strong>{REASON_LABELS[report.reason] ?? report.reason}</strong>
                      <span className={`status-pill ${report.status === 'open' ? 'pill-alert' : ''}`}>{report.status}</span>
                    </div>
                    <p className="muted">
                      {report.reporter_name} reported {report.reported_name} · {shortTime(report.created_at)}
                      {report.kind === 'community_post' && ` · Community post${report.community_name ? ` in ${report.community_name}` : ''}`}
                      {report.kind === 'community_plan' && ` · Community plan${report.community_name ? ` in ${report.community_name}` : ''}`}
                    </p>
                    {report.details && <p>“{report.details}”</p>}
                    {report.post_content && <blockquote className="admin-quote">{report.post_content}</blockquote>}
                    {report.content_snapshot && <blockquote className="admin-quote">{report.content_snapshot}</blockquote>}
                    <div className="admin-actions">
                      {report.status !== 'reviewing' && report.status !== 'resolved' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={busyId === report.id}
                          onClick={() => void changeStatus(report, 'reviewing')}
                        >
                          Start review
                        </button>
                      )}
                      {report.status !== 'resolved' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={busyId === report.id}
                          onClick={() => void changeStatus(report, 'resolved')}
                        >
                          Mark resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={busyId === report.id}
                          onClick={() => void changeStatus(report, 'open')}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted">
              To remove someone, use the Supabase dashboard (Authentication, Users). Decide what to do, then tell
              the reporter the outcome where you can.
            </p>
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>Photo checks waiting</h3>
              <span className="muted">{data.photoRequests.length}</span>
            </header>
            {data.photoRequests.length === 0 ? (
              <p className="muted panel-empty">Nobody is waiting.</p>
            ) : (
              <ul className="admin-list">
                {data.photoRequests.map((request) => {
                  const member = memberById(request.user_id)
                  return (
                    <li key={request.user_id} className="admin-item admin-photo">
                      <Avatar
                        id={request.user_id}
                        name={request.display_name}
                        initials={member?.initials ?? '?'}
                        src={member?.avatarUrl}
                        size={96}
                        rounded="soft"
                      />
                      <div className="admin-photo-main">
                        <strong>{request.display_name}</strong>
                        <small className="muted">Asked {shortTime(request.requested_at)}</small>
                        <p className="muted">Approve only if the photo is a clear picture of a real person’s face.</p>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={busyId === request.user_id}
                            onClick={() => void review(request.user_id, request.display_name, true)}
                          >
                            <Icon name="check" size={15} /> Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={busyId === request.user_id}
                            onClick={() => void review(request.user_id, request.display_name, false)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
