import { useEffect } from 'react'
import { Icon } from '../../lib/icons'

export const FeedbackPopup = ({
  message,
  onDismiss,
  dismissLabel,
  durationMs = 3200,
}: {
  message: string | null
  onDismiss: () => void
  dismissLabel: string
  durationMs?: number
}) => {
  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss()
    }, durationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [durationMs, message, onDismiss])

  if (!message) {
    return null
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,28rem)] -translate-x-1/2 border border-rose-300/40 bg-rose-950/95 px-3 py-2 text-sm text-rose-100 shadow-lg backdrop-blur"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center text-rose-200 hover:text-rose-50"
          aria-label={dismissLabel}
        >
          <Icon name="close" className="text-base leading-none" />
        </button>
      </div>
    </div>
  )
}
