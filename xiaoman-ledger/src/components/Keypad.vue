<script setup lang="ts">
/**
 * 记账数字键盘：只负责吐字符，金额换算与校验都在屏幕里。
 * 右侧一列是功能键（删除 / 改日期 / 小数点），最后一行放「清除」和「保存」。
 */
const emit = defineEmits<{ key: [value: string]; back: []; clear: []; date: []; submit: [] }>()

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
]
</script>

<template>
  <div class="keypad">
    <div v-for="(row, index) in ROWS" :key="row.join('-')" class="kp-row">
      <button v-for="digit in row" :key="digit" type="button" class="key" @click="emit('key', digit)">{{ digit }}</button>
      <button v-if="index === 0" type="button" class="key fn" aria-label="删除一位" @click="emit('back')">⌫</button>
      <button v-else-if="index === 1" type="button" class="key fn" @click="emit('date')">日期</button>
      <button v-else type="button" class="key fn" aria-label="小数点" @click="emit('key', '.')">.</button>
    </div>
    <div class="kp-row">
      <button type="button" class="key wide" aria-label="零" @click="emit('key', '0')">0</button>
      <button type="button" class="key fn" @click="emit('clear')">清除</button>
      <button type="button" class="key go" @click="emit('submit')">保存</button>
    </div>
  </div>
</template>
