import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 全离线本地存储的 iOS 壳：没有远程 server，webDir 直接用 Vite 产物。
 * hash 路由 + 相对 base 是 WKWebView 下的硬要求，配置里不再声明任何在线地址。
 */
const config: CapacitorConfig = {
  appId: 'com.xiaoman.ledger',
  appName: '小满记账',
  webDir: 'dist',
  backgroundColor: '#FFF6EC',
  ios: {
    scheme: 'xiaoman',
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
  },
}

export default config
