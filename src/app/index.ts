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
  args: {[k: string]: string}
  type: 'base'
  pjson: any
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

  constructor(args: any, opts: any) {
    super(args, opts)

    // const types = ['base']
    this.argument('type', {type: String, required: false})
    this.type = opts.type || this.args.type
    if (!this.type) throw new Error('Usage: yo dxcli (single|multi|plugin|base)')
  }

  async prompting() {
    this.log(yosay(
      `Time to build a dxcli ${this.type}!`
    ))

    this.pjson = this.fs.readJSON('package.json', {})
    const fromScratch = Object.keys(this.pjson).length === 0
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
    this.pjson.dxcli.workflows.lint = this.pjson.dxcli.workflows.test || []
    this.pjson.scripts = this.pjson.scripts || {}
    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'appname',
        message: 'npm package name',
        default: this.pjson.name,
        when: fromScratch,
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
        default: this.pjson.description,
        when: !this.pjson.description,
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: this.pjson.author,
        when: !this.pjson.author,
      },
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: this.pjson.version,
        when: !this.pjson.version,
      },
      {
        type: 'input',
        name: 'license',
        message: 'license',
        default: this.pjson.license,
        when: !this.pjson.license,
      },
      {
        type: 'input',
        name: 'engines.node',
        message: 'node version supported',
        default: this.pjson.engines.node,
        when: !this.pjson.engines.node,
      },
      {
        type: 'input',
        name: 'github.user',
        message: 'github owner of repository (https://github.com/OWNER/repo)',
        default: this.pjson.repository ? this.pjson.repository.split('/').slice(0, -1).pop() : await this.user.github.username(),
        when: !this.pjson.repository,
      },
      {
        type: 'input',
        name: 'github.repo',
        message: 'github name of repository (https://github.com/owner/REPO)',
        default: (answers: any) => this.pjson.repository ? this.pjson.repository.split('/').pop() : answers.appname,
        when: !this.pjson.repository,
      },
      {
        type: 'input',
        name: 'repository',
        message: 'repository',
        default: (answers: any) => this.pjson.repository ? this.pjson.repository : `${answers.github.user}/${answers.github.repo}`,
        when: !this.pjson.repository,
      },
      {
        type: 'string',
        name: 'files',
        message: 'npm files to pack',
        default: this.pjson.files ? this.pjson.files.join(',') : '/lib',
        filter: stringToArray as any,
        when: !this.pjson.repository,
      },
      {
        type: 'checkbox',
        name: 'options',
        message: 'components to include',
        choices: [
          {name: 'typescript', checked: fromScratch ? true : !!this.pjson.devDependencies.typescript},
          {name: 'semantic-release', checked: fromScratch ? true : !!this.pjson.devDependencies['@dxcli/dev-semantic-release']},
          {name: 'mocha', checked: fromScratch ? true : !!this.pjson.devDependencies.mocha},
        ],
        filter: ((arr: string[]) => _.keyBy(arr)) as any,
      },
    ]) as any
    if (!this.answers.github) {
      const [user, repo] = this.pjson.repository.split('/').slice(-2)
      this.answers.github = {user, repo}
    }
    debug(this.answers)

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

    if (this.answers.options.typescript) {
      this.fs.copyTpl(this.templatePath('tslint.json'), this.destinationPath('tslint.json'), this)
      this.fs.copyTpl(this.templatePath('tsconfig.json'), this.destinationPath('tsconfig.json'), this)
      this.pjson.scripts.prepare = this.pjson.scripts.prepare || 'tsc'
      if (!lint.find((c: string) => c.startsWith('tsc'))) lint.push('tsc')
      if (!test.find((c: string) => c.startsWith('tsc'))) test.push('tsc')
      if (!lint.find((c: string) => c.startsWith('tslint'))) lint.push('tslint -p .')
      if (!test.find((c: string) => c.startsWith('tslint'))) test.push('tslint -p .')
    }
    if (this.answers.options['semantic-release']) {
      this.pjson.scripts.commitmsg = this.pjson.scripts.commitmsg || 'dxcli-dev-commitmsg'
      if (!lint.find((c: string) => c.startsWith('commitlint'))) lint.push('commitlint --from master')
      if (!test.find((c: string) => c.startsWith('commitlint'))) test.push('commitlint --from master')
    }
    if (this.answers.options.mocha) {
      if (!test.find((c: string) => c.startsWith('nyc mocha'))) test.push('nyc mocha')
    }
    if (this.fs.exists(this.destinationPath('./package.json'))) {
      fixpack(this.destinationPath('./package.json'), require('fixpack/config.json'))
    }
    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(this.pjson))
    this.fs.copyTpl(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'), this)
    this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
    this.fs.copyTpl(this.templatePath('scripts/circleci'), this.destinationPath('scripts/circleci'), this)
    this.fs.copyTpl(this.templatePath('gitattributes'), this.destinationPath('.gitattributes'), this)
    this.fs.copyTpl(this.templatePath('gitignore'), this.destinationPath('.gitignore'), this)
    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), this)
    this.fs.copyTpl(this.templatePath('gitignore'), this.destinationPath('.gitignore'), this)
    this.fs.copyTpl(this.templatePath('circle.yml.ejs'), this.destinationPath('.circleci/config.yml'), this)
  }

  install() {
    const dependencies: string[] = []
    const devDependencies = [
      'husky',
      'eslint-config-dxcli',
      'eslint'
    ]
    if (this.answers.options.mocha) {
      devDependencies.push('mocha', 'nyc')
    }
    if (this.answers.options.typescript) {
      devDependencies.push('typescript', '@dxcli/dev-tslint')
    }
    if (this.answers.options['semantic-release']) {
      devDependencies.push('@dxcli/dev-semantic-release')
    }
    if (dependencies.length) this.yarnInstall(dependencies)
    if (devDependencies.length) this.yarnInstall(devDependencies, {dev: true})
  }
}

export = App
