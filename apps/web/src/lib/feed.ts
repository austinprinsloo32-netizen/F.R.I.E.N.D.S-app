export type StatusKind = 'free' | 'plans' | 'doing' | 'busy'
export type ReactionKind = 'heart' | 'thumb' | 'laugh' | 'cheer'

export type StatusRow = {
  user_id: string
  kind: StatusKind
  text: string
  expires_at: string
  updated_at: string
}

export type PostRow = {
  id: string
  author_id: string
  content: string
  created_at: string
}

export type ReactionRow = {
  post_id: string
  user_id: string
  emoji: ReactionKind
  created_at: string
}

export const STATUS_OPTIONS: { kind: StatusKind; emoji: string; label: string; hint: string }[] = [
  { kind: 'free', emoji: '☕', label: 'Free to hang', hint: 'Up for a chat or a meet-up' },
  { kind: 'plans', emoji: '🗓️', label: 'Looking for plans', hint: 'Want something to do' },
  { kind: 'doing', emoji: '🎧', label: 'Doing something', hint: 'Say what, e.g. “hiking”' },
  { kind: 'busy', emoji: '🔕', label: 'Busy', hint: 'Slow to reply today' },
]

export const REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: 'heart', emoji: '❤️', label: 'Love' },
  { kind: 'thumb', emoji: '👍', label: 'Nice' },
  { kind: 'laugh', emoji: '😂', label: 'Funny' },
  { kind: 'cheer', emoji: '🙌', label: 'Cheer' },
]

export const STATUS_HOURS = 24
export const POST_MAX = 500
export const STATUS_TEXT_MAX = 80

export function statusOption(kind: StatusKind) {
  return STATUS_OPTIONS.find((o) => o.kind === kind) ?? STATUS_OPTIONS[0]
}

export function reactionEmoji(kind: ReactionKind): string {
  return REACTIONS.find((r) => r.kind === kind)?.emoji ?? '❤️'
}

/** Shown under a status avatar: the typed text if any, otherwise the preset label. */
export function statusLine(status: Pick<StatusRow, 'kind' | 'text'>): string {
  return status.text.trim() || statusOption(status.kind).label
}

/** True when a Supabase error means the feed tables have not been created yet. */
export function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  )
}
