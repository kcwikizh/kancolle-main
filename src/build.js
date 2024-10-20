const { spawnSync } = require('child_process')
const { get } = require('axios')
const { readFileSync, outputFileSync, existsSync } = require('fs-extra')
const beautify = require('js-beautify').js

const kcsConstUrl = 'https://kcwiki.github.io/cache/gadget_html5/js/kcs_const.js'
const kcsMainUrl = 'http://203.104.209.71/kcs2/js/main.js'

const decoderSource = readFileSync('src/decode.js').toString()
const patchSource = readFileSync('src/patch.js').toString()

const createjsSource = readFileSync('node_modules/createjs/builds/1.0.0/createjs.js').toString()
const createjsPatched = createjsSource.replace('this.createjs = this.createjs||{}', 'const createjs = {}; module.exports = createjs;')
outputFileSync('dist/createjs.js', createjsPatched)

!(async () => {
  try {
    const kcsConstData = (await get(kcsConstUrl)).data
    const scriptVersionMatch = kcsConstData.match(/scriptVesion\s*?=\s*?["'](.+?)["']/)
    if (!scriptVersionMatch) {
      throw new Error('Failed to extract scriptVesion from kcs_const.js')
    }
    const scriptVesion = scriptVersionMatch[1]
    outputFileSync('dist/version', scriptVesion)

    const mainSource = (await get(kcsMainUrl)).data
    const [mainDecoderPartA, ...mainFormattedTemp] = beautify(mainSource, { indent_size: 2 }).split(', ! function')
    const [mainFormatted, ...mainDecoderPartB] = mainFormattedTemp.join(', ! function').split('\n\nfunction')
    outputFileSync(
      'dist/decode.js',
      `${mainDecoderPartA})${mainDecoderPartB.length > 0 ? ['', ...mainDecoderPartB].join('\n\nfunction') : ''}\n\n${decoderSource}`,
    )
    outputFileSync('dist/main.js', `(! function${mainFormatted}`)

    // 检查文件是否存在
    if (!existsSync('dist/decode.js')) {
      throw new Error('dist/decode.js does not exist')
    }

    const decoderContent = readFileSync('dist/decode.js').toString()
    console.log('Decoder content length:', decoderContent.length)

    // 使用更宽松的正则表达式来匹配解码器函数
    const decoderFunctionMatch = decoderContent.match(/function\s+(\w+)\s*\((?:.+\n)+(?:.+abcdefg.+\n)(?:.+\n)+?^}/m)
    if (!decoderFunctionMatch) {
      console.log('Decoder content preview:', decoderContent.slice(0, 500)) // 输出文件内容的前500个字符以供调试
      throw new Error('Failed to extract decoder function')
    }
    const decoderFunction = decoderFunctionMatch[1]
    console.log('Extracted decoder function name:', decoderFunction)

    const decodeResult = spawnSync('node', ['dist/decode.js', decoderFunction])
    if (decodeResult.error) {
      throw new Error(`Error executing decode.js: ${decodeResult.error.message}`)
    }
    console.log('Decode result:', decodeResult.stdout.toString())

    const mainDecoded = readFileSync('dist/main.js').toString()
    const mainPatched = mainDecoded
      .replace(/Object\.defineProperty\((\S+?), '__esModule'/g, "defineModule($1); Object.defineProperty($1, '__esModule'")
      .replace(/module\.exports = (\S+?)\((.+?)\) :/, 'module.exports = registerModules($1($2)) :')

    const build = `${patchSource.replace('scriptVesion', scriptVesion)}\n${mainPatched}`
    outputFileSync(
      'dist/main.js',
      build.replace(/\\u([\d\w]{4})/gi, (_, e) => String.fromCharCode(parseInt(e, 16))),
    )
    console.log('Build process completed successfully')
  } catch (error) {
    console.error('An error occurred:', error.message)
    process.exit(1)
  }
})()
