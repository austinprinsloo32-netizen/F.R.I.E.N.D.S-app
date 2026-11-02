import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import { clockTime, dayLabel, shortTime } from '../lib/utils'
import type { Member, MessageRow } from '../lib/types'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import SafetyActions from '../components/SafetyActions'

const MAX_LENGTH = 2000

function ChatThread({
  conversationId,
  friend,
}: {
  conversationId: string
  friend: Member
}) {
  const { user, messagesFor, loadThread, sendMessage, markRead, notify } = useApp()
  const messages = messagesFor(conversationId)
  const [loading, setLoading] = useState(messages.length === 0)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let active = true
    void loadThread(conversationId).then((message) => {
      if (!active) return
      setError(message ?? '')
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [conversationId, loadThread])

  const lastMessage = messages[messages.length - 1]

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, conversationId])

  useEffect(() => {
    if (lastMessage) markRead(conversationId, lastMessage.created_at)
  }, [conversationId, lastMessage, markRead])

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setDraft('')
    const failure = await sendMessage(conversationId, content)
    setSending(false)
    if (failure) {
      setDraft(content)
      notify(failure, 'error')
    }
    inputRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  // Group consecutive messages by sender and add day dividers.
  const rows: { message: MessageRow; day?: string; showTime: boolean; first: boolean }[] = []
  messages.forEach((message, index) => {
    const prev = messages[index - 1]
    const next = messages[index + 1]
    const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(message.created_at).toDateString()
    const first = newDay || prev.sender_id !== message.sender_id
    const endsGroup =
      !next ||
      next.sender_id !== message.sender_id ||
      Date.parse(next.created_at) - Date.parse(message.created_at) > 5 * 60_000 ||
      new Date(next.created_at).toDateString() !== new Date(message.created_at).toDateString()
    rows.push({ message, day: newDay ? dayLabel(message.created_at) : undefined, showTime: endsGroup, first })
  })

  return (
    <>
      <header className="thread-head">
        <button
          type="button"
          className="icon-btn thread-back"
          onClick={() => navigate('messages')}
          aria-label="Back to conversations"
        >
          <Icon name="arrowLeft" size={19} />
        </button>
        <Avatar id={friend.id} name={friend.name} initials={friend.initials} src={friend.avatarUrl} size={42} />
        <div className="thread-who">
          <strong>{friend.name}</strong>
          <small>{friend.location || 'Friend'}</small>
        </div>
        <SafetyActions member={friend} onDone={() => navigate('messages')} />
      </header>

      <div className="thread-body">
        {loading ? (
          <p className="thread-note">Loading messages…</p>
        ) : error && messages.length === 0 ? (
          <p className="thread-note" role="alert">
            {error}
          </p>
        ) : messages.length === 0 ? (
          <div className="thread-empty">
            <span className="empty-icon">
              <Icon name="heart" size={26} />
            </span>
            <h3>Say hello to {friend.name.split(' ')[0]}</h3>
            <p>A simple “hi” and something you have in common is a great start.</p>
          </div>
        ) : (
          rows.map(({ message, day, showTime, first }) => {
            const own = message.sender_id === user?.id
            const pending = message.id.startsWith('tmp-')
            return (
              <div key={message.id}>
                {day && <div className="day-divider">{day}</div>}
                <div className={`bubble-row ${own ? 'own' : ''} ${first ? 'first' : ''}`}>
                  <div className={`bubble ${own ? 'bubble-own' : 'bubble-friend'} ${pending ? 'pending' : ''}`}>
                    {message.content}
                  </div>
                  {showTime && (
                    <time className="bubble-time" dateTime={message.created_at}>
                      {pending ? 'Sending…' : clockTime(message.created_at)}
                    </time>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${friend.name.split(' ')[0]}`}
          aria-label="Write a message"
        />
        <button type="submit" className="send-btn" disabled={!draft.trim() || sending} aria-label="Send message">
          <Icon name="send" size={18} />
        </button>
      </form>
    </>
  )
}

export default function Messages({ friendId }: { friendId?: string }) {
  const {
    friends,
    threads,
    conversationFor,
    openConversation,
    inboxLoading,
    inboxError,
    reloadInbox,
    membersLoading,
  } = useApp()

  const friend = friendId ? friends.find((f) => f.id === friendId) : undefined
  const existing = friendId ? conversationFor(friendId) : undefined
  const [created, setCreated] = useState<{ friendId: string; id: string } | null>(null)
  const attempted = useRef<string | null>(null)
  const conversationId = existing ?? (created && created.friendId === friendId ? created.id : undefined)

  useEffect(() => {
    if (!friendId || !friend || existing || attempted.current === friendId) return
    attempted.current = friendId
    void openConversation(friendId).then((id) => {
      if (id) setCreated({ friendId, id })
      else attempted.current = null
    })
  }, [friendId, friend, existing, openConversation])

  const withoutThread = friends.filter((f) => !conversationFor(f.id))
  const notFriend = Boolean(friendId) && !friend && !membersLoading

  return (
    <div className={`messages ${friendId ? 'has-thread' : ''}`}>
      <aside className="inbox">
        <div className="inbox-head">
          <h2>Conversations</h2>
        </div>

        <div className="inbox-list">
          {inboxLoading && threads.length === 0 ? (
            <p className="thread-note">Loading conversations…</p>
          ) : inboxError ? (
            <div className="empty empty-small">
              <p role="alert">{inboxError}</p>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void reloadInbox()}>
                Try again
              </button>
            </div>
          ) : threads.length === 0 ? (
            <div className="empty empty-small">
              <span className="empty-icon">
                <Icon name="message" size={22} />
              </span>
              <h3>No conversations yet</h3>
              <p>
                {friends.length === 0
                  ? 'Connect with someone in Discover, then start chatting here.'
                  : 'Pick a friend below to say hello.'}
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.conversationId}
                type="button"
                className={`thread-row ${friendId === thread.member.id ? 'active' : ''} ${thread.unread ? 'unread' : ''}`}
                onClick={() => navigate(`messages/${thread.member.id}`)}
              >
                <Avatar
                  id={thread.member.id}
                  name={thread.member.name}
                  initials={thread.member.initials}
                  src={thread.member.avatarUrl}
                  size={48}
                />
                <span className="thread-meta">
                  <span className="thread-top">
                    <strong>{thread.member.name}</strong>
                    {thread.last && <time>{shortTime(thread.last.created_at)}</time>}
                  </span>
                  <span className="thread-bottom">
                    <small>{thread.last ? thread.last.content : 'No messages yet'}</small>
                    {thread.unread > 0 && (
                      <span className="count count-alert">{thread.unread > 9 ? '9+' : thread.unread}</span>
                    )}
                  </span>
                </span>
              </button>
            ))
          )}

          {withoutThread.length > 0 && (
            <div className="start-strip">
              <p className="filter-label">Start a conversation</p>
              <div className="start-list">
                {withoutThread.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="start-item"
                    onClick={() => navigate(`messages/${f.id}`)}
                  >
                    <Avatar id={f.id} name={f.name} initials={f.initials} src={f.avatarUrl} size={44} />
                    <small>{f.name.split(' ')[0]}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <section className="thread-pane">
        {friend && conversationId ? (
          <ChatThread key={conversationId} conversationId={conversationId} friend={friend} />
        ) : friend ? (
          <div className="thread-empty">
            <p className="thread-note">Opening conversation…</p>
          </div>
        ) : notFriend ? (
          <div className="thread-empty">
            <span className="empty-icon">
              <Icon name="users" size={26} />
            </span>
            <h3>You can message friends</h3>
            <p>Once this person accepts your request, you’ll be able to chat here.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('friends')}>
              View friends
            </button>
          </div>
        ) : (
          <div className="thread-empty">
            <span className="empty-icon">
              <Icon name="message" size={26} />
            </span>
            <h3>Choose a conversation</h3>
            <p>Your private messages with friends appear here.</p>
          </div>
        )}
      </section>
    </div>
  )
}
