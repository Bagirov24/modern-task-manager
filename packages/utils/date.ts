import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, isPast } from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return 'Сегодня'
  if (isTomorrow(d)) return 'Завтра'
  if (isYesterday(d)) return 'Вчера'
  return format(d, 'd MMM yyyy', { locale: ru })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru })
}

export function isOverdue(date: string | Date): boolean {
  return isPast(new Date(date)) && !isToday(new Date(date))
}
