import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../state/context'
import { navigate, type View } from '../lib/route'
import Avatar from './Avatar'
import Icon, { type IconName } from './Icon'
import Toasts from './Toasts'

type NavItem = { view: View; label: string; short?: string; icon: IconName; soon?: boolean }

const primary: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', short: 'Home', icon: 'home' },
  { view: 'discover', label: 'Discover', icon: 'compass' },
  { view: 'friends', label: 'Friends', icon: 'users' },
  { view: 'messages', label: 'Messages', icon: 'message' },
]

const upcoming: NavItem[] = [
  { view: 'communities', label: 'Communities', icon: 'circles', soon: true },
  { view: 'activities', label: 'Activities', icon: 'calendar', soon: true },
  { view: 'support', label: 'Support', icon: 'heart', soon: true },
]

const titles: Record<View, string> = {
  dashboard: 'Dashboard',
  discover: 'Discover',
  friends: 'Friends',
  messages: 'Messages',
  communities: 'Communities',
  activities: 'Activities',
  support: 'Support',
  profile: 'My profile',
}

const moreViews: View[] = ['communities', 'activities', 'support', 'profile']

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('friends:theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function MoreSheet({
  theme,
  onTheme,
  onClose,
}: {
  theme: Theme
  onTheme: () => void
  onClose: () => void
}) {
  const { signOut } = useApp()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (view: View) => {
    onClose()
    navigate(view)
  }

  return (
    <div className="sheet-backdrop sheet-bottom" onClick={onClose} role="presentation">
      <div
        className="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="More"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="more-grabber" />
        <div className="more-list">
          <button type="button" className="more-item" onClick={() => go('profile')}>
            <Icon name="user" size={20} /> My profile
          </button>
          {upcoming.map((item) => (
            <button key={item.view} type="button" className="more-item" onClick={() => go(item.view)}>
              <Icon name={item.icon} size={20} /> {item.label}
              <span className="soon">Soon</span>
            </button>
          ))}
          <div className="more-divider" />
          <button type="button" className="more-item" onClick={onTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <button
            type="button"
            className="more-item"
            onClick={() => {
              onClose()
              void signOut()
            }}
          >
            <Icon name="logout" size={20} /> Log out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Shell({ view, children }: { view: View; children: ReactNode }) {
  const { me, user, totalUnread, incoming, signOut } = useApp()
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('friends:theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  const name = me.displayName || user?.email?.split('@')[0] || 'You'
  const badge = (item: NavItem) =>
    item.view === 'messages' ? totalUnread : item.view === 'friends' ? incoming.length : 0

  const renderNav = (item: NavItem) => {
    const count = badge(item)
    return (
      <button
        key={item.view}
        type="button"
        className={`nav-item ${view === item.view ? 'active' : ''}`}
        onClick={() => navigate(item.view)}
        aria-current={view === item.view ? 'page' : undefined}
      >
        <Icon name={item.icon} size={20} />
        <span>{item.label}</span>
        {count > 0 && <span className="count">{count > 9 ? '9+' : count}</span>}
        {item.soon && <span className="soon">Soon</span>}
      </button>
    )
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand brand-light" href="#/dashboard" aria-label="F.R.I.E.N.D.S home">
          <span className="brand-mark">f.</span>
          <span>F.R.I.E.N.D.S</span>
        </a>

        <nav className="nav" aria-label="Main">
          {primary.map(renderNav)}
          <p className="nav-label">On the roadmap</p>
          {upcoming.map(renderNav)}
        </nav>

        <button
          type="button"
          className={`me-chip ${view === 'profile' ? 'active' : ''}`}
          onClick={() => navigate('profile')}
        >
          <Avatar
            id={user?.id ?? 'me'}
            name={name}
            initials={(name[0] ?? 'F').toUpperCase()}
            src={me.avatarUrl}
            size={38}
          />
          <span className="me-chip-text">
            <strong>{name}</strong>
            <small>View &amp; edit profile</small>
          </span>
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">{titles[view]}</h1>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate('friends/requests')}
              aria-label={`Friend requests${incoming.length ? `, ${incoming.length} waiting` : ''}`}
            >
              <Icon name="bell" size={19} />
              {incoming.length > 0 && <span className="dot">{incoming.length}</span>}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
            </button>
            <button type="button" className="icon-btn" onClick={() => void signOut()} aria-label="Log out">
              <Icon name="logout" size={19} />
            </button>
          </div>
        </header>

        <div className="content" key={view}>
          {children}
        </div>
      </div>

      <nav className="tabbar" aria-label="Main">
        {primary.map((item) => {
          const count = badge(item)
          return (
            <button
              key={item.view}
              type="button"
              className={`tab ${view === item.view ? 'active' : ''}`}
              onClick={() => navigate(item.view)}
            >
              <span className="tab-icon">
                <Icon name={item.icon} size={22} />
                {count > 0 && <span className="dot">{count > 9 ? '9+' : count}</span>}
              </span>
              <span>{item.short ?? item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={`tab ${moreViews.includes(view) ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="tab-icon">
            <Icon name="grid" size={22} />
          </span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <MoreSheet theme={theme} onTheme={toggleTheme} onClose={() => setMoreOpen(false)} />
      )}

      <Toasts />
    </div>
  )
}
