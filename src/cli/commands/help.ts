import type { Command } from 'cac'

/**
 * 自定义帮助信息为中文
 */
export const customHelp: Command['helpCallback'] = (sections) => {
  return sections.map((section) => {
    // 处理版本信息行
    if (!section.title && section.body.includes('/')) {
      return {
        body: section.body,
      }
    }
    if (section.title === 'Usage') {
      return {
        title: '用法',
        body: section.body,
      }
    }
    if (section.title === 'Commands') {
      return {
        title: '命令',
        body: section.body,
      }
    }
    if (section.title && section.title.includes('For more info')) {
      return {
        title: '更多信息，运行任意命令时使用 `--help` 标志',
        body: section.body,
      }
    }
    if (section.title === 'Options') {
      return {
        title: '选项',
        body: section.body
          .replace('Display version number', '显示版本号')
          .replace('Display this message', '显示帮助信息'),
      }
    }
    return section
  })
}
