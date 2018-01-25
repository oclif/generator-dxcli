import {Hooks, IHook} from '@dxcli/config'
import cli from 'cli-ux'

const hook: IHook<Hooks['init']> = async opts => {
  cli.warn('example hook running\nDisable by deleting ./src/hooks/init.ts')
}

export default hook
