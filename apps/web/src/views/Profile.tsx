import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useApp } from '../state/context'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import BlockedList from '../components/BlockedList'
import GalleryEditor from '../components/GalleryEditor'
import PromptsEditor from '../components/PromptsEditor'

const BIO_MAX = 280
const NAME_MAX = 60

export default function Profile() {
  const { user, me, meLoading, saveProfile, uploadAvatar, notify } = useApp()
  const [name, setName] = useState(me.displayName)
  const [bio, setBio] = useState(me.bio)
  const [place, setPlace] = useState(me.location)
  const [interests, setInterests] = useState<string[]>(me.interests)
  const [interestDraft, setInterestDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Re-seed the form once the saved profile has finished loading.
  useEffect(() => {
    setName(me.displayName)
    setBio(me.bio)
    setPlace(me.location)
    setInterests(me.interests)
  }, [me.displayName, me.bio, me.location, me.interests])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const dirty =
    name.trim() !== me.displayName ||
    bio.trim() !== me.bio ||
    place.trim() !== me.location ||
    interests.join('|') !== me.interests.join('|')

  const checks = [
    { label: 'Add your name', done: Boolean(name.trim()) },
    { label: 'Upload a photo', done: Boolean(me.avatarUrl) },
    { label: 'Write a short bio', done: Boolean(bio.trim()) },
    { label: 'Set your location', done: Boolean(place.trim()) },
    { label: 'Add at least 3 interests', done: interests.length >= 3 },
  ]
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)

  function addInterest(raw: string) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) return
    setInterests((current) => {
      const next = [...current]
      for (const part of parts) {
        if (!next.some((i) => i.toLowerCase() === part.toLowerCase()) && next.length < 20) {
          next.push(part.slice(0, 40))
        }
      }
      return next
    })
    setInterestDraft('')
  }

  function onInterestKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addInterest(interestDraft)
    } else if (event.key === 'Backspace' && !interestDraft && interests.length) {
      setInterests((current) => current.slice(0, -1))
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const finalInterests = [...interests]
    if (interestDraft.trim()) {
      for (const part of interestDraft.split(',').map((p) => p.trim()).filter(Boolean)) {
        if (!finalInterests.some((i) => i.toLowerCase() === part.toLowerCase())) finalInterests.push(part)
      }
      setInterestDraft('')
    }
    setSaving(true)
    const error = await saveProfile({
      displayName: name,
      bio,
      location: place,
      interests: finalInterests.slice(0, 20),
    })
    setSaving(false)
    notify(error ?? 'Profile saved.', error ? 'error' : 'success')
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    const error = await uploadAvatar(file)
    setUploading(false)
    if (error) setPreview('')
    notify(error ?? 'Photo updated.', error ? 'error' : 'success')
    if (fileRef.current) fileRef.current.value = ''
  }

  const shownName = name.trim() || 'Your name'

  return (
    <div className="page page-narrow">
      <section className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-hero-body">
          <div className="avatar-edit">
            <Avatar
              id={user?.id ?? 'me'}
              name={shownName}
              initials={(shownName[0] ?? 'F').toUpperCase()}
              src={preview || me.avatarUrl}
              size={112}
            />
            <button
              type="button"
              className="avatar-edit-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
            >
              <Icon name="camera" size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void onPickFile(e.target.files?.[0])}
            />
          </div>
          <div>
            <h2>{shownName}</h2>
            <p className="muted">{user?.email}</p>
            {uploading && <p className="muted">Uploading photo…</p>}
          </div>
        </div>
      </section>

      <div className="profile-layout">
        <form className="card form" onSubmit={onSave}>
          <h3>About you</h3>
          {meLoading && <p className="muted">Loading your profile…</p>}

          <label className="field">
            <span>Display name</span>
            <input
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should people know you?"
            />
          </label>

          <label className="field">
            <span>Location</span>
            <input
              value={place}
              maxLength={80}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="City or area, e.g. Gqeberha"
            />
            <small>Keep it general. You don’t need to share anything precise.</small>
          </label>

          <label className="field">
            <span>Bio</span>
            <textarea
              rows={4}
              value={bio}
              maxLength={BIO_MAX}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you, what you enjoy and who you’d like to meet."
            />
            <small className="counter">
              {bio.length}/{BIO_MAX}
            </small>
          </label>

          <div className="field">
            <span>Interests</span>
            <div className="interest-input" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
              {interests.map((interest) => (
                <span key={interest} className="chip chip-on chip-removable">
                  {interest}
                  <button
                    type="button"
                    onClick={() => setInterests((c) => c.filter((i) => i !== interest))}
                    aria-label={`Remove ${interest}`}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
              <input
                value={interestDraft}
                onChange={(e) => setInterestDraft(e.target.value)}
                onKeyDown={onInterestKey}
                onBlur={() => addInterest(interestDraft)}
                placeholder={interests.length ? 'Add another' : 'Hiking, jazz, board games…'}
                aria-label="Add an interest"
              />
            </div>
            <small>Press Enter or comma to add. Up to 20.</small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-accent btn-lg" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {!dirty && !saving && <span className="muted">All changes saved</span>}
          </div>
        </form>

        <aside className="card completeness">
          <h3>Profile strength</h3>
          <div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="muted">{percent}% complete</p>
          <ul>
            {checks.map((check) => (
              <li key={check.label} className={check.done ? 'done' : ''}>
                <span className="tick">{check.done && <Icon name="check" size={12} />}</span>
                {check.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <GalleryEditor />
      <PromptsEditor />
      <BlockedList />
    </div>
  )
}
