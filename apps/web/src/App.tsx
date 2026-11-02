import AppProvider from './state/AppProvider'
import { useApp } from './state/context'
import { useRoute } from './lib/route'
import Shell from './components/Shell'
import Toasts from './components/Toasts'
import AuthScreen from './views/AuthScreen'
import Dashboard from './views/Dashboard'
import Discover from './views/Discover'
import Friends from './views/Friends'
import Messages from './views/Messages'
import Profile from './views/Profile'
import Roadmap from './views/Roadmap'

function Routes() {
  const { user, authReady } = useApp()
  const route = useRoute()

  if (!authReady) {
    return (
      <div className="splash" role="status" aria-label="Loading">
        <span className="brand-mark">f.</span>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toasts />
      </>
    )
  }

  return (
    <Shell view={route.view}>
      {route.view === 'dashboard' && <Dashboard />}
      {route.view === 'discover' && <Discover />}
      {route.view === 'friends' && <Friends tab={route.param} />}
      {route.view === 'messages' && <Messages friendId={route.param} />}
      {route.view === 'profile' && <Profile />}
      {(route.view === 'communities' ||
        route.view === 'activities' ||
        route.view === 'support') && <Roadmap which={route.view} />}
    </Shell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Routes />
    </AppProvider>
  )
}
