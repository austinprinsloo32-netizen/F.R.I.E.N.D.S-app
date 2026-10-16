
import { useState } from 'react'
import './App.css'

type FriendProfile = {
  id: number
  name: string
  age: number
  location: string
  bio: string
  interests: string[]
  initials: string
  color: string
  intention: string
}

const profiles: FriendProfile[] = [
  {
    id: 1,
    name: 'Mia',
    age: 27,
    location: 'Nearby',
    bio: 'Looking for good conversations, weekend adventures and genuine friendships.',
    interests: ['Coffee', 'Hiking', 'Music'],
    initials: 'M',
    color: 'peach',
    intention: 'Find a friend',
  },
  {
    id: 2,
    name: 'Daniel',
    age: 30,
    location: 'Your area',
    bio: 'Tech enthusiast, amateur cook and always ready to discover a new place.',
    interests: ['Technology', 'Food', 'Movies'],
    initials: 'D',
    color: 'blue',
    intention: 'Try new activities',
  },
  {
    id: 3,
    name: 'Amara',
    age: 25,
    location: 'Nearby',
    bio: 'Creative soul who loves photography, nature and meaningful conversations.',
    interests: ['Photography', 'Nature', 'Art'],
    initials: 'A',
    color: 'lavender',
    intention: 'Meet like-minded people',
  },
]

const navigation = [
  { label: 'Discover', icon: '✳' },
  { label: 'Communities', icon: '◉' },
  { label: 'Activities', icon: '◇' },
  { label: 'Support', icon: '♡' },
]

function App() {
  const [activeNav, setActiveNav] = useState('Discover')
  const [connected, setConnected] = useState<number[]>([])
  const [saved, setSaved] = useState<number[]>([])
  const [search, setSearch] = useState('')

  const visibleProfiles = profiles.filter((profile) => {
    const query = search.trim().toLowerCase()

    return (
      !query ||
      profile.name.toLowerCase().includes(query) ||
      profile.bio.toLowerCase().includes(query) ||
      profile.interests.some((interest) =>
        interest.toLowerCase().includes(query),
      )
    )
  })

  function toggleConnection(id: number) {
    setConnected((current) =>
      current.includes(id)
        ? current.filter((profileId) => profileId !== id)
        : [...current, id],
    )
  }

  function toggleSaved(id: number) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((profileId) => profileId !== id)
        : [...current, id],
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="F.R.I.E.N.D.S home">
          <span className="brand-mark">f.</span>
          <span>F.R.I.E.N.D.S</span>
        </a>

        <div className="sidebar-label">YOUR SPACE</div>

        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => setActiveNav(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.label === 'Support' && (
                <span className="nav-new">Care</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">✦</span>
            <p>Good friendships start with being yourself.</p>
          </div>
          <button className="profile-button" onClick={() => setActiveNav('My profile')}>
            <span className="avatar avatar-small">Y</span>
            <span className="profile-details">
              <strong>Your profile</strong>
              <span>Preview mode</span>
            </span>
            <span className="profile-menu">···</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Home</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <span className="preview-pill">
              <span className="status-dot" />
              Prototype
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications preview"
              onClick={() => window.alert('Notifications will be available when accounts are connected.')}
            >
              ♧
            </button>
          </div>
        </header>

        {activeNav === 'Discover' ? (
          <>
            <section className="welcome-section">
              <div className="welcome-copy">
                <div className="eyebrow">
                  <span className="eyebrow-star">✳</span>
                  YOUR NEXT CHAPTER STARTS HERE
                </div>
                <h1>
                  Life is better
                  <br />
                  <span>with friends.</span>
                </h1>
                <p>
                  Meet people who get you, find your community,
                  <br className="desktop-break" /> and make room for new memories.
                </p>
                <div className="welcome-actions">
                  <button
                    className="button-primary"
                    onClick={() =>
                      document.getElementById('discover-people')?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }
                  >
                    Find your people <span>↗</span>
                  </button>
                  <span className="welcome-caption">Real connections, at your pace.</span>
                </div>
              </div>

              <div className="welcome-art" aria-label="Abstract illustration of friendship">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-sun" />
                <div className="art-spark spark-one">✳</div>
                <div className="art-spark spark-two">✦</div>
                <div className="art-card art-card-back">
                  <span className="art-face face-lavender">A</span>
                  <span className="art-face face-peach">M</span>
                  <span className="art-face face-blue">D</span>
                </div>
                <div className="art-card art-card-front">
                  <span className="art-heart">♡</span>
                  <span className="art-card-title">Your kind of people</span>
                  <span className="art-card-subtitle">Somewhere, they’re out there.</span>
                </div>
              </div>
            </section>

            <section className="discover-section" id="discover-people">
              <div className="section-heading">
                <div>
                  <div className="eyebrow section-eyebrow">A GOOD PLACE TO START</div>
                  <h2>People you might click with<span>.</span></h2>
                  <p>Little things in common can lead to big friendships.</p>
                </div>
                <label className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Search profiles and interests"
                    placeholder="Search interests..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <kbd>/</kbd>
                </label>
              </div>

              <div className="profile-grid">
                {visibleProfiles.map((profile) => {
                  const isConnected = connected.includes(profile.id)
                  const isSaved = saved.includes(profile.id)

                  return (
                    <article className="person-card" key={profile.id}>
                      <div className={`person-art ${profile.color}`}>
                        <span className="person-art-orbit" />
                        <span className="person-art-sun" />
                        <span className="person-avatar">{profile.initials}</span>
                        <span className="person-art-star">✳</span>
                        <span className="location-pill">
                          <span className="location-dot" />
                          {profile.location}
                        </span>
                        <button
                          className={`save-button ${isSaved ? 'saved' : ''}`}
                          aria-label={isSaved ? `Unsave ${profile.name}` : `Save ${profile.name}`}
                          onClick={() => toggleSaved(profile.id)}
                        >
                          {isSaved ? '♥' : '♡'}
                        </button>
                      </div>

                      <div className="person-info">
                        <div className="person-title-row">
                          <h3>{profile.name}, {profile.age}</h3>
                          <span className="profile-verified" title="Sample profile">✦</span>
                        </div>
                        <p className="person-bio">{profile.bio}</p>
                        <div className="interest-list">
                          {profile.interests.map((interest) => (
                            <button
                              className="interest-chip"
                              key={interest}
                              onClick={() => setSearch(interest)}
                            >
                              {interest}
                            </button>
                          ))}
                        </div>
                        <div className="person-intention">{profile.intention}</div>
                        <button
                          className={`connect-button ${isConnected ? 'connected' : ''}`}
                          onClick={() => toggleConnection(profile.id)}
                        >
                          {isConnected ? 'Request sent ✓' : 'Say hello ↗'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              {visibleProfiles.length === 0 && (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>No matches for that search yet</h3>
                  <p>Try another name or interest.</p>
                  <button className="button-secondary" onClick={() => setSearch('')}>
                    Clear search
                  </button>
                </div>
              )}

              <div className="more-section">
                <span className="more-star">✳</span>
                <div>
                  <strong>Your people are out there.</strong>
                  <p>We're just getting started. More ways to connect are coming.</p>
                </div>
                <button
                  className="button-secondary"
                  onClick={() => setActiveNav('Communities')}
                >
                  Explore communities <span>↗</span>
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="placeholder-section">
            <span className="placeholder-icon">
              {navigation.find((item) => item.label === activeNav)?.icon ?? '☺'}
            </span>
            <div className="eyebrow">A SPACE TO CONNECT</div>
            <h1>{activeNav}<span>.</span></h1>
            <p>
              This part of F.R.I.E.N.D.S is on our roadmap. We're building
              the foundations first, so every connection has room to grow.
            </p>
            <button className="button-primary" onClick={() => setActiveNav('Discover')}>
              Back to Discover ↗
            </button>
          </section>
        )}

        <footer className="page-footer">
          <span>F.R.I.E.N.D.S <span className="footer-dot">✳</span> A little more connected.</span>
          <span>Built for friendship, not pressure.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
