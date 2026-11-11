/**
 * Communities: types, limits and error text.
 * Who can see what is decided by the database (supabase/communities.sql), not here.
 */

/** Turn Communities on only when VITE_FEATURE_COMMUNITIES=true. */
export const COMMUNITIES_ENABLED = import.meta.env.VITE_FEATURE_COMMUNITIES === 'true'

export const COMMUNITY_CODE_MIN = 6
export const COMMUNITY_POST_MAX = 500
export const COMMUNITY_PLAN_TITLE_MAX = 80
export const COMMUNITY_PLAN_PLACE_MAX = 80
export const COMMUNITY_PLAN_DETAILS_MAX = 300
export const COMMUNITY_PLAN_MAX_SPOTS = 20
export const COMMUNITY_MEMBERS_PAGE = 30

export type Community = {
  id: string
  name: string
  description: string
  guidelines: string
  invite_code: string
  max_members: number
  joining_open: boolean
  created_at: string
}

export type CommunityRole = 'host' | 'member'

/** Raw, minimal row returned by community_directory(). */
export type CommunityDirectoryRow = {
  user_id: string
  display_name: string | null
  avatar_path: string | null
  role: CommunityRole
  joined_at: string
}

/** What the UI uses after resolving the private photo path to a signed URL. */
export type CommunityPerson = Omit<CommunityDirectoryRow, 'avatar_path'> & {
  avatar_url: string | null
}

export type CommunityPost = {
  id: string
  community_id: string
  author_id: string
  body: string
  created_at: string
}

export type CommunityPlanRow = {
  id: string
  community_id: string
  host_id: string
  title: string
  details: string
  place: string
  starts_at: string
  spots: number
  canceled: boolean
  created_at: string
}

export type CommunityPlanMemberRow = { plan_id: string; user_id: string; joined_at: string }

export type CommunityPlan = CommunityPlanRow & { members: CommunityPlanMemberRow[] }

export type CommunityPlanInput = {
  title: string
  place: string
  details: string
  startsAt: string
  spots: number
}

export function communitySpotsLeft(plan: CommunityPlan): number {
  return Math.max(0, plan.spots - plan.members.length)
}

type DbError = { code?: string; message?: string } | null | undefined

/**
 * Plain-language text for a database error.
 * Returns exactly 'setup' when the Communities tables do not exist yet.
 */
export function communityErrorText(error: DbError): string {
  if (!error) return ''
  const message = error.message ?? ''
  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST202' ||
    /schema cache|does not exist/i.test(message)
  ) {
    return 'setup'
  }
  // Messages raised by our own SQL functions are already written for members.
  if (error.code === 'P0001' && message) return message
  if (error.code === '42501' || /row-level security/i.test(message)) {
    return 'You don’t have permission to do that.'
  }
  if (error.code === '23514') return 'Please check the details and try again.'
  return 'Something went wrong. Please try again.'
}
