<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MonthSwitch from '@/components/MonthSwitch.vue'
import Icon from '@/components/Icon.vue'
import NavBar from '@/components/NavBar.vue'
import { useLedgerStore } from '@/stores/ledger'

/** 打卡日历：一格的有无账，比金额更容易看出「有没有坚持」。空格按周一为一周起点补齐。 */
const store = useLedgerStore()
const router = useRouter()

const cells = computed(() => {
  const first = `${store.viewMonth}-01T00:00:00`
  const weekday = new Date(first).getDay()
  const blanks = (weekday + 6) % 7
  return [...Array.from({ length: blanks }, () => null), ...store.monthCalendar]
})

const recordedDays = computed(() => store.monthCalendar.filter((d) => d.recorded).length)
const pastDays = computed(() => store.monthCalendar.filter((d) => !d.future).length)
const missedDays = computed(() => pastDays.value - recordedDays.value)
</script>

<template>
  <NavBar title="打卡日历" :subtitle="`连续 ${store.streakDays} 天`" />
  <MonthSwitch />

  <div class="screen-scroll">
    <section class="hero">
      <div class="hero-top">
        <p class="cap">{{ store.monthLabel }} 打卡</p>
        <p class="cap num">{{ recordedDays }} / {{ pastDays }} 天</p>
      </div>
      <p class="h1">{{ recordedDays >= pastDays && pastDays > 0 ? '这个月一天没漏' : `还有 ${missedDays} 天没记` }}</p>
      <div class="hero-2col">
        <div class="mini">
          <p class="cap">连续记账</p>
          <p class="v num">{{ store.streakDays }} 天</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">账龄</p>
          <p class="v num">{{ store.ledgerAge }} 天</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">本月笔数</p>
          <p class="v num">{{ store.monthCount }} 笔</p>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="stamp-head">
        <span v-for="label in ['一', '二', '三', '四', '五', '六', '日']" :key="label">{{ label }}</span>
      </div>
      <div class="stamp-grid">
        <span v-for="(cell, index) in cells" :key="index" class="stamp-slot">
          <span v-if="cell === null" class="stamp blank" />
          <button
            v-else
            type="button"
            class="stamp"
            :class="{ done: cell.recorded, today: cell.dayKey === store.today, future: cell.future }"
            :disabled="cell.future"
            :aria-label="`${store.viewMonth}-${cell.day} 日`"
            @click="router.push(`/ledger/day/${cell.dayKey}`)"
          >
            {{ cell.day }}
          </button>
        </span>
      </div>
      <div class="legend-row">
        <p class="cap"><i class="dot done" />已记账</p>
        <p class="cap"><i class="dot" />没记</p>
        <p class="cap"><i class="dot today" />今天</p>
      </div>
    </section>

    <p class="budget-tip">
      <Icon name="infoDot" :size="14" />
      <span>点已记账的格子看当天流水，空白格子只占位不能点</span>
    </p>
  </div>
</template>
