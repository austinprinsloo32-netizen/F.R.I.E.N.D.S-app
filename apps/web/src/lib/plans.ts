export const PLAN_TITLE_MAX = 80
export const PLAN_PLACE_MAX = 80
export const PLAN_DETAILS_MAX = 300
export const PLAN_MAX_SPOTS = 20

export type PlanRow = {
  id: string
  host_id: string
  title: string
  details: string
  place: string
  starts_at: string
  spots: number
  canceled: boolean
  created_at: string
}

export type PlanMemberRow = { plan_id: string; user_id: string; joined_at: string }

export type Plan = PlanRow & {
  /** People who joined (not counting the host) */
  members: PlanMemberRow[]
}

export type PlanInput = {
  title: string
  place: string
  details: string
  startsAt: string
  spots: number
}

export function spotsLeft(plan: Plan): number {
  return Math.max(0, plan.spots - plan.members.length)
}

/** "Sat, 8 Nov, 10:00" in the viewer's own time zone. */
export function planTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const SETUP_MESSAGE =
  'Plans need a one-time database setup. Run supabase/plans.sql in the Supabase SQL Editor.'

export function planErrorText(error: { code?: string; message?: string }): string {
  const message = error.message ?? ''
  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST202' ||
    /could not find the (table|function)|does not exist/i.test(message)
  ) {
    return SETUP_MESSAGE
  }
  return message || 'Something went wrong. Please try again.'
}
