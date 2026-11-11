import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveAvatars } from '../lib/media'
import {
  COMMUNITY_CODE_MIN,
  COMMUNITY_MEMBERS_PAGE,
  COMMUNITY_PLAN_DETAILS_MAX,
  COMMUNITY_PLAN_MAX_SPOTS,
  COMMUNITY_PLAN_PLACE_MAX,
  COMMUNITY_PLAN_TITLE_MAX,
  COMMUNITY_POST_MAX,
  communityErrorText,
  type Community,
  type CommunityDirectoryRow,
  type CommunityPerson,
  type CommunityPlan,
  type CommunityPlanInput,
  type CommunityPlanMemberRow,
  type CommunityPlanRow,
  type CommunityPost,
  type CommunityRole,
} from '../lib/communities'

const POLL_MS = 30_000
const COMMUNITY_COLUMNS =
  'id, name, description, guidelines, invite_code, max_members, joining_open, created_at'
const PLAN_COLUMNS = 'id, community_id, host_id, title, details, place, starts_at, spots, canceled, created_at'
/** Keep a plan on screen for a few hours after it starts, like Activities. */
const KEEP_AFTER_START_MS = 3 * 3_600_000

async function resolveDirectoryRows(rows: CommunityDirectoryRow[]): Promise<CommunityPerson[]> {
  const urls = await resolveAvatars(rows.map((row) => row.avatar_path))
  return rows.map(({ avatar_path, ...row }) => ({
    ...row,
    avatar_url: avatar_path ? urls[avatar_path] ?? null : null,
  }))
}

/** The communities you belong to. The database only returns communities you are in. */
export function useCommunities(uid: string | undefined) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!uid) {
      setCommunities([])
      setError('')
      return
    }
    const { data, error: dbError } = await supabase
      .from('communities')
      .select(COMMUNITY_COLUMNS)
      .order('name', { ascending: true })
    if (dbError) {
      setError(communityErrorText(dbError))
      return
    }
    setError('')
    setCommunities((data ?? []) as Community[])
  }, [uid])

  useEffect(() => {
    let active = true
    void reload().finally(() => {
      if (active) setLoading(false)
    })
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reload])

  /** Returns an error message, or null on success (plus the community id). */
  const joinByCode = useCallback(
    async (code: string): Promise<{ error: string | null; id: string | null }> => {
      const clean = code.trim()
      if (clean.length < COMMUNITY_CODE_MIN) {
        return { error: 'Invite codes are at least 6 characters.', id: null }
      }
      const { data, error: dbError } = await supabase.rpc('join_community', { code: clean })
      if (dbError) return { error: communityErrorText(dbError), id: null }
      await reload()
      return { error: null, id: data as string }
    },
    [reload],
  )

  const leaveCommunity = useCallback(
    async (communityId: string) => {
      if (!uid) return 'Please sign in again.'
      const { error: dbError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', uid)
      await reload()
      return dbError ? communityErrorText(dbError) : null
    },
    [uid, reload],
  )

  return { communities, loading, error, reload, joinByCode, leaveCommunity }
}

/** Everything inside one community: news, plans and members. */
export function useCommunityDetail(communityId: string, uid: string | undefined) {
  const [myRole, setMyRole] = useState<CommunityRole | null>(null)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [plans, setPlans] = useState<CommunityPlan[]>([])
  const [people, setPeople] = useState<Record<string, CommunityPerson>>({})
  const [memberList, setMemberList] = useState<CommunityPerson[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [memberOffset, setMemberOffset] = useState(0)
  const [membersHasMore, setMembersHasMore] = useState(true)
  const [membersLoadingMore, setMembersLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** Look up names for people who appear in posts and plans. */
  const resolvePeople = useCallback(
    async (ids: string[]) => {
      const requested = Array.from(new Set(ids))
      if (requested.length === 0) return
      const rows: CommunityDirectoryRow[] = []
      for (let start = 0; start < requested.length; start += 200) {
        const { data, error } = await supabase.rpc('community_directory', {
          cid: communityId,
          only_ids: requested.slice(start, start + 200),
          page_limit: 200,
          page_offset: 0,
        })
        if (error) {
          setError(communityErrorText(error))
          return
        }
        rows.push(...((data ?? []) as CommunityDirectoryRow[]))
      }
      const peopleRows = await resolveDirectoryRows(rows)
      if (peopleRows.length === 0) return
      setPeople((prev) => {
        const next = { ...prev }
        for (const row of peopleRows) next[row.user_id] = row
        return next
      })
    },
    [communityId],
  )

  const reload = useCallback(async () => {
    if (!uid) return
    const cutoff = new Date(Date.now() - KEEP_AFTER_START_MS).toISOString()

    const [summaryRes, postRes, planRes] = await Promise.all([
      supabase.rpc('community_summary', { cid: communityId }),
      supabase
        .from('community_posts')
        .select('id, community_id, author_id, body, created_at')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('community_plans')
        .select(PLAN_COLUMNS)
        .eq('community_id', communityId)
        .eq('canceled', false)
        .gte('starts_at', cutoff)
        .order('starts_at', { ascending: true })
        .limit(40),
    ])

    const failed = summaryRes.error ?? postRes.error ?? planRes.error
    if (failed) {
      setError(communityErrorText(failed))
      return
    }
    setError('')
    const summary = summaryRes.data as { my_role?: CommunityRole; member_count?: number } | null
    setMyRole(summary?.my_role ?? null)
    setMemberCount(summary?.member_count ?? 0)

    const postRows = (postRes.data ?? []) as CommunityPost[]
    setPosts(postRows)

    const planRows = (planRes.data ?? []) as CommunityPlanRow[]
    let memberRows: CommunityPlanMemberRow[] = []
    if (planRows.length > 0) {
      const { data, error: memberError } = await supabase
        .from('community_plan_members')
        .select('plan_id, user_id, joined_at')
        .in(
          'plan_id',
          planRows.map((p) => p.id),
        )
      if (memberError) {
        setError(communityErrorText(memberError))
        return
      }
      memberRows = (data ?? []) as CommunityPlanMemberRow[]
    }
    setPlans(planRows.map((row) => ({ ...row, members: memberRows.filter((m) => m.plan_id === row.id) })))

    await resolvePeople(
      [
        ...postRows.map((p) => p.author_id),
        ...planRows.map((p) => p.host_id),
        ...memberRows.map((m) => m.user_id),
      ],
    )
  }, [communityId, uid, resolvePeople])

  const loadMembers = useCallback(
    async (offset: number) => {
      if (offset > 0) setMembersLoadingMore(true)
      try {
        const { data, error: dbError } = await supabase.rpc('community_directory', {
          cid: communityId,
          only_ids: null,
          page_limit: COMMUNITY_MEMBERS_PAGE,
          page_offset: offset,
        })
        if (dbError) {
          setError(communityErrorText(dbError))
          return
        }
        const rows = await resolveDirectoryRows((data ?? []) as CommunityDirectoryRow[])
        setMemberList((prev) => (offset === 0 ? rows : [...prev, ...rows]))
        setMemberOffset(offset + COMMUNITY_MEMBERS_PAGE)
        setMembersHasMore(rows.length === COMMUNITY_MEMBERS_PAGE)
        setPeople((prev) => {
          const next = { ...prev }
          for (const row of rows) next[row.user_id] = row
          return next
        })
      } catch (error) {
        setError(
          error instanceof Error
            ? communityErrorText({ message: error.message })
            : 'Something went wrong. Please try again.',
        )
      } finally {
        if (offset > 0) setMembersLoadingMore(false)
      }
    },
    [communityId],
  )

  useEffect(() => {
    let active = true
    void Promise.all([reload(), loadMembers(0)]).finally(() => {
      if (active) setLoading(false)
    })
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reload, loadMembers])

  const run = useCallback(
    async (action: () => PromiseLike<{ error: { code?: string; message?: string } | null }>) => {
      const { error: dbError } = await action()
      await reload()
      return dbError ? communityErrorText(dbError) : null
    },
    [reload],
  )

  const postAnnouncement = useCallback(
    async (body: string) => {
      const text = body.trim()
      if (!uid) return 'Please sign in again.'
      if (!text) return 'Write something to share.'
      if (text.length > COMMUNITY_POST_MAX) return `Keep it under ${COMMUNITY_POST_MAX} characters.`
      return run(() =>
        supabase.from('community_posts').insert({ community_id: communityId, author_id: uid, body: text }),
      )
    },
    [uid, communityId, run],
  )

  const deletePost = useCallback(
    (postId: string) => run(() => supabase.from('community_posts').delete().eq('id', postId)),
    [run],
  )

  const createPlan = useCallback(
    async (input: CommunityPlanInput) => {
      if (!uid) return 'Please sign in again.'
      const title = input.title.trim()
      if (title.length < 3) return 'Give your plan a short title (at least 3 characters).'
      if (title.length > COMMUNITY_PLAN_TITLE_MAX) return `Keep the title under ${COMMUNITY_PLAN_TITLE_MAX} characters.`
      const start = new Date(input.startsAt)
      if (!input.startsAt || Number.isNaN(start.getTime())) return 'Choose a date and time.'
      if (start.getTime() <= Date.now()) return 'Choose a time in the future.'
      const spots = Math.round(input.spots)
      if (!(spots >= 1 && spots <= COMMUNITY_PLAN_MAX_SPOTS)) {
        return `Spots must be between 1 and ${COMMUNITY_PLAN_MAX_SPOTS}.`
      }
      return run(() =>
        supabase.from('community_plans').insert({
          community_id: communityId,
          host_id: uid,
          title,
          place: input.place.trim().slice(0, COMMUNITY_PLAN_PLACE_MAX),
          details: input.details.trim().slice(0, COMMUNITY_PLAN_DETAILS_MAX),
          starts_at: start.toISOString(),
          spots,
        }),
      )
    },
    [uid, communityId, run],
  )

  const joinPlan = useCallback(
    (planId: string) => run(() => supabase.rpc('join_community_plan', { target: planId })),
    [run],
  )

  const leavePlan = useCallback(
    async (planId: string) => {
      if (!uid) return 'Please sign in again.'
      return run(() =>
        supabase.from('community_plan_members').delete().eq('plan_id', planId).eq('user_id', uid),
      )
    },
    [uid, run],
  )

  const cancelPlan = useCallback(
    (planId: string) => run(() => supabase.rpc('cancel_community_plan', { target: planId })),
    [run],
  )

  const removeMember = useCallback(
    async (target: string) => {
      const error = await run(() => supabase.rpc('remove_community_member', { cid: communityId, target }))
      if (!error) await loadMembers(0)
      return error
    },
    [communityId, loadMembers, run],
  )

  return {
    myRole,
    posts,
    plans,
    people,
    memberList,
    memberCount,
    membersHasMore,
    membersLoadingMore,
    loading,
    error,
    reload,
    loadMoreMembers: () => loadMembers(memberOffset),
    postAnnouncement,
    deletePost,
    createPlan,
    joinPlan,
    leavePlan,
    cancelPlan,
    removeMember,
  }
}
