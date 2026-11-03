import AppProvider from './state/AppProvider'
import { useApp } from './state/context'
import { useRoute } from './lib/route'
import Shell from './components/Shell'
import Toasts from './components/Toasts'
import Activities from './views/Activities'
import Admin from './views/Admin'
import AuthScreen from './views/AuthScreen'
import Dashboard from './views/Dashboard'
import Discover from './views/Discover'
import Friends from './views/Friends'
import Legal from './views/Legal'
import Messages from './views/Messages'
import Profile from './views/Profile'
import ResetPassword from './views/ResetPassword'
import Roadmap from './views/Roadmap'
import { useRecovering } from './lib/recovery'

function Routes() {
  const { user, authReady } = useApp()
  const route = useRoute()
  const recovering = useRecovering()

  if (!authReady) {
    return (
      <div className="splash" role="status" aria-label="Loading">
        <span className="brand-mark">f.</span>
      </div>
    )
  }

  if (recovering && user) {
    return (
      <>
        <ResetPassword />
        <Toasts />
      </>
    )
  }

  if (!user) {
    // The rules and privacy pages must be readable before anyone signs up.
    if (route.view === 'rules' || route.view === 'privacy') {
      return (
        <>
          <Legal which={route.view} standalone />
          <Toasts />
        </>
      )
    }
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
      {route.view === 'activities' && <Activities />}
      {route.view === 'admin' && <Admin />}
      {(route.view === 'rules' || route.view === 'privacy') && <Legal which={route.view} />}
      {(route.view === 'communities' || route.view === 'support') && <Roadmap which={route.view} />}
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
