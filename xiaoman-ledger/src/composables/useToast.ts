import { ref } from 'vue'

export interface ToastState {
  id: number
  title: string
  desc: string
  /** 带「查看」动作时由屏幕注册回调 */
  action?: { label: string; run: () => void }
}

const current = ref<ToastState | null>(null)
let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null

/** 全站一条队列：记账成功、恢复示例、清空账目都从这里出口，避免每个屏幕各写一套。 */
export function useToast() {
  function dismiss(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    current.value = null
  }

  function show(title: string, desc = '', duration = 2200, action?: ToastState['action']): void {
    dismiss()
    seq += 1
    current.value = { id: seq, title, desc, action }
    timer = setTimeout(dismiss, duration)
  }

  return { current, show, dismiss }
}
