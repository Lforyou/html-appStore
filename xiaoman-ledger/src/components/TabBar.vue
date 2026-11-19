<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { TABS, type TabName } from '@/router'

/**
 * 底栏：4 个 tab + 中间 FAB。记一笔/明细这类临时页不属于任何 tab，
 * 高亮沿用上一次停留的 tab，符合 iOS 的返回预期。
 */
const route = useRoute()
const router = useRouter()
const lastTab = ref<TabName>('home')

watch(
  () => route.meta.tab,
  (tab) => {
    if (tab) lastTab.value = tab
  },
  { immediate: true },
)

const active = computed(() => route.meta.tab ?? lastTab.value)
</script>

<template>
  <nav class="tabbar">
    <div class="tab-row">
      <template v-for="(tab, index) in TABS" :key="tab.name">
        <button class="tab" :class="{ on: active === tab.name }" type="button" @click="router.push(tab.to)">
          <Icon :name="tab.icon" :size="24" />
          <span>{{ tab.label }}</span>
        </button>
        <div v-if="index === 1" class="fabslot">
          <button class="fab" type="button" aria-label="记一笔" @click="router.push('/entry/expense')">
            <Icon name="plus" :size="26" />
          </button>
        </div>
      </template>
    </div>
  </nav>
</template>
