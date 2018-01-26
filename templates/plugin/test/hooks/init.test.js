const {expect, test} = require('@dxcli/dev-test')

describe('hooks', () => {
  test
    .stdout()
    .hook('init', {id: 'mycommand'})
    .run(output => expect(output.stdout).to.contain('example hook running mycommand'))
    .it('shows a message')
})
