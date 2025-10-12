import { sync } from 'cross-spawn'
import { composeCommand } from '@/utils'

export async function handleInfoCommand() {
  const fullCustomCommand = composeCommand('@create-uni/info')
  const [command, ..._args] = fullCustomCommand.split(' ')
  const { error } = sync(command, [..._args], {
    stdio: 'inherit',
  })

  if (error)
    throw new Error(`Error executing command: ${error.message}`)
}
