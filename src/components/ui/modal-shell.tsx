import { useEffect, type ReactNode } from 'react'
import { useLocale } from '../../contexts/locale-context'
import { Icon } from '../../lib/icons'

interface ModalShellProps {
  titleId: string
  title: ReactNode
  onClose: () => void
  headerActions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidthClass?: string
}

export const ModalShell = ({
  titleId,
  title,
  onClose,
  headerActions,
  children,
  footer,
  maxWidthClass = 'max-w-2xl',
}: ModalShellProps) => {
  const { t } = useLocale()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-4 backdrop-blur-sm sm:py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[calc(100dvh-2rem)] w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] shadow-2xl shadow-slate-950/30 sm:max-h-[calc(100dvh-3rem)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-none border-b border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4 backdrop-blur sm:px-6">
          <h3 id={titleId} className="text-lg font-semibold text-[var(--text-strong)]">
            {title}
          </h3>
          <div className="flex items-center gap-1.5">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text)] transition hover:text-[var(--text-strong)]"
              aria-label={t.labels.close}
            >
              <Icon name="close" className="text-[20px] leading-none" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 rounded-none border-t border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
