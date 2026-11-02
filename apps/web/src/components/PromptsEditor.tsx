import { useState } from 'react'
import { useApp } from '../state/context'
import {
  PROMPT_ANSWER_MAX,
  PROMPT_QUESTIONS,
  PROMPT_SLOTS,
  type PromptAnswer,
} from '../lib/trust'
import Icon from './Icon'

function padded(prompts: PromptAnswer[] | undefined): PromptAnswer[] {
  const list = [...(prompts ?? [])]
  while (list.length < PROMPT_SLOTS) {
    list.push({ q: PROMPT_QUESTIONS[list.length % PROMPT_QUESTIONS.length], a: '' })
  }
  return list.slice(0, PROMPT_SLOTS)
}

/** "Ask me about" prompts + photo check request, on the profile page. */
export default function PromptsEditor() {
  const { me, myExtras, savePrompts, requestPhotoCheck, notify } = useApp()
  const [draft, setDraft] = useState<PromptAnswer[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const prompts = draft ?? padded(myExtras?.prompts)

  function update(index: number, patch: Partial<PromptAnswer>) {
    setDraft(prompts.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  async function save() {
    if (!draft || saving) return
    setSaving(true)
    const error = await savePrompts(draft)
    setSaving(false)
    notify(error ?? 'Saved.', error ? 'error' : 'success')
    if (!error) setDraft(null)
  }

  async function askForCheck() {
    if (requesting) return
    setRequesting(true)
    const error = await requestPhotoCheck()
    setRequesting(false)
    notify(error ?? 'Request sent. We’ll let you know when your photo has been checked.', error ? 'error' : 'success')
  }

  return (
    <section className="card prompts-editor">
      <h3>Ask me about…</h3>
      <p className="muted">Up to three short answers that make it easy for someone to start a conversation. Everyone on F.R.I.E.N.D.S can see these.</p>

      {prompts.map((prompt, index) => (
        <div key={index} className="prompt-slot">
          <select
            aria-label={`Prompt ${index + 1}`}
            value={prompt.q}
            onChange={(event) => update(index, { q: event.target.value })}
          >
            {PROMPT_QUESTIONS.map((question) => (
              <option key={question} value={question}>
                {question}
              </option>
            ))}
          </select>
          <input
            aria-label={`Answer ${index + 1}`}
            value={prompt.a}
            maxLength={PROMPT_ANSWER_MAX}
            placeholder="Your answer"
            onChange={(event) => update(index, { a: event.target.value })}
          />
        </div>
      ))}

      <div className="prompt-actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={!draft || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save answers'}
        </button>
      </div>

      <hr className="soft-rule" />

      <h3>Photo check</h3>
      {myExtras?.photo_checked ? (
        <p className="with-icon">
          <Icon name="shield" size={16} /> Your profile shows a <strong>Photo checked</strong> badge.
        </p>
      ) : myExtras?.photo_check_requested_at ? (
        <p className="muted">
          Requested on {new Date(myExtras.photo_check_requested_at).toLocaleDateString()}. We’ll review it soon.
        </p>
      ) : (
        <>
          <p className="muted">
            Ask for a badge that tells people your photo really is you. Someone on the team checks it by hand, and no
            selfies are stored in the app. You need a clear profile photo of your face first.
          </p>
          <div className="prompt-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={requesting || !me.avatarUrl}
              onClick={() => void askForCheck()}
            >
              Request a photo check
            </button>
          </div>
        </>
      )}
    </section>
  )
}
