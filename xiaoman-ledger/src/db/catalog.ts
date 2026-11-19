import type { Account, BudgetPlan, Category, Settings } from '@/types/domain'

/** 分类目录：与原型 S2a / S2b 的分类名称、顺序、配色逐条对应。 */
interface CategorySeed {
  id: string
  name: string
  icon: string
  sortOrder: number
}

const EXPENSE_SEED: CategorySeed[] = [
  { id: 'food', name: '餐饮', icon: 'food', sortOrder: 1 },
  { id: 'milkTea', name: '奶茶饮品', icon: 'milkTea', sortOrder: 2 },
  { id: 'transport', name: '交通', icon: 'transport', sortOrder: 3 },
  { id: 'shopping', name: '购物', icon: 'shopping', sortOrder: 4 },
  { id: 'daily', name: '日用品', icon: 'daily', sortOrder: 5 },
  { id: 'housing', name: '居住水电', icon: 'housing', sortOrder: 6 },
  { id: 'entertain', name: '娱乐', icon: 'entertain', sortOrder: 7 },
  { id: 'medical', name: '医疗健康', icon: 'medical', sortOrder: 8 },
  { id: 'study', name: '学习', icon: 'study', sortOrder: 9 },
  { id: 'social', name: '人情往来', icon: 'social', sortOrder: 10 },
  { id: 'other', name: '其他', icon: 'other', sortOrder: 11 },
]

const INCOME_SEED: CategorySeed[] = [
  { id: 'salary', name: '工资薪金', icon: 'salary', sortOrder: 1 },
  { id: 'bonus', name: '奖金绩效', icon: 'bonus', sortOrder: 2 },
  { id: 'sideJob', name: '兼职副业', icon: 'sideJob', sortOrder: 3 },
  { id: 'invest', name: '理财收益', icon: 'invest', sortOrder: 4 },
  { id: 'gift', name: '红包礼金', icon: 'gift', sortOrder: 5 },
  { id: 'reimburse', name: '报销退款', icon: 'reimburse', sortOrder: 6 },
  { id: 'fund', name: '公积金', icon: 'fund', sortOrder: 7 },
  { id: 'rentIncome', name: '房租收入', icon: 'rentIncome', sortOrder: 8 },
  { id: 'goodsReturn', name: '退货退款', icon: 'goodsReturn', sortOrder: 9 },
  { id: 'family', name: '亲属资助', icon: 'family', sortOrder: 10 },
  { id: 'lottery', name: '中奖抽奖', icon: 'lottery', sortOrder: 11 },
  { id: 'otherIncome', name: '其他收入', icon: 'otherIncome', sortOrder: 12 },
]

/** 分类名与图标色从 CATEGORY_ICONS 取，保证与原型 S0 色板同源。 */
import { CATEGORY_ICONS } from '@/assets/icons'

function toCategory(seed: CategorySeed, kind: 'expense' | 'income'): Category {
  const icon = CATEGORY_ICONS[seed.name]
  return {
    id: seed.id,
    kind,
    name: seed.name,
    icon: seed.icon,
    tileColor: icon?.tile ?? '#FBEFE2',
    glyphColor: icon?.glyph ?? '#A2907F',
    sortOrder: seed.sortOrder,
    builtin: true,
  }
}

export const EXPENSE_CATEGORIES: Category[] = EXPENSE_SEED.map((s) => toCategory(s, 'expense'))
export const INCOME_CATEGORIES: Category[] = INCOME_SEED.map((s) => toCategory(s, 'income'))
export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function categoryByName(name: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.name === name)
}

export function categoryIdByName(name: string): string {
  const found = categoryByName(name)
  if (!found) throw new Error(`目录中不存在分类：${name}`)
  return found.id
}

/** 期初余额取整百整千的示例值，用于吸收月初尚未发薪时的日内透支。 */
export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'wechat',
    name: '微信零钱',
    kind: 'ewallet',
    openingBalanceCents: 120_000,
    color: '#7CB065',
    sortOrder: 1,
    builtin: true,
  },
  {
    id: 'cmb',
    name: '招商银行 储蓄卡',
    kind: 'debit',
    tail: '6688',
    openingBalanceCents: 1_200_000,
    color: '#5B87BE',
    sortOrder: 2,
    builtin: true,
  },
  {
    id: 'lingqiantong',
    name: '零钱通',
    kind: 'ewallet',
    openingBalanceCents: 500_000,
    color: '#FFB03A',
    sortOrder: 3,
    builtin: true,
  },
  {
    id: 'alipay',
    name: '支付宝',
    kind: 'ewallet',
    openingBalanceCents: 100_000,
    color: '#9579D6',
    sortOrder: 4,
    builtin: true,
  },
  {
    id: 'cash',
    name: '现金',
    kind: 'cash',
    openingBalanceCents: 30_000,
    color: '#A2907F',
    sortOrder: 5,
    builtin: true,
  },
]

/** 预算模板：总预算与分类预算沿用原型 S5 数值。 */
interface BudgetSeed {
  targetId: string
  amountCents: number
}

const BUDGET_SEED: BudgetSeed[] = [
  { targetId: 'total', amountCents: 600_000 },
  { targetId: 'food', amountCents: 150_000 },
  { targetId: 'milkTea', amountCents: 45_000 },
  { targetId: 'transport', amountCents: 80_000 },
  { targetId: 'shopping', amountCents: 80_000 },
  { targetId: 'daily', amountCents: 40_000 },
  { targetId: 'entertain', amountCents: 30_000 },
]

/**
 * 奶茶预算需早于「连续 3 个月超支」判定窗口生效，故比其余分类提前一年。
 */
function effectiveMonth(targetId: string, now: Date): string {
  const originYear = targetId === 'milkTea' ? now.getFullYear() - 1 : now.getFullYear()
  return `${originYear}-01`
}

export function defaultBudgetPlans(now = new Date()): BudgetPlan[] {
  const stamp = Date.now()
  return BUDGET_SEED.map((b) => {
    const from = effectiveMonth(b.targetId, now)
    return {
      id: `${b.targetId}#${from}`,
      targetId: b.targetId,
      amountCents: b.amountCents,
      effectiveFrom: from,
      updatedAt: stamp,
    }
  })
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  currencySymbol: '¥',
  weekStartsOnMonday: true,
  reminderEnabled: true,
  reminderTime: '20:00',
  theme: 'cream',
  appLockEnabled: false,
  unlockPin: '',
  monthlyResetDay: 1,
  seedVersion: 0,
  onboardedAt: null,
}
