<script setup lang="ts">
import { computed } from 'vue'
import { splitMoney } from '@/utils/money'

/** Hero / 卡片大数字：¥ 走 `.cur` 上标，负号前置，数字用圆体等宽。 */
const props = withDefaults(defineProps<{ cents: number; display?: boolean; decimals?: number }>(), {
  display: true,
  decimals: 2,
})

const parts = computed(() => splitMoney(props.cents, { decimals: props.decimals }))
</script>

<template>
  <span class="num" :class="display ? 'display' : 'd32'">
    <span v-if="parts.symbol" class="cur">{{ parts.symbol }}</span>
    <span class="cur">¥</span>{{ parts.body }}
  </span>
</template>
