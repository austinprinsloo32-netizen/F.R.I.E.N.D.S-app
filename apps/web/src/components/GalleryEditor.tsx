import { useRef, useState } from 'react'
import { useApp } from '../state/context'
import { useGallery } from '../state/useGallery'
import { GALLERY_LIMIT, type GalleryPhoto } from '../lib/trust'
import Icon from './Icon'

/** "Your photos" on the profile page: add up to 6, remove any. Only friends can see them. */
export default function GalleryEditor() {
  const { user, addGalleryPhoto, removeGalleryPhoto, notify } = useApp()
  const { photos, loading, error, reload } = useGallery(user?.id, true)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0 || busy) return
    setBusy(true)
    let added = 0
    for (const file of Array.from(files)) {
      const failure = await addGalleryPhoto(file)
      if (failure) {
        notify(failure, 'error')
        break
      }
      added += 1
    }
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
    if (added > 0) {
      notify(added === 1 ? 'Photo added.' : `${added} photos added.`, 'success')
      await reload()
    }
  }

  async function remove(photo: GalleryPhoto) {
    if (busy || !window.confirm('Remove this photo?')) return
    setBusy(true)
    const failure = await removeGalleryPhoto(photo)
    setBusy(false)
    if (failure) {
      notify(failure, 'error')
      return
    }
    await reload()
  }

  return (
    <section className="card gallery-editor">
      <header className="panel-head">
        <h3>Your photos</h3>
        <span className="muted">
          {photos.length}/{GALLERY_LIMIT}
        </span>
      </header>
      <p className="muted">Only your friends can see these. Real photos of you doing real things help people trust a profile.</p>

      {error && <p className="muted">{error}</p>}

      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <div key={photo.id} className="gallery-tile">
            <img src={photo.url} alt={`Your photo ${index + 1}`} loading="lazy" />
            <button
              type="button"
              className="gallery-remove"
              aria-label={`Remove photo ${index + 1}`}
              disabled={busy}
              onClick={() => void remove(photo)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        {photos.length < GALLERY_LIMIT && (
          <button
            type="button"
            className="gallery-add"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            aria-label="Add photos"
          >
            <Icon name="camera" size={22} />
            <span>{busy ? 'Uploading…' : loading ? 'Loading…' : 'Add photo'}</span>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => void onPick(event.target.files)}
      />
    </section>
  )
}
