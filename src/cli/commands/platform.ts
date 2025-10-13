import { PLATFORM_DESCRIPTIONS } from '@/constant'

export function handlePlatformCommand() {
  // 使用对象数组方式，可以自定义列标题
  const platformData = Object.entries(PLATFORM_DESCRIPTIONS).map(([platform, description]) => ({
    平台: platform,
    描述: description,
  }))

  console.table(platformData)
}
