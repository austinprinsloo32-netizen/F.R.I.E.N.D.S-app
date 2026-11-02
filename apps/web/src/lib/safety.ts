export type ReportReason = 'spam' | 'harassment' | 'fake' | 'inappropriate' | 'unsafe' | 'other'

export const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'harassment', label: 'Harassment or bullying' },
  { reason: 'unsafe', label: 'I feel unsafe' },
  { reason: 'fake', label: 'Fake profile or pretending to be someone' },
  { reason: 'inappropriate', label: 'Inappropriate content' },
  { reason: 'spam', label: 'Spam or scam' },
  { reason: 'other', label: 'Something else' },
]

export const REPORT_DETAILS_MAX = 500

export type ReportInput = {
  reportedId: string
  postId?: string
  reason: ReportReason
  details: string
}

const SETUP_MESSAGE =
  'Safety tools need a one-time database setup. Run supabase/safety.sql in the Supabase SQL Editor.'

/** Turns a Supabase error into something safe to show; flags the "SQL not run yet" case. */
export function safetyErrorText(error: { code?: string; message?: string }): string {
  const message = (error.message ?? '').toLowerCase()
  if (
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('could not find the function') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  ) {
    return SETUP_MESSAGE
  }
  return error.message || 'Something went wrong. Please try again.'
}
