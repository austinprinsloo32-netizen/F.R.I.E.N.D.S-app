import { useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import type { Member } from '../lib/types'
import Icon from './Icon'

type Props = {
  member: Member
  size?: 'sm' | 'md'
  onNavigate?: () => void
}

/** One button that always reflects the true friendship state with a member. */
export default function RelationButton({ member, size = 'md', onNavigate }: Props) {
  const { relationOf, sendRequest, respondToRequest, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const relation = relationOf(member.id)
  const cls = `btn btn-${size}`

  async function run(task: () => Promise<string | null>, success: string) {
    if (busy) return
    setBusy(true)
    const error = await task()
    setBusy(false)
    notify(error ?? success, error ? 'error' : 'success')
  }

  if (relation.status === 'friends') {
    return (
      <button
        type="button"
        className={`${cls} btn-primary`}
        onClick={() => {
          onNavigate?.()
          navigate(`messages/${member.id}`)
        }}
      >
        <Icon name="message" size={16} /> Message
      </button>
    )
  }

  if (relation.status === 'sent') {
    return (
      <button type="button" className={`${cls} btn-ghost`} disabled>
        <Icon name="clock" size={16} /> Requested
      </button>
    )
  }

  if (relation.status === 'received' && relation.requestId) {
    const requestId = relation.requestId
    return (
      <button
        type="button"
        className={`${cls} btn-primary`}
        disabled={busy}
        onClick={() =>
          run(
            () => respondToRequest(requestId, 'accepted'),
            `You and ${member.name} are now friends.`,
          )
        }
      >
        <Icon name="check" size={16} /> {busy ? 'Accepting…' : 'Accept request'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`${cls} btn-accent`}
      disabled={busy}
      onClick={() => run(() => sendRequest(member.id), `Request sent to ${member.name}.`)}
    >
      <Icon name="userPlus" size={16} /> {busy ? 'Sending…' : 'Add friend'}
    </button>
  )
}
