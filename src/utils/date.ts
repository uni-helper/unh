/**
 * 格式化当前时间为 hh:mm:ss A 格式（12小时制带上午/下午标记）
 */
export function formatTime12Hour(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
