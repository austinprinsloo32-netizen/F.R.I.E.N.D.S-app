export type StatusKind = 'free' | 'plans' | 'doing' | 'busy'
export type ReactionKind = 'heart' | 'thumb' | 'laugh' | 'cheer'

export type StatusRow = {
  user_id: string
  kind: StatusKind
  text: string
  expires_at: string
  updated_at: string
  /** Path of an optional photo in the private status-media bucket */
  image_path?: string | null
  /** Optional link to a song or video on a music site */
  music_url?: string | null
}

export type StatusExtra = {
  imageFile?: File | null
  removeImage?: boolean
  musicUrl?: string
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

export const STATUS_BUCKET = 'status-media'
export const STATUS_IMAGE_TTL = 3600
export const STATUS_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const MUSIC_URL_MAX = 300

const MUSIC_HOSTS: [RegExp, string][] = [
  [/(^|\.)spotify\.com$|^spotify\.link$/, 'Spotify'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/^music\.apple\.com$/, 'Apple Music'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
  [/(^|\.)deezer\.com$/, 'Deezer'],
]

/** Only plain https links to well-known music sites are shown, so nobody can plant a harmful link. */
export function parseMusicLink(raw: string | null | undefined): { url: string; label: string } | null {
  const text = (raw ?? '').trim()
  if (!text || text.length > MUSIC_URL_MAX) return null
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    const match = MUSIC_HOSTS.find(([pattern]) => pattern.test(host))
    return match ? { url: url.toString(), label: match[1] } : null
  } catch {
    return null
  }
}
