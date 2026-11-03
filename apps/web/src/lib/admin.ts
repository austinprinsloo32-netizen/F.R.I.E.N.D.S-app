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
}

export type PhotoRequest = {
  user_id: string
  display_name: string
  requested_at: string
}

export type AdminData = {
  metrics: AdminMetrics | null
  reports: AdminReport[]
  photoRequests: PhotoRequest[]
  error: string
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
