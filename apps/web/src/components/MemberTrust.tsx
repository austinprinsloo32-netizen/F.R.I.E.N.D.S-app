import { badgeInfo, type Trust } from '../lib/trust'
import { useMemberTrust } from '../state/useMemberTrust'
import Icon from './Icon'
import PhotoGallery from './PhotoGallery'

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export function BadgePills({ trust }: { trust: Trust }) {
  if (trust.badges.length === 0) return null
  return (
    <ul className="badge-row" aria-label="Badges">
      {trust.badges.map((key) => {
        const info = badgeInfo(key)
        return info ? (
          <li key={key} className="badge-pill" title={info.how}>
            <span aria-hidden="true">{info.emoji}</span> {info.label}
          </li>
        ) : null
      })}
    </ul>
  )
}

/** Only things that are actually true. Nothing here is self-declared. */
export function TrustSignals({ trust, isSelf }: { trust: Trust; isSelf?: boolean }) {
  return (
    <ul className="signals">
      {trust.emailConfirmed && (
        <li>
          <Icon name="mail" size={16} /> Email confirmed
        </li>
      )}
      <li>
        <Icon name="calendar" size={16} /> Member since {memberSince(trust.memberSince)}
      </li>
      {!isSelf && trust.mutualFriends > 0 && (
        <li>
          <Icon name="users" size={16} /> {trust.mutualFriends} mutual {trust.mutualFriends === 1 ? 'friend' : 'friends'}
        </li>
      )}
      {isSelf && trust.friends !== null && (
        <li>
          <Icon name="users" size={16} /> {trust.friends} {trust.friends === 1 ? 'friend' : 'friends'} (only you see this)
        </li>
      )}
    </ul>
  )
}

/** Trust signals, badges and photos shown inside someone else's profile. */
export default function MemberTrust({ memberId, name }: { memberId: string; name: string }) {
  const { trust, photos, loading, error } = useMemberTrust(memberId)
  const first = name.split(/\s+/)[0]

  if (loading && !trust) return <p className="muted trust-note">Loading…</p>
  if (error) return <p className="muted trust-note">{error}</p>
  if (!trust) return null

  const hiddenPhotos = photos.length === 0 && trust.photos > 0

  return (
    <div className="trust-block">
      <BadgePills trust={trust} />
      <TrustSignals trust={trust} />
      {photos.length > 0 && <PhotoGallery photos={photos} name={name} />}
      {hiddenPhotos && (
        <p className="lock-note">
          <Icon name="lock" size={15} /> {first} shares {trust.photos} {trust.photos === 1 ? 'photo' : 'photos'} with friends.
        </p>
      )}
    </div>
  )
}
