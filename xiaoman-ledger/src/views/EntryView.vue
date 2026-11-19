<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryGrid from '@/components/CategoryGrid.vue'
import Icon from '@/components/Icon.vue'
import Keypad from '@/components/Keypad.vue'
import NavBar from '@/components/NavBar.vue'
import Sheet from '@/components/Sheet.vue'
import { useLedgerStore, type EntryDraft } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import { addDays, cnMonthDay, dayKeyOf, nowWallClock, relativeDayLabel, timeOfDay } from '@/utils/date'
import { formatKeypadDisplay, formatMoney, keypadAppend, keypadBackspace, keypadTextToCents } from '@/utils/money'
import type { Kind } from '@/types/domain'

/** S5 记一笔：金额走自定义键盘，分类/账户/时间走弹层；校验全交给 store，屏幕只负责收集。 */
// 路由用 :kind(expense|income|transfer) 限定取值，这里不需要再防御非法值
const props = defineProps<{ kind: string }>()
const store = useLedgerStore()
const route = useRoute()
const router = useRouter()
const { show } = useToast()

const editingId = computed(() => (typeof route.query.id === 'string' ? route.query.id : null))
const editingRow = computed(() => (editingId.value === null ? undefined : store.transactions.find((t) => t.id === editingId.value)))

const kind = ref<Kind>(props.kind as Kind)
const amountText = ref('0')
const categoryId = ref<string | null>(null)
const accountId = ref('')
const targetAccountId = ref('')
const dayKey = ref(store.today)
const timeText = ref(timeOfDay(nowWallClock()))
const merchant = ref('')
const note = ref('')

const dateOpen = ref(false)
const accountSheet = ref<'from' | 'to' | null>(null)
const saving = ref(false)

watch(
  () => store.accounts.length,
  () => {
    if (accountId.value === '') accountId.value = store.accounts[0]?.id ?? ''
  },
  { immediate: true },
)

/** 改一笔：把已有流水灌回表单，金额按元展示、时间拆成日与时分。 */
watch(
  editingRow,
  (row) => {
    if (!row) return
    kind.value = row.kind
    amountText.value = String(row.amountCents / 100)
    categoryId.value = row.categoryId
    accountId.value = row.accountId
    targetAccountId.value = row.targetAccountId ?? ''
    dayKey.value = dayKeyOf(row.occurredAt)
    timeText.value = row.occurredAt.slice(11, 16)
    merchant.value = row.merchant
    note.value = row.note
  },
  { immediate: true },
)

const categories = computed(() => (kind.value === 'income' ? store.incomeCategories : store.expenseCategories))
const amountCents = computed(() => keypadTextToCents(amountText.value))
const dayLabel = computed(() => relativeDayLabel(dayKey.value, store.today) ?? cnMonthDay(dayKey.value))
const quickDays = computed(() =>
  [0, 1, 2].map((offset) => {
    const key = addDays(store.today, -offset)
    return { key, label: relativeDayLabel(key, store.today) ?? cnMonthDay(key) }
  }),
)

function setKind(next: Kind): void {
  if (next === kind.value) return
  kind.value = next
  categoryId.value = null
  if (next === 'transfer' && targetAccountId.value === '') {
    targetAccountId.value = store.accounts.find((account) => account.id !== accountId.value)?.id ?? ''
  }
}

function onKey(value: string): void {
  amountText.value = keypadAppend(amountText.value, value)
}

function pickAccount(id: string): void {
  if (accountSheet.value === 'to') targetAccountId.value = id
  else accountId.value = id
  accountSheet.value = null
}

function swapAccounts(): void {
  const from = accountId.value
  accountId.value = targetAccountId.value
  targetAccountId.value = from
}

async function submit(): Promise<void> {
  if (saving.value) return
  const draft: EntryDraft = {
    kind: kind.value,
    amountCents: amountCents.value,
    categoryId: categoryId.value,
    accountId: accountId.value,
    targetAccountId: kind.value === 'transfer' ? targetAccountId.value : undefined,
    occurredAt: `${dayKey.value}T${timeText.value}:00`,
    merchant: merchant.value,
    note: note.value,
  }
  const id = editingId.value
  saving.value = true
  try {
    const error = id === null ? await store.addEntry(draft) : await store.updateEntry(id, draft)
    if (error !== null) {
      show('还没记上', error)
      return
    }
    const tail = kind.value === 'transfer' ? `${store.accountName(draft.accountId)} → ${store.accountName(targetAccountId.value)}` : store.categoryName(draft.categoryId)
    show(id === null ? '已记一笔' : '已更新这一笔', `${formatMoney(draft.amountCents)} · ${tail}`)
    router.back()
  } catch (error) {
    show('本地库没写进去', error instanceof Error ? error.message : String(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <NavBar :title="editingId ? '修改这一笔' : kind === 'transfer' ? '转账' : '记一笔'" :subtitle="`${dayLabel} · ${timeText}`" />

  <div class="seg-row">
    <div class="seg">
      <button type="button" :class="{ on: kind === 'expense', tinted: kind === 'expense' }" @click="setKind('expense')">支出</button>
      <button type="button" :class="{ on: kind === 'income', tinted: kind === 'income' }" @click="setKind('income')">收入</button>
      <button type="button" :class="{ on: kind === 'transfer', tinted: kind === 'transfer' }" @click="setKind('transfer')">转账</button>
    </div>
  </div>

  <div class="screen-scroll">
    <section class="amount-card">
      <button class="pill" type="button" @click="accountSheet = 'from'">
        <Icon name="wallet" :size="14" />
        <span>{{ store.accountName(accountId) || '选账户' }}</span>
        <Icon name="chevronDown" :size="12" />
      </button>
      <div class="big">
        <span class="cur">¥</span>
        <span class="num">{{ formatKeypadDisplay(amountText) }}</span>
        <span class="caret" />
      </div>
    </section>

    <template v-if="kind === 'transfer'">
      <section class="acct-card">
        <div class="acct" role="button" tabindex="0" @click="accountSheet = 'from'">
          <span class="tile t36 lead"><Icon name="swap" :size="18" /></span>
          <div class="grow">
            <p class="an">转出</p>
            <p class="ab">{{ store.accountName(accountId) || '未选择' }}</p>
          </div>
        </div>
        <button class="swap-ic" type="button" aria-label="交换账户" @click="swapAccounts">
          <Icon name="swapWide" :size="16" />
        </button>
        <div class="acct" role="button" tabindex="0" @click="accountSheet = 'to'">
          <div class="grow right">
            <p class="an">转入</p>
            <p class="ab">{{ store.accountName(targetAccountId) || '未选择' }}</p>
          </div>
          <span class="tile t36 lead"><Icon name="wallet" :size="18" /></span>
        </div>
      </section>
      <p class="budget-tip">
        <Icon name="infoDot" :size="14" />
        <span>转账只在两个账户之间挪钱，不计收支、不占预算</span>
      </p>
    </template>

    <CategoryGrid v-else v-model="categoryId" :categories="categories" :kind="kind === 'income' ? 'income' : 'expense'" />

    <section class="card fields">
      <input v-model="merchant" class="field" type="text" maxlength="24" placeholder="商户或名称，如「全家便利店」" aria-label="商户" />
      <input v-model="note" class="field" type="text" maxlength="40" placeholder="备注（选填）" aria-label="备注" />
    </section>
  </div>

  <Keypad @key="onKey" @back="amountText = keypadBackspace(amountText)" @clear="amountText = '0'" @date="dateOpen = true" @submit="submit" />

  <Sheet :open="dateOpen" title="发生时间" @close="dateOpen = false">
    <div class="chips inside">
      <button
        v-for="option in quickDays"
        :key="option.key"
        type="button"
        class="chip sm"
        :class="{ on: dayKey === option.key }"
        @click="dayKey = option.key"
      >
        {{ option.label }}
      </button>
    </div>
    <div class="field-row">
      <input v-model="dayKey" class="field" type="date" aria-label="日期" />
      <input v-model="timeText" class="field" type="time" aria-label="时间" />
    </div>
    <p class="budget-tip inline-tip">
      <Icon name="infoDot" :size="14" />
      <span>记到未来会被拒绝，先改日期再保存</span>
    </p>
    <button class="btn primary" type="button" @click="dateOpen = false">好</button>
  </Sheet>

  <Sheet :open="accountSheet !== null" :title="accountSheet === 'to' ? '转入账户' : '转出 / 支出账户'" @close="accountSheet = null">
    <div class="list flat">
      <div
        v-for="entry in store.balances"
        :key="entry.account.id"
        class="li tappable"
        role="button"
        tabindex="0"
        @click="pickAccount(entry.account.id)"
      >
        <span class="tile t36" :style="{ background: `${entry.account.color}26`, color: entry.account.color }">
          <Icon name="cardChip" :size="18" />
        </span>
        <span class="lt">{{ entry.account.name }}</span>
        <span class="lv num">{{ formatMoney(entry.balanceCents) }}</span>
      </div>
    </div>
  </Sheet>
</template>
