const {expect, test} = require('@dxcli/dev-test')
const cmd = require('..')

describe('command', () => {
  test()
    .stdout()
    .run(() => cmd.run([]))
    .run(output => expect(output.stdout).to.equal('hello world!\n'))
    .end('says hello world!')

  test()
    .stdout()
    .run(() => cmd.run(['--name', 'jeff']))
    .run(output => expect(output.stdout).to.equal('hello jeff!\n'))
    .end('says hello jeff!')
})
