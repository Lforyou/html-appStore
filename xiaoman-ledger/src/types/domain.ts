/** 领域类型契约：所有金额为「分」整数，所有日期为本地墙钟字符串，禁用 Date.now() 参与业务比较。 */

export type Kind = 'expense' | 'income' | 'transfer'

export type CategoryKind = 'expense' | 'income'

export type AccountKind = 'cash' | 'debit' | 'ewallet' | 'credit'

/** 分类：支出 11 类 / 收入 12 类，颜色取自原型马卡龙色板（tile 底色 + 图标主色）。 */
export interface Category {
  id: string
  kind: CategoryKind
  name: string
  icon: string
  tileColor: string
  glyphColor: string
  sortOrder: number
  builtin: boolean
}

/** 账户：参与余额推演；转账只在两个账户间移动资金，不计收支、不占预算。 */
export interface Account {
  id: string
  name: string
  kind: AccountKind
  tail?: string
  openingBalanceCents: number
  color: string
  sortOrder: number
  builtin: boolean
}

/**
 * 流水。occurredAt 为 'YYYY-MM-DDTHH:mm:ss' 本地墙钟串，字典序即时间序，
 * 因此 dayKey = slice(0,10)、monthKey = slice(0,7) 可直接做区间查询。
 */
export interface Transaction {
  id: string
  kind: Kind
  /** 恒为正数的「分」；方向由 kind 决定 */
  amountCents: number
  /** expense/income 必填；transfer 为 null */
  categoryId: string | null
  /** 支出来入账户；transfer 时为转出账户 */
  accountId: string
  /** 仅 transfer：转入账户 */
  targetAccountId?: string
  occurredAt: string
  merchant: string
  note: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

/** 预算按生效月起版本化，历史月用当时生效值判定超支。 */
export interface BudgetPlan {
  id: string
  /** 'total' 表示月度总预算，否则为分类 id */
  targetId: string
  amountCents: number
  /** 'YYYY-MM'，含本月 */
  effectiveFrom: string
  updatedAt: number
}

export interface Settings {
  id: 'app'
  currencySymbol: string
  weekStartsOnMonday: true
  reminderEnabled: boolean
  reminderTime: string
  theme: 'cream'
  appLockEnabled: boolean
  unlockPin: string
  monthlyResetDay: number
  seedVersion: number
  onboardedAt: string | null
}

/** 统计视图模型 */
export interface CategorySlice {
  categoryId: string
  name: string
  icon: string
  tileColor: string
  glyphColor: string
  amountCents: number
  /** 0-100，一位小数 */
  sharePercent: number
  count: number
}

export interface PeriodSummary {
  label: string
  expenseCents: number
  incomeCents: number
  balanceCents: number
  count: number
  /** 相对上一周期的百分比变化，上一周期为 0 时返回 null */
  changePercent: number | null
}

export interface BudgetStatus {
  targetId: string
  name: string
  icon: string
  tileColor: string
  budgetCents: number
  spentCents: number
  remainingCents: number
  /** 0 以上，可超过 100 */
  usedPercent: number
  overCents: number
  perDayRemainingCents: number
  consecutiveOverMonths: number
  state: 'ok' | 'near' | 'over'
}
