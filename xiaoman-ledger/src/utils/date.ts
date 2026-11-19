/**
 * 日期工具：全部基于「本地墙钟字符串 YYYY-MM-DDTHH:mm:ss」。
 * 不使用 UTC 时间戳做业务分组，避免时区导致的跨日错位。
 */

export type DayKey = string
export type MonthKey = string

export interface ClockParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function nowWallClock(at = new Date()): string {
  return (
    `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())}` +
    `T${pad2(at.getHours())}:${pad2(at.getMinutes())}:${pad2(at.getSeconds())}`
  )
}

export function parseWallClock(text: string): ClockParts {
  const [datePart = '', timePart = '00:00:00'] = text.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm, ss] = timePart.split(':').map(Number)
  return {
    year: y || 1970,
    month: m || 1,
    day: d || 1,
    hour: hh || 0,
    minute: mm || 0,
    second: ss || 0,
  }
}

export function toDate(occurredAt: string): Date {
  const p = parseWallClock(occurredAt)
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

export function dayKeyOf(occurredAt: string): DayKey {
  return occurredAt.slice(0, 10)
}

export function monthKeyOf(occurredAt: string): MonthKey {
  return occurredAt.slice(0, 7)
}

export function dayKeyOfDate(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayKey(): DayKey {
  return dayKeyOfDate(new Date())
}

export function thisMonthKey(): MonthKey {
  return todayKey().slice(0, 7)
}

export function monthKeyFrom(year: number, month: number): MonthKey {
  return `${year}-${pad2(month)}`
}

export function addDays(key: DayKey, delta: number): DayKey {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y as number, (m as number) - 1, (d as number) + delta)
  return dayKeyOfDate(date)
}

/** 月偏移并自动夹到目标月最后一天（1/31 → 2/28）。 */
export function addMonths(key: string, delta: number): string {
  const parts = key.split('-').map(Number)
  const year = parts[0] as number
  const month = parts[1] as number
  const day = parts.length > 2 ? (parts[2] as number) : 1
  const targetMonthIndex = month - 1 + delta
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = daysInMonth(targetYear, normalizedMonth + 1)
  const date = new Date(targetYear, normalizedMonth, Math.min(day, lastDay))
  return key.length > 7 ? dayKeyOfDate(date) : monthKeyFrom(targetYear, normalizedMonth + 1)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 返回 'YYYY-MM-DD' 全量日 key，用于打卡日历与「未过」占位。 */
export function monthDayKeys(monthKey: MonthKey): DayKey[] {
  const [y, m] = monthKey.split('-').map(Number)
  const total = daysInMonth(y as number, m as number)
  return Array.from({ length: total }, (_, i) => `${monthKey}-${pad2(i + 1)}`)
}

/** 周一为一周起点，与原型「一二三四五六日」一致。 */
export function weekRange(anchorDayKey: DayKey): { start: DayKey; end: DayKey; days: DayKey[] } {
  const [y, m, d] = anchorDayKey.split('-').map(Number)
  const anchor = new Date(y as number, (m as number) - 1, d as number)
  const shift = (anchor.getDay() + 6) % 7
  const start = dayKeyOfDate(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - shift))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return { start, end: days[6] as DayKey, days }
}

export function previousWeekRange(anchorDayKey: DayKey): { start: DayKey; end: DayKey; days: DayKey[] } {
  const current = weekRange(anchorDayKey)
  return weekRange(addDays(current.start, -7))
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayCn(key: DayKey): string {
  const [y, m, d] = key.split('-').map(Number)
  return WEEKDAY_CN[new Date(y as number, (m as number) - 1, d as number).getDay()] as string
}

export function weekdayShort(key: DayKey): string {
  return weekdayCn(key).slice(1)
}

/** 2026-11-15 → 11月15日 */
export function cnMonthDay(key: DayKey): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}月${Number(d)}日`
}

/** 2026-11-15 → 11/15 */
export function shortMonthDay(key: DayKey): string {
  const [, m, d] = key.split('-')
  return `${m}/${d}`
}

export function cnYearMonth(monthKey: MonthKey): string {
  const [y, m] = monthKey.split('-')
  return `${y}年${Number(m)}月`
}

export function cnYear(year: number): string {
  return `${year} 年`
}

/** 相对今天的天序：0 今天、1 昨天、2 前天，其余返回 null 由调用方走绝对日期。 */
export function relativeDayLabel(key: DayKey, today = todayKey()): string | null {
  const diff = diffDays(key, today)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  return null
}

export function diffDays(from: DayKey, to: DayKey): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const a = Date.UTC(fy as number, (fm as number) - 1, fd as number)
  const b = Date.UTC(ty as number, (tm as number) - 1, td as number)
  return Math.round((b - a) / 86_400_000)
}

/** 本月剩余天数（不含今天），用于「还能花 / 天」。 */
export function remainingDaysInMonth(monthKey: MonthKey, today = todayKey()): number {
  const total = daysInMonth(Number(monthKey.split('-')[0]), Number(monthKey.split('-')[1]))
  const dayNum = Number(today.slice(8, 10))
  const current = monthKeyOf(today)
  if (current === monthKey) return Math.max(total - dayNum, 0)
  return current > monthKey ? 0 : total
}

export function elapsedDaysInMonth(monthKey: MonthKey, today = todayKey()): number {
  if (monthKeyOf(today) === monthKey) return Number(today.slice(8, 10))
  return monthKeyOf(today) > monthKey ? daysInMonth(...(monthKey.split('-').map(Number) as [number, number])) : 0
}

export function timeOfDay(occurredAt: string): string {
  return occurredAt.slice(11, 16)
}
