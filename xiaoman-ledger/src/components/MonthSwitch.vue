<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useLedgerStore } from '@/stores/ledger'

/** 查看月切换：右箭头在「已经看到本月」时禁用——未来的账还不存在。 */
const store = useLedgerStore()
const atCurrentMonth = computed(() => store.viewMonth >= store.currentMonth)
</script>

<template>
  <div class="month-switch">
    <button class="iconbtn" type="button" aria-label="上一月" @click="store.shiftViewMonth(-1)">
      <Icon name="chevronLeft" :size="18" />
    </button>
    <p class="h2 num">{{ store.monthLabel }}</p>
    <button class="iconbtn" type="button" aria-label="下一月" :disabled="atCurrentMonth" @click="store.shiftViewMonth(1)">
      <Icon name="chevronRight" :size="18" />
    </button>
  </div>
</template>
