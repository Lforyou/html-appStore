export const SEED_VERSION = 3

/* ------------------------------------------------------------------ *
 * 锚点常量：逐条对应原型 S1 / S3a / S3c / S5 / S6 的可见数字，单位「分」
 * ------------------------------------------------------------------ */
export const MONTHLY_EXPENSE_CENTS: Record<number, number> = {
  1: 372_000,
  2: 438_000,
  3: 388_500,
  4: 405_600,
  5: 392_300,
  6: 418_700,
  7: 449_900,
  8: 518_000,
  9: 364_000,
  10: 411_000,
  11: 428_650,
  12: 462_300,
}

/** 原型 S1 Hero「本月支出 ¥4,286.50」与 S3a 图例、S5 预算行的分类拆分。 */
export const CURRENT_MONTH_SPLIT_CENTS: Record<string, number> = {
  餐饮: 137_200,
  奶茶饮品: 51_400,
  交通: 77_200,
  购物: 64_300,
  日用品: 34_300,
  居住水电: 30_000,
  娱乐: 21_400,
  人情往来: 12_850,
}

/** 原型 S3a 笔数/笔均：餐饮 42 笔 ¥32.7、奶茶 12 杯 ¥42.8。 */
export const CURRENT_MONTH_COUNTS: Record<string, number> = {
  餐饮: 42,
  奶茶饮品: 12,
  交通: 30,
  购物: 12,
  日用品: 8,
  居住水电: 3,
  娱乐: 5,
  人情往来: 4,
}

/** 历史月按占比分摊；医疗/学习/其他只出现在历史月（本月归入原型「其余 3 类」）。 */
export const HISTORY_SHARE_VECTOR: Record<string, number> = {
  餐饮: 0.305,
  交通: 0.17,
  购物: 0.145,
  奶茶饮品: 0.115,
  日用品: 0.08,
  居住水电: 0.07,
  娱乐: 0.048,
  人情往来: 0.028,
  医疗健康: 0.016,
  学习: 0.012,
  其他: 0.011,
}

/**
 * 奶茶逐月金额锚点。默认 11.5% 占比会让每个历史月都超掉 ¥450 预算，
 * 「已连续 3 个月超支」就退化成「全年都超」，所以逐月显式给值：
 * 1–8 月压在预算内并缓慢爬坡，9/10/11 月连续越线。
 */
export const MILK_TEA_OVERRIDES_CENTS: Record<number, number> = {
  1: 32_400,
  2: 34_800,
  3: 31_200,
  4: 36_600,
  5: 38_400,
  6: 35_100,
  7: 41_700,
  8: 43_900,
  9: 48_600,
  10: 46_800,
  12: 44_300,
}

export const SALARY_CENTS = 1_200_000
/** 年度收入锚点 131,400 = 10 个月 12,000 + 1 月 11,400。 */
export const SALARY_JANUARY_CENTS = 1_140_000
export const YEAR_END_BONUS_CENTS = 80_000

/**
 * 每月固定转账：只动账户，不计收支、不占预算。
 * 额度按各类目的实际月支出反推，保证任何一天都不会把某个账户记成负数。
 */
export const MONTHLY_TRANSFERS: { day: number; from: string; to: string; cents: number; merchant: string; note: string }[] = [
  { day: 5, from: 'cmb', to: 'lingqiantong', cents: 200_000, merchant: '储蓄罐', note: '招行→零钱通' },
  { day: 6, from: 'cmb', to: 'wechat', cents: 250_000, merchant: '零钱充值', note: '招行→微信零钱' },
  { day: 6, from: 'cmb', to: 'alipay', cents: 160_000, merchant: '支付宝充值', note: '招行→支付宝' },
  { day: 7, from: 'cmb', to: 'cash', cents: 5_000, merchant: 'ATM 取现', note: '招行→现金' },
]

export const AVG_TICKET_CENTS: Record<string, number> = {
  餐饮: 3_300,
  奶茶饮品: 4_300,
  交通: 800,
  购物: 18_000,
  日用品: 8_500,
  居住水电: 26_000,
  娱乐: 5_500,
  医疗健康: 9_000,
  学习: 11_000,
  人情往来: 12_000,
  其他: 6_000,
}

export const MIN_TICKET_CENTS = 100
export const STREAK_DAYS = 21

export interface FixedEntry {
  dayOffsetFromToday: number
  category: string
  cents: number
  time: string
  merchant: string
  note: string
  tags: string[]
  account: string
}

/** 原型 S1 今天组 4 条（¥73.40）与昨天组 2 条（¥373.00），必须原样出现。 */
export const FIXED_ENTRIES: FixedEntry[] = [
  {
    dayOffsetFromToday: 0,
    category: '餐饮',
    cents: 2_650,
    time: '08:12:00',
    merchant: '全家便利店（天河北店）',
    note: '早餐 · 饭团 + 咖啡',
    tags: ['早餐', '工作日'],
    account: 'wechat',
  },
  {
    dayOffsetFromToday: 0,
    category: '交通',
    cents: 500,
    time: '09:04:00',
    merchant: '地铁3号线',
    note: '体育西路→珠江新城',
    tags: ['通勤'],
    account: 'wechat',
  },
  {
    dayOffsetFromToday: 0,
    category: '奶茶饮品',
    cents: 990,
    time: '14:30:00',
    merchant: '瑞幸',
    note: '生椰拿铁（自提）',
    tags: ['咖啡'],
    account: 'wechat',
  },
  {
    dayOffsetFromToday: 0,
    category: '餐饮',
    cents: 3_200,
    time: '12:20:00',
    merchant: '美团外卖',
    note: '麻辣香锅，满减省 ¥6',
    tags: ['午餐', '外卖'],
    account: 'wechat',
  },
  {
    dayOffsetFromToday: 1,
    category: '日用品',
    cents: 32_800,
    time: '20:41:00',
    merchant: '山姆会员店',
    note: '周末采购',
    tags: ['囤货'],
    account: 'alipay',
  },
  {
    dayOffsetFromToday: 1,
    category: '娱乐',
    cents: 4_500,
    time: '19:30:00',
    merchant: '英皇影城',
    note: '《好东西》',
    tags: ['电影'],
    account: 'wechat',
  },
]

export const MERCHANT_POOL: Record<string, [string, string][]> = {
  餐饮: [
    ['公司食堂', '午餐'],
    ['太二酸菜鱼', '晚餐'],
    ['沙县小吃', '快餐'],
    ['美团外卖', '晚餐外卖'],
    ['全家便利店', '便利店'],
    ['煲仔皇', '一人食'],
  ],
  奶茶饮品: [['瑞幸', '生椰拿铁'], ['喜茶', '多肉葡萄'], ['奈雪', '霸气橙子'], ['Manner', '澳白'], ['蜜雪冰城', '柠檬水']],
  交通: [['地铁3号线', '通勤'], ['滴滴出行', '快车'], ['共享单车', '骑行月卡'], ['高德打车', '雨天打车'], ['羊城通', '充值']],
  购物: [['优衣库', '基础款'], ['天猫超市', '日用补货'], ['得物', '球鞋'], ['京东', '数码配件'], ['名创优品', '小物']],
  日用品: [['朴朴超市', '生鲜'], ['屈臣氏', '洗护'], ['全家便利店', '纸巾补货'], ['山姆会员店', '周末采购']],
  居住水电: [['国家电网', '电费'], ['广州自来水', '水费'], ['燃气公司', '燃气费'], ['电信', '宽带月费']],
  娱乐: [['英皇影城', '电影票'], ['Steam', '游戏'], ['腾讯视频', '订阅'], ['剧本杀', '聚会'], ['Keep', '年卡']],
  医疗健康: [['大参林', '感冒药'], ['中山大学附属门诊', '挂号'], ['口腔医院', '洗牙']],
  学习: [['得到', '课程'], ['三联书店', '书'], ['网易云课堂', '订阅课']],
  人情往来: [['同事生日', '红包'], ['爸妈', '家用'], ['朋友婚礼', '随礼']],
  其他: [['快递柜', '寄存费'], ['银行', '手续费'], ['共享充电宝', '租借']],
}

export const ACCOUNT_POOL: Record<string, string[]> = {
  餐饮: ['wechat', 'alipay'],
  奶茶饮品: ['wechat', 'alipay'],
  交通: ['wechat'],
  购物: ['alipay', 'cmb'],
  日用品: ['alipay', 'wechat'],
  居住水电: ['cmb'],
  娱乐: ['wechat', 'alipay'],
  医疗健康: ['cmb', 'alipay'],
  学习: ['alipay'],
  人情往来: ['wechat'],
  其他: ['cash', 'wechat'],
}

export const TIME_WINDOW: Record<string, [number, number]> = {
  餐饮: [7, 20],
  奶茶饮品: [9, 17],
  交通: [7, 22],
  购物: [10, 22],
  日用品: [10, 21],
  居住水电: [9, 18],
  娱乐: [13, 22],
  医疗健康: [8, 19],
  学习: [10, 22],
  人情往来: [9, 21],
  其他: [8, 21],
}
