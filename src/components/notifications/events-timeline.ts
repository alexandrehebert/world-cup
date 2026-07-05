import { getMatchDayKey } from '../../lib/format'
import type { LocaleCode } from '../../types/tournament'
import type { NotificationItem } from './competition-notifications'
import { getIntlDateLocale } from '../../translations/intl'

export interface EventTimelineDayGroup {
  dayKey: string
  dayLabel: string
  notifications: NotificationItem[]
}

export const buildEventTimelineDayGroups = (
  notifications: NotificationItem[],
  locale: LocaleCode,
  timeZone: string,
  todayLabel: string,
  nowMs: number,
): EventTimelineDayGroup[] => {
  const dateLocale = getIntlDateLocale(locale)
  const todayKey = getMatchDayKey(new Date(nowMs).toISOString(), timeZone)
  const dayGroups = new Map<string, EventTimelineDayGroup>()

  const sortedNotifications = [...notifications].sort((first, second) => second.timestamp.localeCompare(first.timestamp))

  for (const notification of sortedNotifications) {
    const dayKey = getMatchDayKey(notification.timestamp, timeZone)
    const existingGroup = dayGroups.get(dayKey)

    if (existingGroup) {
      existingGroup.notifications.push(notification)
      continue
    }

    dayGroups.set(dayKey, {
      dayKey,
      dayLabel: dayKey === todayKey
        ? todayLabel
        : new Intl.DateTimeFormat(dateLocale, { dateStyle: 'full', timeZone }).format(new Date(notification.timestamp)),
      notifications: [notification],
    })
  }

  return [...dayGroups.values()].sort((first, second) => second.dayKey.localeCompare(first.dayKey))
}
