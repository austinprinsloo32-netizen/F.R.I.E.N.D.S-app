import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGallery } from '../state/useGallery'
import type { GalleryPhoto } from '../lib/trust'
import Icon from './Icon'

/** Extra photos on someone's profile. Only friends can see them (the database enforces it). */
export default function GalleryView({
  userId,
  name,
  isFriend,
}: {
  userId: string
  name: string
  isFriend: boolean
}) {
  const { photos, loading, error } = useGallery(userId, isFriend)
  const [big, setBig] = useState<GalleryPhoto | null>(null)

  useEffect(() => {
    if (!big) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBig(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [big])

  if (!isFriend) {
    return (
      <p className="muted gallery-lock">
        <Icon name="shield" size={15} /> Extra photos are only visible to friends.
      </p>
    )
  }
  if (loading && photos.length === 0) return <p className="muted gallery-lock">Loading photos…</p>
  if (error) return <p className="muted gallery-lock">{error}</p>
  if (photos.length === 0) return null

  return (
    <div className="gallery">
      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <button key={photo.id} type="button" className="gallery-tile" onClick={() => setBig(photo)}>
            <img src={photo.url} alt={`Photo ${index + 1} from ${name}`} loading="lazy" />
          </button>
        ))}
      </div>
      {big &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Photo from ${name}`} onClick={() => setBig(null)}>
            <img src={big.url} alt={`Photo from ${name}`} />
            <button type="button" className="icon-btn lightbox-close" aria-label="Close photo" onClick={() => setBig(null)}>
              <Icon name="x" size={18} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
