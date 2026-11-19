<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import MoneyText from '@/components/MoneyText.vue'
import NavBar from '@/components/NavBar.vue'
import Sheet from '@/components/Sheet.vue'
import { useLedgerStore } from '@/stores/ledger'
import { useToast } from '@/composables/useToast'
import { formatMoney, keypadTextToCents } from '@/utils/money'
import type { Account, AccountKind } from '@/types/domain'

/** S7 账户与资产：余额一律「期初 + 流水」推演，改期初即改推演起点，绝不直接写余额。 */
const store = useLedgerStore()
const { show } = useToast()

const KIND_LABEL: Record<AccountKind, string> = { cash: '现金', debit: '储蓄卡', ewallet: '电子钱包', credit: '信用卡' }
const KIND_OPTIONS: AccountKind[] = ['cash', 'debit', 'ewallet', 'credit']
const NEW_COLORS = ['#7CB065', '#5B87BE', '#FFB03A', '#9579D6', '#A2907F', '#E86A90']

const draft = ref<Account | null>(null)
const isNew = ref(false)
const nameText = ref('')
const kindText = ref<AccountKind>('debit')
const tailText = ref('')
const balanceText = ref('')

function startAdd(): void {
  isNew.value = true
  nameText.value = ''
  kindText.value = 'debit'
  tailText.value = ''
  balanceText.value = '0'
  draft.value = {
    id: '',
    name: '',
    kind: 'debit',
    openingBalanceCents: 0,
    color: NEW_COLORS[0] ?? '#7CB065',
    sortOrder: store.accounts.length + 1,
    builtin: false,
  }
}

function startEdit(account: Account): void {
  isNew.value = false
  nameText.value = account.name
  kindText.value = account.kind
  tailText.value = account.tail ?? ''
  balanceText.value = String(account.openingBalanceCents / 100)
  draft.value = account
}

function close(): void {
  draft.value = null
}

async function save(): Promise<void> {
  const target = draft.value
  if (!target) return
  const name = nameText.value.trim()
  if (name === '') {
    show('账户名还空着', '给这个账户起个名字，比如「工资卡」')
    return
  }
  const account: Account = {
    ...target,
    id: isNew.value ? `user:${Date.now().toString(36)}` : target.id,
    name,
    kind: kindText.value,
    openingBalanceCents: keypadTextToCents(balanceText.value),
    color: isNew.value ? NEW_COLORS[store.accounts.length % NEW_COLORS.length] ?? '#A2907F' : target.color,
  }
  if (tailText.value.trim() !== '') account.tail = tailText.value.trim()
  try {
    await store.saveAccount(account)
  } catch (cause) {
    show('本地库没写进去', cause instanceof Error ? cause.message : String(cause))
    return
  }
  close()
  show(`${name}已保存`, '余额按「期初 + 全部流水」重新推演')
}

const sortedBalances = computed(() => [...store.balances].sort((a, b) => a.account.sortOrder - b.account.sortOrder))
</script>

<template>
  <NavBar title="账户与资产" :subtitle="`${store.accounts.length} 个账户`" right-icon="plus" @right="startAdd" />

  <div class="screen-scroll">
    <section class="hero">
      <div class="hero-top">
        <p class="cap">净资产</p>
        <p class="cap num">{{ store.transactions.length }} 笔流水参与推演</p>
      </div>
      <MoneyText :cents="store.netWorth.netCents" />
      <div class="hero-2col">
        <div class="mini">
          <p class="cap">资产</p>
          <p class="v num">{{ formatMoney(store.netWorth.assetsCents) }}</p>
        </div>
        <span class="vsep" />
        <div class="mini">
          <p class="cap">负债</p>
          <p class="v num">{{ formatMoney(store.netWorth.liabilitiesCents) }}</p>
        </div>
      </div>
    </section>

    <section v-for="entry in sortedBalances" :key="entry.account.id" class="acct-card" role="button" tabindex="0" @click="startEdit(entry.account)">
      <span class="tile t40" :style="{ background: `${entry.account.color}26`, color: entry.account.color }">
        <Icon :name="entry.account.kind === 'credit' ? 'cardPlain' : entry.account.kind === 'cash' ? 'wallet' : 'cardChip'" :size="20" />
      </span>
      <div class="grow">
        <p class="an">{{ entry.account.name }}<span v-if="entry.account.tail" class="tail num"> ···· {{ entry.account.tail }}</span></p>
        <p class="ab">{{ KIND_LABEL[entry.account.kind] }} · 期初 {{ formatMoney(entry.account.openingBalanceCents) }}</p>
      </div>
      <p class="num abalance" :class="{ minus: entry.balanceCents < 0 }">{{ formatMoney(entry.balanceCents) }}</p>
    </section>

    <p class="budget-tip">
      <Icon name="infoDot" :size="14" />
      <span>信用卡的余额按负债计入净资产</span>
    </p>
  </div>

  <Sheet :open="draft !== null" :title="isNew ? '新增账户' : '编辑账户'" @close="close">
    <div class="field-row">
      <input v-model="nameText" class="field" type="text" maxlength="20" placeholder="账户名，如「工资卡」" aria-label="账户名" />
    </div>
    <div class="chips inside">
      <button
        v-for="option in KIND_OPTIONS"
        :key="option"
        type="button"
        class="chip sm"
        :class="{ on: kindText === option }"
        @click="kindText = option"
      >
        {{ KIND_LABEL[option] }}
      </button>
    </div>
    <div class="field-row">
      <input v-model="tailText" class="field" type="text" inputmode="numeric" maxlength="4" placeholder="卡号尾号（选填）" aria-label="卡号尾号" />
      <input v-model="balanceText" class="field" type="text" inputmode="decimal" placeholder="期初余额" aria-label="期初余额" />
    </div>
    <div class="btn-row">
      <button class="btn" type="button" @click="close">取消</button>
      <button class="btn primary" type="button" @click="save">保存</button>
    </div>
  </Sheet>
</template>
