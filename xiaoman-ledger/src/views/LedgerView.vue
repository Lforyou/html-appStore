<script setup lang="ts">
import { useRouter } from 'vue-router'
import EntryRow from '@/components/EntryRow.vue'
import MonthSwitch from '@/components/MonthSwitch.vue'
import NavBar from '@/components/NavBar.vue'
import { useLedgerStore } from '@/stores/ledger'
import { formatMoney } from '@/utils/money'

/** S2 账单明细：按月切换，按日分组，天内最新一笔在最上。 */
const store = useLedgerStore()
const router = useRouter()
</script>

<template>
  <NavBar title="账单明细" :subtitle="`${store.monthCount} 笔流水`" :back="false" right-icon="search" @right="router.push('/search')" />
  <MonthSwitch />

  <div class="screen-scroll">
    <section class="card">
      <div class="hero-2col" style="margin-top: 0">
        <div class="mini">
          <p class="cap">支出</p>
          <p class="v num">{{ formatMoney(store.monthExpenseCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">收入</p>
          <p class="v num">{{ formatMoney(store.monthIncomeCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">结余</p>
          <p class="v num">{{ formatMoney(store.monthBalanceCents) }}</p>
        </div>
      </div>
    </section>

    <div v-if="store.dayGroupsOfMonth.length === 0" class="state-block">
      <p class="st-title">{{ store.monthLabel }} 还没有账</p>
      <p class="st-desc">这一月的空位，等你补上第一笔</p>
      <button class="btn primary" type="button" @click="router.push('/entry/expense')">记一笔</button>
    </div>

    <template v-for="day in store.dayGroupsOfMonth" :key="day.dayKey">
      <section class="sec-head tight">
        <p class="sub">{{ day.label }}</p>
        <p class="cap num">支出 {{ formatMoney(day.expenseCents) }}</p>
      </section>
      <div class="list">
        <EntryRow v-for="row in day.rows" :key="row.id" :row="row" compact @click="router.push(`/ledger/day/${day.dayKey}`)" />
      </div>
    </template>
  </div>
</template>
