<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BudgetTotalCard from '@/components/BudgetTotalCard.vue'
import Icon from '@/components/Icon.vue'
import NavBar from '@/components/NavBar.vue'
import Sheet from '@/components/Sheet.vue'
import { useLedgerStore } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import { TOTAL_BUDGET_TARGET, overBudgetList } from '@/domain/budget'
import { formatMoney, keypadTextToCents } from '@/utils/money'
import type { BudgetStatus } from '@/types/domain'

/** S4 预算：总预算 + 分类预算一屏看全；改额度以「本月生效」落新版本，历史月的判定不受影响。 */
const store = useLedgerStore()
const router = useRouter()
const { show } = useToast()

const board = computed(() => store.budgetBoard)
const overspent = computed(() => overBudgetList(board.value))
/** 连续 2 个月以上越线的分类：单月超支是意外，连着超才是额度问题。 */
const repeated = computed(() => board.value.items.filter((item) => item.consecutiveOverMonths >= 2))

const editing = ref<BudgetStatus | null>(null)
const amountText = ref('')
const editTitle = computed(() => {
  const target = editing.value
  if (!target) return '调整预算'
  return target.targetId === TOTAL_BUDGET_TARGET ? '调整总预算' : `调整「${target.name}」预算`
})

function openEdit(status: BudgetStatus): void {
  editing.value = status
  amountText.value = String(status.budgetCents / 100)
}

function closeEdit(): void {
  editing.value = null
  amountText.value = ''
}

async function saveBudget(): Promise<void> {
  const target = editing.value
  if (!target) return
  const cents = keypadTextToCents(amountText.value)
  try {
    const error = await store.setBudget(target.targetId, cents)
    if (error) {
      show(error, '预算要填一个大于 0 的金额')
      return
    }
  } catch (cause) {
    show('本地库没写进去', cause instanceof Error ? cause.message : String(cause))
    return
  }
  closeEdit()
  show(`${target.targetId === TOTAL_BUDGET_TARGET ? '总预算' : target.name}已改为 ${formatMoney(cents)}`, '当月生效，历史月份按当时额度判定')
}
</script>

<template>
  <NavBar
    title="预算"
    :subtitle="`${store.monthLabel} · ${overspent.length} 项超支`"
    :back="false"
    right-icon="bell"
    @right="router.push('/budget/alerts')"
  />

  <div class="screen-scroll">
    <BudgetTotalCard v-if="board.total" :status="board.total" @edit="openEdit" />

    <div v-if="repeated.length > 0" class="alert tappable" role="button" tabindex="0" @click="router.push('/budget/alerts')">
      <Icon name="alertTriangle" :size="20" />
      <div class="grow">
        <p class="t">{{ repeated[0]?.name }}已连续 {{ repeated[0]?.consecutiveOverMonths }} 个月超支</p>
        <p class="d">连着越线说明额度定得偏紧，去看看建议</p>
      </div>
      <Icon name="chevronRight" :size="16" />
    </div>

    <section class="sec-head">
      <p class="h2">分类预算</p>
      <p class="cap num">{{ board.items.length }} 项</p>
    </section>
    <section class="card">
      <p v-if="board.items.length === 0" class="empty-line">还没有分类预算，先调总预算</p>
      <div v-for="item in board.items" :key="item.targetId" class="bud-row tappable" role="button" tabindex="0" @click="openEdit(item)">
        <span class="tile t36" :style="{ background: item.tileColor }">
          <Icon :category="item.name" :size="18" />
        </span>
        <div class="grow">
          <div class="bar-row tight">
            <p class="bn">{{ item.name }}</p>
            <p class="bv num">{{ formatMoney(item.spentCents) }} / {{ formatMoney(item.budgetCents) }}</p>
          </div>
          <div class="bar sm" :class="{ danger: item.state === 'over' }">
            <i :style="{ width: `${Math.min(item.usedPercent, 100)}%` }" />
          </div>
        </div>
        <span class="tri" :class="item.state === 'over' ? 'up' : item.state === 'near' ? 'plain' : 'down'">{{ item.usedPercent }}%</span>
      </div>
    </section>

    <p class="budget-tip">
      <Icon name="infoDot" :size="14" />
      <span>转账不计入预算；改额度从当月生效</span>
    </p>
  </div>

  <Sheet :open="editing !== null" :title="editTitle" @close="closeEdit">
    <div class="field-row">
      <input v-model="amountText" class="field big-input" type="text" inputmode="decimal" aria-label="预算金额" />
      <span class="cap">元 / 月</span>
    </div>
    <p class="budget-tip inline-tip">
      <Icon name="infoDot" :size="14" />
      <span>当前 {{ editing ? formatMoney(editing.budgetCents) : '—' }}，改成 {{ formatMoney(keypadTextToCents(amountText)) }}</span>
    </p>
    <div class="btn-row">
      <button class="btn" type="button" @click="closeEdit">取消</button>
      <button class="btn primary" type="button" @click="saveBudget">保存</button>
    </div>
  </Sheet>
</template>
