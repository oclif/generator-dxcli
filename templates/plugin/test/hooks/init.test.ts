import {test, expect} from '@dxcli/dev-test'
import * as path from 'path'

const root = path.join(__dirname, '../fixtures/test')

describe('command', () => {
  test()
  .hook('command_not_found', {id: 'hel'}, {root, stderr: true, exit: 127}, ({error}) => {
    expect(error!.message).to.equal(`hel is not a mycli command.
    Perhaps you meant hello
Run mycli help for a list of available commands.`)
  })
})
