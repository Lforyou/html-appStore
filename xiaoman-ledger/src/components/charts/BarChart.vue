<script setup lang="ts">
import { computed } from 'vue'

/** 竖柱图：柱高按当期最大值归一，空值画虚线段而不是 0 高，避免「看不出这个月存在」。 */
const props = withDefaults(
  defineProps<{
    points: { key: string; label: string; cents: number }[]
    highlightKey?: string
    /** 12 根柱时用紧凑尺寸 */
    dense?: boolean
    maxBarHeight?: number
  }>(),
  { highlightKey: undefined, dense: false, maxBarHeight: 72 },
)

const emit = defineEmits<{ select: [key: string] }>()

const maxCents = computed(() => Math.max(...props.points.map((p) => p.cents), 1))

function barHeight(cents: number): number {
  if (cents <= 0) return 4
  return Math.max(6, Math.round((cents / maxCents.value) * props.maxBarHeight))
}
</script>

<template>
  <div class="bars" :class="{ y12: dense }">
    <button
      v-for="point in props.points"
      :key="point.key"
      type="button"
      class="bcol"
      :class="{ now: point.key === highlightKey }"
      :aria-label="`${point.label} ${point.cents / 100} 元`"
      @click="emit('select', point.key)"
    >
      <i :class="{ void: point.cents <= 0 }" :style="{ height: `${barHeight(point.cents)}px` }" />
      <em>{{ point.label }}</em>
    </button>
  </div>
</template>
