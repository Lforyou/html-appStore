import type { Transaction } from '@/types/domain'

/** 搜索条件：关键词 + 类型 + 时间范围，三者都是可选维度，缺省即「全部」。 */
export interface SearchQuery {
  text: string
  kind: 'all' | 'expense' | 'income' | 'transfer'
  scope: 'all' | 'month' | 'year'
}

export interface NameLookup {
  category: (categoryId: string | null) => string
  account: (accountId?: string) => string
}

const FIELDS = ['merchant', 'note'] as const

/** 命中判定：任一可搜索字段包含关键词即算命中，大小写不敏感；空关键词返回全部。 */
export function matchesQuery(row: Transaction, text: string, names: NameLookup): boolean {
  const needle = text.trim().toLowerCase()
  if (needle === '') return true
  const haystack = [
    ...FIELDS.map((field) => row[field]),
    ...row.tags,
    names.category(row.categoryId),
    names.account(row.accountId),
    row.targetAccountId ? names.account(row.targetAccountId) : '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

/** 时间范围按墙钟串前缀比较：字典序即时间序，不需要 new Date()。 */
export function inScope(row: Transaction, query: SearchQuery, today: string): boolean {
  if (query.scope === 'all') return true
  const day = row.occurredAt.slice(0, 10)
  return query.scope === 'month' ? day.slice(0, 7) === today.slice(0, 7) : day.slice(0, 4) === today.slice(0, 4)
}

/** 搜索结果按时间倒序，最新一笔在最上。 */
export function searchRows(rows: Transaction[], query: SearchQuery, today: string, names: NameLookup): Transaction[] {
  return rows
    .filter((row) => (query.kind === 'all' || row.kind === query.kind) && inScope(row, query, today) && matchesQuery(row, query.text, names))
    .sort((a, b) => (a.occurredAt === b.occurredAt ? b.id.localeCompare(a.id) : b.occurredAt.localeCompare(a.occurredAt)))
}
