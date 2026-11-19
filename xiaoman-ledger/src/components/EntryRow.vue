<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useLedgerStore } from '@/stores/ledger'
import { formatTransactionAmount } from '@/utils/money'
import { timeOfDay } from '@/utils/date'
import type { Transaction } from '@/types/domain'

/** 流水条目：分类色块 + 商户/备注 + 带符号金额，转账显示「转出 → 转入」。 */
const props = defineProps<{ row: Transaction; compact?: boolean }>()
const emit = defineEmits<{ click: [] }>()

const store = useLedgerStore()

const tile = computed(() => {
  if (props.row.kind === 'transfer') return { name: '转账', tile: '#EFE7DE', glyph: '#A2907F', transfer: true }
  const category = props.row.categoryId ? store.categoryById.get(props.row.categoryId) : undefined
  return {
    name: category?.name ?? '未分类',
    tile: category?.tileColor ?? '#F1EBE3',
    glyph: category?.glyphColor ?? '#A2907F',
    transfer: false,
  }
})

const title = computed(() => props.row.merchant || tile.value.name)
const subtitle = computed(() => {
  if (props.row.kind === 'transfer') return `${store.accountName(props.row.accountId)} → ${store.accountName(props.row.targetAccountId)}`
  const account = store.accountName(props.row.accountId)
  const note = props.row.note ? ` · ${props.row.note}` : ''
  return `${timeOfDay(props.row.occurredAt)}${note}${account ? ` · ${account}` : ''}`
})
const amountClass = computed(() => (props.row.kind === 'income' ? 'amt in' : props.row.kind === 'transfer' ? 'amt tr' : 'amt'))
</script>

<template>
  <div class="row" :class="{ compact: props.compact }" role="button" tabindex="0" @click="emit('click')" @keydown.enter="emit('click')">
    <span class="tile t40" :style="{ background: tile.tile, color: tile.glyph }">
      <Icon v-if="tile.transfer" name="swap" :size="20" />
      <Icon v-else :category="tile.name" :size="20" />
    </span>
    <span class="meta">
      <p class="name">{{ title }}</p>
      <p class="note">{{ subtitle }}</p>
    </span>
    <span class="num" :class="amountClass">{{ formatTransactionAmount(props.row.amountCents, props.row.kind) }}</span>
  </div>
</template>
