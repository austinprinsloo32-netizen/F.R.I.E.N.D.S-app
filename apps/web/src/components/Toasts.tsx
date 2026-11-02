import { useApp } from '../state/context'
import Icon from './Icon'

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <Icon name={toast.tone === 'error' ? 'shield' : 'check'} size={18} />
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
