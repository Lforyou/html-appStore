<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BarChart from '@/components/charts/BarChart.vue'
import EntryRow from '@/components/EntryRow.vue'
import MonthSwitch from '@/components/MonthSwitch.vue'
import NavBar from '@/components/NavBar.vue'
import Icon from '@/components/Icon.vue'
import { useLedgerStore } from '@/stores/ledger'
import { merchantRank, monthlyBars, yearMonthKeys, weekdayAverages } from '@/domain/stats'
import { percentOf, formatCents, formatMoney } from '@/utils/money'

/** 分类详情：一个分类的全年节奏、周几习惯、常去的店，切月只看当月那一段。 */
const props = defineProps<{ categoryId: string }>()
const store = useLedgerStore()
const router = useRouter()

const category = computed(() => store.categoryById.get(props.categoryId))
const rows = computed(() => store.transactions.filter((t) => t.categoryId === props.categoryId))
const monthRows = computed(() => rows.value.filter((t) => t.occurredAt.slice(0, 7) === store.viewMonth))
const monthExpense = computed(() => monthRows.value.reduce((acc, t) => acc + t.amountCents, 0))
const yearExpense = computed(() => rows.value.reduce((acc, t) => acc + t.amountCents, 0))
const sharePercent = computed(() => percentOf(monthExpense.value, store.monthExpenseCents, 1))
const averageCents = computed(() => (monthRows.value.length === 0 ? 0 : Math.round(monthExpense.value / monthRows.value.length)))

const bars = computed(() =>
  monthlyBars(rows.value, yearMonthKeys(store.year)).map((bar) => ({ key: bar.key, label: bar.label, cents: bar.expenseCents })),
)
/** 柱状与顶部的月份切换共用同一个查看月：点柱即切月，不另存一份选中态。 */
const barDetail = computed(() => bars.value.find((bar) => bar.key === store.viewMonth) ?? bars.value[bars.value.length - 1])

function pickMonth(key: string): void {
  if (key <= store.currentMonth) store.viewMonth = key
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const weekdayPoints = computed(() => {
  const byWeekday = weekdayAverages(rows.value)
  return WEEK_LABELS.map((label, index) => {
    const weekday = index === 6 ? 0 : index + 1
    return { key: `w${weekday}`, label, cents: byWeekday[weekday]?.avgCents ?? 0 }
  })
})
const topWeekday = computed(() => {
  const best = [...weekdayPoints.value].sort((a, b) => b.cents - a.cents)[0]
  return best && best.cents > 0 ? best : null
})

const ranks = computed(() => merchantRank(monthRows.value, 5))
const recent = computed(() => [...monthRows.value].reverse().slice(0, 20))
const budget = computed(() => store.budgetBoard.items.find((item) => item.targetId === props.categoryId) ?? null)
</script>

<template>
  <NavBar :title="category?.name ?? '未分类'" :subtitle="`${monthRows.length} 笔 · ${store.monthLabel}`" />
  <MonthSwitch />

  <div class="screen-scroll">
    <section v-if="monthRows.length === 0" class="state-block">
      <p class="st-title">{{ store.monthLabel }} 没有{{ category?.name ?? '该分类' }}</p>
      <p class="st-desc">这一年里共花过 {{ formatMoney(yearExpense) }}，换个看看别的月份</p>
    </section>

    <template v-else>
      <section class="hero">
        <div class="hero-top">
          <p class="cap">{{ store.monthLabel }}{{ category?.name }}</p>
          <span class="tri plain">占当月支出 {{ sharePercent }}%</span>
        </div>
        <p class="display num">
          <span class="cur">¥</span>{{ formatCents(monthExpense) }}
        </p>
        <div class="hero-2col">
          <div class="mini">
            <p class="cap">笔数</p>
            <p class="v num">{{ monthRows.length }} 笔</p>
          </div>
          <span class="vsep" />
          <div class="mini">
            <p class="cap">平均每笔</p>
            <p class="v num">{{ formatMoney(averageCents) }}</p>
          </div>
        </div>
      </section>

      <section v-if="budget" class="card">
        <div class="sec-head inline">
          <p class="h2">{{ budget.name }}预算</p>
          <span class="tri" :class="budget.state === 'over' ? 'up' : budget.state === 'near' ? 'plain' : 'down'">
            {{ budget.usedPercent }}%
          </span>
        </div>
        <div class="bar" :class="{ danger: budget.state === 'over' }">
          <i :style="{ width: `${Math.min(budget.usedPercent, 100)}%` }" />
        </div>
        <div class="bar-row">
          <p class="cap num">{{ formatMoney(budget.spentCents) }} / {{ formatMoney(budget.budgetCents) }}</p>
          <p class="cap num">
            {{
              budget.consecutiveOverMonths > 0
                ? `已连续 ${budget.consecutiveOverMonths} 个月超支`
                : `还剩 ${formatMoney(budget.remainingCents)}`
            }}
          </p>
        </div>
      </section>

      <section class="sec-head">
        <p class="h2">{{ store.year }} 年逐月</p>
        <p v-if="barDetail" class="cap num">{{ Number(barDetail.label) }} 月 ¥{{ formatCents(barDetail.cents, { decimals: 0 }) }}</p>
      </section>
      <section class="card">
        <BarChart :points="bars" dense :highlight-key="store.viewMonth" @select="pickMonth" />
      </section>

      <section class="sec-head">
        <p class="h2">周几最容易花</p>
        <p v-if="topWeekday" class="cap num">周{{ topWeekday.label }}</p>
      </section>
      <section class="card">
        <BarChart :points="weekdayPoints" :highlight-key="topWeekday?.key" />
        <div class="insight">
          <Icon name="bulb" :size="16" />
          <p>{{ store.year }} 年共 {{ rows.length }} 笔 {{ category?.name }}，合计 {{ formatMoney(yearExpense) }}</p>
        </div>
      </section>

      <section v-if="ranks.length > 0" class="card">
        <div class="sec-head inline">
          <p class="h2">常去的{{ ranks.length }} 家</p>
        </div>
        <div v-for="(rank, index) in ranks" :key="rank.name" class="rank">
          <span class="rk num">{{ index + 1 }}</span>
          <div class="grow">
            <p class="sub ellipsis">{{ rank.name }}</p>
            <p class="cap">{{ rank.count }} 笔</p>
          </div>
          <p class="rv num">{{ formatMoney(rank.amountCents) }}</p>
        </div>
      </section>

      <section class="sec-head">
        <p class="h2">当月流水</p>
        <p class="cap num">{{ recent.length }} 笔</p>
      </section>
      <div class="list">
        <EntryRow
          v-for="row in recent"
          :key="row.id"
          :row="row"
          compact
          @click="router.push(`/ledger/day/${row.occurredAt.slice(0, 10)}`)"
        />
      </div>
    </template>
  </div>
</template>
