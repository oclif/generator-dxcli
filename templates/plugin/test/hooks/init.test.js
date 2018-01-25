const {expect, test} = require('@dxcli/dev-test')

describe('hooks', () => {
  test()
    .stdout()
    .hook('init', {id: 'mycommand'})
    .it('shows a message', ({stdout}) => {
      expect(stdout).to.contain('example hook running mycommand')
    })
})
