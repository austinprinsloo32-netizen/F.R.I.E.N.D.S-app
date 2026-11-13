import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type {
  FriendRequestRow,
  Member,
  MessageRow,
  MyProfile,
  Relation,
  Thread,
  ToastItem,
  Tone,
} from '../lib/types'

import type { CommunityReportInput, ReportInput } from '../lib/safety'
import type { Plan, PlanInput } from '../lib/plans'
import type { AdminData, AdminReport } from '../lib/admin'
import type { GalleryPhoto, ProfileExtras, PromptAnswer } from '../lib/trust'
import type {
  PostRow,
  ReactionKind,
  ReactionRow,
  StatusExtra,
  StatusKind,
  StatusRow,
} from '../lib/feed'

export type FeedApi = {
  posts: PostRow[]
  feedLoading: boolean
  /** '' = fine, 'setup' = the SQL has not been run yet, anything else = message to show */
  feedError: string
  reloadFeed: () => Promise<void>
  myStatus: StatusRow | undefined
  statusOf: (id: string) => StatusRow | undefined
  statusImageOf: (id: string) => string | undefined
  setMyStatus: (kind: StatusKind, text: string, extra?: StatusExtra) => Promise<string | null>
  clearMyStatus: () => Promise<string | null>
  createPost: (content: string) => Promise<string | null>
  deletePost: (postId: string) => Promise<string | null>
  toggleReaction: (postId: string, emoji: ReactionKind) => Promise<string | null>
  reactionsFor: (postId: string) => ReactionRow[]
}

export type SafetyApi = {
  /** People you have blocked */
  blockedIds: string[]
  blockMember: (id: string) => Promise<string | null>
  unblockMember: (id: string) => Promise<string | null>
  reportMember: (input: ReportInput) => Promise<string | null>
  reportCommunityContent: (input: CommunityReportInput) => Promise<string | null>
}

export type TrustApi = {
  myExtras: ProfileExtras | undefined
  extrasOf: (id: string) => ProfileExtras | undefined
  savePrompts: (prompts: PromptAnswer[]) => Promise<string | null>
  requestPhotoCheck: () => Promise<string | null>
  loadGallery: (userId: string) => Promise<{ photos: GalleryPhoto[]; error: string }>
  addGalleryPhoto: (file: File) => Promise<string | null>
  removeGalleryPhoto: (photo: GalleryPhoto) => Promise<string | null>
}

export type PlansApi = {
  plans: Plan[]
  plansLoading: boolean
  /** '' = fine, 'setup' = the SQL has not been run yet, anything else = message to show */
  plansError: string
  reloadPlans: () => Promise<void>
  createPlan: (input: PlanInput) => Promise<string | null>
  joinPlan: (planId: string) => Promise<string | null>
  leavePlan: (planId: string) => Promise<string | null>
  cancelPlan: (planId: string) => Promise<string | null>
}

export type AdminApi = {
  isAdmin: boolean
  loadAdmin: () => Promise<AdminData>
  setReportStatus: (reportId: string, status: AdminReport['status']) => Promise<string | null>
  reviewPhoto: (targetId: string, approved: boolean) => Promise<string | null>
}

export type IncomingRequest = { request: FriendRequestRow; member: Member }
export type OutgoingRequest = { request: FriendRequestRow; member: Member }

export type AppContextValue = {
  // auth
  user: User | null
  authReady: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>

  // my profile
  me: MyProfile
  meLoading: boolean
  profileComplete: boolean
  saveProfile: (
    next: Pick<MyProfile, 'displayName' | 'bio' | 'location' | 'interests'>,
  ) => Promise<string | null>
  uploadAvatar: (file: File) => Promise<string | null>

  // members & relationships
  members: Member[]
  membersLoading: boolean
  membersError: string
  reloadMembers: () => Promise<void>
  memberById: (id: string) => Member | undefined
  relationOf: (id: string) => Relation
  friends: Member[]
  incoming: IncomingRequest[]
  outgoing: OutgoingRequest[]
  sendRequest: (receiverId: string) => Promise<string | null>
  respondToRequest: (
    requestId: string,
    decision: 'accepted' | 'declined',
  ) => Promise<string | null>

  // messaging
  threads: Thread[]
  totalUnread: number
  inboxLoading: boolean
  inboxError: string
  reloadInbox: () => Promise<void>
  conversationFor: (friendId: string) => string | undefined
  openConversation: (friendId: string) => Promise<string | null>
  loadThread: (conversationId: string) => Promise<string | null>
  messagesFor: (conversationId: string) => MessageRow[]
  sendMessage: (conversationId: string, content: string) => Promise<string | null>
  markRead: (conversationId: string, latestIso?: string) => void

  // ui
  toasts: ToastItem[]
  notify: (message: string, tone?: Tone) => void
  dismissToast: (id: number) => void
} & FeedApi &
  SafetyApi &
  TrustApi &
  PlansApi &
  AdminApi

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppProvider>')
  return value
}
