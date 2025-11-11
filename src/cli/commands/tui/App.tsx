import type { ChildProcess } from 'node:child_process'
import type { Platforms } from '@/constant'
import { Box, Text } from 'ink'
import { green } from 'kolorist'
import React, { useState } from 'react'

interface PlatformStatus {
  status: 'running' | 'stopped'
  output: string[]
  process?: ChildProcess
}

function getStatusIcon(status: 'running' | 'stopped') {
  switch (status) {
    case 'running':
      return green('▶')
    case 'stopped':
      return ' '
    default:
      return ' '
  }
}

export default function App({ platforms }: { platforms: Platforms }) {
  const [selectedIndex, _setSelectedIndex] = useState(0)
  const [platformStatuses, _setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})

  return (
    <Box flexDirection="row" width="100%" height="100%">
      <Box flexDirection="row" flexGrow={1}>
        <Box width="25%" borderStyle="single" borderColor="blue" paddingX={1} flexDirection="column">
          <Text color="blue" bold>Platform</Text>
          {platforms.map((platform, index) => {
            const isSelected = index === selectedIndex
            let status: 'running' | 'stopped' = 'stopped'
            if (platformStatuses[platform]?.status === 'running') {
              status = 'running'
            }
            const statusIcon = getStatusIcon(status)

            return (
              <Box key={platform}>
                <Text color={isSelected ? 'green' : ''} inverse={isSelected}>
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
      </Box>
    </Box>
  )
}
