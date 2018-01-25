import {expect, test} from '@dxcli/dev-test'

import cmd from '../src'

describe('command', () => {
  test()
  .stdout()
  .it('says hello world!', async output => {
    await cmd.run([])
    expect(output.stdout).to.equal('hello world!\n')
  })

  test()
  .stdout()
  .it('says hello jeff!', async output => {
    await cmd.run(['--name', 'jeff'])
    expect(output.stdout).to.equal('hello jeff!\n')
  })
})
