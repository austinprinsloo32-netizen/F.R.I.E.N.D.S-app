import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GalleryPhoto } from '../lib/trust'
import Icon from './Icon'

/** Thumbnail grid with a full-screen viewer. */
export default function PhotoGallery({ photos, name }: { photos: GalleryPhoto[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    if (index === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIndex(null)
      if (event.key === 'ArrowRight') setIndex((i) => (i === null ? i : (i + 1) % photos.length))
      if (event.key === 'ArrowLeft') setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length])

  if (photos.length === 0) return null
  const current = index === null ? null : photos[index]

  return (
    <>
      <ul className="gallery-grid">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button type="button" className="gallery-thumb" onClick={() => setIndex(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              <img src={photo.url} alt={`${name}, photo ${i + 1}`} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {current &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${name}'s photos`} onClick={() => setIndex(null)}>
            <button type="button" className="icon-btn lightbox-close" onClick={() => setIndex(null)} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
            {photos.length > 1 && (
              <button
                type="button"
                className="icon-btn lightbox-nav lightbox-prev"
                aria-label="Previous photo"
                onClick={(event) => {
                  event.stopPropagation()
                  setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
                }}
              >
                <Icon name="arrowLeft" size={20} />
              </button>
            )}
            <img src={current.url} alt={`${name}, photo ${(index ?? 0) + 1}`} onClick={(event) => event.stopPropagation()} />
            {photos.length > 1 && (
              <button
                type="button"
                className="icon-btn lightbox-nav lightbox-next"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation()
                  setIndex((i) => (i === null ? i : (i + 1) % photos.length))
                }}
              >
                <Icon name="arrowLeft" size={20} className="flip" />
              </button>
            )}
            <span className="lightbox-count">
              {(index ?? 0) + 1} / {photos.length}
            </span>
          </div>,
          document.body,
        )}
    </>
  )
}
