const { readFileSync, writeFileSync } = require('fs')

const decoderFunction = process.argv[2]

let main = readFileSync('dist/main.js').toString()

let decodeAlias = new Set()
let replaceRules = [
  null, // placeholder for decoderFunction
  [/\[\('(.+?)'\)\]/g, "['$1']"], // [('123')] => ['123']
  [/(\w+?)\['(\w+?)'\]/g, '$1.$2'], // _abc['_abc'] => _abc._abc
  [/(\[[^"']+\])\['(\w+?)'\]/g, '$1.$2'], // [123]['_abc'] => [123]._abc
  [/(\([^"']*\))\['(\w+?)'\]/g, '$1.$2'], // (123)['_abc'] => (123)._abc
  [/`'symbol'`/g, '`$1`'], // `'symbol'` => `symbol`
]

let maxLoop = 20
let loop = 0
let needReplace = false
do {
  needReplace = false
  for (const alias of main.matchAll(new RegExp(`var (.+) = ${decoderFunction}[;,]`, 'g'))) {
    decodeAlias.add(alias[1])
  }
  for (const alias of main.matchAll(new RegExp(`var (.+) = (?:${[...decodeAlias].join('|')})[;,]`, 'g'))) {
    decodeAlias.add(alias[1])
  }
  replaceRules[0] = [
    new RegExp(`(?:${[...decodeAlias].join('|')})\\(([0-9a-fx]+?)\\)`, 'g'),
    x => `'${eval(`${decoderFunction}(${x.split('(')[1]}`)}'`.replace(/\n/g, '\\n'),
  ]
  for (const [reg, replacement] of replaceRules) {
    main = main.replace(reg, replacement)
    if (!needReplace) {
      needReplace = reg.test(main)
    }
  }
  if (loop++ > maxLoop) {
    console.log('loop too many times')
    break
  }
} while (needReplace)

main = main.replace(new RegExp(` ${decoderFunction}[;,]`, 'g'), 'null')

writeFileSync('dist/main.js', main)
