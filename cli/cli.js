#!/usr/bin/env node
require('ts-node').register({ /* options */ })

const yargs =  require('yargs')
const yargsHelper =  require('yargs/helpers')
const { hideBin }  = yargsHelper


yargs(hideBin(process.argv))
  // Use the commands directory to scaffold.
  .commandDir('src/commands', {
    extensions: ['js', 'ts'],
  })
  // Enable strict mode.
  .strict()
  // Useful aliases.
  .alias({ h: 'help' })
  .argv;