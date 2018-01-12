import * as path from 'path'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')

const sortPjson = require('sort-pjson')
const fixpack = require('fixpack')

function stringToArray(s: string) {
  const keywords: string[] = [];

  s.split(',').forEach((keyword: string) => {
    if (!keyword.length) {
      return false;
    }

    return keywords.push(keyword.trim());
  });

  return keywords;
}

class App extends Generator {
  args: any
  answers: any

  constructor (args: any, opts: any) {
    super(args, opts)

    // const types = ['base']
    this.argument('type', {type: String, required: true})
  }

  async prompting() {
    this.log(yosay(
      'Welcome to the sweet generator!'
    ))

    const pjson = this.fs.readJSON('package.json', {})
    const gitName = this.user.git.name()
    const githubUsername = await this.user.github.username()
    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'appname',
        message: 'app name',
        default: pjson.name || this.determineAppname(),
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
        default: pjson.description,
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: pjson.author || gitName,
      },
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: pjson.version || '0.0.0',
      },
      {
        type: 'input',
        name: 'license',
        message: 'license',
        default: pjson.license || 'MIT',
      },
    ])
    this.answers = {
      ...this.answers,
      ...await this.prompt([
        {
          type: 'input',
          name: 'repository',
          message: 'repository',
          default: pjson.repository || `${githubUsername}/${this.answers.appname}`,
        },
        {
          type: 'string',
          name: 'files',
          message: 'npm files to pack',
          default: pjson.files ? pjson.files.join(',') : '/lib',
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'use typescript?',
          default: pjson.devDependencies ? !!pjson.devDependencies.typescript : true,
        },
        {
          type: 'confirm',
          name: 'semantic_release',
          message: 'use semantic release?',
          default: pjson.devDependencies ? !!pjson.devDependencies['@dxcli/dev-semantic-release'] : true,
        },
      ])
    }
  }

  writing() {
    const pjson: any = {
      name: this.answers.appname,
      description: this.answers.description,
      version: this.answers.version,
      author: this.answers.author,
      dependencies: {},
      devDependencies: {
        husky: "^0.14.3",
        '@dxcli/dev-lint': "^0.0.1",
      },
      files: stringToArray(this.answers.files),
      license: this.answers.license,
      repository: this.answers.repository,
      scripts: {}
    }
    this.sourceRoot(path.join(__dirname, '../../templates'))
    if (this.answers.typescript) {
      pjson.devDependencies['typescript'] = '^2.6.2'
      this.fs.copy(this.templatePath('tslint.json'), this.destinationPath('tslint.json'))
      pjson.scripts.prepare = 'tsc'
    }
    if (this.answers.semantic_release) {
      pjson.devDependencies['@dxcli/dev-semantic-release'] = '^0.0.2'
      pjson.scripts.commitmsg = 'dxcli-dev-commitmsg'
    }
    fixpack(this.destinationPath('./package.json'), require('fixpack/config.json'))
    this.fs.writeJSON(this.destinationPath('./package.json'), sortPjson(pjson))
    this.fs.copy(this.templatePath('eslintrc'), this.destinationPath('.eslintrc'))
    this.fs.copy(this.templatePath('editorconfig'), this.destinationPath('.editorconfig'))
    this.fs.copyTpl(
      this.templatePath('gitattributes'),
      this.destinationPath('.gitattributes'),
      this.answers,
    )
    this.fs.copyTpl(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore'),
      this.answers,
    )
    this.fs.copyTpl(
      this.templatePath('circle.yml.ejs'),
      this.destinationPath('.circleci/config.yml'),
      this.answers,
    )
  }

  install() {
    this.installDependencies({npm: false, yarn: true, bower: false})
  }
}

export = App
