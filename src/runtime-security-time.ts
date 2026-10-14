import type { RuntimeTranslate } from './runtime-i18n'

/**
 * securityd 的 last_seen / installed_at / 审计时间是 ISO-8601 UTC。老数据里的裸时间
 * "YYYY-MM-DD HH:MM:SS" 同样是 UTC：必须补上 Z 再解析，否则 JS 按本地时间解析，
 * 展示出来的时间会比真实活动时间早一个时区（CST 差 8 小时）。
 */
export function securityTimestamp(value: unknown): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text)
  const parsed = Date.parse(hasZone ? text : `${text.replace(' ', 'T')}Z`)
  return Number.isFinite(parsed) ? parsed : null
}

/** 绝对时间（浏览器本地时区）：YYYY-MM-DD HH:MM。 */
export function securityClockTime(value: unknown): string {
  const timestamp = securityTimestamp(value)
  if (timestamp === null) return ''
  const date = new Date(timestamp)
  const pad = (item: number) => String(item).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 「最近活动」展示：刚发生说「刚刚」，一小时内说几分钟前，更早给本地绝对时间（当天省略日期）。 */
export function formatSecurityActivity(
  value: unknown,
  t: RuntimeTranslate,
  now = Date.now(),
): string {
  const timestamp = securityTimestamp(value)
  if (timestamp === null) return ''
  const elapsed = now - timestamp
  if (elapsed >= 0 && elapsed < 60_000) return t('刚刚')
  if (elapsed >= 60_000 && elapsed < 3_600_000) {
    const minutes = Math.floor(elapsed / 60_000)
    return minutes === 1 ? t('1 分钟前') : t('{minutes} 分钟前', { minutes })
  }
  const clock = securityClockTime(value)
  return new Date(now).toDateString() === new Date(timestamp).toDateString() ? clock.slice(11) : clock
}
