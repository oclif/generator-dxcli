const {expect, describe, it, output} = require('@dxcli/dev-test')
const cmd = require('../../src')

describe('command', () => {
  testCommand(['hello'], {stdout: true}, ({stdout}) => {
    expect(stdout).to.equal('hello world!\n')
  })
  testCommand(['hello', '--name', 'jeff'], {stdout: true}, ({stdout}) => {
    expect(stdout).to.equal('hello jeff!\n')
  })
})
