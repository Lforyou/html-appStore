import type { IDBPDatabase } from 'idb'
import { STORE, WRITE_STORES, openLedgerDb } from './schema'
import { DEFAULT_SETTINGS } from './catalog'
import { addDays } from '@/utils/date'
import type { Account, BudgetPlan, Category, CategoryKind, Settings, Transaction } from '@/types/domain'

let shared: Promise<LedgerRepository> | null = null

/** 全局单例连接：iOS WKWebView 里重复 openDB 的代价不低；测试侧仍可直接 new LedgerRepository()。 */
export function getLedgerRepository(): Promise<LedgerRepository> {
  if (shared === null) shared = openLedgerDb().then((db) => new LedgerRepository(db))
  return shared
}

/** 墙钟串区间统一按 [from, to) 左闭右开处理，跨月边界不会重复计入。 */
export function rangeOf(from: string, to: string): IDBKeyRange {
  return IDBKeyRange.bound(from, to, false, true)
}

export function monthRange(monthKey: string): IDBKeyRange {
  const [y, m] = monthKey.split('-').map(Number)
  const nextYear = m === 12 ? (y as number) + 1 : (y as number)
  const nextMonth = m === 12 ? 1 : (m as number) + 1
  const next = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  return IDBKeyRange.bound(`${monthKey}-01T00:00:00`, `${next}-01T00:00:00`, false, true)
}

export function dayRange(dayKey: string): IDBKeyRange {
  return IDBKeyRange.bound(`${dayKey}T00:00:00`, `${addDays(dayKey, 1)}T00:00:00`, false, true)
}

interface MetaRecord<T = unknown> {
  id: string
  value: T
}

export class LedgerRepository {
  constructor(private readonly db: IDBPDatabase) {}

  async listCategories(kind?: CategoryKind): Promise<Category[]> {
    const all = (await this.db.getAll(STORE.categories)) as Category[]
    const filtered = kind ? all.filter((c) => c.kind === kind) : all
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.db.get(STORE.categories, id) as Promise<Category | undefined>
  }

  async putCategory(category: Category): Promise<void> {
    await this.db.put(STORE.categories, category)
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.delete(STORE.categories, id)
  }

  async listAccounts(): Promise<Account[]> {
    const all = (await this.db.getAll(STORE.accounts)) as Account[]
    return all.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return this.db.get(STORE.accounts, id) as Promise<Account | undefined>
  }

  async putAccount(account: Account): Promise<void> {
    await this.db.put(STORE.accounts, account)
  }

  async listAllTransactions(): Promise<Transaction[]> {
    const all = (await this.db.getAllFromIndex(STORE.transactions, 'occurredAt')) as Transaction[]
    return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }

  /** from / to 为墙钟串，左闭右开。 */
  async listTransactions(from: string, to: string): Promise<Transaction[]> {
    const rows = (await this.db.getAllFromIndex(STORE.transactions, 'occurredAt', rangeOf(from, to))) as Transaction[]
    return rows.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }

  async listTransactionsOfMonth(monthKey: string): Promise<Transaction[]> {
    const rows = (await this.db.getAllFromIndex(STORE.transactions, 'occurredAt', monthRange(monthKey))) as Transaction[]
    return rows.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.db.get(STORE.transactions, id) as Promise<Transaction | undefined>
  }

  async putTransaction(tx: Transaction): Promise<void> {
    await this.db.put(STORE.transactions, tx)
  }

  /** 一次事务写多条：种子灌入与批量删除必须原子完成。 */
  async bulkPutTransactions(list: Transaction[]): Promise<void> {
    if (list.length === 0) return
    const tx = this.db.transaction(STORE.transactions, 'readwrite')
    await Promise.all(list.map((item) => tx.store.put(item)))
    await tx.done
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.db.delete(STORE.transactions, id)
  }

  async countTransactions(): Promise<number> {
    return this.db.count(STORE.transactions)
  }

  async firstOccurredAt(): Promise<string | null> {
    const cursor = await this.db.transaction(STORE.transactions).store.index('occurredAt').openCursor()
    return cursor ? (cursor.value as Transaction).occurredAt : null
  }

  async listBudgetPlans(): Promise<BudgetPlan[]> {
    const all = (await this.db.getAll(STORE.budgets)) as BudgetPlan[]
    return all.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  }

  async putBudgetPlan(plan: BudgetPlan): Promise<void> {
    await this.db.put(STORE.budgets, plan)
  }

  async bulkPutBudgetPlans(list: BudgetPlan[]): Promise<void> {
    if (list.length === 0) return
    const tx = this.db.transaction(STORE.budgets, 'readwrite')
    await Promise.all(list.map((item) => tx.store.put(item)))
    await tx.done
  }

  async deleteBudgetPlan(id: string): Promise<void> {
    await this.db.delete(STORE.budgets, id)
  }

  async getSettings(): Promise<Settings> {
    const stored = (await this.db.get(STORE.meta, 'settings')) as MetaRecord<Settings> | undefined
    return stored ? { ...DEFAULT_SETTINGS, ...stored.value } : { ...DEFAULT_SETTINGS }
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.db.put(STORE.meta, { id: 'settings', value: settings } satisfies MetaRecord<Settings>)
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    const record = (await this.db.get(STORE.meta, key)) as MetaRecord<T> | undefined
    return record?.value
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    await this.db.put(STORE.meta, { id: key, value } satisfies MetaRecord<T>)
  }

  async clearTransactions(): Promise<void> {
    await this.db.clear(STORE.transactions)
  }

  async clearAll(): Promise<void> {
    const tx = this.db.transaction(WRITE_STORES, 'readwrite')
    await Promise.all(WRITE_STORES.map((name) => tx.objectStore(name).clear()))
    await tx.done
  }
}
