<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EntryRow from '@/components/EntryRow.vue'
import NavBar from '@/components/NavBar.vue'
import Sheet from '@/components/Sheet.vue'
import { useLedgerStore } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import { expenseCents, incomeCents } from '@/domain/stats'
import { cnMonthDay, timeOfDay, weekdayCn } from '@/utils/date'
import { formatMoney, formatTransactionAmount } from '@/utils/money'
import type { Transaction } from '@/types/domain'

/** 当日账单：这一天记了什么、各账户动了多少，点条目可改可删。 */
const props = defineProps<{ dayKey: string }>()
const store = useLedgerStore()
const router = useRouter()
const { show } = useToast()

const rows = computed(() => [...store.rowsOfDay(props.dayKey)].reverse())
const dayExpense = computed(() => expenseCents(rows.value))
const dayIncome = computed(() => incomeCents(rows.value))

const picked = ref<Transaction | null>(null)
const detail = computed(() => {
  const row = picked.value
  if (!row) return []
  const items: { label: string; value: string }[] = [
    { label: '金额', value: formatTransactionAmount(row.amountCents, row.kind) },
    { label: row.kind === 'transfer' ? '转账方向' : '分类', value: row.kind === 'transfer' ? `${store.accountName(row.accountId)} → ${store.accountName(row.targetAccountId)}` : store.categoryName(row.categoryId) },
    { label: '时间', value: `${cnMonthDay(row.occurredAt.slice(0, 10))} ${timeOfDay(row.occurredAt)}` },
  ]
  if (row.kind !== 'transfer') items.push({ label: '账户', value: store.accountName(row.accountId) })
  if (row.merchant) items.push({ label: '商户', value: row.merchant })
  if (row.note) items.push({ label: '备注', value: row.note })
  if (row.tags.length > 0) items.push({ label: '标签', value: row.tags.join(' · ') })
  return items
})

function close(): void {
  picked.value = null
}

async function remove(): Promise<void> {
  const row = picked.value
  if (!row) return
  await store.removeEntry(row.id)
  close()
  show('已删除这一笔', `${cnMonthDay(row.occurredAt.slice(0, 10))} ${formatMoney(row.amountCents)}`)
}

function edit(): void {
  const row = picked.value
  if (!row) return
  close()
  void router.push({ path: `/entry/${row.kind}`, query: { id: row.id } })
}
</script>

<template>
  <NavBar :title="`${cnMonthDay(props.dayKey)} · ${weekdayCn(props.dayKey)}`" :subtitle="`${rows.length} 笔`" />

  <div class="screen-scroll">
    <section class="hero">
      <div class="hero-top">
        <p class="cap">当日支出</p>
        <p class="cap num">{{ rows.length }} 笔</p>
      </div>
      <p class="h1 num">{{ formatMoney(dayExpense) }}</p>
      <div v-if="dayIncome > 0" class="hero-2col">
        <div class="mini">
          <p class="cap">当日收入</p>
          <p class="v num">{{ formatMoney(dayIncome) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">当日结余</p>
          <p class="v num">{{ formatMoney(dayIncome - dayExpense) }}</p>
        </div>
      </div>
    </section>

    <div v-if="rows.length === 0" class="state-block">
      <p class="st-title">这天没有账</p>
      <p class="st-desc">补一笔，日历上的印章就齐了</p>
    </div>

    <div v-else class="list">
      <EntryRow v-for="row in rows" :key="row.id" :row="row" @click="picked = row" />
    </div>

    <p class="budget-tip">
      <span>点条目可改金额、换分类或删除</span>
    </p>
  </div>

  <Sheet :open="picked !== null" title="这一笔" @close="close">
    <div class="list flat">
      <div v-for="item in detail" :key="item.label" class="li">
        <span class="lt">{{ item.label }}</span>
        <span class="lv num">{{ item.value }}</span>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn danger" type="button" @click="remove">删除</button>
      <button class="btn primary" type="button" @click="edit">修改</button>
    </div>
  </Sheet>
</template>
