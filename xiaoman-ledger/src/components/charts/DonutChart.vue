<script setup lang="ts">
import { computed } from 'vue'

/**
 * 环形图：用 stroke-dasharray 画弧，不依赖任何图表库（全离线、零运行时依赖）。
 * 段序与图例一致，由调用方保证按金额倒序传入。
 */
const props = withDefaults(
  defineProps<{
    slices: { key: string; amountCents: number; color: string }[]
    centerLabel: string
    centerValue: string
    size?: number
    thickness?: number
  }>(),
  { size: 132, thickness: 22 },
)

const radius = computed(() => (props.size - props.thickness) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const totalCents = computed(() => props.slices.reduce((acc, s) => acc + s.amountCents, 0))

const arcs = computed(() => {
  if (totalCents.value <= 0) return []
  let offset = 0
  return props.slices.map((slice) => {
    const length = (slice.amountCents / totalCents.value) * circumference.value
    const arc = { ...slice, dashArray: `${Math.max(length - 1.5, 0)} ${circumference.value - length + 1.5}`, dashOffset: -offset }
    offset += length
    return arc
  })
})
</script>

<template>
  <div class="donut-box" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :aria-label="`${centerLabel} 环形图`" role="img">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--paper-200)"
        :stroke-width="thickness"
      />
      <circle
        v-for="arc in arcs"
        :key="arc.key"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        :stroke-width="thickness"
        :stroke-dasharray="arc.dashArray"
        :stroke-dashoffset="arc.dashOffset"
        stroke-linecap="butt"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div class="donut-c" :style="{ top: `${size / 2 - 20}px` }">
      <p class="cap">{{ centerLabel }}</p>
      <p class="v num">{{ centerValue }}</p>
    </div>
  </div>
</template>
