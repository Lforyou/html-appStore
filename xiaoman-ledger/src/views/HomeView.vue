<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import EntryRow from '@/components/EntryRow.vue'
import Icon from '@/components/Icon.vue'
import MoneyText from '@/components/MoneyText.vue'
import { useLedgerStore } from '@/stores/ledger'
import { cnYearMonth, shortMonthDay, weekdayCn } from '@/utils/date'
import { formatMoney } from '@/utils/money'
import type { Transaction } from '@/types/domain'

/** S1 首页：本月大盘 + 今天 + 预算进度 + 最近流水，所有数字都由 store 派生，不写死。 */
const store = useLedgerStore()
const router = useRouter()

const todayDate = computed(() => `${Number(store.today.slice(0, 4))} 年 ${Number(store.today.slice(5, 7))} 月 ${Number(store.today.slice(8, 10))} 日`)
const weekday = computed(() => weekdayCn(store.today))

interface DayBlock {
  dayKey: string
  label: string
  expenseCents: number
  rows: Transaction[]
}

/** 最近 3 天：有流水的日子才占位，天内按时间倒排。 */
const recentDays = computed<DayBlock[]>(() =>
  store.daySummaries
    .filter((d) => d.count > 0)
    .slice(0, 3)
    .map((d) => ({
      dayKey: d.dayKey,
      label: d.label,
      expenseCents: d.expenseCents,
      rows: [...store.rowsOfDay(d.dayKey)].reverse().slice(0, 4),
    })),
)

const total = computed(() => store.currentBudgetBoard.total)
</script>

<template>
  <header class="topbar">
    <div>
      <p class="h1">小满记账</p>
      <p class="cap">{{ todayDate }} · {{ weekday }}</p>
    </div>
    <div class="t-right">
      <button class="iconbtn" type="button" aria-label="搜索" @click="router.push('/search')">
        <Icon name="search" :size="18" />
      </button>
      <button class="avatar" type="button" aria-label="我的" @click="router.push('/profile')">满</button>
    </div>
  </header>

  <div class="screen-scroll">
    <section class="hero">
      <span class="tape">连续 {{ store.streakDays }} 天</span>
      <div class="hero-top">
        <p class="cap">本月支出</p>
        <p class="cap num">{{ cnYearMonth(store.currentMonth) }}</p>
      </div>
      <MoneyText :cents="store.currentMonthExpenseCents" />
      <div class="hero-2col">
        <div class="mini">
          <p class="cap">本月收入</p>
          <p class="v num">{{ formatMoney(store.currentMonthIncomeCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">本月结余</p>
          <p class="v num">{{ formatMoney(store.currentMonthBalanceCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">本月笔数</p>
          <p class="v num">{{ store.currentMonthCount }} 笔</p>
        </div>
      </div>
    </section>

    <section class="card tappable" role="button" tabindex="0" @click="router.push('/entry/expense')">
      <div class="hero-top">
        <div>
          <p class="cap">今天 · {{ weekday }}</p>
          <p class="h2 num">{{ formatMoney(store.todayExpenseCents) }}</p>
        </div>
        <span class="tri plain">{{ store.todayCount }} 笔</span>
      </div>
      <p class="sub">点这里记一笔，把这天的账补齐</p>
    </section>

    <section v-if="total" class="card tappable" role="button" tabindex="0" @click="router.push('/budget')">
      <div class="sec-head inline">
        <p class="h2">本月预算</p>
        <span class="tri" :class="total.state === 'over' ? 'up' : total.state === 'near' ? 'plain' : 'down'">
          已用 {{ total.usedPercent }}%
        </span>
      </div>
      <div class="bar" :class="{ danger: total.state === 'over' }">
        <i :style="{ width: `${Math.min(total.usedPercent, 100)}%` }" />
      </div>
      <div class="bar-row">
        <p class="cap num">{{ formatMoney(total.spentCents) }} / {{ formatMoney(total.budgetCents) }}</p>
        <p class="cap num">
          {{ total.remainingCents > 0 ? `日剩 ${formatMoney(total.perDayRemainingCents)}` : `已超 ${formatMoney(total.overCents)}` }}
        </p>
      </div>
    </section>

    <template v-for="day in recentDays" :key="day.dayKey">
      <section class="sec-head tight">
        <p class="sub">{{ day.label }} · {{ shortMonthDay(day.dayKey) }}</p>
        <p class="cap num">支出 {{ formatMoney(day.expenseCents) }}</p>
      </section>
      <div class="list">
        <EntryRow v-for="row in day.rows" :key="row.id" :row="row" compact @click="router.push(`/ledger/day/${day.dayKey}`)" />
      </div>
    </template>

    <p class="budget-tip">
      <Icon name="bulb" :size="14" />
      <span>预算按自然月计算，转账不计入支出</span>
    </p>

    <div class="btn-row inset">
      <button class="btn tint" type="button" @click="router.push('/ledger')">查看全部账单</button>
      <button class="btn primary" type="button" @click="router.push('/entry/expense')">记一笔</button>
    </div>
  </div>
</template>
