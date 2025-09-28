import type { ChildProcess } from 'node:child_process'
import type { Platforms } from '../constant'
import process from 'node:process'
import blessed from 'blessed'
import spawn from 'cross-spawn'
import { green } from 'kolorist'

export class UniHelperTerminalUi {
  private platforms: Platforms
  private screen: blessed.Widgets.Screen
  private platformBox!: blessed.Widgets.ListElement
  private terminalBox!: blessed.Widgets.Log
  private infoBox!: blessed.Widgets.BoxElement
  private processMap: Map<string, ChildProcess> = new Map()
  private currentProcess: ChildProcess | undefined
  private currentPlatform: string | undefined
  private platformOutputMap: Map<string, string[]> = new Map() // 存储每个平台的输出历史
  private platformStatusMap: Map<string, 'running' | 'stopped'> = new Map() // 存储每个平台的状态

  private padding = {
    left: 2,
    right: 2,
    top: 0,
    bottom: 1,
  }

  constructor(platforms: Platforms) {
    this.screen = blessed.screen({
      // smartCSR: true,
      fullUnicode: true,
    })

    this.platforms = platforms
    this.setupUI()
    this.setupKeyHandlers()
  }

  private setupUI(): void {
    // 创建左侧平台选择列表
    this.platformBox = blessed.list({
      parent: this.screen,
      width: '20%',
      height: '70%',
      left: 0,
      top: 0,
      label: ' 平台启动 ',
      border: 'line',
      padding: this.padding,
      style: {
        selected: {
          bg: 'green',
          fg: 'white',
        },
        scrollbar: {
          bg: 'green',
          fg: 'white',
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      items: this.getPlatformItemsWithStatus(),
      scrollable: true,
      alwaysScroll: true,
    })

    // 创建右侧终端输出区域 - 使用log组件支持ANSI颜色
    this.terminalBox = blessed.log({
      parent: this.screen,
      label: '终端输出',
      border: 'line',
      padding: this.padding,
      top: 0,
      left: '20%',
      width: '80%',
      height: '70%',
      scrollable: true,
      alwaysScroll: true,
      tags: true, // 支持blessed颜色标签
      wrap: true,
      keys: true,
      vi: true,
      mouse: true, // 启用鼠标支持
      scrollback: 1000, // 增加滚动缓冲区大小
      style: {
        scrollbar: {
          bg: 'blue',
          fg: 'white',
        },
        focus: {
          border: {
            fg: 'green',
          },
        },
      },
    })

    // 创建底部系统信息区域
    this.infoBox = blessed.box({
      parent: this.screen,
      label: '系统信息',
      border: 'line',
      padding: this.padding,
      top: '70%',
      left: 0,
      width: '100%',
      height: '30%',
      content: '{green-fg}UniApp Terminal Launcher Ready{/green-fg}\n\n{cyan-fg}Features:{/cyan-fg}\n• Full ANSI color support enabled\n• Real-time terminal output\n• Process management\n• Platform status indicators\n\n{yellow-fg}Controls:{/yellow-fg}\n• Arrow keys: Navigate platform list\n• Enter: Start selected platform\n• Number keys 1-8: Quick selection\n• q or Esc: Stop current platform\n• Ctrl+C: Exit application\n\n{cyan-fg}Status Icons:{/cyan-fg}\n{green-fg}▶{/green-fg} Running  {gray-fg}■{/gray-fg} Stopped  {red-fg}✖{/red-fg} Error',
    })
  }

  private setupKeyHandlers(): void {
    this.screen.key(['C-c'], () => {
      this.cleanup()
      process.exit(0)
    })

    this.screen.key(['escape', 'q'], () => {
      if (!this.currentPlatform)
        return
      if (this.processMap.has(this.currentPlatform)) {
        this.processMap.get(this.currentPlatform)?.kill('SIGKILL')
        this.processMap.delete(this.currentPlatform)
        this.platformStatusMap.set(this.currentPlatform, 'stopped')
        this.updatePlatformList()
      }
      if (this.platformOutputMap.has(this.currentPlatform)) {
        this.platformOutputMap.delete(this.currentPlatform)
      }
    })

    this.platformBox.on('select', (item) => {
      const platform = this.extractPlatformName(item.content)
      this.currentPlatform = platform
      this.startPlatform(platform)
    })
  }

  cleanup(): void {
    this.screen.destroy()
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM')
    }
  }

  startPlatform(platform: string): void {
    this.screen.render()

    // 清理之前进程的事件监听器
    if (this.currentProcess) {
      this.currentProcess.stdout?.removeAllListeners('data')
      this.currentProcess.stderr?.removeAllListeners('data')
      this.currentProcess.removeAllListeners('close')
      this.currentProcess.removeAllListeners('error')
    }

    if (this.processMap.has(platform)) {
      this.currentProcess = this.processMap.get(platform)
    }
    else {
      // Start new process
      this.currentProcess = spawn('uni', ['dev', '-p', platform], {
        stdio: 'pipe',
        shell: true,
      })
      this.processMap.set(platform, this.currentProcess)
      // 初始化新平台的输出历史
      if (!this.platformOutputMap.has(platform)) {
        this.platformOutputMap.set(platform, [])
      }
    }

    // 更新平台状态为运行中
    this.platformStatusMap.set(platform, 'running')
    this.updatePlatformList()

    // 恢复该平台的输出历史，而不是清空
    this.restorePlatformOutput(platform)

    // 修改终端标题显示当前平台
    this.terminalBox.setLabel(` 终端输出 - ${platform} `)

    // 重新绑定事件监听器，无论进程是新创建的还是已存在的
    this.setupProcessListeners(platform)
  }

  private setupProcessListeners(platform: string): void {
    if (!this.currentProcess)
      return

    this.currentProcess.stdout?.on('data', (data) => {
      const text = data.toString()
      const lines = text.split('\n')
      lines.forEach((line: string) => {
        if (line.trim()) {
          this.terminalBox.log(`${line}`)
          // 保存到该平台的输出历史
          const history = this.platformOutputMap.get(platform) || []
          history.push(line)
          this.platformOutputMap.set(platform, history)
        }
      })
      this.screen.render()
    })

    this.currentProcess.stderr?.on('data', (data) => {
      const text = data.toString()
      const lines = text.split('\n')
      lines.forEach((line: string) => {
        if (line.trim()) {
          let formattedLine: string
          if (!line.includes('\x1B[')) {
            formattedLine = `{red-fg}[ERROR] ${line}{/red-fg}`
          }
          else {
            formattedLine = line
          }
          this.terminalBox.log(formattedLine)
          // 保存到该平台的输出历史
          const history = this.platformOutputMap.get(platform) || []
          history.push(formattedLine)
          this.platformOutputMap.set(platform, history)
        }
      })
      this.screen.render()
    })

    this.currentProcess.on('close', (code) => {
      const statusColor = code === 0 ? 'green' : 'red'
      const closeMessage = `{${statusColor}-fg}Process exited with code: ${code}{/${statusColor}-fg}`
      const separator = `{green-fg}${'='.repeat(50)}{/green-fg}`

      this.terminalBox.log(closeMessage)
      this.terminalBox.log(separator)

      // 保存关闭信息到历史
      const history = this.platformOutputMap.get(platform) || []
      history.push(closeMessage)
      history.push(separator)
      this.platformOutputMap.set(platform, history)

      // 更新平台状态
      this.platformStatusMap.set(platform, code === 0 ? 'stopped' : 'running')
      this.updatePlatformList()

      this.screen.render()
      this.currentProcess = undefined
    })

    this.currentProcess.on('error', (error) => {
      const errorMessage = `{red-fg}Failed to start: ${error.message}{/red-fg}`
      this.terminalBox.log(errorMessage)

      // 保存错误信息到历史
      const history = this.platformOutputMap.get(platform) || []
      history.push(errorMessage)
      this.platformOutputMap.set(platform, history)

      // 更新平台状态为运行中
      this.platformStatusMap.set(platform, 'running')
      this.updatePlatformList()

      this.screen.render()
      this.currentProcess = undefined
    })
  }

  private restorePlatformOutput(platform: string): void {
    const history = this.platformOutputMap.get(platform) || []

    // 恢复该平台的输出历史
    this.terminalBox.setContent('')
    history.forEach((line) => {
      this.terminalBox.log(line)
    })
  }

  selectPlatform(platform: string) {
    const index = this.platforms.findIndex(item => item === platform)
    if (index !== -1) {
      this.platformBox.select(index)
    }
  }

  render() {
    this.screen.render()
  }

  // 获取带状态的平台项目列表
  private getPlatformItemsWithStatus(): string[] {
    return this.platforms.map((platform) => {
      const status = this.platformStatusMap.get(platform) || 'stopped'
      const statusIcon = this.getStatusIcon(status)
      return `${statusIcon} ${platform}`
    })
  }

  // 获取状态图标
  private getStatusIcon(status: 'running' | 'stopped'): string {
    switch (status) {
      case 'running':
        return green('▶')
      case 'stopped':
        return ' '
      default:
        return ' '
    }
  }

  // 更新平台列表显示
  private updatePlatformList(): void {
    this.platformBox.setItems(this.getPlatformItemsWithStatus())
    this.screen.render()
  }

  // 从显示文本中提取平台名称
  private extractPlatformName(displayText: string): string {
    // 按长度降序排序，优先匹配更长的平台名称
    // 这样可以避免 'app-plus' 被错误匹配为 'app'
    const sortedPlatforms = [...this.platforms].sort((a, b) => b.length - a.length)

    // 从所有平台中查找匹配的平台名称
    for (const platform of sortedPlatforms) {
      if (displayText.includes(platform)) {
        return platform
      }
    }
    // 如果没有找到匹配的平台，返回原始文本去除前后空格
    return displayText.trim()
  }
}
