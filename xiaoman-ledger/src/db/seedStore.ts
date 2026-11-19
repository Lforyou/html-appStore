import type { Transaction } from '@/types/domain'
import type { LedgerRepository } from './repository'
import { SEED_VERSION } from './seedAnchors'
import { buildSeedDataset } from './seed'
import type { SeedDataset } from './seed'
import type { SeedInvariants } from './seedVerify'

/* ------------------------------------------------------------------ *
 * 落库：灌入 / 幂等检查 / 恢复示例 / 清空账目
 * ------------------------------------------------------------------ */

export async function applySeed(repo: LedgerRepository, dataset: SeedDataset): Promise<void> {
  await repo.clearAll()
  for (const category of dataset.categories) await repo.putCategory(category)
  for (const account of dataset.accounts) await repo.putAccount(account)
  await repo.bulkPutBudgetPlans(dataset.budgetPlans)
  await repo.bulkPutTransactions(dataset.transactions)
  await repo.saveSettings(dataset.settings)
  await repo.setMeta('seedVersion', dataset.settings.seedVersion)
}

export interface SeedOutcome {
  action: 'seeded' | 'kept'
  transactionCount: number
  warnings: string[]
}

export async function ensureSeeded(repo: LedgerRepository, options: { today?: Date } = {}): Promise<SeedOutcome> {
  const applied = await repo.getMeta<number>('seedVersion')
  const existing = await repo.countTransactions()
  if (applied === SEED_VERSION && existing > 0) {
    return { action: 'kept', transactionCount: existing, warnings: [] }
  }
  const dataset = buildSeedDataset({ today: options.today })
  await applySeed(repo, dataset)
  return { action: 'seeded', transactionCount: dataset.transactions.length, warnings: dataset.warnings }
}

export async function restoreDemoData(repo: LedgerRepository, options: { today?: Date } = {}): Promise<SeedDataset> {
  const dataset = buildSeedDataset({ today: options.today })
  await applySeed(repo, dataset)
  return dataset
}

/** 清空账目但保留分类/账户/预算模板，回到「空账本」。 */
export async function clearUserData(repo: LedgerRepository): Promise<void> {
  await repo.clearTransactions()
  await repo.setMeta('seedVersion', SEED_VERSION)
}

export function countByKind(transactions: Transaction[]): Record<'expense' | 'income' | 'transfer', number> {
  const acc = { expense: 0, income: 0, transfer: 0 }
  for (const t of transactions) acc[t.kind] += 1
  return acc
}


export function formatInvariantSummary(inv: SeedInvariants): string {
  return [
    `本月支出 ¥${(inv.currentMonthExpenseCents / 100).toFixed(2)}`,
    `年度支出 ¥${(inv.yearlyExpenseCents / 100).toFixed(2)}`,
    `年度收入 ¥${(inv.yearlyIncomeCents / 100).toFixed(2)}`,
    `连续记账 ${inv.streakDays} 天`,
  ].join(' · ')
}

