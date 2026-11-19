<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import NavBar from '@/components/NavBar.vue'
import Sheet from '@/components/Sheet.vue'
import { useLedgerStore } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import type { Settings } from '@/types/domain'

/** S7 设置：偏好 + 本地数据管理。两个破坏性动作都要在弹层里再点一次「确认」。 */
const store = useLedgerStore()
const { show } = useToast()

const pending = ref<'wipe' | 'restore' | null>(null)
const pinText = ref('')
const pinError = ref('')

const reminderEnabled = computed(() => store.settings.reminderEnabled)
const appLockEnabled = computed(() => store.settings.appLockEnabled)

async function patch(next: Partial<Settings>): Promise<void> {
  try {
    await store.saveSettings({ ...store.settings, ...next })
  } catch (cause) {
    show('设置没保存成功', cause instanceof Error ? cause.message : String(cause))
  }
}

function toggleReminder(): void {
  patch({ reminderEnabled: !reminderEnabled.value })
}

function toggleLock(): void {
  if (appLockEnabled.value) {
    patch({ appLockEnabled: false, unlockPin: '' })
    pinText.value = ''
    show('已关闭应用锁', '本机 PIN 一并清除')
    return
  }
  if (pinText.value.length !== 4) {
    pinError.value = '先设一个 4 位数字，再开启应用锁'
    return
  }
  pinError.value = ''
  patch({ appLockEnabled: true, unlockPin: pinText.value })
  show('应用锁已开启', '下次打开需要输入这 4 位数字')
}

/** PIN 只在「已开启应用锁」时写库；未开启时仅暂存，开启那一步再校验长度。 */
function setPin(value: string): void {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  pinText.value = digits
  if (!appLockEnabled.value) return
  if (digits.length !== 4) {
    pinError.value = '解锁数字要 4 位'
    return
  }
  pinError.value = ''
  patch({ unlockPin: digits })
}

function onTime(event: Event): void {
  patch({ reminderTime: (event.target as HTMLInputElement).value })
}

function onPin(event: Event): void {
  setPin((event.target as HTMLInputElement).value)
}

async function confirmPending(): Promise<void> {
  const action = pending.value
  pending.value = null
  if (action === null) return
  try {
    if (action === 'wipe') {
      await store.wipeLedger()
      show('账目已清空', '分类、账户与预算都保留着')
    } else {
      await store.rebuildDemo()
      show('示例账本已重建', '你自己记的流水会被覆盖掉')
    }
  } catch (cause) {
    show('本地库没改动成功', cause instanceof Error ? cause.message : String(cause))
  }
}
</script>

<template>
  <NavBar title="设置" />

  <div class="screen-scroll">
    <section class="sec-head">
      <p class="h2">日常</p>
    </section>
    <div class="list">
      <div class="li">
        <span class="tile t36 lead"><Icon name="bell" :size="18" /></span>
        <span class="lt">每日记账提醒</span>
        <button class="switch" :class="{ on: reminderEnabled }" type="button" role="switch" :aria-checked="reminderEnabled" @click="toggleReminder"><i /></button>
      </div>
      <div v-if="reminderEnabled" class="li">
        <span class="lt">提醒时间</span>
        <input :value="store.settings.reminderTime" class="field time" type="time" @change="onTime" />
      </div>
      <div class="li">
        <span class="lt">月度周期</span>
        <span class="lv">每月 {{ store.settings.monthlyResetDay }} 日</span>
      </div>
      <div class="li">
        <span class="lt">主题</span>
        <span class="lv">暖纸（内置）</span>
      </div>
    </div>

    <section class="sec-head">
      <p class="h2">隐私</p>
    </section>
    <div class="list">
      <div class="li">
        <span class="tile t36 lead"><Icon name="lock" :size="18" /></span>
        <span class="lt">应用锁</span>
        <button class="switch" :class="{ on: appLockEnabled }" type="button" role="switch" :aria-checked="appLockEnabled" @click="toggleLock"><i /></button>
      </div>
      <div class="li column">
        <span class="lt">4 位解锁数字</span>
        <input :value="pinText" class="field pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="重新设置 4 位解锁数字" @input="onPin" />
      </div>
      <p v-if="pinError" class="err">
        <Icon name="alertTriangle" :size="13" />
        <span>{{ pinError }}</span>
      </p>
    </div>
    <p class="budget-tip">
      <Icon name="infoDot" :size="14" />
      <span>解锁数字只用于本机界面遮罩，不联网、不同步；系统级加密由 iOS 沙盒负责</span>
    </p>

    <section class="sec-head">
      <p class="h2">本地数据</p>
    </section>
    <div class="list">
      <div class="li">
        <span class="lt">流水笔数</span>
        <span class="lv num">{{ store.transactions.length }} 笔</span>
      </div>
      <div class="li">
        <span class="lt">分类 / 账户</span>
        <span class="lv num">{{ store.categories.length }} / {{ store.accounts.length }}</span>
      </div>
      <div class="li tappable" role="button" tabindex="0" @click="pending = 'restore'">
        <span class="tile t36 lead"><Icon name="swap" :size="18" /></span>
        <span class="lt">恢复示例账本</span>
        <span class="lv danger">覆盖式</span>
      </div>
      <div class="li tappable" role="button" tabindex="0" @click="pending = 'wipe'">
        <span class="tile t36 lead"><Icon name="trash" :size="18" /></span>
        <span class="lt">清空账目</span>
        <span class="lv danger">不可撤销</span>
      </div>
    </div>
    <p class="budget-tip">
      <Icon name="lock" :size="14" />
      <span>账本存在这台设备的 IndexedDB 里，卸载 App 即随之删除</span>
    </p>
  </div>

  <Sheet :open="pending !== null" :title="pending === 'wipe' ? '清空全部账目？' : '重建示例账本？'" @close="pending = null">
    <p class="sheet-copy">
      {{
        pending === 'wipe'
          ? `将删除 ${store.transactions.length} 笔流水，分类、账户与预算模板都会保留。`
          : '将按原型示例重建账本，你自己记的流水会被覆盖，这一步不能撤销。'
      }}
    </p>
    <div class="btn-row">
      <button class="btn" type="button" @click="pending = null">再想想</button>
      <button class="btn danger" type="button" @click="confirmPending">确认{{ pending === 'wipe' ? '清空' : '重建' }}</button>
    </div>
  </Sheet>
</template>
