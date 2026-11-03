import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  PLAN_DETAILS_MAX,
  PLAN_MAX_SPOTS,
  PLAN_PLACE_MAX,
  PLAN_TITLE_MAX,
  planErrorText,
  type Plan,
  type PlanInput,
  type PlanMemberRow,
  type PlanRow,
} from '../lib/plans'
import type { PlansApi } from './context'

const POLL_MS = 30_000
const PLAN_COLUMNS = 'id, host_id, title, details, place, starts_at, spots, canceled, created_at'
/** Keep a plan on screen for a few hours after it starts. */
const KEEP_AFTER_START_MS = 3 * 3_600_000

/**
 * Open plans: friends post something to do, others tap to join.
 * Who can see a plan and whether there is room is decided by the database (supabase/plans.sql).
 */
export function usePlans(uid: string | undefined, friendIdsKey: string): PlansApi {
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')

  const reloadPlans = useCallback(async () => {
    if (!uid) {
      setPlans([])
      setPlansError('')
      return
    }
    const cutoff = new Date(Date.now() - KEEP_AFTER_START_MS).toISOString()
    const { data, error } = await supabase
      .from('plans')
      .select(PLAN_COLUMNS)
      .eq('canceled', false)
      .gte('starts_at', cutoff)
      .order('starts_at', { ascending: true })
      .limit(60)
    if (error) {
      const text = planErrorText(error)
      setPlansError(text.startsWith('Plans need') ? 'setup' : text)
      return
    }
    setPlansError('')
    const rows = (data ?? []) as PlanRow[]
    if (rows.length === 0) {
      setPlans([])
      return
    }
    const { data: memberData } = await supabase
      .from('plan_members')
      .select('plan_id, user_id, joined_at')
      .in(
        'plan_id',
        rows.map((r) => r.id),
      )
    const members = (memberData ?? []) as PlanMemberRow[]
    setPlans(rows.map((row) => ({ ...row, members: members.filter((m) => m.plan_id === row.id) })))
  }, [uid])

  useEffect(() => {
    let active = true
    void reloadPlans().finally(() => {
      if (active) setPlansLoading(false)
    })
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reloadPlans()
    }, POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reloadPlans, friendIdsKey])

  const createPlan = useCallback(
    async (input: PlanInput) => {
      if (!uid) return 'Please sign in again.'
      const title = input.title.trim()
      if (title.length < 3) return 'Give your plan a short title (at least 3 characters).'
      if (title.length > PLAN_TITLE_MAX) return `Keep the title under ${PLAN_TITLE_MAX} characters.`
      const start = new Date(input.startsAt)
      if (!input.startsAt || Number.isNaN(start.getTime())) return 'Choose a date and time.'
      if (start.getTime() <= Date.now()) return 'Choose a time in the future.'
      const spots = Math.round(input.spots)
      if (!(spots >= 1 && spots <= PLAN_MAX_SPOTS)) return `Spots must be between 1 and ${PLAN_MAX_SPOTS}.`

      const { error } = await supabase.from('plans').insert({
        host_id: uid,
        title,
        place: input.place.trim().slice(0, PLAN_PLACE_MAX),
        details: input.details.trim().slice(0, PLAN_DETAILS_MAX),
        starts_at: start.toISOString(),
        spots,
      })
      if (error) return planErrorText(error)
      await reloadPlans()
      return null
    },
    [uid, reloadPlans],
  )

  const joinPlan = useCallback(
    async (planId: string) => {
      const { error } = await supabase.rpc('join_plan', { target: planId })
      await reloadPlans()
      return error ? planErrorText(error) : null
    },
    [reloadPlans],
  )

  const leavePlan = useCallback(
    async (planId: string) => {
      if (!uid) return 'Please sign in again.'
      const { error } = await supabase
        .from('plan_members')
        .delete()
        .eq('plan_id', planId)
        .eq('user_id', uid)
      await reloadPlans()
      return error ? planErrorText(error) : null
    },
    [uid, reloadPlans],
  )

  const cancelPlan = useCallback(
    async (planId: string) => {
      if (!uid) return 'Please sign in again.'
      const { error } = await supabase
        .from('plans')
        .update({ canceled: true })
        .eq('id', planId)
        .eq('host_id', uid)
      await reloadPlans()
      return error ? planErrorText(error) : null
    },
    [uid, reloadPlans],
  )

  return { plans, plansLoading, plansError, reloadPlans, createPlan, joinPlan, leavePlan, cancelPlan }
}
