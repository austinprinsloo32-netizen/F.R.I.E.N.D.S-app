import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../state/context'
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '../lib/safety'
import type { Member } from '../lib/types'
import Icon from './Icon'

type Props = {
  member: Member
  /** When reporting a specific update */
  postId?: string
  /** 'icon' = round "..." button, 'text' = "Report or block" link */
  variant?: 'icon' | 'text'
  /** Called after the person has been blocked (e.g. close a screen) */
  onDone?: () => void
}

/** Report / block menu with its confirmation dialogs. Nobody is told they were blocked or reported. */
export default function SafetyActions({ member, postId, variant = 'icon', onDone }: Props) {
  const { blockMember, reportMember, notify } = useApp()
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState<'report' | 'block' | null>(null)
  const [reason, setReason] = useState<ReportReason>('harassment')
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const first = member.name.split(/\s+/)[0]

  useEffect(() => {
    if (!dialog) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  function toggleMenu() {
    if (menu) {
      setMenu(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const width = 210
      const height = 108
      const below = rect.bottom + 6
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
      setPos({ top, left })
    }
    setMenu(true)
  }

  function openDialog(kind: 'report' | 'block') {
    setMenu(false)
    setReason('harassment')
    setDetails('')
    setAlsoBlock(false)
    setDialog(kind)
  }

  async function confirmBlock() {
    if (busy) return
    setBusy(true)
    const error = await blockMember(member.id)
    setBusy(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setDialog(null)
    notify(`${member.name} is blocked. They won’t be told.`, 'success')
    onDone?.()
  }

  async function submitReport() {
    if (busy) return
    setBusy(true)
    const error = await reportMember({ reportedId: member.id, postId, reason, details })
    if (error) {
      setBusy(false)
      notify(error, 'error')
      return
    }
    let blocked = false
    if (alsoBlock) {
      const blockError = await blockMember(member.id)
      if (blockError) notify(blockError, 'error')
      else blocked = true
    }
    setBusy(false)
    setDialog(null)
    notify(
      blocked
        ? `Thanks. Your report was sent and ${member.name} is blocked.`
        : 'Thanks. Your report was sent to the F.R.I.E.N.D.S team.',
      'success',
    )
    if (blocked) onDone?.()
  }

  return (
    <span className="safety">
      {variant === 'icon' ? (
        <button
          type="button"
          className="icon-btn safety-trigger"
          aria-label={`More options for ${member.name}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          ref={triggerRef}
          onClick={toggleMenu}
        >
          <Icon name="more" size={18} />
        </button>
      ) : (
        <button type="button" className="link-btn" aria-haspopup="menu" aria-expanded={menu} ref={triggerRef} onClick={toggleMenu}>
          Report or block
        </button>
      )}

      {menu &&
        createPortal(
          <>
            <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />
            <div className="safety-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
              <button type="button" role="menuitem" onClick={() => openDialog('report')}>
                <Icon name="flag" size={16} /> Report {first}
              </button>
              <button type="button" role="menuitem" className="danger" onClick={() => openDialog('block')}>
                <Icon name="ban" size={16} /> Block {first}
              </button>
            </div>
          </>,
          document.body,
        )}

      {dialog &&
        createPortal(
          <div className="sheet-backdrop" onClick={() => setDialog(null)} role="presentation">
            <div
              className="sheet safety-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={dialog === 'block' ? `Block ${member.name}` : `Report ${member.name}`}
              onClick={(event) => event.stopPropagation()}
            >
              {dialog === 'block' ? (
                <div className="safety-body">
                  <h2>Block {member.name}?</h2>
                  <ul className="safety-list">
                    <li>They won’t see your status or updates, and you won’t see theirs.</li>
                    <li>They can’t message you or send you friend requests.</li>
                    <li>You’ll stop being friends.</li>
                    <li>They won’t be told. You can unblock anyone from your profile page.</li>
                  </ul>
                  <div className="safety-actions">
                    <button type="button" className="btn btn-md btn-danger" disabled={busy} onClick={() => void confirmBlock()}>
                      Block {first}
                    </button>
                    <button type="button" className="btn btn-md btn-ghost" onClick={() => setDialog(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="safety-body">
                  <h2>Report {member.name}</h2>
                  <p className="muted">
                    Reports go to the F.R.I.E.N.D.S team and {first} won’t be told who reported them.
                    {postId ? ' This report will include the update you’re looking at.' : ''}
                  </p>
                  <div className="safety-reasons" role="radiogroup" aria-label="Reason">
                    {REPORT_REASONS.map((item) => (
                      <label key={item.reason} className={`safety-reason ${reason === item.reason ? 'on' : ''}`}>
                        <input
                          type="radio"
                          name={`report-reason-${member.id}`}
                          checked={reason === item.reason}
                          onChange={() => setReason(item.reason)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <label className="field">
                    <span>Anything else we should know? (optional)</span>
                    <textarea
                      rows={3}
                      value={details}
                      maxLength={REPORT_DETAILS_MAX}
                      onChange={(event) => setDetails(event.target.value)}
                    />
                    <small>
                      {details.length}/{REPORT_DETAILS_MAX}
                    </small>
                  </label>
                  <label className="safety-check">
                    <input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} />
                    <span>Also block {first}</span>
                  </label>
                  <div className="safety-actions">
                    <button type="button" className="btn btn-md btn-primary" disabled={busy} onClick={() => void submitReport()}>
                      Send report
                    </button>
                    <button type="button" className="btn btn-md btn-ghost" onClick={() => setDialog(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  )
}
