#!/usr/bin/env node
/**
 * iOS 模拟器验收链路：编译 .app → 启动模拟器 → 安装 → 拉起 → 截图。
 * 每一步都把命令与退出码打出来，作为「已验证」的证据，而不是「应该能跑」。
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SIM_NAME = process.env.SIM_NAME || 'iPhone 15 Pro'
const BUNDLE_ID = process.env.BUNDLE_ID || 'com.xiaoman.ledger'
const ROOT = path.resolve(__dirname, '..')
const WORKSPACE = path.join(ROOT, 'ios', 'App', 'App.xcworkspace')
const SCHEME = 'App'
const DERIVED = path.join(ROOT, 'ios', 'build', 'DerivedData')
const SHOT_DIR = path.join(ROOT, 'ios', 'build', 'screenshots')
const BUILD_LOG = path.join(ROOT, 'ios', 'build', 'xcodebuild.log')

// xcode-select 可能指向 Command Line Tools，那样 xcodebuild 直接不可用；这里只覆盖本子进程的环境，不改系统配置
if (!process.env.DEVELOPER_DIR && fs.existsSync('/Applications/Xcode.app/Contents/Developer')) {
  process.env.DEVELOPER_DIR = '/Applications/Xcode.app/Contents/Developer'
}

function run(cmd, args, options = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
    if (out && out.length < 4000) process.stdout.write(out)
    console.log(`exit=0`)
    return out
  } catch (error) {
    process.stdout.write(String(error.stdout || ''))
    process.stderr.write(String(error.stderr || ''))
    console.error(`exit=${error.status}`)
    throw error
  }
}

/**
 * xcodebuild 的输出远超 execFileSync 默认 1 MiB maxBuffer，捕获会把编译进程打成 SIGKILL，
 * 因此全量落盘、失败时只回显尾部。
 */
function runToFile(logPath, cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  console.log(`完整日志：${logPath}`)
  const fd = fs.openSync(logPath, 'w')
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', fd, fd] })
    console.log('exit=0')
  } catch (error) {
    const tail = fs.readFileSync(logPath, 'utf8').split('\n').slice(-40).join('\n')
    process.stdout.write(`${tail}\n`)
    console.error(`exit=${error.status}`)
    throw error
  } finally {
    fs.closeSync(fd)
  }
}

function findDevice() {
  const json = run('xcrun', ['simctl', 'list', 'devices', '--json', 'available'], { stdio: ['ignore', 'pipe', 'pipe'] })
  const data = JSON.parse(json)
  for (const runtime of Object.values(data.devices)) {
    const match = runtime.find((d) => d.name === SIM_NAME)
    if (match) return match
  }
  throw new Error(`模拟器里找不到 ${SIM_NAME}，用 SIM_NAME 指定一个可用的`)
}

function dirSizeMb(dir) {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    total += entry.isDirectory() ? dirSizeMb(full) : fs.statSync(full).size
  }
  return total / 1024 / 1024
}

function main() {
  if (!fs.existsSync(WORKSPACE)) throw new Error(`没有 ${WORKSPACE}，先跑 npx cap add ios`)
  fs.mkdirSync(SHOT_DIR, { recursive: true })

  runToFile(BUILD_LOG, 'xcodebuild', [
    '-workspace', WORKSPACE,
    '-scheme', SCHEME,
    '-configuration', 'Debug',
    '-sdk', 'iphonesimulator',
    '-destination', `platform=iOS Simulator,name=${SIM_NAME}`,
    '-derivedDataPath', DERIVED,
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ])

  const appPath = path.join(DERIVED, 'Build', 'Products', 'Debug-iphonesimulator', 'App.app')
  if (!fs.existsSync(appPath)) throw new Error(`产物不存在：${appPath}`)
  console.log(`\n.app 已生成：${appPath} (${(dirSizeMb(appPath)).toFixed(1)} MB)`)

  const device = findDevice()
  console.log(`模拟器：${SIM_NAME} ${device.udid} state=${device.state}`)
  if (device.state !== 'Booted') {
    try {
      run('xcrun', ['simctl', 'boot', device.udid])
    } catch (error) {
      console.log('模拟器已在运行，忽略 boot 报错')
    }
  }

  run('xcrun', ['simctl', 'install', device.udid, appPath])
  run('xcrun', ['simctl', 'launch', device.udid, BUNDLE_ID])

  // 冷启动要过 dyld + WKWebView 首帧，立即截图会拍到启动图
  execFileSync('sleep', ['3'])

  const shot = path.join(SHOT_DIR, 's1-home.png')
  run('xcrun', ['simctl', 'io', device.udid, 'screenshot', shot])
  console.log(`\n截图：${shot}`)
}

main()
