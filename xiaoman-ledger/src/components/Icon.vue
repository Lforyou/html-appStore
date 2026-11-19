<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_ICONS, UI_ICONS, type IconName } from '@/assets/icons'

/** 图标一律走注册表，屏幕不内联 path，保证与原型 S0 的描边口径一致。 */
const props = withDefaults(
  defineProps<{
    name?: IconName
    /** 分类图标按中文名索引，传 category.name 即可 */
    category?: string
    size?: number
    color?: string
    strokeWidth?: number
  }>(),
  { name: undefined, category: undefined, size: 22, color: 'currentColor', strokeWidth: 2 },
)

const inner = computed(() => {
  if (props.category) return CATEGORY_ICONS[props.category]?.inner ?? UI_ICONS.docLines
  return props.name ? UI_ICONS[props.name] : ''
})
</script>

<template>
  <span class="ic" :style="{ width: `${size}px`, height: `${size}px`, color }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      v-html="inner"
    />
  </span>
</template>
