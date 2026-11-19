/** 金额一律以「分」为单位做整数运算，仅在展示层转成元。 */

const YUAN_PER_CENTS = 100

export function yuanToCents(yuan: number): number {
  return Math.round(yuan * YUAN_PER_CENTS)
}

export function centsToYuan(cents: number): number {
  return cents / YUAN_PER_CENTS
}

function groupThousands(intText: string): string {
  return intText.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export interface MoneyFormatOptions {
  /** 千分位，默认开启 */
  grouping?: boolean
  /** 小数位，默认 2；传 0 输出整数元 */
  decimals?: number
  /** 强制带符号（正数显示 +） */
  signed?: boolean
}

/** 输出如 4,286.50；不含币种符号与正负号以外的装饰。 */
export function formatCents(cents: number, options: MoneyFormatOptions = {}): string {
  const { grouping = true, decimals = 2, signed = false } = options
  const negative = cents < 0
  const abs = Math.abs(cents)
  const yuan = abs / YUAN_PER_CENTS
  const text = yuan.toFixed(decimals)
  const [intPart, fracPart] = text.split('.')
  const safeInt = intPart ?? '0'
  const head = grouping ? groupThousands(safeInt) : safeInt
  const body = decimals > 0 ? `${head}.${fracPart ?? ''}` : head
  if (negative) return `-${body}`
  if (signed && cents > 0) return `+${body}`
  return body
}

const MINUS = '−'

/** 流水条目金额：支出 −26.50，收入 +12,000.00。 */
export function formatTransactionAmount(cents: number, kind: 'expense' | 'income' | 'transfer'): string {
  if (kind === 'expense') return `${MINUS}${formatCents(cents)}`
  if (kind === 'income') return `+${formatCents(cents)}`
  return formatCents(cents)
}

/** 展示为 ¥4,286.50；负数使用 −。 */
export function formatMoney(cents: number, options: MoneyFormatOptions = {}): string {
  const { signed = false, ...rest } = options
  const body = formatCents(cents, rest)
  if (body.startsWith('-')) return `¥${MINUS}${body.slice(1)}`
  return `¥${signed ? '+' : ''}${body}`
}

/** Hero 大数字：¥ 上标小字号，由模板拆列渲染。 */
export function splitMoney(cents: number, options: MoneyFormatOptions = {}): { symbol: string; body: string } {
  const abs = formatCents(Math.abs(cents), options)
  return { symbol: cents < 0 ? MINUS : '', body: abs }
}

/** 占比：分母为 0 返回 0，避免 NaN 穿透到视图。 */
export function percentOf(part: number, whole: number, decimals = 0): number {
  if (whole <= 0) return 0
  const factor = 10 ** decimals
  return Math.round((part / whole) * 100 * factor) / factor
}

/**
 * 数字键盘输入串 → 分。串最长 9 位数字、最多一个小数点。
 * 溢出返回上限值，不做静默丢弃。
 */
export function keypadTextToCents(text: string): number {
  const cleaned = text.replace(/,/g, '')
  if (cleaned === '' || cleaned === '.') return 0
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return 0
  return Math.min(yuanToCents(value), MAX_AMOUNT_CENTS)
}

export const MAX_AMOUNT_CENTS = 9_999_999_999

/** 键盘实时展示串：0 → 0，12.3 → 12.3，1000 → 1,000。 */
export function formatKeypadDisplay(text: string): string {
  const cleaned = text.replace(/,/g, '')
  if (cleaned === '') return '0'
  const [intPart = '0', fracPart] = cleaned.split('.')
  const stripped = intPart.replace(/^0+(?=\d)/, '')
  const grouped = groupThousands(stripped)
  return fracPart === undefined ? grouped : `${grouped}.${fracPart.slice(0, 2)}`
}

/** 键盘追加一位，遵守 9 位数字与单小数点约束。 */
export function keypadAppend(current: string, key: string): string {
  const digitCount = current.replace(/[^0-9]/g, '').length
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`
  if (digitCount >= 9) return current
  if (current === '0') return key
  return `${current}${key}`
}

export function keypadBackspace(current: string): string {
  const next = current.slice(0, -1)
  return next === '' || next === '.' ? '0' : next
}
