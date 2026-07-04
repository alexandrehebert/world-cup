import { useDashboard } from '../../contexts/dashboard-context'
import { useLocale } from '../../contexts/locale-context'
import { useNow } from '../../contexts/time-context'
import type { NotificationItem } from './competition-notifications'

const getRelativeTimeLabel = (timestamp: string, locale: 'en' | 'fr', nowMs: number) => {
  const eventMs = new Date(timestamp).getTime()
  if (!Number.isFinite(eventMs)) {
    return ''
  }

  const diffMs = eventMs - nowMs
  const diffMinutes = Math.round(diffMs / 60000)
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) {
    return relative.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relative.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return relative.format(diffDays, 'day')
}

export const NotificationFeed = ({
  notifications,
  onAction,
  className = '',
  variant = 'cards',
}: {
  notifications: NotificationItem[]
  onAction?: () => void
  className?: string
  variant?: 'cards' | 'timeline'
}) => {
  const { t, locale } = useLocale()
  const { setSelectedMatchId, setSelectedTeamId } = useDashboard()
  const nowMs = useNow()

  if (notifications.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{t.labels.noNotifications}</p>
  }

  if (variant === 'timeline') {
    return (
      <ul className={`relative ${className || 'space-y-0'}`.trim()}>
        <span className="pointer-events-none absolute bottom-0 left-[5.75rem] top-0 z-0 w-px bg-[var(--border)]" aria-hidden="true" />
        {notifications.map((notification) => {
          return (
            <li key={notification.id} className="grid grid-cols-[4.75rem_1rem_minmax(0,1fr)] items-start gap-2 py-2">
              <p className="self-center whitespace-nowrap text-right text-[11px] leading-none text-[var(--text-soft)]">
                {getRelativeTimeLabel(notification.timestamp, locale, nowMs)}
              </p>

              <div className="relative z-10 flex self-center justify-center" aria-hidden="true">
                <span
                  className={`relative z-10 inline-flex h-3 w-3 rounded-full border-2 shadow-[0_0_0_2px_var(--surface)] ${
                    notification.tone === 'live' || notification.tone === 'soon'
                      ? 'border-[var(--accent)] bg-[var(--surface)]'
                      : 'border-[var(--border-strong)] bg-[var(--surface)]'
                  }`}
                />
              </div>

              <p className="text-sm leading-relaxed text-[var(--text)]">
                {notification.tokens.map((token, tokenIndex) => {
                  if (token.type === 'text') {
                    return <span key={`${notification.id}-${tokenIndex}`}>{token.value}</span>
                  }

                  if (token.type === 'team') {
                    return (
                      <button
                        key={`${notification.id}-${tokenIndex}`}
                        type="button"
                        onClick={() => {
                          setSelectedTeamId(token.teamId)
                          onAction?.()
                        }}
                        className="cursor-pointer text-[var(--accent-text)] underline decoration-dotted underline-offset-3 transition hover:text-[var(--text-strong)]"
                      >
                        {token.value}
                      </button>
                    )
                  }

                  return (
                    <button
                      key={`${notification.id}-${tokenIndex}`}
                      type="button"
                      onClick={() => {
                        setSelectedMatchId(token.matchId)
                        onAction?.()
                      }}
                      className="cursor-pointer text-[var(--accent-text)] underline decoration-dotted underline-offset-3 transition hover:text-[var(--text-strong)]"
                    >
                      {token.value}
                    </button>
                  )
                })}
              </p>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className={className || 'space-y-2'}>
      {notifications.map((notification) => (
        <li
          key={notification.id}
          className={`overflow-hidden rounded-[var(--radius-sm)] border px-3 py-2 text-sm ${
            notification.tone === 'live'
              ? 'border-[var(--accent-border)] bg-[var(--accent-muted)]'
              : notification.tone === 'soon'
                ? 'border-[var(--accent-border)] bg-[var(--surface-soft)]'
              : 'border-[var(--border)] bg-[var(--surface-soft)]'
          }`}
        >
          <p className="leading-relaxed">
            {notification.tokens.map((token, index) => {
              if (token.type === 'text') {
                return <span key={`${notification.id}-${index}`}>{token.value}</span>
              }

              if (token.type === 'team') {
                return (
                  <button
                    key={`${notification.id}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(token.teamId)
                      onAction?.()
                    }}
                    className="cursor-pointer text-[var(--accent-text)] underline decoration-dotted underline-offset-3 transition hover:text-[var(--text-strong)]"
                  >
                    {token.value}
                  </button>
                )
              }

              return (
                <button
                  key={`${notification.id}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedMatchId(token.matchId)
                    onAction?.()
                  }}
                  className="cursor-pointer text-[var(--accent-text)] underline decoration-dotted underline-offset-3 transition hover:text-[var(--text-strong)]"
                >
                  {token.value}
                </button>
              )
            })}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            {getRelativeTimeLabel(notification.timestamp, locale, nowMs)}
          </p>
        </li>
      ))}
    </ul>
  )
}
