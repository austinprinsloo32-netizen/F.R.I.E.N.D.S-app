import { useEffect, useState } from 'react'
import { fetchPhotos, fetchTrust, type GalleryPhoto, type Trust } from '../lib/trust'

type State = { trust: Trust | null; photos: GalleryPhoto[]; loading: boolean; error: string }

/** Loads trust signals, badges and gallery photos for one member. refreshKey re-loads after changes. */
export function useMemberTrust(memberId: string, refreshKey = 0): State {
  const [state, setState] = useState<State>({ trust: null, photos: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true }))
    void Promise.all([fetchTrust(memberId), fetchPhotos(memberId)]).then(([t, p]) => {
      if (!active) return
      setState({ trust: t.trust, photos: p.photos, loading: false, error: t.error || p.error })
    })
    return () => {
      active = false
    }
  }, [memberId, refreshKey])

  return state
}
