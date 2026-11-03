import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AVATAR_BUCKET, AVATAR_TTL, resolveAvatars } from '../lib/media'
import { toMember } from '../lib/utils'
import { useFeed } from './useFeed'
import { useSafety } from './useSafety'
import { useTrust } from './useTrust'
import { usePlans } from './usePlans'
import { useAdmin } from './useAdmin'
import type {
  ConversationRow,
  FriendRequestRow,
  Member,
  MessageRow,
  MyProfile,
  Relation,
  Thread,
  ToastItem,
  Tone,
} from '../lib/types'
import {
  AppContext,
  type AppContextValue,
  type IncomingRequest,
  type OutgoingRequest,
} from './context'

const PROFILE_COLUMNS = 'id, display_name, bio, location, interests, avatar_path'
const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, content, created_at'
const REQUEST_COLUMNS = 'id, sender_id, receiver_id, status, created_at'
const EMPTY_PROFILE: MyProfile = {
  displayName: '',
  bio: '',
  location: '',
  interests: [],
  avatarUrl: '',
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function mergeMessages(
  existing: MessageRow[] | undefined,
  incoming: MessageRow[],
): MessageRow[] {
  const map = new Map<string, MessageRow>()
  for (const m of existing ?? []) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return [...map.values()].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  )
}

function groupByConversation(rows: MessageRow[]): Record<string, MessageRow[]> {
  const grouped: Record<string, MessageRow[]> = {}
  for (const row of rows) {
    ;(grouped[row.conversation_id] ??= []).push(row)
  }
  return grouped
}

export default function AppProvider({ children }: { children: ReactNode }) {
  // ---------- auth ----------
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const uid = user?.id

  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setUser(data.session?.user ?? null)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return error ? error.message : null
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) return { error: error.message, needsConfirmation: false }
    return { error: null, needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.hash = ''
  }, [])

  // ---------- toasts ----------
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: Tone = 'info') => {
      toastId.current += 1
      const id = toastId.current
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismissToast(id), 4200)
    },
    [dismissToast],
  )

  // ---------- my profile ----------
  const [me, setMe] = useState<MyProfile>(EMPTY_PROFILE)
  const [meLoading, setMeLoading] = useState(false)

  useEffect(() => {
    if (!uid) {
      setMe(EMPTY_PROFILE)
      return
    }
    let active = true
    setMeLoading(true)

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', uid)
        .maybeSingle()

      if (!active) return
      if (error) {
        notify(errorText(error, 'Could not load your profile.'), 'error')
        setMeLoading(false)
        return
      }

      const urls = await resolveAvatars([data?.avatar_path])
      if (!active) return
      setMe({
        displayName: data?.display_name ?? '',
        bio: data?.bio ?? '',
        location: data?.location ?? '',
        interests: data?.interests ?? [],
        avatarUrl: data?.avatar_path ? (urls[data.avatar_path] ?? '') : '',
      })
      setMeLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [uid, notify])

  const profileComplete = Boolean(me.displayName.trim()) && me.interests.length > 0

  const saveProfile = useCallback(
    async (
      next: Pick<MyProfile, 'displayName' | 'bio' | 'location' | 'interests'>,
    ) => {
      if (!uid) return 'Please sign in to save your profile.'
      const { error } = await supabase.from('profiles').upsert(
        {
          id: uid,
          display_name: next.displayName.trim(),
          bio: next.bio.trim(),
          location: next.location.trim(),
          interests: next.interests,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      if (error) return errorText(error, 'Could not save your profile.')
      setMe((current) => ({
        ...current,
        displayName: next.displayName.trim(),
        bio: next.bio.trim(),
        location: next.location.trim(),
        interests: next.interests,
      }))
      return null
    },
    [uid],
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!uid) return 'Please sign in to upload a photo.'
      const types: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      }
      const extension = types[file.type]
      if (!extension) return 'Please choose a JPG, PNG or WebP image.'
      if (file.size > 5 * 1024 * 1024) return 'Your photo must be 5 MB or smaller.'

      const path = `${uid}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
      if (uploadError) return errorText(uploadError, 'Could not upload your photo.')

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq('id', uid)
        .select('id')
        .maybeSingle()
      if (updateError || !updated) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path])
        return updateError
          ? errorText(updateError, 'Could not save your photo.')
          : 'Save your profile details first, then add a photo.'
      }

      const { data, error: urlError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, AVATAR_TTL)
      if (urlError) return errorText(urlError, 'Photo saved, but could not display it.')
      setMe((current) => ({ ...current, avatarUrl: data.signedUrl }))
      return null
    },
    [uid],
  )

  // ---------- members ----------
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')

  const reloadMembers = useCallback(async () => {
    if (!uid) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    setMembersError('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .neq('id', uid)
        .order('display_name', { ascending: true })
      if (error) throw error
      const rows = data ?? []
      const urls = await resolveAvatars(rows.map((r) => r.avatar_path))
      setMembers(
        rows.map((r) => toMember(r, r.avatar_path ? urls[r.avatar_path] : undefined)),
      )
    } catch (error) {
      setMembers([])
      setMembersError(errorText(error, 'Could not load members.'))
    } finally {
      setMembersLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void reloadMembers()
  }, [reloadMembers])

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const memberById = useCallback((id: string) => memberMap.get(id), [memberMap])

  // ---------- friend requests ----------
  const [requests, setRequests] = useState<FriendRequestRow[]>([])

  const reloadRequests = useCallback(async () => {
    if (!uid) {
      setRequests([])
      return
    }
    const { data, error } = await supabase
      .from('friend_requests')
      .select(REQUEST_COLUMNS)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    if (!error) setRequests((data ?? []) as FriendRequestRow[])
  }, [uid])

  useEffect(() => {
    void reloadRequests()
  }, [reloadRequests])

  const relations = useMemo(() => {
    const map = new Map<string, Relation>()
    for (const r of requests) {
      const other = r.sender_id === uid ? r.receiver_id : r.sender_id
      if (r.status === 'accepted') {
        map.set(other, { status: 'friends', requestId: r.id })
      } else if (r.status === 'pending' && map.get(other)?.status !== 'friends') {
        map.set(other, {
          status: r.sender_id === uid ? 'sent' : 'received',
          requestId: r.id,
        })
      }
    }
    return map
  }, [requests, uid])

  const relationOf = useCallback(
    (id: string): Relation => relations.get(id) ?? { status: 'none' },
    [relations],
  )

  const friends = useMemo(
    () =>
      members
        .filter((m) => relations.get(m.id)?.status === 'friends')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members, relations],
  )

  const incoming = useMemo<IncomingRequest[]>(() => {
    const list: IncomingRequest[] = []
    for (const r of requests) {
      if (r.status !== 'pending' || r.receiver_id !== uid) continue
      const member = memberMap.get(r.sender_id)
      if (member) list.push({ request: r, member })
    }
    return list
  }, [requests, memberMap, uid])

  const outgoing = useMemo<OutgoingRequest[]>(() => {
    const list: OutgoingRequest[] = []
    for (const r of requests) {
      if (r.status !== 'pending' || r.sender_id !== uid) continue
      const member = memberMap.get(r.receiver_id)
      if (member) list.push({ request: r, member })
    }
    return list
  }, [requests, memberMap, uid])

  const sendRequest = useCallback(
    async (receiverId: string) => {
      if (!uid) return 'Please sign in to send a friend request.'
      if (relations.has(receiverId)) return 'A request already exists for this member.'
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: uid, receiver_id: receiverId, status: 'pending' })
        .select(REQUEST_COLUMNS)
        .single()
      if (error) {
        if (error.code === '23505') {
          return 'A request already exists for this member, or you are already connected.'
        }
        return 'Could not send your request. Please try again.'
      }
      setRequests((current) => [data as FriendRequestRow, ...current])
      return null
    },
    [uid, relations],
  )

  const respondToRequest = useCallback(
    async (requestId: string, decision: 'accepted' | 'declined') => {
      if (!uid) return 'Please sign in.'
      const { data, error } = await supabase
        .from('friend_requests')
        .update({ status: decision })
        .eq('id', requestId)
        .eq('receiver_id', uid)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()
      if (error) return errorText(error, 'Could not update the request.')
      if (!data) return 'This request could not be updated. It may have already been handled.'
      setRequests((current) =>
        decision === 'declined'
          ? current.filter((r) => r.id !== requestId)
          : current.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r)),
      )
      return null
    },
    [uid],
  )

  // ---------- messaging ----------
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [messagesByConv, setMessagesByConv] = useState<Record<string, MessageRow[]>>({})
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxError, setInboxError] = useState('')
  const [lastRead, setLastRead] = useState<Record<string, string>>({})

  const lastReadKey = uid ? `friends:lastRead:${uid}` : null

  useEffect(() => {
    if (!lastReadKey) {
      setLastRead({})
      return
    }
    try {
      setLastRead(JSON.parse(localStorage.getItem(lastReadKey) ?? '{}'))
    } catch {
      setLastRead({})
    }
  }, [lastReadKey])

  const markRead = useCallback(
    (conversationId: string, latestIso?: string) => {
      if (!lastReadKey) return
      const stamp = latestIso ?? new Date().toISOString()
      setLastRead((current) => {
        const existing = current[conversationId]
        if (existing && Date.parse(existing) >= Date.parse(stamp)) return current
        const next = { ...current, [conversationId]: stamp }
        try {
          localStorage.setItem(lastReadKey, JSON.stringify(next))
        } catch {
          // Storage can be unavailable (private mode); unread state is then per-session.
        }
        return next
      })
    },
    [lastReadKey],
  )

  const reloadInbox = useCallback(async () => {
    if (!uid) {
      setConversations([])
      setMessagesByConv({})
      return
    }
    try {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('id, user_one, user_two')
        .or(`user_one.eq.${uid},user_two.eq.${uid}`)
      if (error) throw error
      const list = (convs ?? []) as ConversationRow[]
      setConversations(list)

      if (list.length > 0) {
        const { data: msgs, error: msgError } = await supabase
          .from('messages')
          .select(MESSAGE_COLUMNS)
          .in(
            'conversation_id',
            list.map((c) => c.id),
          )
          .order('created_at', { ascending: false })
          .limit(300)
        if (msgError) throw msgError
        const grouped = groupByConversation((msgs ?? []) as MessageRow[])
        setMessagesByConv((current) => {
          const next = { ...current }
          for (const id of Object.keys(grouped)) {
            next[id] = mergeMessages(current[id], grouped[id])
          }
          return next
        })
      }
      setInboxError('')
    } catch (error) {
      setInboxError(errorText(error, 'Could not load your conversations.'))
    }
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setConversations([])
      setMessagesByConv({})
      return
    }
    setInboxLoading(true)
    void reloadInbox().finally(() => setInboxLoading(false))
  }, [uid, reloadInbox])

  // Live updates: realtime when enabled on the `messages` table, with a gentle poll as a safety net.
  const conversationsRef = useRef<ConversationRow[]>([])
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    if (!uid) return

    const channel = supabase
      .channel(`messages-for-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as MessageRow
          if (conversationsRef.current.some((c) => c.id === row.conversation_id)) {
            setMessagesByConv((current) => ({
              ...current,
              [row.conversation_id]: mergeMessages(current[row.conversation_id], [row]),
            }))
          } else {
            void reloadInbox()
          }
        },
      )
      .subscribe()

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reloadInbox()
    }, 20_000)

    return () => {
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [uid, reloadInbox])

  const conversationFor = useCallback(
    (friendId: string) =>
      conversations.find((c) => c.user_one === friendId || c.user_two === friendId)?.id,
    [conversations],
  )

  const openConversation = useCallback(
    async (friendId: string) => {
      if (!uid || friendId === uid) return null
      const existing = conversationFor(friendId)
      if (existing) return existing

      const [userOne, userTwo] = [uid, friendId].sort()
      try {
        const { data: found, error: lookupError } = await supabase
          .from('conversations')
          .select('id, user_one, user_two')
          .eq('user_one', userOne)
          .eq('user_two', userTwo)
          .maybeSingle()
        if (lookupError) throw lookupError

        let row = found as ConversationRow | null
        if (!row) {
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({ user_one: userOne, user_two: userTwo })
            .select('id, user_one, user_two')
            .single()
          if (createError) {
            if (createError.code !== '23505') throw createError
            const { data: retry, error: retryError } = await supabase
              .from('conversations')
              .select('id, user_one, user_two')
              .eq('user_one', userOne)
              .eq('user_two', userTwo)
              .single()
            if (retryError) throw retryError
            row = retry as ConversationRow
          } else {
            row = created as ConversationRow
          }
        }
        const conversation = row as ConversationRow
        setConversations((current) =>
          current.some((c) => c.id === conversation.id)
            ? current
            : [...current, conversation],
        )
        return conversation.id
      } catch (error) {
        notify(errorText(error, 'Could not open this conversation.'), 'error')
        return null
      }
    },
    [uid, conversationFor, notify],
  )

  const loadThread = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return errorText(error, 'Could not load messages.')
    setMessagesByConv((current) => ({
      ...current,
      [conversationId]: mergeMessages(current[conversationId], (data ?? []) as MessageRow[]),
    }))
    return null
  }, [])

  const messagesFor = useCallback(
    (conversationId: string) => messagesByConv[conversationId] ?? [],
    [messagesByConv],
  )

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!uid) return 'Please sign in.'
      const tempId = `tmp-${crypto.randomUUID()}`
      const temp: MessageRow = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: uid,
        content,
        created_at: new Date().toISOString(),
      }
      setMessagesByConv((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId], [temp]),
      }))

      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: uid, content })
        .select(MESSAGE_COLUMNS)
        .single()

      if (error || !data) {
        setMessagesByConv((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).filter((m) => m.id !== tempId),
        }))
        return errorText(error, 'Could not send your message.')
      }

      setMessagesByConv((current) => ({
        ...current,
        [conversationId]: mergeMessages(
          (current[conversationId] ?? []).filter((m) => m.id !== tempId),
          [data as MessageRow],
        ),
      }))
      return null
    },
    [uid],
  )

  const threads = useMemo<Thread[]>(() => {
    const list: Thread[] = []
    for (const c of conversations) {
      const otherId = c.user_one === uid ? c.user_two : c.user_one
      const member = memberMap.get(otherId)
      if (!member) continue
      const msgs = messagesByConv[c.id] ?? []
      const readAt = lastRead[c.id] ? Date.parse(lastRead[c.id]) : 0
      const unread = msgs.filter(
        (m) => m.sender_id !== uid && Date.parse(m.created_at) > readAt,
      ).length
      list.push({ conversationId: c.id, member, last: msgs[msgs.length - 1], unread })
    }
    return list.sort(
      (a, b) =>
        (b.last ? Date.parse(b.last.created_at) : 0) -
        (a.last ? Date.parse(a.last.created_at) : 0),
    )
  }, [conversations, messagesByConv, lastRead, memberMap, uid])

  // ---------- statuses & friends feed ----------
  const friendIdsKey = useMemo(() => friends.map((f) => f.id).join(','), [friends])
  const feed = useFeed(uid, friendIdsKey)
  const { reloadFeed } = feed

  // ---------- blocking & reporting ----------
  const afterBlockChange = useCallback(async () => {
    await Promise.all([reloadRequests(), reloadInbox(), reloadFeed()])
  }, [reloadRequests, reloadInbox, reloadFeed])
  const safety = useSafety(uid, afterBlockChange)

  const trust = useTrust(uid)
  const plansApi = usePlans(uid, friendIdsKey)
  const admin = useAdmin(uid)

  const blockedSet = useMemo(() => new Set(safety.blockedIds), [safety.blockedIds])
  const visibleMembers = useMemo(
    () => members.filter((m) => !blockedSet.has(m.id)),
    [members, blockedSet],
  )
  const visibleThreads = useMemo(
    () => threads.filter((t) => !blockedSet.has(t.member.id)),
    [threads, blockedSet],
  )
  const visibleUnread = useMemo(
    () => visibleThreads.reduce((sum, t) => sum + t.unread, 0),
    [visibleThreads],
  )

  const value: AppContextValue = {
    ...feed,
    ...safety,
    ...trust,
    ...plansApi,
    ...admin,
    user,
    authReady,
    signIn,
    signUp,
    signOut,
    me,
    meLoading,
    profileComplete,
    saveProfile,
    uploadAvatar,
    members: visibleMembers,
    membersLoading,
    membersError,
    reloadMembers,
    memberById,
    relationOf,
    friends,
    incoming,
    outgoing,
    sendRequest,
    respondToRequest,
    threads: visibleThreads,
    totalUnread: visibleUnread,
    inboxLoading,
    inboxError,
    reloadInbox,
    conversationFor,
    openConversation,
    loadThread,
    messagesFor,
    sendMessage,
    markRead,
    toasts,
    notify,
    dismissToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
