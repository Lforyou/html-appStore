<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import EntryRow from '@/components/EntryRow.vue'
import MonthSwitch from '@/components/MonthSwitch.vue'
import NavBar from '@/components/NavBar.vue'
import Icon from '@/components/Icon.vue'
import { useLedgerStore } from '@/stores/ledger'
import { expenseCents, incomeCents, maxExpense, merchantRank, periodComparison, weekdayAverages } from '@/domain/stats'
import { addMonths, cnYearMonth } from '@/utils/date'
import { formatCents, formatMoney } from '@/utils/money'

/** S3 报表：环形构成 + 全年趋势 + 周几均值 + 商户排行，所有数字由当月/当年数据推得。 */
const store = useLedgerStore()
const router = useRouter()

const monthTotal = computed(() => store.monthBreakdown.totalCents)

interface LegendRow {
  key: string
  name: string
  color: string
  cents: number
  percent: number
  categoryId?: string
}

/** 图例最多 8 条，其余并成「其他」；环形图与图例共用同一份切分，两边不会对不上。 */
const legend = computed<LegendRow[]>(() => {
  const slices = store.monthBreakdown.slices
  const rows: LegendRow[] = slices.slice(0, 8).map((s) => ({
    key: s.category?.id ?? 'none',
    name: s.category?.name ?? '未分类',
    color: s.category?.glyphColor ?? '#CBBCAC',
    cents: s.amountCents,
    percent: s.sharePercent,
    categoryId: s.category?.id,
  }))
  const tail = slices.slice(8)
  if (tail.length > 0) {
    rows.push({
      key: 'other',
      name: `其他 ${tail.length} 类`,
      color: '#CBBCAC',
      cents: tail.reduce((acc, s) => acc + s.amountCents, 0),
      percent: tail.reduce((acc, s) => acc + s.sharePercent, 0),
    })
  }
  return rows
})

const slices = computed(() => legend.value.map((row) => ({ key: row.key, amountCents: row.cents, color: row.color })))

const yearRows = computed(() => store.rowsOfYear(store.year))
const yearPoints = computed(() => store.yearBars.map((bar) => ({ key: bar.key, label: bar.label, cents: bar.expenseCents })))
const selectedMonth = computed(() => store.yearBars.find((bar) => bar.key === store.viewMonth))

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
/** 周几均值取全年样本：只看当月容易把「这周凑巧」当成习惯。 */
const weekdayPoints = computed(() => {
  const byWeekday = weekdayAverages(yearRows.value)
  return WEEK_LABELS.map((label, index) => {
    const weekday = index === 6 ? 0 : index + 1
    return { key: `w${weekday}`, label, cents: byWeekday[weekday]?.avgCents ?? 0 }
  })
})
const topWeekday = computed(() => {
  const best = [...weekdayPoints.value].sort((a, b) => b.cents - a.cents)[0]
  return best && best.cents > 0 ? best : null
})

const previousMonth = computed(() => {
  const key = addMonths(store.viewMonth, -1)
  const rows = store.rowsOfMonth(key)
  return { key, expenseCents: expenseCents(rows), incomeCents: incomeCents(rows), count: rows.length }
})
const comparison = computed(() =>
  periodComparison(
    { expenseCents: store.monthExpenseCents, incomeCents: store.monthIncomeCents, count: store.monthCount },
    previousMonth.value,
  ),
)

const ranks = computed(() => merchantRank(store.monthRows, 5))
const biggest = computed(() => maxExpense(store.monthRows))

/** 点年度柱切查看月：未来的月还没有账，不接受。 */
function pickMonth(key: string): void {
  if (key <= store.currentMonth) store.viewMonth = key
}
</script>

<template>
  <NavBar title="统计报表" :back="false" />
  <MonthSwitch />

  <div class="screen-scroll">
    <section class="card">
      <div class="donut-wrap">
        <DonutChart :slices="slices" center-label="当月支出" :center-value="formatMoney(monthTotal)" />
        <div class="legend">
          <button
            v-for="row in legend"
            :key="row.key"
            type="button"
            class="lg"
            :disabled="!row.categoryId"
            @click="row.categoryId && router.push(`/reports/${row.categoryId}`)"
          >
            <i :style="{ background: row.color }" />
            <span class="n">{{ row.name }}</span>
            <span class="p num">{{ row.percent }}%</span>
          </button>
          <p v-if="legend.length === 0" class="cap">这个月还没有支出</p>
        </div>
      </div>
      <div class="insight">
        <Icon name="bulb" :size="16" />
        <p v-if="comparison.expenseChangePercent === null">{{ cnYearMonth(previousMonth.key) }} 没有支出，暂无环比</p>
        <p v-else>
          比 {{ cnYearMonth(previousMonth.key) }} {{ comparison.expenseChangePercent >= 0 ? '多花' : '少花' }}
          {{ Math.abs(comparison.expenseChangePercent) }}%，当月 {{ store.monthCount }} 笔 · 收入
          {{ formatMoney(store.monthIncomeCents) }}
        </p>
      </div>
    </section>

    <section class="sec-head">
      <p class="h2">{{ store.year }} 年支出趋势</p>
      <p v-if="selectedMonth" class="cap num">{{ Number(selectedMonth.label) }} 月 ¥{{ formatCents(selectedMonth.expenseCents, { decimals: 0 }) }}</p>
    </section>
    <section class="card">
      <BarChart :points="yearPoints" :highlight-key="store.viewMonth" dense @select="pickMonth" />
    </section>

    <section class="sec-head">
      <p class="h2">每周几花得最多</p>
      <p v-if="topWeekday" class="cap num">周{{ topWeekday.label }} ¥{{ formatCents(topWeekday.cents, { decimals: 0 }) }}</p>
    </section>
    <section class="card">
      <BarChart :points="weekdayPoints" :highlight-key="topWeekday?.key" />
      <div class="insight">
        <Icon name="trendUp" :size="16" />
        <p>按 {{ store.year }} 年 {{ yearRows.length }} 笔流水逐日汇总取平均，只算支出</p>
      </div>
    </section>

    <section class="sec-head">
      <p class="h2">商户排行</p>
      <p class="link" @click="router.push('/ledger')">全部明细 ›</p>
    </section>
    <section class="card">
      <p v-if="ranks.length === 0" class="empty-line">当月还没有支出记录</p>
      <div v-for="(rank, index) in ranks" :key="rank.name" class="rank">
        <span class="rk num">{{ index + 1 }}</span>
        <span class="tile t36 rank-tile"><Icon name="wallet" :size="18" /></span>
        <div class="grow">
          <p class="sub ellipsis">{{ rank.name }}</p>
          <p class="cap">{{ rank.count }} 笔</p>
        </div>
        <p class="rv num">{{ formatMoney(rank.amountCents) }}</p>
      </div>
    </section>

    <section v-if="biggest" class="card">
      <div class="hero-top">
        <p class="cap">当月最大一笔支出</p>
        <p class="cap num">{{ store.categoryName(biggest.categoryId) }}</p>
      </div>
      <EntryRow :row="biggest" @click="router.push(`/ledger/day/${biggest.occurredAt.slice(0, 10)}`)" />
    </section>
  </div>
</template>
