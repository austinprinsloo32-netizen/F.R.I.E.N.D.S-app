export type AdminMetrics = {
  members_total: number
  members_new_7d: number
  cohort_size: number
  cohort_sent_request: number
  cohort_got_friend: number
  cohort_conversation: number
  active_7d: number
  active_prev_7d: number
  friendships: number
  messages_7d: number
  updates_7d: number
  plans_upcoming: number
  plan_joins_total: number
  reports_open: number
  photo_checks_waiting: number
}

export type AdminReport = {
  id: string
  created_at: string
  status: 'open' | 'reviewing' | 'resolved'
  reason: string
  details: string
  reporter_id: string
  reporter_name: string
  reported_id: string
  reported_name: string
  post_content: string | null
  /** Only present when supabase/community_reports.sql has been run */
  kind?: 'member' | 'community_post' | 'community_plan' | 'community_content'
  community_name?: string | null
  content_snapshot?: string | null
}

export type PhotoRequest = {
  user_id: string
  display_name: string
  requested_at: string
}

export type AdminMember = {
  member_id: string
  name: string
  email: string | null
  place: string
  bio: string
  interests: unknown
  joined_at: string
  last_sign_in: string | null
  friends: number
  messages_sent: number
  plans_hosted: number
  plans_joined: number
}

export type AdminPlan = {
  plan_id: string
  title: string
  host_name: string
  place: string
  starts_at: string
  spots: number
  joined: number
  joined_names: string
  canceled: boolean
  created_at: string
}

export type AdminData = {
  metrics: AdminMetrics | null
  reports: AdminReport[]
  photoRequests: PhotoRequest[]
  members: AdminMember[]
  plans: AdminPlan[]
  /** '' = fine, 'setup' = supabase/admin_members.sql has not been run, anything else = message */
  peopleError: string
  error: string
}

/** "7 Nov 2026, 12:53" in the viewer's own time zone. */
export function fullTime(iso: string | null | undefined): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "3 hours ago", "2 days ago". */
export function ago(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function interestCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export const REASON_LABELS: Record<string, string> = {
  spam: 'Spam or scam',
  harassment: 'Harassment or bullying',
  fake: 'Fake profile',
  inappropriate: 'Inappropriate content',
  unsafe: 'Feels unsafe',
  other: 'Something else',
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
