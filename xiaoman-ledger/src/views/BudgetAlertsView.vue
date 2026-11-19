<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import NavBar from '@/components/NavBar.vue'
import { useLedgerStore } from '@/stores/ledger'
import { overBudgetList } from '@/domain/budget'
import { formatMoney } from '@/utils/money'

/** 超支提醒：只报「超了多少、连着超了几个月」，不替用户编建议额度。 */
const store = useLedgerStore()
const router = useRouter()

const items = computed(() => overBudgetList(store.budgetBoard))
const totalOver = computed(() => items.value.reduce((acc, item) => acc + item.overCents, 0))
</script>

<template>
  <NavBar title="超支提醒" :subtitle="`${store.monthLabel} · ${items.length} 项`" />

  <div class="screen-scroll">
    <div v-if="items.length === 0" class="state-block">
      <Icon name="check" :size="30" />
      <p class="st-title">{{ store.monthLabel }}没有超支</p>
      <p class="st-desc">所有设了预算的分类都还在额度里，保持住</p>
      <button class="btn tint" type="button" @click="router.push('/budget')">去看预算</button>
    </div>

    <template v-else>
      <div class="alert">
        <Icon name="alertTriangle" :size="20" />
        <div class="grow">
          <p class="t">当月合计超出 {{ formatMoney(totalOver) }}</p>
          <p class="d">{{ items.length }} 个分类越线，最长已连续 {{ Math.max(...items.map((i) => i.consecutiveOverMonths)) }} 个月</p>
        </div>
      </div>

      <section v-for="item in items" :key="item.targetId" class="card" role="button" tabindex="0" @click="router.push('/budget')">
        <div class="hero-top">
          <span class="tile t36" :style="{ background: item.tileColor }">
            <Icon :category="item.name" :size="18" />
          </span>
          <div class="grow">
            <p class="h2">{{ item.name }}</p>
            <p class="cap num">{{ formatMoney(item.spentCents) }} / {{ formatMoney(item.budgetCents) }}</p>
          </div>
          <span class="tri up">超 {{ formatMoney(item.overCents) }}</span>
        </div>
        <div class="bar danger">
          <i :style="{ width: `${Math.min(item.usedPercent, 100)}%` }" />
        </div>
        <p class="cap streak-line">
          <Icon name="trendUp" :size="13" />
          <span>{{ item.consecutiveOverMonths > 1 ? `已连续 ${item.consecutiveOverMonths} 个月超支` : '当月首次超支' }}</span>
        </p>
      </section>
    </template>
  </div>
</template>
