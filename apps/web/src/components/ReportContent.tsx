import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../state/context'
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  type CommunityContentKind,
  type ReportReason,
} from '../lib/safety'
import Icon from './Icon'

type Props = {
  kind: CommunityContentKind
  targetId: string
}

/** "Report" button and dialog for a Communities post or plan. The author is never told who reported. */
export default function ReportContent({ kind, targetId }: Props) {
  const { reportCommunityContent, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('inappropriate')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const noun = kind === 'plan' ? 'plan' : 'post'

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function submit() {
    if (busy) return
    setBusy(true)
    const error = await reportCommunityContent({ kind, targetId, reason, details })
    setBusy(false)
    if (error) {
      notify(error, 'error')
      return
    }
    setOpen(false)
    setDetails('')
    notify('Thanks. Your report was sent to the F.R.I.E.N.D.S team.', 'success')
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        aria-label={`Report this ${noun}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="flag" /> Report
      </button>
      {open &&
        createPortal(
          <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
            <div
              className="sheet safety-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`Report this ${noun}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="safety-body">
                <h2>Report this {noun}</h2>
                <p className="muted">
                  Reports go to the F.R.I.E.N.D.S team. The person who wrote it won’t be told who reported it.
                </p>
                <div className="safety-reasons" role="radiogroup" aria-label="Reason">
                  {REPORT_REASONS.map((item) => (
                    <label key={item.reason} className={`safety-reason ${reason === item.reason ? 'on' : ''}`}>
                      <input
                        type="radio"
                        name={`report-reason-${targetId}`}
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
                <div className="safety-actions">
                  <button type="button" className="btn btn-md btn-primary" disabled={busy} onClick={() => void submit()}>
                    Send report
                  </button>
                  <button type="button" className="btn btn-md btn-ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
