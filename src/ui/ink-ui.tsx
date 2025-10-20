import type { ChildProcess } from 'node:child_process'
import type { Platforms } from '../constant'
import spawn from 'cross-spawn'
import { Box, render, Text, useApp, useInput } from 'ink'
import { green, red } from 'kolorist'
import React, { useCallback, useEffect, useState } from 'react'

interface PlatformStatus {
  status: 'running' | 'stopped'
  output: string[]
  process?: ChildProcess
}

interface InkTerminalUIProps {
  platforms: Platforms
  initialPlatform?: Platforms[number]
}

const InkTerminalUI: React.FC<InkTerminalUIProps> = ({ platforms, initialPlatform }) => {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})
  const [currentPlatform, setCurrentPlatform] = useState<Platforms[number] | undefined>(initialPlatform)
  const [showHelp, setShowHelp] = useState(false)

  // Initialize platform statuses
  useEffect(() => {
    const initialStatuses: Record<string, PlatformStatus> = {}
    platforms.forEach((platform) => {
      initialStatuses[platform] = {
        status: 'stopped',
        output: [],
      }
    })
    setPlatformStatuses(initialStatuses)

    // Set initial platform if provided
    if (initialPlatform && platforms.includes(initialPlatform)) {
      setCurrentPlatform(initialPlatform)
      setSelectedIndex(platforms.indexOf(initialPlatform))
    }
  }, [platforms, initialPlatform])

  const stopPlatform = useCallback((platform: string) => {
    const process = platformStatuses[platform]?.process
    if (process) {
      process.kill('SIGKILL')
      setPlatformStatuses(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'stopped',
        },
      }))
    }
  }, [platformStatuses])

  const cleanup = useCallback(() => {
    Object.values(platformStatuses).forEach((status) => {
      status.process?.kill('SIGTERM')
    })
  }, [platformStatuses])

  const startPlatform = useCallback((platform: Platforms[number]) => {
    setCurrentPlatform(platform)

    setPlatformStatuses(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        status: 'running',
      },
    }))

    // Stop existing process for this platform if running
    if (platformStatuses[platform]?.process) {
      platformStatuses[platform].process?.kill('SIGTERM')
    }

    // Start new process
    const process = spawn('uni', ['dev', '-p', platform], {
      stdio: 'pipe',
      shell: true,
    })

    setPlatformStatuses(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        process,
        status: 'running',
      },
    }))

    // Handle stdout
    process.stdout?.on('data', (data) => {
      const text = data.toString()
      const lines = text.split('\n').filter((line: string) => line.trim())

      setPlatformStatuses(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          output: [...prev[platform].output, ...lines],
        },
      }))
    })

    // Handle stderr
    process.stderr?.on('data', (data) => {
      const text = data.toString()
      const lines = text.split('\n').filter((line: string) => line.trim())
      const formattedLines = lines.map(line =>
        line.includes('\x1B[') ? line : `[ERROR] ${line}`,
      )

      setPlatformStatuses(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          output: [...prev[platform].output, ...formattedLines],
        },
      }))
    })

    // Handle process close
    process.on('close', (code) => {
      let status: 'stopped' | 'running'
      if (code === 0) {
        status = 'stopped'
      }
      else {
        status = 'running'
      }

      let closeMessage: string
      if (code === 0) {
        closeMessage = green(`Process exited with code: ${code}`)
      }
      else {
        closeMessage = red(`Process exited with code: ${code}`)
      }

      const separator = green('='.repeat(50))

      setPlatformStatuses(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status,
          output: [...prev[platform].output, closeMessage, separator],
        },
      }))
    })

    // Handle process error
    process.on('error', (error) => {
      const errorMessage = red(`Failed to start: ${error.message}`)

      setPlatformStatuses(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'stopped',
          output: [...prev[platform].output, errorMessage],
        },
      }))
    })
  }, [platformStatuses, stopPlatform, cleanup])

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (showHelp) {
        setShowHelp(false)
      }
      else if (currentPlatform) {
        stopPlatform(currentPlatform)
      }
      return
    }

    if (input === 'h') {
      setShowHelp(prev => !prev)
      return
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(platforms.length - 1, prev + 1))
      return
    }

    if (key.return) {
      const platform = platforms[selectedIndex]
      startPlatform(platform)
      return
    }

    if (input >= '1' && input <= '8') {
      const index = Number.parseInt(input) - 1
      if (index < platforms.length) {
        setSelectedIndex(index)
        startPlatform(platforms[index])
      }
      return
    }

    if (key.ctrl && input === 'c') {
      cleanup()
      exit()
    }
  })

  const getStatusIcon = (status: 'running' | 'stopped') => {
    switch (status) {
      case 'running':
        return green('▶')
      case 'stopped':
        return ' '
      default:
        return ' '
    }
  }

  const getStatusColor = (isSelected: boolean) => {
    if (isSelected) {
      return 'green'
    }
    return undefined
  }

  let currentOutput: string[]
  if (currentPlatform) {
    currentOutput = platformStatuses[currentPlatform]?.output ?? []
  }
  else {
    currentOutput = []
  }
  const limitedOutput = currentOutput.slice(-50) // Keep last 50 lines

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="green" bold>UniApp Terminal Launcher</Text>
      </Box>

      {(() => {
        if (showHelp) {
          return (
            /* Help Screen */
            <Box flexDirection="column" flexGrow={1}>
              <Box borderStyle="single" borderColor="cyan" paddingX={1} marginTop={1}>
                <Text color="cyan" bold>Help - Controls</Text>
              </Box>
              <Box flexDirection="column" marginTop={1} paddingX={1}>
                <Text>• Arrow keys: Navigate platform list</Text>
                <Text>• Enter: Start selected platform</Text>
                <Text>• Number keys 1-8: Quick selection</Text>
                <Text>• q or Esc: Stop current platform</Text>
                <Text>• h: Toggle help</Text>
                <Text>• Ctrl+C: Exit application</Text>
              </Box>
              <Box borderStyle="single" borderColor="cyan" paddingX={1} marginTop={1}>
                <Text color="cyan" bold>Status Icons</Text>
              </Box>
              <Box flexDirection="column" marginTop={1} paddingX={1}>
                <Text>
                  {green('▶')}
                  {' '}
                  Running
                </Text>
                <Text>■ Stopped</Text>
                <Text>
                  {red('✖')}
                  {' '}
                  Error
                </Text>
              </Box>
              <Text dimColor marginTop={1} paddingX={1}>Press h to close help</Text>
            </Box>
          )
        }
        return (
          /* Main UI */
          <Box flexDirection="row" flexGrow={1}>
            {/* Platform List */}
            <Box width="25%" borderStyle="single" borderColor="blue" paddingX={1} flexDirection="column">
              <Text color="blue" bold>Platforms</Text>
              {platforms.map((platform, index) => {
                const isSelected = index === selectedIndex
                let status: 'running' | 'stopped' = 'stopped'
                if (platformStatuses[platform]?.status === 'running') {
                  status = 'running'
                }
                const statusIcon = getStatusIcon(status)

                return (
                  <Box key={platform}>
                    <Text color={getStatusColor(isSelected)} inverse={isSelected}>
                      {(() => {
                        if (isSelected) {
                          return '> '
                        }
                        return '  '
                      })()}
                      {statusIcon}
                      {' '}
                      {platform}
                    </Text>
                  </Box>
                )
              })}
            </Box>

            {/* Terminal Output */}
            <Box width="75%" borderStyle="single" borderColor="green" paddingX={1} flexDirection="column">
              <Text color="green" bold>
                Terminal Output
                {' '}
                {(() => {
                  if (currentPlatform) {
                    return `- ${currentPlatform}`
                  }
                  return ''
                })()}
              </Text>
              <Box flexDirection="column" flexGrow={1} overflowY="hidden">
                {limitedOutput.map((line, index) => (
                  <Text key={index}>{line}</Text>
                ))}
              </Box>
            </Box>
          </Box>
        )
      })()}

      {/* Footer */}
      <Box borderStyle="single" borderColor="yellow" paddingX={1}>
        <Text dimColor>
          Use arrow keys to navigate, Enter to start, q to stop, h for help, Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  )
}

export class UniHelperTerminalUi {
  private platforms: Platforms
  private currentPlatform?: string

  constructor(platforms: Platforms) {
    this.platforms = platforms
  }

  startPlatform(platform: string): void {
    this.currentPlatform = platform
  }

  selectPlatform(platform: string): void {
    this.currentPlatform = platform
  }

  render(): void {
    render(
      <InkTerminalUI
        platforms={this.platforms}
        initialPlatform={this.currentPlatform}
      />,
    )
  }

  cleanup(): void {
    // Cleanup is handled by the React component
  }
}
