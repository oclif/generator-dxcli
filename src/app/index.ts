// tslint:disable no-floating-promises
// tslint:disable no-console

import * as _ from 'lodash'
import * as path from 'path'
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
  options: {defaults: boolean}
  args: {[k: string]: string}
  type: 'base'
  path: string
  pjson: any
  tsconfig: any
  fromScratch: boolean
  githubUser: string | undefined
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
    if (process.env.DXCLI_CREATE_DEFAULTS === '1') this.options.defaults = true
    this.log(yosay(
      `Time to build a dxcli ${this.type}! Version: ${require('../../package.json').version}`
    ))

    if (this.path) {
      this.destinationRoot(path.resolve(this.path))
      process.chdir(this.destinationRoot())
    }
    this.githubUser = await this.user.github.username().catch(debug)
    this.pjson = this.fs.readJSON('package.json', {})
    this.fromScratch = Object.keys(this.pjson).length === 0
    this.pjson.name = this.pjson.name || this.determineAppname().replace(/ /, '-')
    this.pjson.version = this.pjson.version || '0.0.0'
    this.pjson.license = this.pjson.license || 'MIT'
    this.pjson.author = this.pjson.author || (this.githubUser ? `${this.user.git.name()} @${this.githubUser}` : this.user.git.name())
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
        default: this.pjson.repository ? this.pjson.repository.split('/').slice(0, -1).pop() : this.githubUser,
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
      {
        type: 'string',
        name: 'files',
        message: 'npm files to pack',
        default: this.pjson.files ? this.pjson.files.join(',') : '/lib',
        filter: stringToArray as any,
        when: this.fromScratch || !this.pjson.repository,
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
    this.pjson.scripts.precommit = this.pjson.scripts.precommit || 'dxcli-dev lint'
    this.pjson.main = this.pjson.main || 'lib/index.js'

    if (this.ts) {
      this.pjson.types = this.pjson.types || 'lib/index.d.ts'
      this.fs.copyTpl(this.templatePath('tslint.json'), this.destinationPath('tslint.json'), this)
      this.tsconfig = this.fs.readJSON(this.destinationPath('tsconfig.json'), {
        compilerOptions: {
          declaration: true,
          forceConsistentCasingInFileNames: true,
          importHelpers: true,
          module: 'commonjs',
          noUnusedLocals: true,
          noUnusedParameters: true,
          outDir: './lib',
          rootDir: './src',
          strict: true,
          target: 'es2017'
        },
        include: [
          'src/**/*'
        ]
      })
      this.fs.writeJSON(this.destinationPath('tsconfig.json'), this.tsconfig)
      this.pjson.scripts.prepare = this.pjson.scripts.prepare || `rm -rf ${this._tsOutDir!.replace(/^\//, '')} && tsc`
      if (!lint.find((c: string) => c.startsWith('tsc'))) lint.push('tsc --noEmit')
      if (!test.find((c: string) => c.startsWith('tsc'))) test.push('tsc --noEmit')
      if (!lint.find((c: string) => c.startsWith('tslint'))) lint.push('tslint -p .')
      if (!test.find((c: string) => c.startsWith('tslint'))) test.push('tslint -p .')
      if (this.mocha) {
        if (!lint.find((c: string) => c.startsWith('tsc -p test'))) lint.push('tsc -p test --noEmit')
        if (!test.find((c: string) => c.startsWith('tsc -p test'))) test.push('tsc -p test --noEmit')
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

    this.fs.write(this.destinationPath('.gitignore'), this._gitignore())
    this.fs.copyTpl(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'), this)
    this.fs.write(this.destinationPath('.eslintignore'), this._eslintignore())
  }

  install() {
    const dependencies: string[] = []
    const devDependencies = [
      '@dxcli/dev',
      'husky',
      'eslint-config-dxcli',
      'eslint',
      'nyc',
    ]
    if (this.mocha) {
      devDependencies.push(
        '@dxcli/dev-test',
        'mocha',
      )
    }
    if (this.ts) {
      devDependencies.push(
        'typescript',
        '@dxcli/dev-tslint',
        '@types/node',
      )
      if (this.mocha) {
        devDependencies.push(
          'ts-node',
        )
      }
    }
    if (this.semantic_release) {
      devDependencies.push('@dxcli/dev-semantic-release')
    }
    Promise.all([
      this.yarnInstall(devDependencies, {dev: true}),
      dependencies.length ? this.yarnInstall(dependencies) : Promise.resolve(),
    ]).then(() => {
      console.log(`\nCreated ${this.pjson.name} in ${this.destinationRoot()}`)
    })
  }

  private get _tsOutDir(): string | undefined {
    if (!this.ts || !this.tsconfig || !this.tsconfig.compilerOptions || !this.tsconfig.compilerOptions.outDir) return
    return this.tsconfig.compilerOptions.outDir.replace(/^\./, '')
  }

  private _gitignore(): string {
    const existing = this.fs.exists(this.destinationPath('.gitignore')) ? this.fs.read(this.destinationPath('.gitignore')).split('\n') : []
    return _([
      '*-debug.log',
      '*-error.log',
      '/coverage',
      '/node_modules',
      '/tmp',
      this._tsOutDir,
      this.mocha && '/.nyc_output',
    ])
      .concat(existing)
      .compact()
      .uniq()
      .sort()
      .join('\n') + '\n'
  }

  private _eslintignore(): string {
    const existing = this.fs.exists(this.destinationPath('.eslintignore')) ? this.fs.read(this.destinationPath('.eslintignore')).split('\n') : []
    return _([
      this._tsOutDir,
    ])
      .concat(existing)
      .compact()
      .uniq()
      .sort()
      .join('\n') + '\n'
  }
}

export = App
