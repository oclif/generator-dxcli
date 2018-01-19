const _ = require('lodash')
const {concurrent, series} = require('nps-utils')

const types = ['base', 'single', 'plugin']

module.exports = {
  scripts: {
    build: 'tsc',
    lint: {
      default: concurrent.nps('lint.eslint', 'lint.tsc', 'lint.commitlint', 'lint.tslint'),
      tsc: 'tsc -p . --noEmit',
      eslint: 'eslint .',
      tslint: 'tslint -p .',
      commitlint: 'commitlint --from origin/master',
    },
    test: {
      default: {
        script: series.nps('lint', ...types.map(t => `test.${t}`)),
        description: 'lint and run all tests',
      },
      ..._.zipObject(types, types.map(type => ({
        default: {
          script: concurrent.nps(...['plain', 'semantic-release', 'mocha', 'typescript', 'everything'].map(t => `test.${type}.${t}`)),
          description: `test ${type} generator with all permutations`,
        },
        plain: {
          script: `node ./scripts/test ${type}`,
          description: `test ${type} generator with no extra opts`,
        },
        'semantic-release': {
          script: `node ./scripts/test ${type} --semantic-release`,
          description: `test ${type} generator with semantic_release`,
        },
        mocha: {
          script: `node ./scripts/test ${type} --mocha`,
          description: `test ${type} generator with mocha`,
        },
        typescript: {
          script: `node ./scripts/test ${type} --typescript`,
          description: `test ${type} generator with typescript`,
        },
        everything: {
          script: `node ./scripts/test ${type} --typescript --semantic-release --mocha`,
          description: `test ${type} generator with everything enabled`,
        },
      }))),
    },
    ci: {
      release: {
        script: 'yarn --frozen-lockfile && dxcli-dev-semantic-release',
        hiddenFromHelp: true,
      },
    },
  },
}
