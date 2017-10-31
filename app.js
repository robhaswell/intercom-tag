#!/usr/bin/env node
require('dotenv').config()
const Intercom = require('intercom-client')
const { promisify } = require('util')
const fs = require('fs')
const parse = require('csv-parse/lib/sync')

const readFile = promisify(fs.readFile)

const yargs = require('yargs')
  // .usage('$0 <cmd> [args]')
  .env('INTERCOM')
  .options({
    file: {
      alias: 'f',
      description: 'CSV file of email addresses',
      demandOption: true
    },
    tags: {
      alias: ['t', 'tag'],
      description: 'Tags to apply',
      demandOption: true,
      array: true
    },
    token: {
      description: 'Intercom access token (can also set env INTERCOM_TOKEN)',
      demandOption: true
    }
  })
  .help()

const argv = yargs.argv

process.on('unhandledRejection', (reason) => {
  console.error(reason)
  console.error('\n\n')
  yargs.showHelp()
  process.exit(1)
})

async function main () {
  const client = new Intercom.Client({ token: argv.token })
  const emailsToTag = parse(await readFile(argv.file)).map(([email]) => email)
  const users = [] // <Array>{ id: <String> }

  process.stdout.write('Paging... ')
  let i = 0
  await client.users.scroll.each({}, async (res) => {
    i++; process.stdout.write(`${i}... `)
    for (const user of res.body.users) {
      if (emailsToTag.includes(user.email)) {
        users.push({ id: user.id })
      }
    }
  })
  process.stdout.write('\n\n')

  for (const name of argv.tags) {
    await client.tags.tag({ name, users })
    console.log(`tagged ${users.length} users with ${name}`)
  }
}
main()
