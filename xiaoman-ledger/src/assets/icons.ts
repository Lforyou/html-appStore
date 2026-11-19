/* 图标注册表：inner 为 24×24 viewBox 内的 path 内容，描边宽度 2、圆头，颜色由组件用 currentColor 注入。 */

export const UI_ICONS = {
  tabStats: "<path d=\"M4 20V10M10 20V5M16 20v-8M22 20H2\"/>",
  tabBudget: "<path d=\"M4 7h16v13H4z\"/><path d=\"M4 11h16M9 7v4\"/><path d=\"M15 3v4\"/>",
  tabMe: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4.5 20a7.5 7.5 0 0115 0\"/>",
  plus: "<path d=\"M12 5v14M5 12h14\"/>",
  chevronLeft: "<path d=\"M15 5l-7 7 7 7\"/>",
  chevronRight: "<path d=\"M9 5l7 7-7 7\"/>",
  chevronDown: "<path d=\"M6 9l6 6 6-6\"/>",
  doc: "<path d=\"M5 4h9l5 5v11H5z\"/><path d=\"M13 4v6h6\"/>",
  docLines: "<path d=\"M5 4h9l5 5v11H5z\"/><path d=\"M13 4v6h6\"/><path d=\"M8 14h7M8 17h5\"/>",
  bell: "<path d=\"M12 4a5 5 0 015 5v4l2 3H5l2-3V9a5 5 0 015-5z\"/><path d=\"M10 19a2 2 0 004 0\"/>",
  lock: "<rect x=\"4\" y=\"10\" width=\"16\" height=\"10\" rx=\"2.5\"/><path d=\"M8 10V7a4 4 0 018 0v3\"/>",
  search: "<circle cx=\"11\" cy=\"11\" r=\"6\"/><path d=\"M15.5 15.5L20 20\"/>",
  info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8v.5\"/>",
  infoDot: "<path d=\"M12 8v5M12 16.4v.4\"/><circle cx=\"12\" cy=\"12\" r=\"9\"/>",
  alertTriangle: "<path d=\"M12 8v5M12 16.4v.4\"/><path d=\"M12 3l9 16H3z\"/>",
  pencil: "<path d=\"M4 20h4L19 9a2.5 2.5 0 00-4-4L4 16z\"/>",
  swap: "<path d=\"M7 8h11M15 5l3 3-3 3M17 16H6M9 13l-3 3 3 3\"/>",
  swapWide: "<path d=\"M4 9h13M14 5l4 4-4 4M20 15H7M10 11l-4 4 4 4\"/>",
  check: "<path d=\"M5 12.5l4.5 4.5L19 8\"/>",
  calendar: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2.5\"/><path d=\"M3 10h18\"/>",
  cardChip: "<rect x=\"3\" y=\"7\" width=\"18\" height=\"11\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12.5\" r=\"2.6\"/><path d=\"M6.5 10v5M17.5 10v5\"/>",
  cardPlain: "<rect x=\"3\" y=\"7\" width=\"18\" height=\"11\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12.5\" r=\"2.6\"/>",
  wallet: "<path d=\"M5 8h14v11H5z\"/><path d=\"M8 8V6a4 4 0 018 0v2\"/>",
  gear: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.3 1a7 7 0 00-2-1.2L16.2 3H7.8l-.4 2.4a7 7 0 00-2 1.2l-2.3-1-2 3.5 2 1.5A7 7 0 005 12\"/><path d=\"M5 12a7 7 0 00.1 1.2l-2 1.5 2 3.5 2.3-1a7 7 0 002 1.2L9.8 21h8.4l.4-2.4a7 7 0 002-1.2l2.3 1 2-3.5-2-1.5A7 7 0 0019 12\"/>",
  trash: "<path d=\"M4 7h16M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7\"/><path d=\"M6.5 7l1 13.5h9L17.5 7\"/><path d=\"M10 11v6M14 11v6\"/>",
  close: "<path d=\"M6 6l12 12M18 6L6 18\"/>",
  trendUp: "<path d=\"M4 17l5-5 3 3 7-7\"/><path d=\"M15 8h4v4\"/>",
  bulb: "<path d=\"M12 4a6 6 0 013.5 10.9V17a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2.1A6 6 0 0112 4z\"/><path d=\"M10 20h4\"/>"
} as const

export type IconName = keyof typeof UI_ICONS

export interface CategoryIcon {
  inner: string
  tile: string
  glyph: string
}

export const CATEGORY_ICONS: Record<string, CategoryIcon> = {
  "餐饮": { inner: "<path d=\"M4 11h16a8 8 0 01-8 8 8 8 0 01-8-8z\"/><path d=\"M8 7V4M12 7V4M16 7V4\"/>", tile: "#FFEEE3", glyph: "#FF9A6C" },
  "奶茶饮品": { inner: "<path d=\"M6 8h12l-1.4 11a2 2 0 01-2 1.8H9.4a2 2 0 01-2-1.8z\"/><path d=\"M9 8l2-5h4\"/>", tile: "#FFF4E0", glyph: "#EFA93C" },
  "交通": { inner: "<path d=\"M4 16V9l2-4h12l2 4v7\"/><path d=\"M4 12h16\"/><circle cx=\"7.5\" cy=\"17.5\" r=\"1.5\"/><circle cx=\"16.5\" cy=\"17.5\" r=\"1.5\"/>", tile: "#E5F3FC", glyph: "#5BA9D6" },
  "购物": { inner: "<path d=\"M5 8h14l-1 12H6z\"/><path d=\"M9 8V6a3 3 0 016 0v2\"/>", tile: "#FDE9EF", glyph: "#E86A90" },
  "日用品": { inner: "<path d=\"M4 8h16l-1.6 11a2 2 0 01-2 1.8H7.6a2 2 0 01-2-1.8z\"/><path d=\"M9 8V6a3 3 0 016 0v2\"/>", tile: "#EBF6E5", glyph: "#7CB065" },
  "居住水电": { inner: "<path d=\"M4 11l8-6.5 8 6.5v9H4z\"/><path d=\"M10 20v-6h4v6\"/>", tile: "#F0EAFC", glyph: "#9579D6" },
  "娱乐": { inner: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M10 9l5 3-5 3z\"/>", tile: "#FCE9F7", glyph: "#E065B0" },
  "医疗健康": { inner: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7.5v9M7.5 12h9\"/>", tile: "#E4F7F3", glyph: "#4FB3A2" },
  "学习": { inner: "<path d=\"M4 5h7v15H4zM13 5h7v15h-7z\"/><path d=\"M4 5a3 3 0 013-3M20 5a3 3 0 00-3-3\"/>", tile: "#E8EEFD", glyph: "#6A85D6" },
  "人情往来": { inner: "<path d=\"M4 9h16v11H4zM4 9h16M12 9v11\"/><path d=\"M9 9a2.5 2.5 0 010-5c1.8 0 3 2 3 5M15 9a2.5 2.5 0 000-5c-1.8 0-3 2-3 5\"/>", tile: "#FBEDD9", glyph: "#CE9040" },
  "其他": { inner: "<path d=\"M4 6h16M4 12h16M4 18h10\"/>", tile: "#F1EBE3", glyph: "#A2907F" },
  "工资薪金": { inner: "<rect x=\"3\" y=\"7\" width=\"18\" height=\"11\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12.5\" r=\"2.6\"/>", tile: "#E7F4EC", glyph: "#4E9E75" },
  "奖金绩效": { inner: "<path d=\"M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z\"/>", tile: "#FFF5E0", glyph: "#DFA13A" },
  "兼职副业": { inner: "<rect x=\"4\" y=\"6\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M2 20h20\"/>", tile: "#E9F1FA", glyph: "#5B87BE" },
  "理财收益": { inner: "<path d=\"M4 17l5-5 3 3 7-7\"/><path d=\"M15 8h4v4\"/>", tile: "#EBF6E5", glyph: "#7CB065" },
  "红包礼金": { inner: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2.5\"/><path d=\"M3.5 7l8.5 6 8.5-6\"/>", tile: "#FDE9EF", glyph: "#E86A90" },
  "报销退款": { inner: "<path d=\"M6 3h12v18l-3-2-3 2-3-2-3 2z\"/><path d=\"M9 8h6M9 12h4\"/>", tile: "#F0EAFC", glyph: "#9579D6" },
  "公积金": { inner: "<path d=\"M4 20V9l8-5 8 5v11z\"/><path d=\"M9 20v-6h6v6\"/>", tile: "#E5F3FC", glyph: "#5BA9D6" },
  "房租收入": { inner: "<circle cx=\"8.5\" cy=\"8.5\" r=\"4\"/><path d=\"M11.5 11.5L20 20M17 17l2-2M14 14l2-2\"/>", tile: "#FBEDD9", glyph: "#CE9040" },
  "退货退款": { inner: "<path d=\"M4 10a8 8 0 1114 6\"/><path d=\"M4 5v5h5\"/>", tile: "#E4F7F3", glyph: "#4FB3A2" },
  "亲属资助": { inner: "<path d=\"M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z\"/>", tile: "#FCE9F7", glyph: "#E065B0" },
  "中奖抽奖": { inner: "<rect x=\"4\" y=\"9\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M4 13h16M12 9v11\"/><path d=\"M8 9a2 2 0 010-4c2 0 4 2 4 4M16 9a2 2 0 000-4c-2 0-4 2-4 4\"/>", tile: "#FFEEE3", glyph: "#FF9A6C" },
  "其他收入": { inner: "<path d=\"M4 6h16M4 12h16M4 18h10\"/>", tile: "#F1EBE3", glyph: "#A2907F" }
}
