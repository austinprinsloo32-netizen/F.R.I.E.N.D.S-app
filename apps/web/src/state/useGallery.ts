import { useCallback, useEffect, useState } from 'react'
import { useApp } from './context'
import type { GalleryPhoto } from '../lib/trust'

/** Loads one person's gallery. Pass enabled=false to skip (e.g. when you're not friends). */
export function useGallery(userId: string | undefined, enabled: boolean) {
  const { loadGallery } = useApp()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!userId || !enabled) {
      setPhotos([])
      return
    }
    setLoading(true)
    const result = await loadGallery(userId)
    setPhotos(result.photos)
    setError(result.error)
    setLoading(false)
  }, [userId, enabled, loadGallery])

  useEffect(() => {
    void reload()
  }, [reload])

  return { photos, loading, error, reload }
}
