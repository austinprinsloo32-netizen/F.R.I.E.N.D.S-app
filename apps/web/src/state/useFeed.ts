import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  STATUS_HOURS,
  isMissingTable,
  type PostRow,
  type ReactionKind,
  type ReactionRow,
  type StatusKind,
  type StatusRow,
} from '../lib/feed'
import type { FeedApi } from './context'

const POLL_MS = 30_000
const POST_LIMIT = 50

/**
 * Statuses and friends-only updates.
 * Who can see what is decided by the database rules in supabase/friends_feed.sql,
 * so this hook just asks for rows and shows whatever comes back.
 */
export function useFeed(uid: string | undefined, friendIdsKey: string): FeedApi {
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [posts, setPosts] = useState<PostRow[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState('')

  const reloadFeed = useCallback(async () => {
    if (!uid) {
      setStatuses([])
      setPosts([])
      setReactions([])
      setFeedError('')
      return
    }
    const [statusRes, postRes] = await Promise.all([
      supabase
        .from('statuses')
        .select('user_id, kind, text, expires_at, updated_at')
        .gt('expires_at', new Date().toISOString()),
      supabase
        .from('posts')
        .select('id, author_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(POST_LIMIT),
    ])

    const failed = statusRes.error ?? postRes.error
    if (failed) {
      setFeedError(
        isMissingTable(failed)
          ? 'setup'
          : 'Couldn’t load your friends’ updates. Try again in a moment.',
      )
      return
    }
    setFeedError('')
    setStatuses((statusRes.data ?? []) as StatusRow[])
    const nextPosts = (postRes.data ?? []) as PostRow[]
    setPosts(nextPosts)

    if (nextPosts.length === 0) {
      setReactions([])
      return
    }
    const { data: reactionData } = await supabase
      .from('post_reactions')
      .select('post_id, user_id, emoji, created_at')
      .in(
        'post_id',
        nextPosts.map((p) => p.id),
      )
    setReactions((reactionData ?? []) as ReactionRow[])
  }, [uid])

  // Load on sign-in, whenever the friend list changes, and every 30s while the tab is visible.
  useEffect(() => {
    let active = true
    void reloadFeed().finally(() => {
      if (active) setFeedLoading(false)
    })
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reloadFeed()
    }, POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reloadFeed, friendIdsKey])

  const myStatus = useMemo(
    () => statuses.find((s) => s.user_id === uid),
    [statuses, uid],
  )

  const statusOf = useCallback(
    (id: string) => statuses.find((s) => s.user_id === id),
    [statuses],
  )

  const setMyStatus = useCallback(
    async (kind: StatusKind, text: string) => {
      if (!uid) return 'Please sign in again.'
      const now = new Date()
      const { error } = await supabase.from('statuses').upsert(
        {
          user_id: uid,
          kind,
          text: text.trim(),
          expires_at: new Date(now.getTime() + STATUS_HOURS * 3_600_000).toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) return error.message
      await reloadFeed()
      return null
    },
    [uid, reloadFeed],
  )

  const clearMyStatus = useCallback(async () => {
    if (!uid) return 'Please sign in again.'
    const { error } = await supabase.from('statuses').delete().eq('user_id', uid)
    if (error) return error.message
    await reloadFeed()
    return null
  }, [uid, reloadFeed])

  const createPost = useCallback(
    async (content: string) => {
      if (!uid) return 'Please sign in again.'
      const trimmed = content.trim()
      if (!trimmed) return 'Write something first.'
      const { error } = await supabase
        .from('posts')
        .insert({ author_id: uid, content: trimmed })
      if (error) return error.message
      await reloadFeed()
      return null
    },
    [uid, reloadFeed],
  )

  const deletePost = useCallback(
    async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) return error.message
      setPosts((current) => current.filter((p) => p.id !== postId))
      return null
    },
    [],
  )

  const toggleReaction = useCallback(
    async (postId: string, emoji: ReactionKind) => {
      if (!uid) return 'Please sign in again.'
      const existing = reactions.find((r) => r.post_id === postId && r.user_id === uid)

      // Show the change straight away, then confirm with the database.
      setReactions((current) => {
        const rest = current.filter((r) => !(r.post_id === postId && r.user_id === uid))
        if (existing?.emoji === emoji) return rest
        return [
          ...rest,
          { post_id: postId, user_id: uid, emoji, created_at: new Date().toISOString() },
        ]
      })

      const { error } =
        existing?.emoji === emoji
          ? await supabase
              .from('post_reactions')
              .delete()
              .eq('post_id', postId)
              .eq('user_id', uid)
          : await supabase
              .from('post_reactions')
              .upsert({ post_id: postId, user_id: uid, emoji }, { onConflict: 'post_id,user_id' })

      if (error) {
        await reloadFeed()
        return error.message
      }
      return null
    },
    [uid, reactions, reloadFeed],
  )

  const reactionsFor = useCallback(
    (postId: string) => reactions.filter((r) => r.post_id === postId),
    [reactions],
  )

  return {
    posts,
    feedLoading,
    feedError,
    reloadFeed,
    myStatus,
    statusOf,
    setMyStatus,
    clearMyStatus,
    createPost,
    deletePost,
    toggleReaction,
    reactionsFor,
  }
}
