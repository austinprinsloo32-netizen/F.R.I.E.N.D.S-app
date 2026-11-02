export type Member = {
  id: string
  name: string
  hasName: boolean
  location: string
  bio: string
  interests: string[]
  initials: string
  avatarUrl?: string
}

export type MyProfile = {
  displayName: string
  bio: string
  location: string
  interests: string[]
  avatarUrl: string
}

export type RequestStatus = 'pending' | 'accepted' | 'declined'

export type FriendRequestRow = {
  id: string
  sender_id: string
  receiver_id: string
  status: RequestStatus
  created_at: string
}

export type RelationStatus = 'none' | 'friends' | 'sent' | 'received'

export type Relation = {
  status: RelationStatus
  requestId?: string
}

export type ConversationRow = {
  id: string
  user_one: string
  user_two: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export type Thread = {
  conversationId: string
  member: Member
  last?: MessageRow
  unread: number
}

export type Tone = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  tone: Tone
}
