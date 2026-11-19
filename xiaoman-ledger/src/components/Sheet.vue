<script setup lang="ts">
/** 底部弹层：盖住 tabbar，遮罩点击即收起。 */
withDefaults(defineProps<{ open: boolean; title?: string; grabber?: boolean }>(), { title: undefined, grabber: true })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="#overlays">
    <Transition name="veil">
      <div v-if="open" class="veil" @click="emit('close')" />
    </Transition>
    <Transition name="sheet">
      <section v-if="open" class="sheet" role="dialog" :aria-label="title ?? '选项'">
        <div v-if="grabber" class="grab" />
        <p v-if="title" class="h2 sheet-title">{{ title }}</p>
        <slot />
      </section>
    </Transition>
  </Teleport>
</template>
