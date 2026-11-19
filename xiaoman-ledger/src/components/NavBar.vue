<script setup lang="ts">
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'
import type { IconName } from '@/assets/icons'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    rightIcon?: IconName
    rightText?: string
    /** 明细页这类「同级切月」的导航条不显示返回键 */
    back?: boolean
  }>(),
  { subtitle: undefined, rightIcon: undefined, rightText: undefined, back: true },
)

const emit = defineEmits<{ right: [] }>()
const router = useRouter()
</script>

<template>
  <header class="navbar">
    <button v-if="back" class="iconbtn" type="button" aria-label="返回" @click="router.back()">
      <Icon name="chevronLeft" :size="18" />
    </button>
    <span v-else class="navside" />
    <div class="navtitle">
      <p class="h2">{{ title }}</p>
      <p v-if="subtitle" class="cap">{{ subtitle }}</p>
    </div>
    <button v-if="rightIcon || rightText" class="iconbtn" type="button" :aria-label="rightText ?? '操作'" @click="emit('right')">
      <Icon v-if="rightIcon" :name="rightIcon" :size="18" />
      <span v-else class="sub">{{ rightText }}</span>
    </button>
    <span v-else class="navside" />
  </header>
</template>
