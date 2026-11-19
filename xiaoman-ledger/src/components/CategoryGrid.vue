<script setup lang="ts">
import Icon from './Icon.vue'
import type { Category } from '@/types/domain'

/** 分类九宫格：支出选中描橙边，收入描绿边，与原型 S5 的两种强调色一致。 */
const props = defineProps<{ categories: Category[]; modelValue: string | null; kind: 'expense' | 'income' }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <div class="catgrid" role="listbox" :aria-label="props.kind === 'expense' ? '支出分类' : '收入分类'">
    <button
      v-for="category in props.categories"
      :key="category.id"
      type="button"
      class="cat"
      :class="{ sel: props.kind === 'expense' && category.id === props.modelValue, 'sel-income': props.kind === 'income' && category.id === props.modelValue }"
      role="option"
      :aria-selected="category.id === props.modelValue"
      @click="emit('update:modelValue', category.id)"
    >
      <span class="tile t36" :style="{ background: category.tileColor, color: category.glyphColor }">
        <Icon :category="category.name" :size="18" />
      </span>
      <span>{{ category.name }}</span>
    </button>
  </div>
</template>
