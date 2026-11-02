import { useEffect, useState } from 'react'

export const VIEWS = [
  'dashboard',
  'discover',
  'friends',
  'messages',
  'communities',
  'activities',
  'support',
  'profile',
] as const

export type View = (typeof VIEWS)[number]

export type Route = { view: View; param?: string }

function parse(): Route {
  const parts = window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
  const view = VIEWS.find((v) => v === parts[0]) ?? 'dashboard'
  return { view, param: parts[1] }
}

export function navigate(path: string) {
  window.location.hash = `/${path}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)

  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
