import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toJpeg } from '../lib/trust'
import {
  MUSIC_URL_MAX,
  STATUS_BUCKET,
  STATUS_HOURS,
  STATUS_IMAGE_MAX_BYTES,
  STATUS_IMAGE_TTL,
  parseMusicLink,
  type StatusExtra,
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
  const [statusImages, setStatusImages] = useState<Record<string, string>>({})
  const signedCache = useRef(new Map<string, { url: string; at: number }>())

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
        .select('*')
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
    const statusRows = (statusRes.data ?? []) as StatusRow[]
    setStatuses(statusRows)

    // Photos on statuses: signed links are reused so the pictures do not reload every 30 seconds.
    const withImage = statusRows.filter((row) => row.image_path)
    const stale = withImage
      .map((row) => row.image_path as string)
      .filter((path) => {
        const hit = signedCache.current.get(path)
        return !hit || Date.now() - hit.at > (STATUS_IMAGE_TTL - 600) * 1000
      })
    if (stale.length > 0) {
      const { data: signed } = await supabase.storage
        .from(STATUS_BUCKET)
        .createSignedUrls(stale, STATUS_IMAGE_TTL)
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl && !item.error) {
          signedCache.current.set(item.path, { url: item.signedUrl, at: Date.now() })
        }
      }
    }
    const nextImages: Record<string, string> = {}
    for (const row of withImage) {
      const hit = signedCache.current.get(row.image_path as string)
      if (hit) nextImages[row.user_id] = hit.url
    }
    setStatusImages(nextImages)
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

  const statusImageOf = useCallback((id: string) => statusImages[id], [statusImages])

  const setMyStatus = useCallback(
    async (kind: StatusKind, text: string, extra?: StatusExtra) => {
      if (!uid) return 'Please sign in again.'

      const musicRaw = (extra?.musicUrl ?? '').trim()
      if (musicRaw && (musicRaw.length > MUSIC_URL_MAX || !parseMusicLink(musicRaw))) {
        return 'Use a link from Spotify, YouTube, Apple Music, SoundCloud or Deezer.'
      }

      const oldPath = statuses.find((row) => row.user_id === uid)?.image_path ?? null
      let imagePath: string | null = oldPath
      let uploaded: string | null = null

      if (extra?.imageFile) {
        const file = extra.imageFile
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          return 'Please choose a JPG, PNG or WebP image.'
        }
        const blob = await toJpeg(file, 1280)
        if (blob.size > STATUS_IMAGE_MAX_BYTES) return 'That photo is over 5 MB. Please choose a smaller one.'
        uploaded = `${uid}/${crypto.randomUUID()}.jpg`
        const { error: uploadError } = await supabase.storage.from(STATUS_BUCKET).upload(uploaded, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || 'image/jpeg',
        })
        if (uploadError) {
          return /bucket/i.test(uploadError.message)
            ? 'Photo statuses need a one-time setup. Run supabase/status_media.sql in Supabase.'
            : uploadError.message
        }
        imagePath = uploaded
      } else if (extra?.removeImage) {
        imagePath = null
      }

      const now = new Date()
      const { error } = await supabase.from('statuses').upsert(
        {
          user_id: uid,
          kind,
          text: text.trim(),
          image_path: imagePath,
          music_url: musicRaw || null,
          expires_at: new Date(now.getTime() + STATUS_HOURS * 3_600_000).toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        if (uploaded) await supabase.storage.from(STATUS_BUCKET).remove([uploaded])
        return /image_path|music_url/i.test(error.message)
          ? 'Photo and song statuses need a one-time setup. Run supabase/status_media.sql in Supabase.'
          : error.message
      }
      if (oldPath && oldPath !== imagePath) await supabase.storage.from(STATUS_BUCKET).remove([oldPath])
      await reloadFeed()
      return null
    },
    [uid, statuses, reloadFeed],
  )

  const clearMyStatus = useCallback(async () => {
    if (!uid) return 'Please sign in again.'
    const oldPath = statuses.find((row) => row.user_id === uid)?.image_path ?? null
    const { error } = await supabase.from('statuses').delete().eq('user_id', uid)
    if (error) return error.message
    if (oldPath) await supabase.storage.from(STATUS_BUCKET).remove([oldPath])
    await reloadFeed()
    return null
  }, [uid, statuses, reloadFeed])

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
    statusImageOf,
    setMyStatus,
    clearMyStatus,
    createPost,
    deletePost,
    toggleReaction,
    reactionsFor,
  }
}
