import { useApp } from '../state/context'
import { isProfileComplete } from '../lib/trust'
import type { Member } from '../lib/types'
import Icon from './Icon'

/** Small badges under a name: "Photo checked" (set by hand by you) and "Complete profile". */
export default function TrustBadges({ member }: { member: Member }) {
  const { extrasOf } = useApp()
  const photoChecked = Boolean(extrasOf(member.id)?.photo_checked)
  const complete = isProfileComplete(member)
  if (!photoChecked && !complete) return null

  return (
    <div className="trust-badges">
      {photoChecked && (
        <span className="trust-badge trust-photo" title="Someone on the F.R.I.E.N.D.S team checked that this profile photo looks like them">
          <Icon name="shield" size={14} /> Photo checked
        </span>
      )}
      {complete && (
        <span className="trust-badge" title="Name, photo, bio, location and interests are all filled in">
          <Icon name="check" size={14} /> Complete profile
        </span>
      )}
    </div>
  )
}
