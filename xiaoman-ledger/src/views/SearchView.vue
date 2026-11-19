<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EntryRow from '@/components/EntryRow.vue'
import Icon from '@/components/Icon.vue'
import NavBar from '@/components/NavBar.vue'
import { useLedgerStore } from '@/stores/ledger'
import { searchRows, type SearchQuery } from '@/domain/search'
import { expenseCents } from '@/domain/stats'
import { formatMoney } from '@/utils/money'

/** 搜索：商户 / 备注 / 标签 / 分类 / 账户 全字段包含匹配，可再按类型与时间范围收窄。 */
const store = useLedgerStore()
const router = useRouter()

const text = ref('')
const kind = ref<SearchQuery['kind']>('all')
const scope = ref<SearchQuery['scope']>('all')

const kindOptions: { value: SearchQuery['kind']; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'transfer', label: '转账' },
]
const scopeOptions: { value: SearchQuery['scope']; label: string }[] = [
  { value: 'all', label: '不限' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' },
]

const names = { category: store.categoryName, account: store.accountName }
const hasQuery = computed(() => text.value.trim() !== '')
const hits = computed(() =>
  searchRows(store.transactions, { text: text.value, kind: kind.value, scope: scope.value }, store.today, names),
)
/** 整本账一次铺出来会撑爆 DOM，命中再多也只渲染最近 100 笔。 */
const results = computed(() => hits.value.slice(0, 100))
const resultExpense = computed(() => expenseCents(hits.value))

function openRow(occurredAt: string): void {
  void router.push(`/ledger/day/${occurredAt.slice(0, 10)}`)
}
</script>

<template>
  <NavBar title="搜索" :back="false" />

  <div class="search-bar">
    <Icon name="search" :size="16" />
    <input v-model="text" class="field" type="text" autocomplete="off" placeholder="商户、备注、分类、账户" aria-label="搜索账单" />
    <button v-if="text" class="iconbtn plain" type="button" aria-label="清空" @click="text = ''">
      <Icon name="close" :size="16" />
    </button>
  </div>

  <div class="chips">
    <button
      v-for="option in kindOptions"
      :key="option.value"
      type="button"
      class="chip sm"
      :class="{ on: kind === option.value }"
      @click="kind = option.value"
    >
      {{ option.label }}
    </button>
    <span class="chip-gap" />
    <button
      v-for="option in scopeOptions"
      :key="option.value"
      type="button"
      class="chip sm"
      :class="{ on: scope === option.value }"
      @click="scope = option.value"
    >
      {{ option.label }}
    </button>
  </div>

  <div class="screen-scroll">
    <p v-if="hasQuery && hits.length > 0" class="budget-tip">
      <span>{{ hits.length }} 笔命中 · 支出 {{ formatMoney(resultExpense) }}{{ hits.length > results.length ? ' · 仅展示最近 100 笔' : '' }}</span>
    </p>

    <div v-if="hasQuery && hits.length > 0" class="list">
      <EntryRow v-for="row in results" :key="row.id" :row="row" compact @click="openRow(row.occurredAt)" />
    </div>

    <div v-else class="state-block">
      <p class="st-title">{{ hasQuery ? '没找到匹配的账' : '想查哪一笔？' }}</p>
      <p class="st-desc">
        {{ hasQuery ? `全部 ${store.transactions.length} 笔里都没有「${text.trim()}」` : '比如「奶茶」「微信零钱」，或者你写过的备注' }}
      </p>
    </div>
  </div>
</template>
