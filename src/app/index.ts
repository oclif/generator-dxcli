import * as path from 'path'
import * as Generator from 'yeoman-generator'
import yosay = require('yosay')

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

    const gitName = this.user.git.name()
    const githubUsername = await this.user.github.username()//.catch(() => '')
    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'appname',
        message: 'app name',
        default: this.determineAppname(),
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: gitName,
      },
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: '0.0.0',
      },
      {
        type: 'input',
        name: 'license',
        message: 'license',
        default: 'MIT',
      },
    ])
    this.answers = {
      ...this.answers,
      ...await this.prompt([
        {
          type: 'input',
          name: 'repository',
          message: 'repository',
          default: `${githubUsername}/${this.answers.appname}`,
        },
        {
          type: 'string',
          name: 'files',
          message: 'npm files to pack',
          default: '/lib',
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'use typescript?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'semantic_release',
          message: 'use semantic release?',
          default: true,
        },
      ])
    }
  }

  writing() {
    const pjson: any = {
      name: this.args.appname,
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
    this.fs.writeJSON(this.destinationPath('./package.json'), pjson)
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
