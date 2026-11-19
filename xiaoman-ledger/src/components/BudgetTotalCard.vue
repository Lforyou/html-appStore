<script setup lang="ts">
import Icon from './Icon.vue'
import MoneyText from './MoneyText.vue'
import { formatMoney } from '@/utils/money'
import type { BudgetStatus } from '@/types/domain'

/** 总预算卡：已用比例 + 日剩 + 调整入口。单独成组件是为了让父级 v-if 收窄掉 null 分支。 */
const props = defineProps<{ status: BudgetStatus }>()
const emit = defineEmits<{ edit: [BudgetStatus] }>()
</script>

<template>
  <section class="hero">
    <span v-if="props.status.state === 'over'" class="tape danger">已超支</span>
    <div class="hero-top">
      <p class="cap">当月总预算</p>
      <p class="cap num">{{ formatMoney(props.status.budgetCents) }}</p>
    </div>
    <MoneyText :cents="props.status.remainingCents" />
    <p class="cap">
      {{ props.status.remainingCents >= 0 ? '还能花' : '已经超了' }}
      · 已用 {{ props.status.usedPercent }}%
    </p>
    <div class="bar" :class="{ danger: props.status.state === 'over', ok: props.status.state === 'ok' }">
      <i :style="{ width: `${Math.min(props.status.usedPercent, 100)}%` }" />
    </div>
    <div class="bar-row">
      <p class="cap num">支出 {{ formatMoney(props.status.spentCents) }}</p>
      <p class="cap num">
        {{ props.status.remainingCents > 0 ? `日剩 ${formatMoney(props.status.perDayRemainingCents)}` : `超出 ${formatMoney(props.status.overCents)}` }}
      </p>
    </div>
    <div class="btn-row">
      <button class="btn tint" type="button" @click="emit('edit', props.status)">
        <Icon name="pencil" :size="16" />
        <span>调整总预算</span>
      </button>
      <p class="cap">日剩按当月剩余天数平摊</p>
    </div>
  </section>
</template>
