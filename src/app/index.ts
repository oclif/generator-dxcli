// tslint:disable no-floating-promises

import * as path from 'path'
import _ from 'ts-lodash'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')

const sortPjson = require('sort-pjson')
const fixpack = require('fixpack')
const debug = require('debug')('generator-dxcli')

function stringToArray(s: string) {
  const keywords: string[] = []

  s.split(',').forEach((keyword: string) => {
    if (!keyword.length) {
      return false
    }

    return keywords.push(keyword.trim())
  })

  return keywords
}

class App extends Generator {
  options: any
  args: {[k: string]: string}
  type: 'base'
  path: string
  pjson: any
  fromScratch: boolean
  answers: {
    appname: string
    description: string
    version: string
    engines: {node: string}
    github: {repo: string, user: string}
    author: string
    files: string
    license: string
    repository: string
    options: {
      mocha: boolean,
      typescript: boolean,
      'semantic-release': boolean,
    }
  }
  mocha: boolean
  semantic_release: boolean
  ts: boolean
  get _ext() {
    return this.ts ? 'ts' : 'js'
  }

  constructor(args: any, opts: any) {
    super(args, opts)

    this.option('defaults', {description: 'use default values for everything'})
    // const types = ['base']
    this.argument('type', {type: String, required: false})
    this.argument('path', {type: String, required: false})
    this.type = opts.type || this.args.type
    this.path = opts.path || this.args.path
    if (!this.type) throw new Error('Usage: yo dxcli (single|multi|plugin|base)')
  }

  async prompting() {
    this.log(yosay(
      `Time to build a dxcli ${this.type}!`
    ))

    if (this.path) {
      this.destinationRoot(path.resolve(this.path))
      process.chdir(this.destinationRoot())
    }
    this.pjson = this.fs.readJSON('package.json', {})
    this.fromScratch = Object.keys(this.pjson).length === 0
    this.pjson.name = this.pjson.name || this.determineAppname().replace(/ /, '-')
    this.pjson.version = this.pjson.version || '0.0.0'
    this.pjson.license = this.pjson.license || 'MIT'
    this.pjson.author = this.pjson.author || this.user.git.name()
    this.pjson.engines = this.pjson.engines || {}
    this.pjson.engines.node = this.pjson.engines.node || '>=8.0.0'
    this.pjson.dependencies = this.pjson.dependencies || {}
    this.pjson.devDependencies = this.pjson.devDependencies || {}
    this.pjson.dxcli = this.pjson.dxcli || {}
    this.pjson.dxcli.workflows = this.pjson.dxcli.workflows || {}
    this.pjson.dxcli.workflows.test = this.pjson.dxcli.workflows.test || []
    this.pjson.dxcli.workflows.lint = this.pjson.dxcli.workflows.lint || []
    this.pjson.scripts = this.pjson.scripts || {}
    if (this.options.defaults) {
      this.pjson.repository = this.destinationRoot().split(path.sep).slice(-2).join('/')
      this.ts = true
      this.mocha = true
      this.semantic_release = true

      return
    }
    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'appname',
        message: 'npm package name',
        default: this.pjson.name,
        when: this.fromScratch,
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
        default: this.pjson.description,
        when: this.fromScratch || !this.pjson.description,
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: this.pjson.author,
        when: this.fromScratch || !this.pjson.author,
      },
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: this.pjson.version,
        when: this.fromScratch || !this.pjson.version,
      },
      {
        type: 'input',
        name: 'license',
        message: 'license',
        default: this.pjson.license,
        when: this.fromScratch || !this.pjson.license,
      },
      {
        type: 'input',
        name: 'engines.node',
        message: 'node version supported',
        default: this.pjson.engines.node,
        when: this.fromScratch || !this.pjson.engines.node,
      },
      {
        type: 'input',
        name: 'github.user',
        message: 'github owner of repository (https://github.com/OWNER/repo)',
        default: this.pjson.repository ? this.pjson.repository.split('/').slice(0, -1).pop() : await this.user.github.username(),
        when: this.fromScratch || !this.pjson.repository,
      },
      {
        type: 'input',
        name: 'github.repo',
        message: 'github name of repository (https://github.com/owner/REPO)',
        default: (answers: any) => (this.pjson.repository ? this.pjson.repository : answers.appname).split('/').pop(),
        when: this.fromScratch || !this.pjson.repository,
      },
      {
        type: 'input',
        name: 'repository',
        message: 'repository',
        default: (answers: any) => this.pjson.repository ? this.pjson.repository : `${answers.github.user}/${answers.github.repo}`,
        when: this.fromScratch || !this.pjson.repository,
      },
      {
        type: 'string',
        name: 'files',
        message: 'npm files to pack',
        default: this.pjson.files ? this.pjson.files.join(',') : '/lib',
        filter: stringToArray as any,
        when: this.fromScratch || !this.pjson.repository,
      },
      {
        type: 'checkbox',
        name: 'options',
        message: 'components to include',
        choices: [
          {name: 'typescript', checked: this.fromScratch ? true : !!this.pjson.devDependencies.typescript},
          {name: 'semantic-release', checked: this.fromScratch ? true : !!this.pjson.devDependencies['@dxcli/dev-semantic-release']},
          {name: 'mocha', checked: this.fromScratch ? true : !!this.pjson.devDependencies.mocha},
        ],
        filter: ((arr: string[]) => _.keyBy(arr)) as any,
      },
    ]) as any
    if (!this.answers.github && this.pjson.repository) {
      const [user, repo] = this.pjson.repository.split('/').slice(-2)
      this.answers.github = {user, repo}
    }
    debug(this.answers)
    this.ts = this.answers.options.typescript
    this.mocha = this.answers.options.mocha
    this.semantic_release = this.answers.options['semantic-release']

    this.pjson.name = this.answers.appname || this.pjson.name
    this.pjson.description = this.answers.description || this.pjson.description
    this.pjson.version = this.answers.version || this.pjson.version
    this.pjson.engines.node = this.answers.engines ? this.answers.engines.node : this.pjson.engines.node
    this.pjson.author = this.answers.author || this.pjson.author
    this.pjson.files = this.answers.files || this.pjson.files
    this.pjson.license = this.answers.license || this.pjson.license
    this.pjson.repository = this.answers.repository || this.pjson.repository
  }

  writing() {
    this.sourceRoot(path.join(__dirname, '../../templates'))
    const {test, lint} = this.pjson.dxcli.workflows
    if (!lint.find((c: string) => c.startsWith('eslint'))) lint.push('eslint .')
    if (!test.find((c: string) => c.startsWith('eslint'))) test.push('eslint .')
    this.pjson.scripts.lint = this.pjson.scripts.lint || 'dxcli-dev lint'
    this.pjson.scripts.test = this.pjson.scripts.test || 'dxcli-dev test'
    this.pjson.scripts.precommit = this.pjson.scripts.test || 'dxcli-dev lint'

    if (this.ts) {
      this.fs.copyTpl(this.templatePath('tslint.json'), this.destinationPath('tslint.json'), this)
      this.fs.copyTpl(this.templatePath('tsconfig.json'), this.destinationPath('tsconfig.json'), this)
      this.pjson.scripts.prepare = this.pjson.scripts.prepare || 'del-cli lib && tsc'
      if (!lint.find((c: string) => c.startsWith('tsc'))) lint.push('tsc')
      if (!test.find((c: string) => c.startsWith('tsc'))) test.push('tsc')
      if (!lint.find((c: string) => c.startsWith('tslint'))) lint.push('tslint -p .')
      if (!test.find((c: string) => c.startsWith('tslint'))) test.push('tslint -p .')
      if (this.mocha) {
        this.fs.copyTpl(this.templatePath('test/tsconfig.json'), this.destinationPath('test/tsconfig.json'), this)
      }
    }
    if (this.semantic_release) {
      this.pjson.scripts.commitmsg = this.pjson.scripts.commitmsg || 'dxcli-dev-commitmsg'
      if (!lint.find((c: string) => c.startsWith('commitlint'))) lint.push('commitlint --from master')
      if (!test.find((c: string) => c.startsWith('commitlint'))) test.push('commitlint --from master')
    }
    if (this.mocha) {
      if (!test.find((c: string) => c.startsWith('mocha'))) test.push('mocha "test/**/*.ts"')
      if (this.fromScratch) {
        this.fs.copyTpl(this.templatePath('test/helpers/init.js'), this.destinationPath('test/helpers/init.js'), this)
        this.fs.copyTpl(this.templatePath('test/mocha.opts'), this.destinationPath('test/mocha.opts'), this)
        this.fs.copyTpl(this.templatePath(`test/index.test.${this._ext}`), this.destinationPath(`test/index.test.${this._ext}`), this)
      }
    }
    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('fixpack/config.json'))
    }
    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    // fixpack(this.destinationPath('./package.json'), require('fixpack/config.json'))
    this.fs.copyTpl(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'), this)
    this.fs.copyTpl(this.templatePath('scripts/circleci'), this.destinationPath('scripts/circleci'), this)
    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), this)
    this.fs.copyTpl(this.templatePath('circle.yml.ejs'), this.destinationPath('.circleci/config.yml'), this)
    this.fs.copyTpl(this.templatePath('appveyor.yml'), this.destinationPath('appveyor.yml'), this)
    if (this.fromScratch) {
      this.fs.copyTpl(this.templatePath(`src/index.${this._ext}`), this.destinationPath(`src/index.${this._ext}`), this)
    }

    // git
    if (this.fromScratch) this.spawnCommandSync('git', ['init'])
    this.fs.copyTpl(this.templatePath('gitattributes'), this.destinationPath('.gitattributes'), this)
    let gitignore = [
      '/coverage',
      '/lib',
      '/node_modules',
      '/tmp',
    ]
    if (this.mocha) gitignore.push('/.nyc_output')
    gitignore.push(
      '',
      '*-error.log',
      '*-debug.log',
    )

    if (gitignore.length) this.fs.write(this.destinationPath('.gitignore'), gitignore.join('\n') + '\n')

    // eslint
    this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
    let eslintignore: string[] = []
    if (this.ts) eslintignore.push('/lib')
    if (eslintignore.length) this.fs.write(this.destinationPath('.eslintignore'), eslintignore.join('\n') + '\n')
  }

  install() {
    const dependencies = [
      'cli-ux'
    ]
    const devDependencies = [
      '@dxcli/dev',
      'husky',
      'eslint-config-dxcli',
      'eslint',
    ]
    if (this.mocha) {
      devDependencies.push(
        'mocha',
        'nyc',
        'chai',
      )
    }
    if (this.ts) {
      devDependencies.push(
        'del-cli',
        'typescript',
        '@dxcli/dev-tslint',
        '@types/ansi-styles',
        '@types/node',
      )
      if (this.mocha) {
        devDependencies.push(
          'ts-node',
          '@types/mocha',
          '@types/chai',
          '@dxcli/dev-nyc-config',
        )
      }
    }
    if (this.semantic_release) {
      devDependencies.push('@dxcli/dev-semantic-release')
    }
    if (devDependencies.length) this.yarnInstall(devDependencies, {dev: true})
    if (dependencies.length) this.yarnInstall(dependencies)
  }
}

export = App
