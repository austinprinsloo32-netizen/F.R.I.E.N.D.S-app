import { useEffect } from 'react'
import { useApp } from '../state/context'
import { describeShared, sharedInterests, normalizeInterest } from '../lib/utils'
import type { Member } from '../lib/types'
import Avatar from './Avatar'
import Icon from './Icon'
import RelationButton from './RelationButton'
import SafetyActions from './SafetyActions'
import TrustBadges from './TrustBadges'
import GalleryView from './GalleryView'

export default function ProfileSheet({
  member,
  onClose,
}: {
  member: Member
  onClose: () => void
}) {
  const { me, extrasOf, relationOf } = useApp()
  const prompts = extrasOf(member.id)?.prompts ?? []
  const isFriend = relationOf(member.id).status === 'friends'
  const shared = sharedInterests(me.interests, member.interests)
  const sharedKeys = new Set(shared.map(normalizeInterest))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name}'s profile`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>

        <div className="sheet-cover" />
        <div className="sheet-body">
          <Avatar
            id={member.id}
            name={member.name}
            initials={member.initials}
            src={member.avatarUrl}
            size={104}
            className="sheet-avatar"
          />
          <h2>{member.name}</h2>
          <TrustBadges member={member} />
          {member.location && (
            <p className="muted with-icon">
              <Icon name="pin" size={15} /> {member.location}
            </p>
          )}

          {shared.length > 0 && (
            <p className="match-note">
              <Icon name="sparkle" size={15} /> {describeShared(shared)}
            </p>
          )}

          <p className="sheet-bio">{member.bio || 'Still getting to know this member.'}</p>

          {prompts.length > 0 && (
            <ul className="prompt-list">
              {prompts.map((prompt, index) => (
                <li key={index}>
                  <small>{prompt.q}</small>
                  <p>{prompt.a}</p>
                </li>
              ))}
            </ul>
          )}

          {member.interests.length > 0 && (
            <div className="chips">
              {member.interests.map((interest) => (
                <span
                  key={interest}
                  className={`chip ${sharedKeys.has(normalizeInterest(interest)) ? 'chip-shared' : ''}`}
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          <GalleryView userId={member.id} name={member.name} isFriend={isFriend} />

          <div className="sheet-actions">
            <RelationButton member={member} onNavigate={onClose} />
            <SafetyActions member={member} variant="text" onDone={onClose} />
          </div>
        </div>
      </div>
    </div>
  )
}
