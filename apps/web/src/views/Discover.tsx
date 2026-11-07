import { useMemo, useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import {
  describeShared,
  greeting,
  normalizeInterest,
  sharedInterests,
} from '../lib/utils'
import type { Member } from '../lib/types'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import ProfileSheet from '../components/ProfileSheet'
import RelationButton from '../components/RelationButton'

type Scored = { member: Member; shared: string[] }

function MemberCard({
  item,
  onOpen,
}: {
  item: Scored
  onOpen: (member: Member) => void
}) {
  const { member, shared } = item

  return (
    <article className="friend-tile person-tile">
      <button type="button" className="friend-open" onClick={() => onOpen(member)}>
        <Avatar
          id={member.id}
          name={member.name}
          initials={member.initials}
          src={member.avatarUrl}
          size={64}
        />
        <strong>{member.name}</strong>
        <small>{member.location || 'Location not set'}</small>
        {shared.length > 0 && (
          <span className="match-pill">
            <Icon name="sparkle" size={12} /> {shared.length} in common
          </span>
        )}
      </button>
      <RelationButton member={member} size="sm" />
    </article>
  )
}

export default function Discover() {
  const { me, members, membersLoading, membersError, reloadMembers, relationOf, profileComplete } =
    useApp()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [hideFriends, setHideFriends] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [open, setOpen] = useState<Member | null>(null)

  const scored = useMemo<Scored[]>(
    () => members.map((member) => ({ member, shared: sharedInterests(me.interests, member.interests) })),
    [members, me.interests],
  )

  const locations = useMemo(() => {
    const map = new Map<string, string>()
    for (const { member } of scored) {
      const key = member.location.toLowerCase()
      if (key && !map.has(key)) map.set(key, member.location)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [scored])

  const interestOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const { member } of scored) {
      for (const interest of member.interests) {
        const key = normalizeInterest(interest)
        if (!key) continue
        const entry = counts.get(key)
        if (entry) entry.count += 1
        else counts.set(key, { label: interest.trim(), count: 1 })
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .slice(0, 16)
  }, [scored])

  const filtersActive = Boolean(query.trim() || location || picked.length || hideFriends)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scored
      .filter(({ member }) => {
        if (
          q &&
          !member.name.toLowerCase().includes(q) &&
          !member.bio.toLowerCase().includes(q) &&
          !member.location.toLowerCase().includes(q) &&
          !member.interests.some((i) => i.toLowerCase().includes(q))
        )
          return false
        if (location && member.location.toLowerCase() !== location) return false
        if (
          picked.length &&
          !member.interests.some((i) => picked.includes(normalizeInterest(i)))
        )
          return false
        if (hideFriends && relationOf(member.id).status === 'friends') return false
        return true
      })
      .sort(
        (a, b) => b.shared.length - a.shared.length || a.member.name.localeCompare(b.member.name),
      )
  }, [scored, query, location, picked, hideFriends, relationOf])

  const topMatches = useMemo(
    () =>
      scored
        .filter((s) => s.shared.length > 0 && relationOf(s.member.id).status === 'none')
        .sort((a, b) => b.shared.length - a.shared.length)
        .slice(0, 8),
    [scored, relationOf],
  )

  function toggleInterest(key: string) {
    setPicked((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    )
  }

  function clearFilters() {
    setQuery('')
    setLocation('')
    setPicked([])
    setHideFriends(false)
  }

  const activeCount = (location ? 1 : 0) + picked.length + (hideFriends ? 1 : 0)

  return (
    <div className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">{greeting()}{me.displayName ? `, ${me.displayName.split(' ')[0]}` : ''}</p>
          <h2 className="page-title">Meet people worth knowing</h2>
          <p className="muted">Start with what you have in common. Everything else follows.</p>
        </div>
      </section>

      {!profileComplete && (
        <div className="banner">
          <span className="banner-icon">
            <Icon name="sparkle" size={20} />
          </span>
          <div>
            <strong>Finish your profile to get better matches</strong>
            <p>Add your name and a few interests so we can show what you share with others.</p>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('profile')}>
            Complete profile
          </button>
        </div>
      )}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Search by name, interest or place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search members"
          />
        </label>
        <button
          type="button"
          className={`btn btn-ghost ${showFilters || activeCount ? 'is-on' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <Icon name="sliders" size={17} /> Filters{activeCount > 0 && <span className="count">{activeCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="filters">
          <div className="filter-row">
            <label className="field field-inline">
              <span>Location</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Anywhere</option>
                {locations.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={hideFriends}
                onChange={(e) => setHideFriends(e.target.checked)}
              />
              <span className="switch-track" />
              <span>Hide people I’m already friends with</span>
            </label>
          </div>

          {interestOptions.length > 0 && (
            <div>
              <p className="filter-label">Interests</p>
              <div className="chips">
                {interestOptions.map(([key, { label }]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip chip-btn ${picked.includes(key) ? 'chip-on' : ''}`}
                    onClick={() => toggleInterest(key)}
                    aria-pressed={picked.includes(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtersActive && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {!filtersActive && topMatches.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h3>Suggested for you</h3>
            <span className="muted">Based on interests you share</span>
          </div>
          <div className="rail">
            {topMatches.map(({ member, shared }) => (
              <button
                key={member.id}
                type="button"
                className="rail-card"
                onClick={() => setOpen(member)}
              >
                <Avatar
                  id={member.id}
                  name={member.name}
                  initials={member.initials}
                  src={member.avatarUrl}
                  size={56}
                />
                <strong>{member.name}</strong>
                <small>{describeShared(shared)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h3>{filtersActive ? 'Results' : 'Everyone'}</h3>
          <span className="muted">
            {membersLoading ? 'Loading…' : `${results.length} ${results.length === 1 ? 'person' : 'people'}`}
          </span>
        </div>

        {membersError ? (
          <div className="empty">
            <h3>We couldn’t load members</h3>
            <p role="alert">{membersError}</p>
            <button type="button" className="btn btn-primary" onClick={() => void reloadMembers()}>
              Try again
            </button>
          </div>
        ) : membersLoading && members.length === 0 ? (
          <div className="grid grid-compact">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="friend-tile skeleton" aria-hidden="true" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Icon name="compass" size={26} />
            </span>
            <h3>{filtersActive ? 'No one matches those filters' : 'No other members yet'}</h3>
            <p>
              {filtersActive
                ? 'Try removing a filter or searching for something broader.'
                : 'You’re one of the first here. Complete your profile and check back soon.'}
            </p>
            {filtersActive && (
              <button type="button" className="btn btn-primary" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-compact">
            {results.map((item) => (
              <MemberCard key={item.member.id} item={item} onOpen={setOpen} />
            ))}
          </div>
        )}
      </section>

      {open && <ProfileSheet member={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
