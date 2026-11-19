import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { ref } from 'vue'
import HomeView from '@/views/HomeView.vue'

/** 原型 tab 只有 4 个位置，中间留给记一笔 FAB；明细/搜索从首页推入。 */
export type TabName = 'home' | 'reports' | 'budget' | 'profile'

declare module 'vue-router' {
  interface RouteMeta {
    /** 归属底栏 tab；记一笔等临时页不归属，切页时底栏保持上一次高亮。 */
    tab?: TabName
    /** 导航层级：tab 根页 0，推入页 1，推入页的下一级 2。 */
    depth?: number
    title?: string
  }
}

/**
 * 层级 depth 决定转场方向：tab 根页 0，推入页 1，推入页的下一级 2。
 * hash 历史是 Capacitor WKWebView 的硬要求——file:// 下 history API 会 404。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'home', component: HomeView, meta: { tab: 'home', depth: 0, title: '小满记账' } },
  {
    path: '/ledger',
    name: 'ledger',
    component: () => import('@/views/LedgerView.vue'),
    meta: { tab: 'home', depth: 1, title: '账单明细' },
  },
  {
    path: '/ledger/day/:dayKey',
    name: 'day',
    component: () => import('@/views/DayDetailView.vue'),
    props: true,
    meta: { tab: 'home', depth: 2, title: '当日账单' },
  },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { tab: 'home', depth: 1, title: '搜索' } },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('@/views/ReportsView.vue'),
    meta: { tab: 'reports', depth: 0, title: '统计报表' },
  },
  {
    path: '/reports/:categoryId',
    name: 'category-report',
    component: () => import('@/views/CategoryReportView.vue'),
    props: true,
    meta: { tab: 'reports', depth: 1, title: '分类详情' },
  },
  {
    path: '/budget',
    name: 'budget',
    component: () => import('@/views/BudgetView.vue'),
    meta: { tab: 'budget', depth: 0, title: '预算' },
  },
  {
    path: '/budget/alerts',
    name: 'budget-alerts',
    component: () => import('@/views/BudgetAlertsView.vue'),
    meta: { tab: 'budget', depth: 1, title: '超支提醒' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { tab: 'profile', depth: 0, title: '我的' },
  },
  {
    path: '/profile/calendar',
    name: 'calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { tab: 'profile', depth: 1, title: '打卡日历' },
  },
  {
    path: '/profile/accounts',
    name: 'accounts',
    component: () => import('@/views/AccountsView.vue'),
    meta: { tab: 'profile', depth: 1, title: '账户与资产' },
  },
  {
    path: '/profile/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { tab: 'profile', depth: 1, title: '设置' },
  },
  {
    path: '/entry/:kind(expense|income|transfer)',
    name: 'entry',
    component: () => import('@/views/EntryView.vue'),
    props: true,
    meta: { depth: 1, title: '记一笔' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

export const appRouter = createRouter({ history: createWebHashHistory(), routes })

export const TABS: { name: TabName; label: string; icon: 'docLines' | 'tabStats' | 'tabBudget' | 'tabMe'; to: string }[] = [
  { name: 'home', label: '记账', icon: 'docLines', to: '/home' },
  { name: 'reports', label: '报表', icon: 'tabStats', to: '/reports' },
  { name: 'budget', label: '预算', icon: 'tabBudget', to: '/budget' },
  { name: 'profile', label: '我的', icon: 'tabMe', to: '/profile' },
]

/**
 * 转场方向：同层级、或跨 tab（含从当日页跳记一笔）只做淡入——
 * 横向推入会让人误以为进入了下一层，只有同一 tab 内加深/回退才该推。
 */
export function transitionName(fromDepth: number, toDepth: number, sameTab: boolean): string {
  if (fromDepth === toDepth || !sameTab) return 'fade'
  return toDepth > fromDepth ? 'fwd' : 'back'
}

/** App.vue 的 <Transition> 名字由导航方向推导，视图本身不关心自己是怎么被打开的。 */
export const navAnim = ref('fade')

appRouter.beforeEach((to, from) => {
  navAnim.value = transitionName(from.meta.depth ?? 0, to.meta.depth ?? 0, to.meta.tab === from.meta.tab)
})
