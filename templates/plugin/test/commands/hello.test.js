const {expect, test} = require('@dxcli/dev-test')

describe('command', () => {
  test()
    .stdout()
    .command(['hello'])
    .run(output => expect(output.stdout).to.contain('hello world!'))
    .end('says hello')

  test()
    .stdout()
    .command(['hello', '--name', 'jeff'])
    .run(output => expect(output.stdout).to.contain('hello jeff!'))
    .end('says hello jeff')
})
