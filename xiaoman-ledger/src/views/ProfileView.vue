<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { useLedgerStore } from '@/stores/ledger'
import type { IconName } from '@/assets/icons'
import { formatMoney } from '@/utils/money'

/** S6 我的：身份 + 净资产 + 入口集合。资产全部由「期初 + 流水」推演，库里不落余额。 */
const store = useLedgerStore()
const router = useRouter()

const appVersion = __APP_VERSION__
const netWorth = computed(() => store.netWorth)
const topAccounts = computed(() => store.balances.slice(0, 2))

const links: { icon: IconName; label: string; value: string; to: string }[] = [
  { icon: 'calendar', label: '打卡日历', value: `连续 ${store.streakDays} 天`, to: '/profile/calendar' },
  { icon: 'cardChip', label: '账户与资产', value: `${store.accounts.length} 个账户`, to: '/profile/accounts' },
  { icon: 'tabBudget', label: '预算', value: formatMoney(store.budgetBoard.total?.budgetCents ?? 0), to: '/budget' },
  { icon: 'tabStats', label: '统计报表', value: `${store.year} 年`, to: '/reports' },
]
</script>

<template>
  <div class="screen-scroll">
    <section class="hero profile-head">
      <span class="avatar big">满</span>
      <div class="grow">
        <p class="h1">小满</p>
        <p class="cap">记账第 {{ store.ledgerAge }} 天 · 连续 {{ store.streakDays }} 天</p>
      </div>
      <button class="iconbtn" type="button" aria-label="设置" @click="router.push('/profile/settings')">
        <Icon name="gear" :size="18" />
      </button>
    </section>

    <section class="card" role="button" tabindex="0" @click="router.push('/profile/accounts')">
      <div class="hero-top">
        <p class="cap">净资产</p>
        <p class="link">明细 ›</p>
      </div>
      <p class="d32 num">{{ formatMoney(netWorth.netCents) }}</p>
      <div class="hero-2col">
        <div class="mini">
          <p class="cap">资产</p>
          <p class="v num">{{ formatMoney(netWorth.assetsCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">负债</p>
          <p class="v num">{{ formatMoney(netWorth.liabilitiesCents) }}</p>
        </div>
      </div>
      <div class="dash acct-strip">
        <p v-for="entry in topAccounts" :key="entry.account.id" class="cap num">
          {{ entry.account.name }} {{ formatMoney(entry.balanceCents) }}
        </p>
      </div>
    </section>

    <div class="list">
      <div v-for="link in links" :key="link.to" class="li tappable" role="button" tabindex="0" @click="router.push(link.to)">
        <span class="tile t36 lead"><Icon :name="link.icon" :size="18" /></span>
        <span class="lt">{{ link.label }}</span>
        <span class="lv num">{{ link.value }}</span>
        <Icon name="chevronRight" :size="16" />
      </div>
    </div>

    <div class="list">
      <div class="li tappable" role="button" tabindex="0" @click="router.push('/profile/settings')">
        <span class="tile t36 lead"><Icon name="gear" :size="18" /></span>
        <span class="lt">设置</span>
        <span class="lv">提醒 · 主题 · 数据</span>
        <Icon name="chevronRight" :size="16" />
      </div>
      <div class="li">
        <span class="tile t36 lead"><Icon name="info" :size="18" /></span>
        <span class="lt">版本</span>
        <span class="lv num">{{ appVersion }}</span>
      </div>
    </div>

    <p class="budget-tip">
      <Icon name="lock" :size="14" />
      <span>全部数据只存在这台设备的本地数据库，不使用网络、不上传</span>
    </p>
  </div>
</template>
