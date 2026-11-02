import { useState } from 'react'
import { useApp } from '../state/context'
import { navigate } from '../lib/route'
import { initialsOf, shortTime } from '../lib/utils'
import { POST_MAX, REACTIONS, reactionEmoji, type PostRow } from '../lib/feed'
import Avatar from './Avatar'
import Icon from './Icon'
import SafetyActions from './SafetyActions'

/** Friends-only updates. No follower counts, no public like totals; replies go to private messages. */
export default function Feed() {
  const {
    me,
    user,
    friends,
    posts,
    feedLoading,
    feedError,
    reloadFeed,
    memberById,
    createPost,
    deletePost,
    toggleReaction,
    reactionsFor,
    notify,
  } = useApp()
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const myId = user?.id
  const myName = me.displayName.trim() || 'You'

  async function submit() {
    const content = draft.trim()
    if (!content || posting) return
    setPosting(true)
    const error = await createPost(content)
    setPosting(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setDraft('')
  }

  async function remove(post: PostRow) {
    if (!window.confirm('Delete this update?')) return
    const error = await deletePost(post.id)
    if (error) notify(error, 'error')
  }

  async function react(postId: string, kind: (typeof REACTIONS)[number]['kind']) {
    const error = await toggleReaction(postId, kind)
    if (error) notify(error, 'error')
  }

  if (feedError === 'setup') {
    return (
      <section className="panel">
        <header className="panel-head">
          <h3>Friends’ updates</h3>
        </header>
        <p className="muted panel-empty">
          Updates need a one-time database setup. Open <strong>supabase/friends_feed.sql</strong>, paste it into the
          Supabase SQL Editor and run it, then refresh this page.
        </p>
      </section>
    )
  }

  return (
    <section className="panel feed-panel" aria-label="Friends’ updates">
      <header className="panel-head">
        <h3>Friends’ updates</h3>
        <span className="muted">Friends only</span>
      </header>

      <div className="composer-card">
        <Avatar
          id={myId ?? 'me'}
          name={myName}
          initials={initialsOf(myName)}
          src={me.avatarUrl || undefined}
          size={40}
        />
        <div className="composer-body">
          <textarea
            value={draft}
            rows={2}
            maxLength={POST_MAX}
            placeholder="What are you up to? Share a thought, a plan or a win."
            aria-label="Write an update"
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="composer-foot">
            <small className="muted">
              {draft.length}/{POST_MAX}
            </small>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!draft.trim() || posting}
              onClick={() => void submit()}
            >
              <Icon name="send" size={15} /> Share
            </button>
          </div>
        </div>
      </div>

      {feedError && (
        <p className="muted panel-empty">
          {feedError}{' '}
          <button type="button" className="link-btn" onClick={() => void reloadFeed()}>
            Try again
          </button>
        </p>
      )}

      {!feedError && feedLoading && posts.length === 0 && <p className="muted panel-empty">Loading updates…</p>}

      {!feedError && !feedLoading && posts.length === 0 && (
        <p className="muted panel-empty">
          {friends.length === 0
            ? 'Updates from your friends will show up here. Find someone to connect with to get started.'
            : 'Nothing here yet. Be the first to share what you’re up to.'}
          {friends.length === 0 && (
            <>
              {' '}
              <button type="button" className="link-btn" onClick={() => navigate('discover')}>
                Find people
              </button>
            </>
          )}
        </p>
      )}

      <ul className="post-list">
        {posts.map((post) => {
          const mine = post.author_id === myId
          const author = mine ? undefined : memberById(post.author_id)
          const name = mine ? myName : (author?.name ?? 'Friend')
          const reactions = reactionsFor(post.id)
          const myReaction = reactions.find((r) => r.user_id === myId)?.emoji

          return (
            <li key={post.id} className="post">
              <header className="post-head">
                <Avatar
                  id={post.author_id}
                  name={name}
                  initials={mine ? initialsOf(myName) : (author?.initials ?? '?')}
                  src={mine ? me.avatarUrl || undefined : author?.avatarUrl}
                  size={40}
                />
                <span className="mini-main">
                  <strong>{mine ? 'You' : name}</strong>
                  <small>
                    <time dateTime={post.created_at}>{shortTime(post.created_at)}</time>
                  </small>
                </span>
                {mine ? (
                  <button type="button" className="link-btn" onClick={() => void remove(post)}>
                    Delete
                  </button>
                ) : (
                  author && <SafetyActions member={author} postId={post.id} />
                )}
              </header>

              <p className="post-text">{post.content}</p>

              {mine ? (
                <p className="muted post-reacted">
                  {reactions.length === 0
                    ? 'No reactions yet'
                    : reactions
                        .map((r) => `${memberById(r.user_id)?.name ?? 'A friend'} ${reactionEmoji(r.emoji)}`)
                        .join(' · ')}
                </p>
              ) : (
                <footer className="post-actions">
                  <span className="react-group" role="group" aria-label="React">
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction.kind}
                        type="button"
                        className={`react-btn ${myReaction === reaction.kind ? 'on' : ''}`}
                        aria-pressed={myReaction === reaction.kind}
                        aria-label={reaction.label}
                        onClick={() => void react(post.id, reaction.kind)}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => navigate(`messages/${post.author_id}`)}
                  >
                    <Icon name="message" size={15} /> Reply privately
                  </button>
                </footer>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
