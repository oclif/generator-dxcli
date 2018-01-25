import {expect, test} from '@dxcli/dev-test'

import cmd from '../src'

describe('command', () => {
  test()
  .stdout()
  .run(() => cmd.run([]))
  .run(output => expect(output.stdout).to.equal('hello world!\n'))
  .end('says hello world!')

  test()
  .stdout()
  .run(() => cmd.run([]))
  .run(output => expect(output.stdout).to.equal('hello jeff!\n'))
  .it('says hello jeff!')
})
