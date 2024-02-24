const { readFileSync, writeFileSync } = require('fs')

const decoderFunction = process.argv[2]

let main = readFileSync('dist/main.js').toString()

let decodeAlias = new Set()
let replaceRules = [
  null, // placeholder for decoderFunction
  [/\[\('(.+?)'\)\]/g, "['$1']"], // [('123')] => ['123']
  [/(\w+?)\['(\w+?)'\]/g, '$1.$2'], // _abc['_abc'] => _abc._abc
  [/([\])'}]) *\['(\w+?)'\]/g, '$1.$2'], // []['_abc'] => []._abc
  [/(\/i?) *\['(\w+?)'\]/g, '$1.$2'], // /r/i ['_abc'] => /r/i._abc
  [/([ ([\-!])0x([0-9a-f]+)/g, (_, p1, p2) => `${p1}${parseInt(p2, 16)}`], // 0x1 => 1
  [/!0(?=\W)/g, 'true'], // !0 => true
  [/!1(?=\W)/g, 'false'], // !1 => false
  [/void 0(?=\W)/g, 'undefined'], // void 0 => undefined
  [/([([])(\d+)\.toString\(\)/g, "$1['$2']"], // [123.toString()] => ['123']
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

main = main.replace(new RegExp(` ${decoderFunction}[;,]`, 'g'), ' null')

writeFileSync('dist/main.js', main)
