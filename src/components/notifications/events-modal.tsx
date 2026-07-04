import { useNow, useTimeZone } from '../../contexts/time-context'
import { useLocale } from '../../contexts/locale-context'
import { ModalShell } from '../ui/modal-shell'
import { NotificationFeed } from './notifications-feed'
import type { NotificationItem } from './competition-notifications'
import { buildEventTimelineDayGroups } from './events-timeline'
import { Icon } from '../../lib/icons'

interface EventsModalProps {
  notifications: NotificationItem[]
  onClose: () => void
}

export const EventsModal = ({ notifications, onClose }: EventsModalProps) => {
  const { locale, t } = useLocale()
  const nowMs = useNow()
  const timeZone = useTimeZone()
  const dayGroups = buildEventTimelineDayGroups(notifications, locale, timeZone, t.labels.today, nowMs)

  return (
    <ModalShell
      titleId="events-modal-title"
      title={(
        <span className="inline-flex items-center gap-2">
          <Icon name="notifications" className="text-[18px]" />
          <span>{t.labels.eventsSection}</span>
        </span>
      )}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {dayGroups.map((dayGroup) => (
          <section key={dayGroup.dayKey} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                {dayGroup.dayLabel}
              </p>
              <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
            </div>
            <NotificationFeed notifications={dayGroup.notifications} onAction={onClose} variant="timeline" className="space-y-0" />
          </section>
        ))}
      </div>
    </ModalShell>
  )
}
