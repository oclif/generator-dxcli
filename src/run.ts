#!/usr/bin/env node

import {createEnv} from 'yeoman-environment'

const env = createEnv()

env.register(
  require.resolve('./app'),
  'dxcli:app'
)

const type = process.argv[2]
if (!type) throw new Error('Usage: yarn create dxcli (single|multi|plugin|base)')

env.run('dxcli:app', {type, path: process.argv[3]})
