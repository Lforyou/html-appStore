<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import Icon from '@/components/Icon.vue'
import { useLedgerStore } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import { navAnim } from '@/router'
import { nowWallClock, timeOfDay } from '@/utils/date'

/**
 * 外壳只负责三件事：iPhone 机身（状态栏/横条）、路由页面栈、全局浮层容器。
 * 页面内容一律来自视图，浮层由 Sheet/Toast 通过 #overlays 挂进来。
 */
const store = useLedgerStore()
const route = useRoute()
const { current: toast, show, dismiss } = useToast()

/** 假状态栏只在浏览器预览出现；真机上系统状态栏 + safe-area 已经占位。 */
const isNative = typeof (window as { Capacitor?: unknown }).Capacitor !== 'undefined'
const sbTime = ref(timeOfDay(nowWallClock()))
const ticker = setInterval(() => {
  sbTime.value = timeOfDay(nowWallClock())
}, 30_000)
onBeforeUnmount(() => clearInterval(ticker))

const booting = computed(() => store.phase === 'idle' || store.phase === 'loading')
const failed = computed(() => store.phase === 'error')

void store.load()

watch(
  () => store.seedWarnings.length,
  (count) => {
    if (count > 0) show('示例数据有对不齐的地方', `${count} 条自检提示，可在设置中恢复示例账本`)
  },
)

function retry(): void {
  void store.load()
}

function runAction(): void {
  toast.value?.action?.run()
  dismiss()
}
</script>

<template>
  <div class="app-shell">
    <div v-if="!isNative" class="sim-statusbar">
      <span class="sb-time num">{{ sbTime }}</span>
      <span class="cap num">100%</span>
    </div>

    <div class="screen">
      <router-view v-slot="{ Component }">
        <Transition :name="navAnim">
          <div class="page" :key="route.fullPath">
            <component :is="Component" />
          </div>
        </Transition>
      </router-view>

      <div v-if="booting" class="page">
        <div class="skeleton" style="height: 96px; margin: 20px" />
        <div class="skeleton" style="height: 140px; margin: 0 20px 12px" />
        <div class="skeleton" style="height: 64px; margin: 0 20px" />
      </div>

      <div v-else-if="failed" class="page">
        <div class="screen-scroll">
          <div class="state-block">
            <Icon name="alertTriangle" :size="30" />
            <p class="st-title">账本没打开</p>
            <p class="st-desc">{{ store.errorMessage || '本地数据库读取失败，重试一次看看' }}</p>
            <button class="btn primary" type="button" @click="retry">重新载入</button>
          </div>
        </div>
      </div>
    </div>

    <TabBar v-if="route.meta.tab !== undefined" />

    <div id="overlays" class="overlays">
      <Transition name="toast">
        <div v-if="toast" class="toast" role="status" @click="dismiss">
          <div style="flex: 1; min-width: 0">
            <p class="tt">{{ toast.title }}</p>
            <p v-if="toast.desc" class="td">{{ toast.desc }}</p>
          </div>
          <button v-if="toast.action" class="pill" type="button" @click.stop="runAction">{{ toast.action.label }}</button>
        </div>
      </Transition>
    </div>

    <div v-if="!isNative" class="home-indicator"><i /></div>
  </div>
</template>
