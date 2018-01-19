const {expect, describe, it, output} = require('@dxcli/dev-test')
const cmd = require('../../src')

describe.stdout('command', () => {
  it('says hello world!', async () => {
    await cmd.run(['hello'])
    expect(output.stdout).to.equal('hello world!\n')
  })
  it('says hello jeff!', async () => {
    await cmd.run(['hello', '--name', 'jeff'])
    expect(output.stdout).to.equal('hello jeff!\n')
  })
})
