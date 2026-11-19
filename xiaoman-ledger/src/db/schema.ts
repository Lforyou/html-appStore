import { openDB, type IDBPDatabase } from 'idb'

export const DB_NAME = 'xiaoman-ledger'
export const DB_VERSION = 1

export const STORE = {
  transactions: 'transactions',
  categories: 'categories',
  accounts: 'accounts',
  budgets: 'budgets',
  meta: 'meta',
} as const

export type StoreName = (typeof STORE)[keyof typeof STORE]

/** 参与一次写入事务的全部 store，保证记账与余额推演不会出现半写状态。 */
export const WRITE_STORES: StoreName[] = [
  STORE.transactions,
  STORE.categories,
  STORE.accounts,
  STORE.budgets,
  STORE.meta,
]

/**
 * idb 只使用全局 indexedDB，因此测试侧用 `fake-indexeddb/auto` 覆盖全局即可获得独立库。
 * 每次调用返回一个新连接；应用侧通过 createLedgerRepository() 复用单例。
 */
export function openLedgerDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const tx = db.createObjectStore(STORE.transactions, { keyPath: 'id' })
        // occurredAt 为本地墙钟串，字典序即时间序，区间查询直接可用
        tx.createIndex('occurredAt', 'occurredAt')
        tx.createIndex('categoryId', 'categoryId')
        tx.createIndex('accountId', 'accountId')
        tx.createIndex('kind', 'kind')
        db.createObjectStore(STORE.categories, { keyPath: 'id' })
        db.createObjectStore(STORE.accounts, { keyPath: 'id' })
        const budgets = db.createObjectStore(STORE.budgets, { keyPath: 'id' })
        budgets.createIndex('targetId', 'targetId')
        db.createObjectStore(STORE.meta, { keyPath: 'id' })
      }
    },
  })
}
