import { useRef, useState } from 'react'
import { useApp } from '../state/context'
import { BADGES, MAX_PHOTOS, addPhoto, removePhoto, type GalleryPhoto } from '../lib/trust'
import { useMemberTrust } from '../state/useMemberTrust'
import Icon from './Icon'
import PhotoGallery from './PhotoGallery'
import { TrustSignals } from './MemberTrust'

/** Your own gallery manager and badge progress, shown on the profile page. */
export default function MyTrust() {
  const { user, me, notify, setAvatarPath } = useApp()
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uid = user?.id ?? ''
  const { trust, photos, loading, error } = useMemberTrust(uid, version)

  const full = photos.length >= MAX_PHOTOS
  const refresh = () => setVersion((v) => v + 1)

  async function onFiles(files: FileList | null) {
    if (!files || !uid) return
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    if (list.length === 0) return
    setBusy('add')
    let failure: string | null = null
    for (const file of list) {
      failure = await addPhoto(uid, file)
      if (failure) break
    }
    setBusy(null)
    if (fileRef.current) fileRef.current.value = ''
    notify(failure ?? (list.length === 1 ? 'Photo added.' : `${list.length} photos added.`), failure ? 'error' : 'success')
    refresh()
  }

  async function remove(photo: GalleryPhoto) {
    if (busy || !window.confirm('Remove this photo?')) return
    setBusy(photo.id)
    const failure = await removePhoto(photo)
    setBusy(null)
    notify(failure ?? 'Photo removed.', failure ? 'error' : 'success')
    refresh()
  }

  async function makeMain(photo: GalleryPhoto) {
    if (busy) return
    setBusy(photo.id)
    const failure = await setAvatarPath(photo.path)
    setBusy(null)
    notify(failure ?? 'Profile photo updated.', failure ? 'error' : 'success')
  }

  return (
    <>
      <section className="card gallery-card">
        <header className="panel-head">
          <h3>Your photos</h3>
          <span className="muted">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </header>
        <p className="muted">
          <Icon name="lock" size={14} /> Shared with your friends only. Everyone can see your main profile photo.
        </p>

        {error ? (
          <p className="form-note form-error" role="alert">
            {error}
          </p>
        ) : (
          <ul className="gallery-manage">
            {photos.map((photo, i) => (
              <li key={photo.id} className="photo-tile">
                <img src={photo.url} alt={`Your photo ${i + 1}`} loading="lazy" />
                <div className="photo-tile-actions">
                  <button type="button" className="btn btn-sm btn-accent" disabled={busy !== null} onClick={() => void makeMain(photo)}>
                    Set as main
                  </button>
                  <button type="button" className="icon-btn" disabled={busy !== null} onClick={() => void remove(photo)} aria-label="Remove photo">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
            {!full && (
              <li>
                <button type="button" className="photo-add" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                  <Icon name="plus" size={22} />
                  <span>{busy === 'add' ? 'Uploading…' : 'Add photos'}</span>
                </button>
              </li>
            )}
          </ul>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => void onFiles(event.target.files)}
        />
        {loading && photos.length === 0 && !error && <p className="muted">Loading your photos…</p>}
        {photos.length > 0 && !error && (
          <details className="preview-details">
            <summary>Preview how friends see your gallery</summary>
            <PhotoGallery photos={photos} name={me.displayName || 'You'} />
          </details>
        )}
      </section>

      <section className="card badges-card">
        <h3>Trust and badges</h3>
        <p className="muted">
          These are worked out automatically from what you do on F.R.I.E.N.D.S. They can’t be edited, and nobody sees
          how many reports or blocks anyone has.
        </p>
        {trust && <TrustSignals trust={trust} isSelf />}
        {trust && (
          <ul className="badge-grid">
            {BADGES.map((badge) => {
              const earned = trust.badges.includes(badge.key)
              return (
                <li key={badge.key} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
                  <span className="badge-emoji" aria-hidden="true">
                    {earned ? badge.emoji : '🔒'}
                  </span>
                  <strong>{badge.label}</strong>
                  <small>{earned ? 'Earned' : badge.how}</small>
                </li>
              )
            })}
          </ul>
        )}
        {!trust && !loading && !error && <p className="muted">Badges will appear here once your profile is saved.</p>}
      </section>
    </>
  )
}
