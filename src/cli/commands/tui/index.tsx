import type { Platforms } from '@/constant'
import { render } from 'ink'
import React from 'react'
import { PLATFORM } from '@/constant'
import App from './App'

/**
 * 启动终端 UI
 * @param platforms 可选的平台列表，用于限制 UI 显示的平台
 */
export function handleTuiCommand(platforms?: Platforms) {
  console.clear()
  render(<App platforms={platforms || PLATFORM} />)
}
