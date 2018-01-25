import {expect, test} from '@dxcli/dev-test'

describe('command', () => {
  test()
  .stdout()
  .command(['hello'])
  .it('says hello', ({stdout}) => {
    expect(stdout).to.contain('hello world!')
  })

  test()
  .stdout()
  .command(['hello', '--name', 'jeff'])
  .it('says hello jeff', ({stdout}) => {
    expect(stdout).to.contain('hello jeff!')
  })
})
